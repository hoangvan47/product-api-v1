import { LivestreamService } from './livestream.service';

type ParticipantRole = 'seller' | 'viewer';

class FakeMulti {
  private steps: Array<() => void> = [];
  constructor(private readonly redis: FakeRedis) {}

  set(key: string, value: string) {
    this.steps.push(() => this.redis.setSync(key, value));
    return this;
  }
  sadd(key: string, value: string) {
    this.steps.push(() => this.redis.saddSync(key, value));
    return this;
  }
  srem(key: string, value: string) {
    this.steps.push(() => this.redis.sremSync(key, value));
    return this;
  }
  del(key: string) {
    this.steps.push(() => this.redis.delSync(key));
    return this;
  }
  hset(key: string, field: string, value: string) {
    this.steps.push(() => this.redis.hsetSync(key, field, value));
    return this;
  }
  hdel(key: string, field: string) {
    this.steps.push(() => this.redis.hdelSync(key, field));
    return this;
  }
  exec() {
    this.steps.forEach((fn) => fn());
    return Promise.resolve([]);
  }
}

class FakeRedis {
  private kv = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private hashes = new Map<string, Map<string, string>>();

  multi() {
    return new FakeMulti(this);
  }

  async set(key: string, value: string) {
    this.setSync(key, value);
    return 'OK';
  }
  setSync(key: string, value: string) {
    this.kv.set(key, value);
  }

  async get(key: string) {
    return this.kv.get(key) ?? null;
  }

  async del(key: string) {
    this.delSync(key);
    return 1;
  }
  delSync(key: string) {
    this.kv.delete(key);
    this.hashes.delete(key);
    this.sets.delete(key);
  }

  async sadd(key: string, value: string) {
    this.saddSync(key, value);
    return 1;
  }
  saddSync(key: string, value: string) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key)!.add(value);
  }

  async srem(key: string, value: string) {
    this.sremSync(key, value);
    return 1;
  }
  sremSync(key: string, value: string) {
    this.sets.get(key)?.delete(value);
  }

  async smembers(key: string) {
    return Array.from(this.sets.get(key) ?? new Set<string>());
  }

  async hset(key: string, field: string, value: string) {
    this.hsetSync(key, field, value);
    return 1;
  }
  hsetSync(key: string, field: string, value: string) {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key)!.set(field, value);
  }

  async hget(key: string, field: string) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hdel(key: string, field: string) {
    this.hdelSync(key, field);
    return 1;
  }
  hdelSync(key: string, field: string) {
    this.hashes.get(key)?.delete(field);
  }

  async hvals(key: string) {
    return Array.from(this.hashes.get(key)?.values() ?? []);
  }

  async hlen(key: string) {
    return this.hashes.get(key)?.size ?? 0;
  }
}

function roomParticipantsKey(roomId: string) {
  return `live:room:${roomId}:participants`;
}

describe('LivestreamService', () => {
  let redis: FakeRedis;
  let service: LivestreamService;

  beforeEach(() => {
    redis = new FakeRedis();
    service = new LivestreamService({ redis } as any);
  });

  it('creates and joins room as active', async () => {
    const room = await service.createRoom(10, 'Flash Sale');
    expect(room.status).toBe('active');

    const joined = await service.joinRoom(room.id, 'viewer', 22);
    expect(joined.room.status).toBe('active');
    expect(joined.websocket.payload.roomId).toBe(room.id);
  });

  it('does not end room when one seller socket disconnects but another seller socket exists', async () => {
    const room = await service.createRoom(1, 'Room A');
    await service.registerSocketParticipant(room.id, 'seller-socket-1', 1, 'seller');
    await service.registerSocketParticipant(room.id, 'seller-socket-2', 1, 'seller');
    await service.registerSocketParticipant(room.id, 'viewer-socket-1', 9, 'viewer');

    const result = await service.unregisterSocketParticipant('seller-socket-1');
    expect(result).not.toBeNull();
    expect(result!.endedByDisconnect).toBe(false);

    const liveRoom = await service.getRoom(room.id);
    expect(liveRoom.status).toBe('active');
    expect(liveRoom.viewerCount).toBe(1);
  });

  it('ends room when last seller socket disconnects', async () => {
    const room = await service.createRoom(2, 'Room B');
    await service.registerSocketParticipant(room.id, 'seller-only', 2, 'seller');
    await service.registerSocketParticipant(room.id, 'viewer-only', 7, 'viewer');

    const result = await service.unregisterSocketParticipant('seller-only');
    expect(result).not.toBeNull();
    expect(result!.endedByDisconnect).toBe(true);
    expect(result!.room.status).toBe('ended');

    const storedParticipants = await redis.hlen(roomParticipantsKey(room.id));
    expect(storedParticipants).toBe(0);
  });

  it('denies join when room is ended', async () => {
    const room = await service.createRoom(3, 'Room C');
    await service.stopRoom(room.id, 3);

    await expect(service.joinRoom(room.id, 'viewer', 99)).rejects.toThrow('Phòng livestream đã kết thúc.');
  });

  it('denies seller join when user is not owner', async () => {
    const room = await service.createRoom(4, 'Room D');
    await expect(service.joinRoom(room.id, 'seller', 100)).rejects.toThrow('Chỉ người bán của phòng mới có thể tham gia với vai trò seller.');
  });
});
