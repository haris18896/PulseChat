import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @SkipThrottle()
  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.ping();

    return {
      status: 'ok',
      service: 'pulsechat',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      database: 'connected',
      redis: 'connected',
    };
  }
}
