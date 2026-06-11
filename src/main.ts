import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 1_048_576,
    }),
    { logger: ['error', 'warn', 'log'] },
  );

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT', '3000'));
  const publicDir = join(process.cwd(), 'public');

  await app.register(helmet);
  await app.register(cors, { origin: true });

  if (existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/public/',
    });
  }

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
