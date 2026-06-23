import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'http';
import { Redis } from 'ioredis';
import { Logger } from 'nestjs-pino';

// -- Custom Adapter for Redis
export class RedisIoAdapter extends IoAdapter {
  // This stores the Redis adapter instance, we will attach it when the Socker.IO server is created
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: INestApplicationContext,
    private readonly logger: Logger,
  ) {
    super(app); // Pass Nest Js app into adapter, becuase we need access to convifService to get the Redis host and port
  }

  connectToRedis(): void {
    // Get the Redis host and port from the configuration
    const configService = this.app.get(ConfigService);

    const host = configService.get<string>('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);

    // Create the Redis clients
    // pubClient is used to publish messages to the Redis channel
    const pubClient = new Redis({
      host,
      port,
    });

    // subClient is used to subscribe to the Redis channel
    const subClient = pubClient.duplicate();

    pubClient.on('error', (error) => {
      this.logger.error(
        { err: error, context: 'RedisIoAdapter' },
        'Redis pub client error',
      );
    });

    subClient.on('error', (error) => {
      this.logger.error(
        { err: error, context: 'RedisIoAdapter' },
        'Redis sub client error',
      );
    });

    // await Promise.all([pubClient.connect(), subClient.connect()]); // no manual connection needed, because we are using the Redis client from the RedisModule

    // This creates the Redis adapter
    this.adapterConstructor = createAdapter(pubClient, subClient); // After this, when one node instance emits "new_message" Redis forwars that packet to other node instaces

    this.logger.log(
      {
        context: 'RedisIoAdapter',
        redisHost: host,
        redisPort: port,
      },
      'Socket.IO Redis adapter connected',
    );
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options); // This method runs when Nest creates the Socket.IO server.

    server.adapter(this.adapterConstructor); // This replaces the default in-memory adapter with Redis adapter.
    return server;
  }
}
