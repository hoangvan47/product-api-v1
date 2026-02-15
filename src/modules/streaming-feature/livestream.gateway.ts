import { BadRequestException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../@shared/prisma/prisma.service';
import { LivestreamService } from './livestream.service';

type JoinRoomEvent = {
  roomId: string;
  userId: number;
  role: 'seller' | 'viewer';
};

type CommentEvent = {
  roomId: string;
  userId: number;
  message: string;
};

type StreamSignalEvent = {
  roomId: string;
  fromUserId: number;
  toUserId?: number;
  payload: unknown;
};

type ShareProductEvent = {
  roomId: string;
  userId: number;
  product: {
    id: number;
    title: string;
    price: number;
    imageUrl: string;
    description?: string;
  };
};

@WebSocketGateway({
  namespace: '/livestream',
  cors: { origin: '*' },
})
export class LivestreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LivestreamGateway.name);

  constructor(
    private readonly livestreamService: LivestreamService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const result = await this.livestreamService.unregisterSocketParticipant(client.id);
    if (!result) {
      return;
    }

    this.server.to(result.room.id).emit('viewer_count_updated', {
      roomId: result.room.id,
      viewerCount: result.room.viewerCount,
    });
    this.server.to(result.room.id).emit('participant_left', {
      roomId: result.room.id,
      userId: result.participant.userId,
      role: result.participant.role,
    });

    if (result.endedByDisconnect) {
      this.server.to(result.room.id).emit('room_ended', {
        roomId: result.room.id,
        reason: 'seller_disconnected',
      });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinRoomEvent) {
    if (!payload?.roomId || !payload?.userId || !payload?.role) {
      throw new BadRequestException('Payload join_room không hợp lệ.');
    }

    const room = await this.livestreamService.registerSocketParticipant(
      payload.roomId,
      client.id,
      payload.userId,
      payload.role,
    );

    void client.join(payload.roomId);

    client.emit('room_state', room);
    this.server.to(payload.roomId).emit('viewer_count_updated', {
      roomId: room.id,
      viewerCount: room.viewerCount,
    });
    this.server.to(payload.roomId).emit('participant_joined', {
      roomId: payload.roomId,
      userId: payload.userId,
      role: payload.role,
    });

    return { ok: true };
  }

  @SubscribeMessage('send_comment')
  async handleComment(@ConnectedSocket() client: Socket, @MessageBody() payload: CommentEvent) {
    if (!payload?.roomId || !payload?.message?.trim()) {
      throw new BadRequestException('Payload send_comment không hợp lệ.');
    }

    await this.prisma.liveChatMessage.create({
      data: {
        roomId: payload.roomId,
        senderUserId: payload.userId,
        senderLabel: `user-${payload.userId}`,
        message: payload.message.trim(),
        type: 'TEXT',
      },
    });

    this.server.to(payload.roomId).emit('comment_created', {
      roomId: payload.roomId,
      userId: payload.userId,
      message: payload.message.trim(),
      createdAt: new Date().toISOString(),
    });

    return { ok: true, socketId: client.id };
  }

  @SubscribeMessage('stream_signal')
  handleStreamSignal(@ConnectedSocket() client: Socket, @MessageBody() payload: StreamSignalEvent) {
    if (!payload?.roomId || !payload?.fromUserId) {
      throw new BadRequestException('Payload stream_signal không hợp lệ.');
    }

    this.server.to(payload.roomId).emit('stream_signal', {
      roomId: payload.roomId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      payload: payload.payload,
      socketId: client.id,
    });

    return { ok: true };
  }

  @SubscribeMessage('share_product')
  async handleShareProduct(@ConnectedSocket() client: Socket, @MessageBody() payload: ShareProductEvent) {
    if (!payload?.roomId || !payload?.userId || !payload?.product?.id) {
      throw new BadRequestException('Payload share_product không hợp lệ.');
    }

    await this.prisma.$transaction([
      this.prisma.liveProductMention.create({
        data: {
          roomId: payload.roomId,
          sellerId: payload.userId,
          productId: payload.product.id,
        },
      }),
      this.prisma.liveChatMessage.create({
        data: {
          roomId: payload.roomId,
          senderUserId: payload.userId,
          senderLabel: `seller-${payload.userId}`,
          type: 'PRODUCT',
          message: `San pham dang duoc gioi thieu: ${payload.product.title}`,
          productId: payload.product.id,
          productData: payload.product as any,
        },
      }),
    ]);

    this.server.to(payload.roomId).emit('product_shared', {
      roomId: payload.roomId,
      userId: payload.userId,
      product: payload.product,
      createdAt: new Date().toISOString(),
    });

    return { ok: true, socketId: client.id };
  }
}
