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

function parseCorsOrigins(value: string): boolean | string[] {
  if (value === '*') {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

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
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const port = Number(configService.get<string>('PORT', '3000'));
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000',
  );
  const publicDir = join(process.cwd(), 'public');

  // CORS must register before routes; explicit origins are safer than `origin: true` in production.
  await app.register(cors, {
    origin: parseCorsOrigins(corsOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    // JSON APIs do not serve HTML; disable CSP to avoid breaking future Socket.IO clients.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: isProduction ? { policy: 'same-site' } : false,
  });

  // CSRF is not enabled globally: this API is stateless (JWT bearer tokens).
  // When cookie-based sessions are added, register @fastify/cookie + @fastify/csrf-protection.

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
