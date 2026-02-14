import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';

type RoomStatus = 'active' | 'ended';
type ParticipantRole = 'seller' | 'viewer';

type Participant = {
  userId: number;
  role: ParticipantRole;
};

type LivestreamRoom = {
  id: string;
  title: string;
  sellerId: number;
  status: RoomStatus;
  isStreaming: boolean;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  viewerCount: number;
};

@Injectable()
export class LivestreamService {
  private readonly roomSetKey = 'live:rooms';

  constructor(private readonly redisService: RedisService) {}

  async createRoom(sellerId: number, title: string) {
    try {
      const now = new Date().toISOString();
      const roomId = this.generateRoomId();
      const room: LivestreamRoom = {
        id: roomId,
        title,
        sellerId,
        status: 'active',
        isStreaming: false,
        createdAt: now,
        updatedAt: now,
        viewerCount: 0,
      };

      await this.redisService.redis.multi().set(this.roomKey(roomId), JSON.stringify(room)).sadd(this.roomSetKey, roomId).exec();
      return room;
    } catch {
      throw new BadRequestException('Không thể tạo phòng livestream. Vui lòng thử lại.');
    }
  }

  async joinRoom(roomId: string, role: ParticipantRole, requestedUserId?: number) {
    const room = await this.requireRoom(roomId);
    if (room.status === 'ended') {
      throw new BadRequestException('Phòng livestream đã kết thúc.');
    }
    if (role === 'seller' && requestedUserId !== room.sellerId) {
      throw new BadRequestException('Chỉ người bán của phòng mới có thể tham gia với vai trò seller.');
    }

    const viewerCount = await this.getViewerCountFromParticipants(roomId);
    return {
      room: { ...room, viewerCount },
      websocket: {
        namespace: '/livestream',
        event: 'join_room',
        payload: {
          roomId,
          role,
          userId: requestedUserId ?? room.sellerId,
        },
      },
    };
  }

  async startRoom(roomId: string, sellerId: number) {
    const room = await this.requireSellerOwnedRoom(roomId, sellerId);
    if (room.status === 'ended') {
      throw new BadRequestException('Không thể bắt đầu. Phòng đã kết thúc.');
    }
    room.isStreaming = true;
    room.updatedAt = new Date().toISOString();
    await this.saveRoom(room);
    return room;
  }

  async stopRoom(roomId: string, sellerId: number) {
    const room = await this.requireSellerOwnedRoom(roomId, sellerId);
    await this.endRoom(room);
    return room;
  }

  async getRoom(roomId: string) {
    const room = await this.requireRoom(roomId);
    room.viewerCount = await this.getViewerCountFromParticipants(roomId);
    return room;
  }

  async getViewerCount(roomId: string) {
    await this.requireRoom(roomId);
    return { roomId, viewerCount: await this.getViewerCountFromParticipants(roomId) };
  }

  async registerSocketParticipant(roomId: string, socketId: string, userId: number, role: ParticipantRole) {
    const room = await this.requireRoom(roomId);
    if (room.status === 'ended') {
      throw new BadRequestException('Phòng không khả dụng để tham gia.');
    }

    const participant: Participant = { userId, role };
    const participantsKey = this.participantsKey(roomId);
    await this.redisService.redis
      .multi()
      .hset(participantsKey, socketId, JSON.stringify(participant))
      .set(this.socketRoomKey(socketId), roomId)
      .exec();

    room.viewerCount = await this.getViewerCountFromParticipants(roomId);
    room.updatedAt = new Date().toISOString();
    await this.saveRoom(room);
    return room;
  }

  async unregisterSocketParticipant(socketId: string) {
    const roomId = await this.redisService.redis.get(this.socketRoomKey(socketId));
    if (!roomId) {
      return null;
    }

    const participantRaw = await this.redisService.redis.hget(this.participantsKey(roomId), socketId);
    if (!participantRaw) {
      await this.redisService.redis.del(this.socketRoomKey(socketId));
      return null;
    }

    const participant: Participant = JSON.parse(participantRaw);
    await this.redisService.redis
      .multi()
      .hdel(this.participantsKey(roomId), socketId)
      .del(this.socketRoomKey(socketId))
      .exec();

    const room = await this.requireRoom(roomId);
    if (participant.role === 'seller' && room.status !== 'ended') {
      await this.endRoom(room);
      return { room, endedByDisconnect: true, participant };
    }

    room.viewerCount = await this.getViewerCountFromParticipants(roomId);
    room.updatedAt = new Date().toISOString();
    await this.saveRoom(room);
    return { room, endedByDisconnect: false, participant };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredRooms() {
    const roomIds = await this.redisService.redis.smembers(this.roomSetKey);
    const now = Date.now();

    for (const roomId of roomIds) {
      const roomRaw = await this.redisService.redis.get(this.roomKey(roomId));
      if (!roomRaw) {
        await this.redisService.redis.srem(this.roomSetKey, roomId);
        continue;
      }

      const room: LivestreamRoom = JSON.parse(roomRaw);
      const endedAt = room.endedAt ? new Date(room.endedAt).getTime() : 0;
      const updatedAt = new Date(room.updatedAt).getTime();
      const noParticipants = (await this.redisService.redis.hlen(this.participantsKey(roomId))) === 0;

      const shouldDeleteEnded = room.status === 'ended' && endedAt > 0 && now - endedAt > 1000 * 60 * 60 * 24;
      const shouldDeleteStale = room.status === 'active' && noParticipants && now - updatedAt > 1000 * 60 * 60 * 6;

      if (shouldDeleteEnded || shouldDeleteStale) {
        await this.redisService.redis
          .multi()
          .del(this.roomKey(roomId))
          .del(this.participantsKey(roomId))
          .srem(this.roomSetKey, roomId)
          .exec();
      }
    }
  }

  private async endRoom(room: LivestreamRoom) {
    room.status = 'ended';
    room.isStreaming = false;
    room.endedAt = new Date().toISOString();
    room.updatedAt = room.endedAt;
    room.viewerCount = 0;
    await this.redisService.redis.multi().set(this.roomKey(room.id), JSON.stringify(room)).del(this.participantsKey(room.id)).exec();
  }

  private async saveRoom(room: LivestreamRoom) {
    await this.redisService.redis.set(this.roomKey(room.id), JSON.stringify(room));
  }

  private async requireRoom(roomId: string) {
    const roomRaw = await this.redisService.redis.get(this.roomKey(roomId));
    if (!roomRaw) {
      throw new NotFoundException('Không tìm thấy phòng livestream.');
    }
    return JSON.parse(roomRaw) as LivestreamRoom;
  }

  private async requireSellerOwnedRoom(roomId: string, sellerId: number) {
    const room = await this.requireRoom(roomId);
    if (room.sellerId !== sellerId) {
      throw new BadRequestException('Bạn không có quyền thao tác phòng livestream này.');
    }
    return room;
  }

  private async getViewerCountFromParticipants(roomId: string) {
    const participants = await this.redisService.redis.hvals(this.participantsKey(roomId));
    return participants.reduce((count, raw) => {
      const participant: Participant = JSON.parse(raw);
      return participant.role === 'viewer' ? count + 1 : count;
    }, 0);
  }

  private roomKey(roomId: string) {
    return `live:room:${roomId}`;
  }

  private participantsKey(roomId: string) {
    return `live:room:${roomId}:participants`;
  }

  private socketRoomKey(socketId: string) {
    return `live:socket:${socketId}`;
  }

  private generateRoomId() {
    return `ls-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }
}
