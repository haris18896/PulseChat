import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get<string>('THROTTLE_TTL', '60000')), // 1 minute
          limit: Number(config.get<string>('THROTTLE_LIMIT', '10')), // 10 requests
          storage: new ThrottlerStorageRedisService(
            new Redis({
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: Number(config.get<string>('REDIS_PORT', '6379')),
            }),
          ),
        },
      ],
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
