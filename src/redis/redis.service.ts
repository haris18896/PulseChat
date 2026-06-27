import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configSerivce: ConfigService) {
    this.redis = new Redis({
      host: this.configSerivce.get<string>('REDIS_HOST', 'localhost'),
      port: this.configSerivce.get<number>('REDIS_PORT', 6379),
    });
  }

  async onModuleInit() {
    await this.redis.ping();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  getClient(): Redis {
    return this.redis;
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }
}
