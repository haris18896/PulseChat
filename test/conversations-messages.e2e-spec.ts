import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Conversations + Messages REST (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  let userBId: string;
  let conversationId: string;
  let messageId: string;

  const suffix = Date.now();

  const userA = {
    username: 'E2E User A',
    email: `e2e-user-a-${suffix}@yopmail.com`,
    password: 'Password123',
  };

  const userB = {
    username: 'E2E User B',
    email: `e2e-user-b-${suffix}@yopmail.com`,
    password: 'Password123',
  };

  const userC = {
    username: 'E2E User C',
    email: `e2e-user-c-${suffix}@yopmail.com`,
    password: 'Password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    const registerA = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userA)
      .expect(201);

    const registerB = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userB)
      .expect(201);

    const registerC = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userC)
      .expect(201);

    tokenA = registerA.body.access_token;
    tokenB = registerB.body.access_token;
    tokenC = registerC.body.access_token;

    userBId = registerB.body.user.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [userA.email, userB.email, userC.email],
          },
        },
      });

      await prisma.$disconnect();
    }

    if (app) {
      await app.close();
    }
  });

  it('should create a direct conversation', async () => {
    const response = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        participantIds: [userBId],
        title: 'E2E Direct Conversation',
        isGroup: false,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.isGroup).toBe(false);
    expect(response.body.participants).toHaveLength(2);

    conversationId = response.body.id;
  });

  it('should list conversations with unreadCount', async () => {
    const response = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    const conversation = response.body.find(
      (item: any) => item.id === conversationId,
    );

    expect(conversation).toBeDefined();
    expect(conversation).toHaveProperty('unreadCount');
  });

  it('should get conversation by id for participant', async () => {
    const response = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.id).toBe(conversationId);
  });

  it('should send a message', async () => {
    const response = await request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        conversationId,
        content: 'Hello from E2E test',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.content).toBe('Hello from E2E test');
    expect(response.body.status).toBe('SENT');

    messageId = response.body.id;
  });

  it('should show unreadCount for receiver', async () => {
    const response = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const conversation = response.body.find(
      (item: any) => item.id === conversationId,
    );

    expect(conversation).toBeDefined();
    expect(conversation.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('should get messages by conversation', async () => {
    const response = await request(app.getHttpServer())
      .get(`/messages/${conversationId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('pageInfo');

    const message = response.body.items.find(
      (item: any) => item.id === messageId,
    );
    expect(message).toBeDefined();
  });

  it('should edit own message', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: 'Edited E2E message',
      })
      .expect(200);

    expect(response.body.content).toBe('Edited E2E message');
    expect(response.body.editedAt).toBeTruthy();
  });

  it('should reject editing another user message', async () => {
    await request(app.getHttpServer())
      .patch(`/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        content: 'User B should not edit this',
      })
      .expect(403);
  });

  it('should reject non-participant conversation access', async () => {
    await request(app.getHttpServer())
      .get(`/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(404);
  });

  it('should reject non-participant messages access', async () => {
    await request(app.getHttpServer())
      .get(`/messages/${conversationId}`)
      .set('Authorization', `Bearer ${tokenC}`)
      .expect(404);
  });

  it('should delete own message', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/messages/${messageId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.content).toBe('This message was deleted');
    expect(response.body.deletedAt).toBeTruthy();
  });
});
