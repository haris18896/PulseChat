import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  private getUserSocketKey(userId: string): string {
    return `presence:user:${userId}:sockets`;
  }

  async getSocket(userId: string, socketId: string): Promise<number> {
    const redis = this.redis.getClient();
    const key = this.getUserSocketKey(userId);

    // Adds socket ID into redis set. A set automatically removes duplicates.
    await redis.sadd(key, socketId);
    await redis.expire(key, 60 * 60 * 24); // 24 hours

    // Returns the number of sockets connected to the user.
    return redis.scard(key);
  }

  async removeSocket(userId: string, socketId: string): Promise<number> {
    const redis = this.redis.getClient();
    const key = this.getUserSocketKey(userId);

    await redis.srem(key, socketId);
    const remainingSockets = await redis.scard(key);

    if (remainingSockets === 0) {
      await redis.del(key);
    }

    return remainingSockets;
  }

  async isOnline(userId: string): Promise<boolean> {
    const redis = this.redis.getClient();
    const key = this.getUserSocketKey(userId);

    const count = await redis.scard(key);
    return count > 0;
  }

  async getOnlineStatus(
    userIds: string[],
  ): Promise<{ userId: string; isOnline: boolean }[]> {
    const results = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        isOnline: await this.isOnline(userId),
      })),
    );

    return results;
  }
}
