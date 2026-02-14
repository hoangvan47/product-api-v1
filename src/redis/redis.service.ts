import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = config.get<number>('REDIS_PORT', 6379);
    const db = config.get<number>('REDIS_DB', 2);
    const password = config.get<string>('REDIS_PASSWORD', '');

    this.client = new Redis({
      host,
      port,
      db,
      password: password || undefined,
      maxRetriesPerRequest: 2,
    });
  }

  get redis() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
