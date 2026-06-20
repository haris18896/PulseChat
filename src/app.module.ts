import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// -- Services
import { AppService } from './app.service';

// -- Controllers
import { AppController } from './app.controller';

// -- Third Party
import { Redis } from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

// -- Modules
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './messages/messages.module';
import { ConversationsModule } from './conversations/conversations.module';

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
    RedisModule,
    AuthModule,
    ConversationsModule,
    MessagesModule,
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
