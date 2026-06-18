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
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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
  // NestJS application
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 1_048_576,
    }),
    { logger: ['error', 'warn', 'log'] },
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PulseChat API')
    .setDescription('Realtime Chat API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configuration
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const port = Number(configService.get<string>('PORT', '3000'));
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000',
  );

  // Public directory
  const publicDir = join(process.cwd(), 'public');

  if (existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/public/',
    });
  }

  // CORS configuration
  await app.register(cors, {
    origin: parseCorsOrigins(corsOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Helmet configuration
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: isProduction ? { policy: 'same-site' } : false,
  });

  // CSRF is not enabled globally: this API is stateless (JWT bearer tokens).
  // When cookie-based sessions are added, register @fastify/cookie + @fastify/csrf-protection.

  // Shutdown hooks
  app.enableShutdownHooks();

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Listen on port
  await app.listen(port, '0.0.0.0');
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
