# PulseChat — Production Realtime Chat Backend

> A nine-phase, hands-on guide to building a production-grade realtime chat backend with NestJS, PostgreSQL, Prisma, Redis, Socket.IO, Docker, and NGINX.

---

## What You Will Build

PulseChat is not a toy project. Every architectural decision mirrors what you would find in a real production system — from JWT authentication and Prisma migrations to horizontal scaling behind NGINX with Redis-synchronized WebSockets.

By the end of this guide you will have shipped:

- ✅ REST API with JWT auth, pagination, and global validation
- ✅ Socket.IO gateway with rooms, typing indicators, and presence
- ✅ Cross-instance event sync via the Redis adapter
- ✅ Multi-container Docker setup with NGINX load balancing
- ✅ Production hardening — structured logging, rate limiting, exception filters
- ✅ Full chat feature set — statuses, read receipts, edits, soft deletes, group management
- ✅ Unit, e2e, and socket integration tests

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 22+ | Matches the Docker base image |
| Yarn | Package manager used throughout |
| Docker Desktop | Runs Postgres, Redis, API containers, and NGINX |
| NestJS CLI | `npm i -g @nestjs/cli` |
| TypeScript basics | Classes, decorators, async/await |
| HTTP & REST basics | Methods, status codes, JSON bodies |

---

## Quick-Start Commands

```bash
# Install dependencies
yarn install

# Start infrastructure (Postgres + Redis)
docker compose --env-file .env up -d postgres redis

# Local development (single instance)
yarn start:dev

# Run unit and e2e tests
yarn test
yarn test:e2e

# Run local Prisma migrations against Docker Postgres
DATABASE_URL=postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public \
  npx prisma migrate dev

# Scale full stack (3 API instances behind NGINX)
docker compose --env-file .env up -d --build --scale pulsechat-api=3

# Socket integration tests (requires valid tokens in .env)
npx tsx socket-tests/socket-test-a.ts
npx tsx socket-tests/socket-test-b.ts
```

---

## Curriculum Overview

| Phase | Topic | Outcome |
|---|---|---|
| **0** | Project Setup | NestJS + Fastify + Docker + Prisma foundation |
| **1** | Authentication | Register, login, JWT guards |
| **2** | Data Model & REST | Conversations, messages, cursor pagination |
| **3** | Socket.IO Gateway | Realtime messaging, typing, presence |
| **4** | Redis Adapter | Cross-instance socket synchronization |
| **5** | Docker Multi-Instance | Containerized, scalable API |
| **6** | NGINX Load Balancing | Single entry point, WebSocket proxy |
| **7** | Production Hardening | Errors, logging, rate limits, security |
| **8** | Chat Product Features | Statuses, receipts, edits, group management |
| **9** | Testing | Unit, e2e, socket, and adapter tests |

---

## Phase 0 — Project Setup

> **Goal:** Establish a production-ready NestJS foundation with Fastify, Docker, PostgreSQL, Redis, Prisma, and developer tooling.

### What You Will Learn

- Scaffold a strict-mode NestJS application with Swagger and path aliases
- Configure Husky and lint-staged for consistent code quality on every commit
- Run PostgreSQL and Redis locally with Docker Compose
- Integrate Prisma as the database access layer inside NestJS
- Understand why Fastify is preferred over Express for this project

---

### 0.1 — Create the NestJS Application

NestJS starts here. The project is scaffolded in strict TypeScript mode and Swagger is added immediately so every endpoint can be explored interactively at `/api`.

```bash
sudo npm i -g @nestjs/cli
nest new pulsechat --strict
yarn add @types/mocha --dev
yarn add @nestjs/swagger
```

Add Swagger to `main.ts`:

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('PulseChat API')
  .setDescription('Realtime Chat API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

Add path aliases to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "*": ["./*"]
    },
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "test/**/*"]
}
```

---

### 0.2 — Git Hooks with Husky

Pre-commit hooks catch formatting and lint errors before they enter the repository.

```bash
yarn add -D husky lint-staged
yarn husky init
```

Add to `package.json`:

```json
"lint-staged": {
  "*.{ts,js,mjs}": ["eslint --fix", "prettier --write"]
}
```

Set `.husky/pre-commit`:

```bash
yarn lint-staged
```

**Usage:** Hooks run automatically on `git commit`. After cloning, run `yarn` — the `prepare` script installs hooks. Test manually with `yarn lint-staged`.

---

### 0.3 — Docker Compose for Postgres and Redis

Chat applications need a relational database for durable data and Redis for ephemeral state (presence, pub/sub). Docker gives every developer an identical environment.

- Create `docker-compose.yml` with PostgreSQL and Redis services
- Run `docker compose up -d` to start both containers

---

### 0.4 — Environment Configuration

`@nestjs/config` loads `.env` values into a typed configuration service. Never hard-code secrets or connection strings in source files.

```bash
npm install @nestjs/config
```

Update `src/app.module.ts` and `src/app.controller.ts` to use the config service.

---

### 0.5 — Switch from Express to Fastify

Fastify is faster than Express and aligns with NestJS's recommended adapter for high-throughput APIs. Use Fastify plugins (`@fastify/helmet`, `@fastify/cors`) instead of Express middleware.

```bash
yarn remove @nestjs/platform-express
yarn add @nestjs/platform-fastify @fastify/helmet @fastify/cors @fastify/static
```

Update `main.ts`:

```typescript
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false, trustProxy: true }),
  { logger: ['error', 'warn', 'log'] },
);

await app.register(helmet);
await app.register(cors, { origin: true });
await app.listen(port, '0.0.0.0'); // bind all interfaces — Docker-friendly
```

> **Notes:** Use `@fastify/*` plugins, not Express middleware. In controllers and guards, use `FastifyRequest` / `FastifyReply` instead of Express types.

---

### 0.6 — Database Setup with Prisma

Prisma is the ORM and migration tool. Schema changes are version-controlled SQL files; the generated client provides type-safe queries in services.

```bash
yarn add prisma --dev
yarn add @prisma/client

npx prisma init
# Add User model to prisma/schema.prisma, then:
npx prisma migrate dev --name init
npx prisma generate
npx prisma studio --port 5555
```

---

### 0.7 — Prisma Service in NestJS

A dedicated `PrismaService` extends the Prisma client and is injected into feature services. This is the only place that should open database connections.

```bash
nest g module prisma
nest g service prisma
```

---

### Key Takeaways — Phase 0

- A chat backend needs durable infrastructure (Postgres) and ephemeral infrastructure (Redis) from day one.
- Feature-based module layout scales better than organizing by file type.
- Binding to `0.0.0.0` and using environment variables prepares the app for container deployment.

---

## Phase 1 — Authentication and JWT Guards

> **Goal:** Implement secure user registration, login, and JWT-protected REST endpoints.

### What You Will Learn

- Hash passwords with bcrypt before storing them
- Issue and verify JWT access tokens with `@nestjs/jwt`
- Validate request bodies globally with `class-validator` and `ValidationPipe`
- Protect routes using a custom `JwtAuthGuard` and `@CurrentUser()` decorator

---

### 1.1 — Authentication Flows

**Registration**
```
POST /auth/register
  → Validate DTO
  → Hash password
  → Save User in Postgres
  → Return JWT
```

**Login**
```
POST /auth/login
  → Find user by email
  → Compare hashed password
  → Return JWT
```

**Protected Route**
```
Authorization: Bearer <token>
  → JwtAuthGuard verifies token
  → User data attached to request
  → @CurrentUser() exposes user in controller
```

---

### 1.2 — Install Dependencies

```bash
yarn add @nestjs/jwt bcrypt
yarn add -D @types/bcrypt
yarn add class-validator class-transformer
```

---

### 1.3 — Configure JWT

Add to `.env`:

```env
JWT_SECRET="super-secret-change-this-later"
JWT_EXPIRES_IN="7d"
```

---

### 1.4 — Enable Global Request Validation

DTOs are useless without enforcement. `ValidationPipe` rejects malformed input before it reaches services.

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // Strips extra fields not defined in the DTO
    forbidNonWhitelisted: true, // Throws an error instead of silently stripping
    transform: true,            // Converts plain JSON into DTO class instances
  }),
);
```

---

### 1.5 — Generate Modules

```bash
nest g module users && nest g service users
nest g module auth && nest g controller auth && nest g service auth
```

---

### 1.6 — DTOs

Create:
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`

---

### 1.7 — JWT Guard and `@CurrentUser()` Decorator

Guards run before controllers. The decorator extracts the authenticated user that the guard attached to the request.

Create:
- `src/auth/types/jwt-payload.type.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/decorators/current-user.decorator.ts`

**Flow:**
```
Client sends token
  → JwtAuthGuard verifies token
  → Guard extracts userId from payload
  → Guard fetches user from Postgres
  → Guard attaches user to request
  → @CurrentUser() reads that user in the controller
```

---

### Key Takeaways — Phase 1

- Authentication belongs in guards and services — not scattered across controllers.
- DTOs with `whitelist` and `forbidNonWhitelisted` prevent mass-assignment vulnerabilities.
- JWT statelessness enables horizontal scaling later without server-side sessions.

---

## Phase 2 — Conversation and Message Data Model

> **Goal:** Design and implement the conversation-centric data model and REST APIs for chats and messages.

### What You Will Learn

- Model many-to-many user–conversation relationships with a join table
- Understand why messages belong to conversations, not directly to receivers
- Build CRUD REST endpoints with authorization and membership checks
- Implement cursor-based pagination for chat history
- Separate durable state (Postgres) from ephemeral state (Redis)

---

### 2.1 — Conversations, Not Direct Messages

In systems like WhatsApp, messages are not sent directly to a user — they belong to a **conversation**.

```
Direct message model (limited):
  Message → senderId + receiverId
  ❌ Breaks group chats entirely

Conversation model (scalable):
  Conversation → Participants → Messages
  ✅ Scales to 2, 10, or 500 users with no schema changes
```

---

### 2.2 — Database Schema

Four tables underpin the entire system:

| Table | Purpose |
|---|---|
| `User` | Already exists from Phase 1 |
| `Conversation` | Represents a chat thread |
| `ConversationParticipant` | Join table linking users to conversations |
| `Message` | Every message ever sent |

**Why a join table?** Relational databases do not store arrays of foreign keys efficiently. Normalizing into `ConversationParticipant` allows future metadata like `lastReadAt`, `role`, and `mutedAt` without any schema change.

---

### 2.3 — Prisma Schema

```prisma
model Conversation {
  id                 String    @id @default(uuid())
  title              String?
  isGroup            Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  participants       ConversationParticipant[]
  messages           Message[]
}

model ConversationParticipant {
  id             String   @id @default(uuid())
  conversationId String
  userId         String
  joinedAt       DateTime @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  senderId       String
  content        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User         @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```

> **Key decisions:**
> - `@@unique([conversationId, userId])` prevents duplicate participants
> - `onDelete: Cascade` keeps data consistent when conversations or users are removed
> - No `receiverId` on messages — the conversation already defines who the participants are

```bash
npx prisma migrate dev --name add_conversations_and_messages
npx prisma generate
npx prisma studio
```

---

### 2.4 — Online Status Belongs in Redis

Storing `online = true` in Postgres is an anti-pattern:

```
❌ Postgres: user.online = true
   — Server crash leaves every user permanently "online"

✅ Redis: presence:user:{userId}:sockets → Set of socket IDs
   — TTL and disconnection events keep state accurate
```

Postgres stores **permanent** data. Redis stores **temporary** data.

---

### 2.5 — Recommended Folder Structure

Organize by feature, not by file type:

```
src/
├── auth/
├── users/
├── prisma/
├── redis/
├── conversations/
│   ├── dto/
│   ├── conversations.controller.ts
│   ├── conversations.service.ts
│   └── conversations.module.ts
└── messages/
    ├── dto/
    ├── messages.controller.ts
    ├── messages.service.ts
    └── messages.module.ts
```

---

### 2.6 — REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/conversations` | Create a conversation |
| `GET` | `/conversations` | List my conversations |
| `GET` | `/conversations/:id` | Get conversation details |
| `POST` | `/messages` | Send a message |
| `GET` | `/messages/:conversationId` | Get paginated messages |

**Duplicate prevention:** When creating a conversation, use `[...new Set([currentUserId, ...dto.participantIds])]` to deduplicate participant IDs before inserting.

---

### 2.7 — Cursor-Based Pagination

Returning all messages is fine for small datasets. At scale, one conversation may have 50,000+ messages. Cursor-based pagination loads history in efficient chunks.

**Usage:**
```
GET /messages/:conversationId?limit=20
GET /messages/:conversationId?limit=20&cursor=<messageId>
```

```typescript
const messages = await this.prisma.message.findMany({
  where: { conversationId },
  orderBy: { createdAt: 'desc' },
  take: limit + 1,
  ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  include: { sender: { select: { id: true, username: true, email: true } } },
});

const hasNextPage = messages.length > limit;
const items = hasNextPage ? messages.slice(0, limit) : messages;

return {
  items: items.reverse(),
  pageInfo: {
    nextCursor: hasNextPage ? items[items.length - 1].id : null,
    hasNextPage,
  },
};
```

---

### Key Takeaways — Phase 2

- Socket.IO is a transport layer — schema and business logic must be correct first.
- `ConversationParticipant` enables group chats and future metadata fields.
- Cursor pagination avoids loading entire message histories into memory.

---

## Phase 3 — Socket.IO Gateway

> **Goal:** Add realtime messaging, typing indicators, and presence on top of the REST foundation.

### What You Will Learn

- Create a Socket.IO gateway with connection lifecycle handlers
- Authenticate WebSocket connections using JWT in the handshake
- Join conversation rooms and broadcast events only to participants
- Persist messages through the existing service layer — never duplicate logic in the gateway
- Track online/offline presence in Redis

---

### 3.1 — Install Dependencies

```bash
yarn add @nestjs/websockets @nestjs/platform-socket.io socket.io
yarn add -D socket.io-client tsx
nest g module chat
nest g gateway chat
```

---

### 3.2 — JWT Authentication for WebSockets

HTTP guards do not apply to WebSockets. Validate the JWT during the Socket.IO handshake and attach the user to the socket.

```
Socket connects with token in handshake auth
  → Gateway verifies JWT
  → User is attached to socket.data
  → Unauthenticated connections are rejected immediately
```

---

### 3.3 — Conversation Rooms

Every conversation has a room named `conversation-{conversationId}`. Clients join rooms after joining a conversation; broadcast events are scoped to those rooms.

```typescript
// Client
socket.emit('join_conversation', { conversationId });

// Gateway
this.server.to(`conversation-${conversationId}`).emit('new_message', message);
```

---

### 3.4 — Socket Events Reference

| Event (Client → Server) | Description |
|---|---|
| `join_conversation` | Join a conversation room |
| `send_message` | Send a message |
| `typing_start` | Notify others you are typing |
| `typing_stop` | Notify others you stopped typing |

| Event (Server → Client) | Description |
|---|---|
| `authenticated` | Emitted after successful handshake |
| `conversation_joined` | Confirms room entry |
| `new_message` | A new message in a conversation |
| `message_sent` | Confirms your own message was saved |
| `user_typing_start` | Another user started typing |
| `user_typing_stop` | Another user stopped typing |
| `user_online` | A contact came online |
| `user_offline` | A contact went offline |

---

### 3.5 — Presence System with Redis

A single user may have multiple active connections:

```
User
├── Browser tab 1  (socket-1)
├── Browser tab 2  (socket-2)
└── Mobile app     (socket-3)
```

The user should only appear offline when **all** of their sockets disconnect.

**Redis key design:**

```
presence:user:{userId}:sockets  →  Set of active socket IDs
```

**Logic:**

```
On connect  → add socketId to set → if set size becomes 1, broadcast user_online
On disconnect → remove socketId from set → if set is now empty, broadcast user_offline
```

**Scoped broadcasts:** Don't emit `user_online` to every connected client — only to users who share a conversation with the user going online/offline.

```typescript
async emitPresenceToUserConversations(
  userId: string,
  event: 'user_online' | 'user_offline',
  payload: unknown,
) {
  const conversationIds =
    await this.conversationsService.getConversationIdsForUser(userId);

  conversationIds.forEach((id) => {
    this.server.to(`conversation-${id}`).emit(event, payload);
  });
}
```

---

### Key Takeaways — Phase 3

- Gateways should orchestrate; services should own business rules.
- Room-based broadcasting scopes events to authorized participants only.
- Presence is ephemeral — never store `online = true` in PostgreSQL.

---

## Phase 4 — Redis Adapter for Socket.IO

> **Goal:** Synchronize Socket.IO events across multiple Node.js processes using Redis Pub/Sub.

### What You Will Learn

- Understand why a single Node.js process cannot see sockets on another instance
- Configure the official `@socket.io/redis-adapter` in NestJS
- Prove cross-instance delivery with clients on different ports

---

### 4.1 — The Problem

Without the Redis adapter:

```
Instance A (port 3000) — knows only its own sockets
Instance B (port 3001) — knows only its own sockets

Client A (on Instance A) sends a message
→ server.to(room).emit('new_message', ...)
→ Client B (on Instance B) never receives it ❌
```

With the Redis adapter:

```
Instance A emits to room
→ Redis Pub/Sub forwards the event
→ Instance B receives it and delivers to Client B ✅
```

---

### 4.2 — Setup

```bash
yarn add @socket.io/redis-adapter ioredis
```

Create `src/chat/adapters/redis-io.adapter.ts`, then register in `main.ts`:

```typescript
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

---

### 4.3 — Verify Cross-Instance Delivery

```bash
# Terminal 1
PORT=3000 yarn start:dev

# Terminal 2
PORT=3001 npx nest start --watch

# Terminal 3 — Client A connects to 3000, Client B connects to 3001
# Both join the same conversation room
# Client A sends a message → Client B should receive new_message
```

> **Note:** The Redis adapter forwards packets — it does not store socket state as Redis keys. Sticky sessions are still recommended (added in Phase 6 via `ip_hash`).

---

### Key Takeaways — Phase 4

- The Redis adapter is what makes multi-instance rooms work — not sticky sessions alone.
- Presence is already cross-instance safe because the socket count lives in Redis.

---

## Phase 5 — Multi-Instance Docker Setup

> **Goal:** Containerize the API and run multiple identical backend instances against shared Postgres and Redis.

### What You Will Learn

- Write a multi-stage Dockerfile for NestJS + Prisma
- Connect API containers to shared Postgres and Redis services
- Scale replicas with `docker compose up --scale`
- Run `prisma migrate deploy` on container startup

---

### 5.1 — Implementation Steps

1. Create `.dockerignore`
2. Create a multi-stage `Dockerfile`
3. Update `docker-compose.yml` with the API service
4. Build and run the API inside Docker
5. Test REST APIs from the container
6. Test Socket.IO against the containerized backend
7. Scale to multiple containers

```bash
# Build and start (attached)
docker compose up --build

# Build and start (detached)
docker compose up --build -d

# Tail logs
docker logs -f pulsechat_api

# Health check
curl http://localhost:3000/health

# Full rebuild from scratch
docker compose down
docker builder prune -f
docker compose build --no-cache && docker compose up -d
```

---

### Key Takeaways — Phase 5

- Containers must be stateless — all durable data lives in Postgres.
- Remove fixed `container_name` values to enable `--scale`.
- Use `expose` internally; only publish ports through the reverse proxy.

---

## Phase 6 — NGINX Load Balancing

> **Goal:** Place multiple API containers behind NGINX with WebSocket-aware load balancing.

### What You Will Learn

- Configure an upstream block and `proxy_pass` for horizontal scaling
- Forward `Upgrade` and `Connection` headers for Socket.IO
- Use `ip_hash` for sticky sessions
- Understand `ports` vs `expose` in Docker networking

---

### 6.1 — Target Architecture

```
Browser → localhost:8080 → NGINX → pulsechat-api-1
                                  → pulsechat-api-2
                                  → pulsechat-api-3
                                        ↓           ↓
                                   PostgreSQL     Redis
```

All three instances share the same Postgres and Redis.

---

### 6.2 — Why NGINX?

One Node.js process uses exactly one CPU core. Running three instances means:

```
pulsechat-api-1 → CPU core 1
pulsechat-api-2 → CPU core 2
pulsechat-api-3 → CPU core 3
```

NGINX acts as the receptionist — clients connect to one address and NGINX routes traffic.

---

### 6.3 — NGINX Config Concepts

**Upstream block** — a named group of backend servers:

```nginx
upstream pulsechat_api_upstream {
  ip_hash;                      # Sticky sessions
  server pulsechat-api:3000;    # Docker DNS resolves to all scaled containers
}
```

**WebSocket upgrade headers** — without these, Socket.IO connections fail:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

**`ip_hash`** — routes each client IP to the same backend instance consistently. Critical for WebSocket handshakes.

---

### 6.4 — `ports` vs `expose`

| | `ports` | `expose` |
|---|---|---|
| Accessible from | Host machine + Docker network | Docker network only |
| Use when | Debugging locally | Behind a reverse proxy |
| Supports `--scale` | ❌ Port conflicts | ✅ No conflict |

Only NGINX publishes a host port (`8080`). API containers use `expose`.

---

### 6.5 — Scale and Test

```bash
docker compose --env-file .env down
docker compose --env-file .env up -d --build --scale pulsechat-api=3
```

---

### Key Takeaways — Phase 6

- NGINX is the single public entry point; API containers stay on the internal Docker network.
- Long `proxy_read_timeout` values are required for persistent WebSocket connections.
- `ip_hash` + the Redis adapter together make multi-instance WebSockets reliable.

---

## Phase 7 — Production Hardening

> **Goal:** Harden the backend with structured errors, logging, validation, and rate limiting.

### What You Will Learn

- Return consistent socket and REST error shapes
- Validate Socket.IO payloads explicitly — there is no global pipe for WebSockets
- Replace file logging with stdout-friendly structured logs (Pino)
- Identify instances in logs with `INSTANCE_ID`
- Apply tiered rate limits to auth, messaging, and general endpoints

---

### 7.1 — Consistent Socket Error Responses

All socket errors should follow a uniform shape:

```json
{
  "message": "You are not a participant of this conversation",
  "code": "FORBIDDEN"
}
```

Create `src/chat/utils/socket-error.util.ts` and replace raw NestJS exceptions in the gateway.

Socket payloads are not validated automatically. Create `src/chat/utils/validate-socket-payload.util.ts` and call it explicitly for each incoming event.

---

### 7.2 — Structured Logging with Pino

**Why not log files in Docker?** Containers are ephemeral. Files disappear on restart. Log to stdout instead and let your infrastructure (CloudWatch, ELK, Grafana) collect them.

**Why `INSTANCE_ID`?** With three containers running, you need to know which one handled a request.

```bash
yarn add nestjs-pino pino-http pino
yarn add -D pino-pretty
```

Pino includes `instanceId` in every log line — automatically sourced from `process.env.HOSTNAME` inside Docker.

```bash
# Tail logs per instance
docker logs -f pulsechat-pulsechat-api-1
docker logs --tail=30 pulsechat-pulsechat-api-2
```

---

### 7.3 — Global REST Exception Filter

All REST errors return a predictable shape:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Conversation not found",
  "path": "/conversations/abc",
  "timestamp": "2026-06-23T10:00:00.000Z"
}
```

Create `src/common/filters/http-exception.filter.ts` and register it in `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter(logger));
```

---

### 7.4 — Tiered Rate Limiting

| Endpoint | Limit |
|---|---|
| `GET /health` | No limit |
| `POST /auth/login` | 5 requests / min |
| `POST /auth/register` | 5 requests / min |
| `POST /messages` | 30 requests / min |
| General APIs | 100 requests / min |

```typescript
// Auth endpoints (strict)
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')

// Health check (exempt)
@SkipThrottle()
@Get('health')
```

---

### 7.5 — Message Security Rules

Beyond membership checks, enforce these edge cases:

- Validate that the conversation exists before returning data
- Reject empty or whitespace-only message content
- Return `404 Conversation not found` when the user is not a participant

> **Why 404 and not 403?** A 403 reveals that the conversation exists. A 404 prevents resource enumeration by unauthorized users.

---

### Key Takeaways — Phase 7

- In Docker, always log to stdout — containers are ephemeral.
- Return 404 (not 403) for unauthorized conversation access to avoid leaking existence.
- Auth endpoints deserve the strictest throttle limits.

---

## Phase 8 — Chat Product Features

> **Goal:** Implement product-grade chat features: statuses, read receipts, previews, edits, deletes, and group management.

### What You Will Learn

- Model the message lifecycle: `SENT → DELIVERED → READ`
- Denormalize `lastMessagePreview` for fast conversation lists
- Compute unread counts from `ConversationParticipant.lastReadAt`
- Use soft delete and edit timestamps for auditability
- Expose group management via REST, then broadcast over Socket.IO

---

### 8.1 — Message Status Lifecycle

Every message progresses through states:

```
SENT       — message saved, waiting for delivery
DELIVERED  — receiver's client acknowledged receipt
READ       — receiver opened the conversation
```

```prisma
enum MessageStatus {
  SENT
  DELIVERED
  READ
}

model Message {
  // ... existing fields
  status    MessageStatus @default(SENT)
  editedAt  DateTime?     // null = never edited
  deletedAt DateTime?     // null = active (soft delete)
}
```

---

### 8.2 — Delivered Status

When a receiver's client receives a message, it emits `message_delivered`. The server:

1. Verifies the user is a participant (not the sender)
2. Updates the message status to `DELIVERED`
3. Broadcasts `message_delivered` to the conversation room

---

### 8.3 — Read Receipts

When a user opens a conversation, the client emits `mark_messages_read`. The server:

1. Marks all messages in that conversation as `READ` (excluding the user's own messages)
2. Updates `ConversationParticipant.lastReadAt` to the current timestamp
3. Broadcasts `messages_read` to the room

---

### 8.4 — Last Message Preview (Denormalization)

Fetching the latest message via a join on every conversation list request is expensive. Store a preview directly on `Conversation`:

```prisma
model Conversation {
  // ... existing fields
  lastMessageId      String?
  lastMessagePreview String?
  lastMessageAt      DateTime?
}
```

Update these fields on every `send_message` event.

---

### 8.5 — Unread Counts

```
unread count = messages after participant.lastReadAt WHERE senderId != currentUserId
```

This query is fast and requires no extra tables — `lastReadAt` is already stored on `ConversationParticipant`.

---

### 8.6 — Edit Message

**Rules:**
- Only the sender may edit their own message
- Deleted messages cannot be edited
- Empty content is rejected

```
PATCH /messages/:messageId
→ verifies sender ownership
→ updates content and editedAt
→ broadcasts message_edited to conversation room
```

---

### 8.7 — Delete Message (Soft Delete)

Hard deletes break audit trails. Use soft delete instead:

```
DELETE /messages/:messageId
→ sets deletedAt = now()
→ sets content = "This message was deleted"
→ broadcasts message_deleted to room
```

The row is preserved; only the content and timestamp change.

---

### 8.8 — Group Management

| Method | Endpoint | Action |
|---|---|---|
| `PATCH` | `/conversations/:id/title` | Rename group |
| `POST` | `/conversations/:id/participants` | Add participant |
| `DELETE` | `/conversations/:id/participants/:userId` | Remove participant |
| `POST` | `/conversations/:id/leave` | Leave conversation |

**Enforcement rules:**
- Only participants can manage the group
- Only group conversations support these operations
- Duplicate participants are rejected
- The last participant cannot be removed or leave

---

### 8.9 — Run Phase 8 Migrations

```bash
npx prisma migrate dev --name phase_8_chat_product_features
npx prisma generate

# Rebuild Docker
docker compose --env-file .env up -d --build --scale pulsechat-api=3

# Confirm migration
docker logs --tail=80 pulsechat-pulsechat-api-1
```

---

### Key Takeaways — Phase 8

- Each product feature gets its own migration — never batch unrelated schema changes.
- REST services own business rules; gateways only broadcast results.
- Soft delete preserves history while hiding content from the UI.

---

## Phase 9 — Testing

> **Goal:** Plan and execute a testing strategy covering services, REST, sockets, and multi-instance behavior.

### What You Will Learn

- Write unit tests for service-layer business logic
- Add e2e tests for REST flows with authentication
- Build socket integration tests with `socket.io-client`
- Verify Redis adapter behavior across instances
- Inspect the database with Prisma Studio against Docker Postgres

---

### 9.1 — Test Coverage Plan

| Test Type | What It Covers |
|---|---|
| Unit tests | Service-layer business logic |
| e2e tests | Full REST flows with JWT auth |
| Socket integration tests | Events, rooms, presence |
| Multi-instance tests | Redis adapter cross-delivery |

---

### 9.2 — File Structure

Unit tests live next to the feature they test. E2e and socket tests live in the top-level `test/` folder.

```
src/
  messages/
    messages.service.spec.ts          # unit test
    messages.controller.spec.ts       # controller unit test (if needed)
  conversations/
    conversations.service.spec.ts     # unit test
  auth/
    auth.service.spec.ts              # unit test

test/
  app.e2e-spec.ts
  auth.e2e-spec.ts
  conversations-messages.e2e-spec.ts
  chat.socket.e2e-spec.ts
  multi-instance.socket.e2e-spec.ts
  jest-e2e.json

socket-tests/                         # manual development scripts
  socket-test-a.ts
  socket-test-b.ts
```

> **Note:** Update `jest-e2e.json` to understand your path aliases, otherwise e2e tests will fail to resolve imports like `src/auth/...`.

---

### 9.3 — Implementation Order

Work through tests in this sequence — each layer builds on the previous:

```
9.1  MessagesService unit tests
9.2  ConversationsService unit tests
9.3  Auth REST e2e tests
9.4  Conversations + Messages REST e2e tests
9.5  Socket integration tests
9.6  Multi-instance Redis adapter test
```

---

### 9.4 — Quick-Run Commands

```bash
# Unit tests
yarn test

# Single unit test file
yarn test src/messages/messages.service.spec.ts

# e2e tests
yarn test:e2e

# Single e2e file (if the script supports file paths)
yarn test:e2e test/auth.e2e-spec.ts

# Alternative — use Jest directly with the e2e config
npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts

# Prisma Studio against Docker Postgres
npx prisma db pull \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public"

npx prisma studio \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public" \
  --port 5555
```

---

### 9.5 — Test Database

E2e tests must not run against your development database. Tests write and delete real rows — they will pollute your dev data.

Create a separate `.env.test` file:

```env
NODE_ENV=test
PORT=3001

DATABASE_URL=postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public

JWT_SECRET=test-secret
JWT_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379

CORS_ORIGINS=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=1000
LOG_LEVEL=silent
```

> `LOG_LEVEL=silent` keeps test output clean. `THROTTLE_LIMIT=1000` prevents rate limiting from interfering with rapid test requests.

---

### 9.6 — Conversations and Messages REST e2e Tests

**File:** `test/conversations-messages.e2e-spec.ts`

This test file exercises the **full chat REST flow** end to end. It boots the real NestJS app, hits real HTTP routes, writes to the test database, and asserts both happy paths and security rules — who can read, edit, or delete what.

#### What problem does this test solve?

Unit tests mock the database. These e2e tests do not. They answer questions like:

- Can a logged-in user create a direct conversation with another user?
- Does `unreadCount` update when someone sends a message?
- Can User B fetch messages in a conversation they belong to?
- Can User C (not a participant) read that conversation? They should not.
- Can only the message author edit or delete their own message?

If any guard, service rule, or controller wiring breaks, this file should catch it.

#### The story the tests tell

Jest runs `it(...)` blocks top to bottom. Later tests depend on IDs saved by earlier ones:

```
1.  Register User A, User B, User C  →  save JWT tokens
2.  User A creates a direct chat with User B  →  save conversationId
3.  User A lists conversations  →  expects unreadCount field
4.  User A fetches the conversation by id
5.  User A sends a message  →  save messageId
6.  User B lists conversations  →  unreadCount >= 1
7.  User B fetches paginated messages
8.  User A edits their own message
9.  User B tries to edit User A's message  →  403 Forbidden
10. User C tries to read the conversation  →  404 Not Found
11. User C tries to read messages  →  404 Not Found
12. User A soft-deletes their message
```

Think of it as a mini user journey through the API, with security checks woven through it.

#### Step 1 — Load the test environment

E2e tests must not use your dev database. Load `.env.test` at the top of the file:

```typescript
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });
```

`quiet: true` suppresses warnings when the file is already loaded.

#### Step 2 — Bootstrap the real application

`beforeAll` creates the same app shape as production — full `AppModule`, Fastify adapter, and global `ValidationPipe`:

```typescript
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
  // ... register users (see below)
});
```

`supertest` sends HTTP requests to `app.getHttpServer()`. You are testing routes, guards, pipes, and services together — exactly how a real client calls the API.

#### Step 3 — Shared state between tests

These variables are declared at the top of the `describe` block and filled in as tests run:

```typescript
let tokenA: string;       // JWT for User A (creator + sender)
let tokenB: string;       // JWT for User B (receiver / participant)
let tokenC: string;       // JWT for User C (outsider — security tests only)

let userBId: string;      // Needed when creating a conversation with User B
let conversationId: string;
let messageId: string;
```

User A's identity is carried by `tokenA` on every request — no need to store their id separately.

#### Step 4 — Create three users with unique emails

Use `Date.now()` in the email so parallel runs do not collide:

```typescript
const suffix = Date.now();

const userA = {
  username: 'E2E User A',
  email: `e2e-user-a-${suffix}@yopmail.com`,
  password: 'Password123',
};
// userB and userC follow the same pattern
```

Register all three in `beforeAll`:

```typescript
const registerA = await request(app.getHttpServer())
  .post('/auth/register')
  .send(userA)
  .expect(201);

tokenA = registerA.body.access_token;
tokenB = registerB.body.access_token;
tokenC = registerC.body.access_token;
userBId = registerB.body.user.id;
```

Pattern to remember: `.set('Authorization', \`Bearer ${tokenA}\`)` simulates a logged-in client on every subsequent request.

#### Step 5 — Clean up after all tests

`afterAll` deletes test users and closes the app. Without cleanup, every test run leaves rows in Postgres:

```typescript
afterAll(async () => {
  if (prisma) {
    await prisma.user.deleteMany({
      where: {
        email: { in: [userA.email, userB.email, userC.email] },
      },
    });
    await prisma.$disconnect();
  }
  if (app) {
    await app.close();
  }
});
```

#### Test walkthrough — conversations

**Create a direct conversation** — User A invites User B by id:

```typescript
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

  expect(response.body.isGroup).toBe(false);
  expect(response.body.participants).toHaveLength(2);

  conversationId = response.body.id;
});
```

**List conversations with `unreadCount`** — proves the list endpoint returns the badge field clients need:

```typescript
it('should list conversations with unreadCount', async () => {
  const response = await request(app.getHttpServer())
    .get('/conversations')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  const conversation = response.body.find(
    (item: any) => item.id === conversationId,
  );

  expect(conversation).toBeDefined();
  expect(conversation).toHaveProperty('unreadCount');
});
```

**Get conversation by id** — only participants should succeed (tested again below with User C):

```typescript
it('should get conversation by id for participant', async () => {
  const response = await request(app.getHttpServer())
    .get(`/conversations/${conversationId}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  expect(response.body.id).toBe(conversationId);
});
```

#### Test walkthrough — messages

**Send a message** — User A posts into the conversation:

```typescript
it('should send a message', async () => {
  const response = await request(app.getHttpServer())
    .post('/messages')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({
      conversationId,
      content: 'Hello from E2E test',
    })
    .expect(201);

  expect(response.body.status).toBe('SENT');
  messageId = response.body.id;
});
```

**Unread count for the receiver** — User B should see at least one unread message:

```typescript
it('should show unreadCount for receiver', async () => {
  const response = await request(app.getHttpServer())
    .get('/conversations')
    .set('Authorization', `Bearer ${tokenB}`)
    .expect(200);

  const conversation = response.body.find(
    (item: any) => item.id === conversationId,
  );

  expect(conversation.unreadCount).toBeGreaterThanOrEqual(1);
});
```

**Paginated message history** — User B reads the thread:

```typescript
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
```

#### Test walkthrough — edit, authorization, delete

**Edit own message** — author patches content; server sets `editedAt`:

```typescript
it('should edit own message', async () => {
  const response = await request(app.getHttpServer())
    .patch(`/messages/${messageId}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content: 'Edited E2E message' })
    .expect(200);

  expect(response.body.content).toBe('Edited E2E message');
  expect(response.body.editedAt).toBeTruthy();
});
```

**Reject editing someone else's message** — User B gets `403`:

```typescript
it('should reject editing another user message', async () => {
  await request(app.getHttpServer())
    .patch(`/messages/${messageId}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ content: 'User B should not edit this' })
    .expect(403);
});
```

**Reject non-participant access** — User C was never added to the conversation. Both endpoints return `404` (not `403`) so outsiders cannot confirm whether a resource exists:

```typescript
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
```

**Soft delete** — author deletes; content is replaced and `deletedAt` is set:

```typescript
it('should delete own message', async () => {
  const response = await request(app.getHttpServer())
    .delete(`/messages/${messageId}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  expect(response.body.content).toBe('This message was deleted');
  expect(response.body.deletedAt).toBeTruthy();
});
```

#### API coverage summary

| Method | Route | What we assert |
|---|---|---|
| `POST` | `/conversations` | Direct chat created, 2 participants |
| `GET` | `/conversations` | List includes `unreadCount` |
| `GET` | `/conversations/:id` | Participant can read; outsider gets 404 |
| `POST` | `/messages` | Message sent with `SENT` status |
| `GET` | `/messages/:conversationId` | Paginated `items` + `pageInfo` |
| `PATCH` | `/messages/:messageId` | Author can edit; non-author gets 403 |
| `DELETE` | `/messages/:messageId` | Soft delete sets content + `deletedAt` |

#### How to run

```bash
yarn test:e2e test/conversations-messages.e2e-spec.ts

# Alternative
npx jest --config ./test/jest-e2e.json test/conversations-messages.e2e-spec.ts
```

**Prerequisites:** Docker Postgres and Redis running, `.env.test` configured, and migrations applied to the test database.

---

### 9.7 — Socket Integration Tests

**File:** `test/chat.socket.e2e-spec.ts`

Unlike the REST e2e tests above, this file **does not boot NestJS inside Jest**. It connects to a **running server** (Docker + NGINX on port `8080`) using `socket.io-client` and verifies that realtime events flow correctly between two users.

#### REST e2e vs socket e2e — what's different?

| | REST e2e | Socket e2e |
|---|---|---|
| App startup | Jest starts NestJS in-process | Server must already be running |
| Transport | HTTP (`supertest`) | WebSocket (`socket.io-client`) |
| Auth | `Authorization: Bearer <token>` header | `auth: { token }` in socket handshake |
| Assertions | Status codes + JSON body | Async events (`new_message`, `user_typing_start`, etc.) |
| Test data | Created inside the test file | Pre-seeded tokens + conversation id in `.env.test` |

#### What problem does this test solve?

REST tests prove your HTTP layer works. Socket tests prove your **gateway**, **rooms**, and **cross-client broadcasting** work. This file answers:

- Do both clients authenticate over the socket handshake?
- When User A joins a conversation room, does the server confirm with `conversation_joined`?
- Does `typing_start` / `typing_stop` reach the other participant?
- When User A sends a message, does User B receive `new_message` and User A get a send ack?
- Do delivery and read receipts propagate correctly?
- Can messages be edited and deleted through socket events?

If Redis, the gateway, or room membership breaks, these tests fail even when REST still passes.

#### The story the tests tell

```
1.  Read tokens + conversationId from .env.test
2.  Connect clientA and clientB  →  wait for authenticated
3.  Both emit join_conversation  →  expect conversation_joined
4.  User A types  →  User B receives user_typing_start / user_typing_stop
5.  User A sends message  →  User B gets new_message; User A gets message_sent ack
6.  User B marks delivered  →  both sides get delivery events
7.  User B marks read  →  both sides get read events
8.  User A edits message  →  User B gets message_edited; User A gets ack
9.  User A deletes message  →  User B gets message_deleted; User A gets ack
```

Each `it(...)` block builds on sockets and `messageId` from earlier steps — same pattern as the REST e2e tests.

#### Step 1 — Load test config and required env vars

```typescript
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });

import { io, Socket } from 'socket.io-client';

const socketUrl = process.env.SOCKET_TEST_URL || 'http://localhost:8080/chat';

const tokenA = process.env.SOCKET_TEST_USER_A_TOKEN;
const tokenB = process.env.SOCKET_TEST_USER_B_TOKEN;
const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;
```

Add these to `.env.test` using real values from your running environment:

```env
SOCKET_TEST_URL=http://localhost:8080/chat
SOCKET_TEST_USER_A_TOKEN=<jwt-for-user-a>
SOCKET_TEST_USER_B_TOKEN=<jwt-for-user-b>
SOCKET_TEST_CONVERSATION_ID=<uuid-of-a-conversation-both-users-belong-to>
```

**How to get these values:**

1. Start Docker: `docker compose --env-file .env up -d --build`
2. Register or log in two users via `POST /auth/register` or `/auth/login`
3. Copy each `access_token` into the corresponding env var
4. Create a conversation between them (`POST /conversations`) and copy the `id`

Both users must already be **participants** in that conversation, or `join_conversation` will fail.

#### Step 2 — The `waitForEvent` helper

Sockets are event-driven — there is no `.expect(200)`. Set up a listener and resolve when the event fires, or reject on timeout:

```typescript
const waitForEvent = <T = any>(
  socket: Socket,
  event: string,
  timeout = 8000,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };

    socket.once(event, handler);
  });
};
```

> **Critical pattern:** Always set up the listener **before** emitting. If you emit first, you can miss the response event before the listener is registered.

#### Step 3 — The `connectClient` helper

```typescript
const connectClient = async (token: string): Promise<Socket> => {
  const socket = io(socketUrl, {
    transports: ['websocket'],
    auth: { token },
    forceNew: true,
  });

  await waitForEvent(socket, 'authenticated');

  return socket;
};
```

- `transports: ['websocket']` — skips long-polling; matches production WebSocket behaviour
- `auth: { token }` — JWT is validated during the handshake, not as an HTTP header
- `forceNew: true` — each test client gets a fresh connection
- `authenticated` — your gateway emits this once the token is verified

#### Step 4 — Fail fast on missing env vars

```typescript
beforeAll(() => {
  if (!tokenA || !tokenB || !conversationId) {
    throw new Error(
      'Missing SOCKET_TEST_USER_A_TOKEN, SOCKET_TEST_USER_B_TOKEN, or ' +
      'SOCKET_TEST_CONVERSATION_ID in .env.test',
    );
  }
});
```

This gives a clear error message instead of a confusing timeout later.

#### Step 5 — Disconnect when done

```typescript
afterAll(() => {
  clientA?.disconnect();
  clientB?.disconnect();
});
```

#### Test walkthrough — connect and join rooms

**Authenticate both clients:**

```typescript
it('should authenticate both socket clients', async () => {
  clientA = await connectClient(tokenA!);
  clientB = await connectClient(tokenB!);

  expect(clientA.connected).toBe(true);
  expect(clientB.connected).toBe(true);
});
```

**Join the same conversation room** — register listeners before emitting:

```typescript
it('should join both clients to conversation room', async () => {
  const joinedA = waitForEvent(clientA, 'conversation_joined');
  const joinedB = waitForEvent(clientB, 'conversation_joined');

  clientA.emit('join_conversation', { conversationId });
  clientB.emit('join_conversation', { conversationId });

  const resultA = await joinedA;
  const resultB = await joinedB;

  expect(resultA).toMatchObject({ conversationId, joined: true });
  expect(resultB).toMatchObject({ conversationId, joined: true });
});
```

#### Test walkthrough — typing indicators

User A types; User B receives start and stop events:

```typescript
it('should broadcast typing events', async () => {
  const typingStart = waitForEvent<any>(clientB, 'user_typing_start');
  const typingStop = waitForEvent<any>(clientB, 'user_typing_stop');

  clientA.emit('typing_start', { conversationId });
  clientA.emit('typing_stop', { conversationId });

  const startEvent = await typingStart;
  const stopEvent = await typingStop;

  expect(startEvent.conversationId).toBe(conversationId);
  expect(stopEvent.conversationId).toBe(conversationId);
});
```

#### Test walkthrough — send message

User A sends; User B receives `new_message`. User A gets a send ack (`message_sent`). The test uses `Promise.race` to handle minor event name variation during development:

```typescript
it('should send message and receive new_message', async () => {
  const newMessageForB = waitForEvent<any>(clientB, 'new_message');

  const messageSentAck = Promise.race([
    waitForEvent<any>(clientA, 'message_sent'),
    waitForEvent<any>(clientA, 'message_Sent'),
  ]);

  clientA.emit('send_message', {
    conversationId,
    content: `Socket integration message ${Date.now()}`,
  });

  const newMessage = await newMessageForB;
  const sentAck = await messageSentAck;

  expect(newMessage.conversationId).toBe(conversationId);
  expect(newMessage.status).toBe('SENT');

  messageId = newMessage.id; // used by later tests
}, 15000);
```

The `15000` ms timeout is intentional — message persistence and broadcast can take longer than Jest's default.

#### Test walkthrough — delivery and read receipts

**Mark delivered** — User B confirms receipt; User A is notified:

```typescript
it('should mark message delivered', async () => {
  const deliveredEventForA = waitForEvent<any>(clientA, 'message_delivered');
  const deliveredAckForB = waitForEvent<any>(clientB, 'message_delivered_ack');

  clientB.emit('message_delivered', { conversationId, messageId });

  const deliveredEvent = await deliveredEventForA;

  expect(deliveredEvent).toMatchObject({
    conversationId,
    messageId,
    status: 'DELIVERED',
  });
});
```

**Mark read** — User B marks the conversation read; both clients receive read events with `updatedCount`:

```typescript
it('should mark messages as read', async () => {
  const readEventForA = waitForEvent<any>(clientA, 'messages_read');
  const readAckForB = waitForEvent<any>(clientB, 'messages_read_ack');

  clientB.emit('messages_read', { conversationId });

  const readEvent = await readEventForA;

  expect(readEvent.conversationId).toBe(conversationId);
  expect(readEvent).toHaveProperty('updatedCount');
});
```

#### Test walkthrough — edit and delete over socket

**Edit** — author emits `edit_message`; other participant receives `message_edited`:

```typescript
it('should edit message through socket', async () => {
  const editedEventForB = waitForEvent<any>(clientB, 'message_edited');
  const editedAckForA = waitForEvent<any>(clientA, 'message_edited_ack');

  clientA.emit('edit_message', {
    messageId,
    content: `Edited by socket test ${Date.now()}`,
  });

  const editedEvent = await editedEventForB;

  expect(editedEvent.message.id).toBe(messageId);
  expect(editedEvent.message.editedAt).toBeTruthy();
});
```

**Delete** — author emits `delete_message`; other participant receives `message_deleted`:

```typescript
it('should delete message through socket', async () => {
  const deletedEventForB = waitForEvent<any>(clientB, 'message_deleted');
  const deletedAckForA = waitForEvent<any>(clientA, 'message_deleted_ack');

  clientA.emit('delete_message', { messageId });

  const deletedEvent = await deletedEventForB;

  expect(deletedEvent.message.id).toBe(messageId);
  expect(deletedEvent.message.deletedAt).toBeTruthy();
});
```

#### Socket event coverage summary

| Client emits | Who receives | What we assert |
|---|---|---|
| (connect) | same client | `authenticated` |
| `join_conversation` | same client | `conversation_joined` with `joined: true` |
| `typing_start` / `typing_stop` | other participant | `user_typing_start` / `user_typing_stop` |
| `send_message` | other participant + sender | `new_message` + `message_sent` ack |
| `message_delivered` | sender + receiver | `message_delivered` + `message_delivered_ack` |
| `messages_read` | sender + receiver | `messages_read` + `messages_read_ack` |
| `edit_message` | other participant + sender | `message_edited` + `message_edited_ack` |
| `delete_message` | other participant + sender | `message_deleted` + `message_deleted_ack` |

#### How to run

```bash
# 1. Start the server (Jest does not start it for you)
docker compose --env-file .env up -d --build
curl http://localhost:8080/health

# 2. Run the test (--runInBand keeps socket tests sequential)
yarn test:e2e test/chat.socket.e2e-spec.ts --runInBand

# Alternative
npx jest --config ./test/jest-e2e.json test/chat.socket.e2e-spec.ts --runInBand
```

**Common failures:**

| Symptom | Likely cause |
|---|---|
| `Timeout waiting for event: authenticated` | Invalid or expired JWT in `.env.test` |
| `Timeout waiting for event: conversation_joined` | Wrong `SOCKET_TEST_CONVERSATION_ID` or user not a participant |
| Connection refused | Docker / NGINX not running on port 8080 |
| `Missing SOCKET_TEST_...` | Socket env vars not set in `.env.test` |

---

### 9.8 — Multi-Instance Redis Adapter Test

**File:** `test/multi-instance.socket.e2e-spec.ts`

This is the final realtime test in Phase 9. It proves that Socket.IO events still reach the right clients when PulseChat runs as **multiple API containers** behind NGINX, with the **Redis adapter** syncing rooms across instances.

#### Single instance vs multi-instance — why this file exists

The socket test in §9.7 can pass with only **one** API container — both sockets may land on the same Node.js process. That does not prove horizontal scaling works.

In production you run several replicas:

```
Client A  ──►  NGINX (ip_hash)  ──►  pulsechat-api-1
Client B  ──►  NGINX (ip_hash)  ──►  pulsechat-api-2 (or api-3)
                      │
                      └── Redis adapter pub/sub syncs socket events
```

Each container only knows about **its own** connected sockets. When User A (on instance 1) sends a message, instance 2 must forward `new_message` to User B via Redis. If the adapter is misconfigured, §9.7 might still pass but this test should fail.

#### REST / socket / multi-instance — quick comparison

| | REST e2e (§9.6) | Socket e2e (§9.7) | Multi-instance (§9.8) |
|---|---|---|---|
| Server | Jest boots app | 1+ Docker containers | **3 scaled** containers |
| Proves | HTTP + auth + DB rules | Gateway events work | Events work **across** containers |
| Docker scale | Postgres + Redis only | `docker compose up` | `--scale pulsechat-api=3` required |

#### What problem does this test solve?

| Question | If this test passes |
|---|---|
| Does typing reach a user on another container? | Redis adapter + rooms work cross-instance |
| Does `send_message` broadcast across instances? | Message pipeline is cluster-safe |
| Do delivery receipts cross instances? | Status events sync correctly |
| Do read receipts cross instances? | Read state propagates cluster-wide |

#### The story the tests tell

```
1.  Read tokens + conversationId from .env.test (same vars as §9.7)
2.  beforeAll: connect clientA + clientB, join both to conversation room
3.  User A types  →  User B receives user_typing_start (possibly on another instance)
4.  User A sends message  →  User B gets new_message; User A gets send ack
5.  User A sends another message  →  User B marks it delivered  →  User A gets message_delivered
6.  User B marks conversation read  →  User A gets messages_read
```

Setup is in `beforeAll` so every `it` block starts with both clients already connected and in the room.

#### Step 1 — Same env vars as §9.7

This file reuses the socket test configuration from `.env.test`. No new variables are needed:

```typescript
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test', quiet: true });

import { io, Socket } from 'socket.io-client';

jest.setTimeout(30000);

const socketUrl = process.env.SOCKET_TEST_URL || 'http://localhost:8080/chat';
const tokenA = process.env.SOCKET_TEST_USER_A_TOKEN;
const tokenB = process.env.SOCKET_TEST_USER_B_TOKEN;
const conversationId = process.env.SOCKET_TEST_CONVERSATION_ID;
```

`jest.setTimeout(30000)` raises the global limit — cross-container delivery via Redis pub/sub can be slower than a single-instance test.

#### Step 2 — Shared helpers

`waitForEvent` and `connectClient` are identical in spirit to §9.7, but with a **10s event timeout** (vs 8s) to account for extra network hops between containers:

```typescript
const waitForEvent = <T = any>(
  socket: Socket,
  event: string,
  timeout = 10000,
): Promise<T> => { /* same implementation as §9.7 */ };

const connectClient = async (token: string): Promise<Socket> => {
  const socket = io(socketUrl, {
    transports: ['websocket'],
    auth: { token },
    forceNew: true,
  });
  await waitForEvent(socket, 'authenticated');
  return socket;
};
```

#### Step 3 — Connect and join in `beforeAll`

Unlike §9.7, room joining happens once up front. Each `it` block only needs to check broadcasting:

```typescript
beforeAll(async () => {
  if (!tokenA || !tokenB || !conversationId) {
    throw new Error(
      'Missing SOCKET_TEST_USER_A_TOKEN, SOCKET_TEST_USER_B_TOKEN, or ' +
      'SOCKET_TEST_CONVERSATION_ID in .env.test',
    );
  }

  clientA = await connectClient(tokenA);
  clientB = await connectClient(tokenB);

  const joinedA = waitForEvent(clientA, 'conversation_joined');
  const joinedB = waitForEvent(clientB, 'conversation_joined');

  clientA.emit('join_conversation', { conversationId });
  clientB.emit('join_conversation', { conversationId });

  await Promise.all([joinedA, joinedB]);
});
```

NGINX `ip_hash` typically pins each client to one backend. With two clients they often land on **different** instances — exactly what we want to exercise.

#### Test walkthrough — typing across instances

User A emits `typing_start`; User B must receive it even if they are on a different container:

```typescript
it('should broadcast typing event across scaled API instances', async () => {
  const typingEventForB = waitForEvent<any>(clientB, 'user_typing_start');

  clientA.emit('typing_start', { conversationId });

  const event = await typingEventForB;

  expect(event.conversationId).toBe(conversationId);
  expect(event).toHaveProperty('userId');
});
```

#### Test walkthrough — message across instances

The core scaling test: `send_message` on instance A's socket must produce `new_message` on instance B's socket:

```typescript
it('should broadcast message across scaled API instances', async () => {
  const newMessageForB = waitForEvent<any>(clientB, 'new_message');

  const messageAckForA = Promise.race([
    waitForEvent<any>(clientA, 'message_sent'),
    waitForEvent<any>(clientA, 'message_Sent'),
  ]);

  clientA.emit('send_message', {
    conversationId,
    content: `Redis multi-instance test ${Date.now()}`,
  });

  const [newMessage, ack] = await Promise.all([newMessageForB, messageAckForA]);

  expect(newMessage.conversationId).toBe(conversationId);
  expect(newMessage.content).toContain('Redis multi-instance test');
  expect(ack).toHaveProperty('id');
});
```

If the Redis adapter wiring is broken, `newMessageForB` times out here — even though §9.7 passed on a single instance.

#### Test walkthrough — delivery receipt across instances

This test sends a **fresh** message, then marks it delivered — proving status events also cross the cluster:

```typescript
it('should broadcast delivered event across scaled API instances', async () => {
  const newMessageForB = waitForEvent<any>(clientB, 'new_message');

  clientA.emit('send_message', {
    conversationId,
    content: `Redis delivery test ${Date.now()}`,
  });

  const message = await newMessageForB;

  const deliveredEventForA = waitForEvent<any>(clientA, 'message_delivered');

  clientB.emit('message_delivered', {
    conversationId,
    messageId: message.id,
  });

  const deliveredEvent = await deliveredEventForA;

  expect(deliveredEvent).toMatchObject({
    conversationId,
    messageId: message.id,
    status: 'DELIVERED',
  });
});
```

#### Test walkthrough — read receipt across instances

User B marks the conversation read; User A must receive `messages_read` from the other instance:

```typescript
it('should broadcast read receipt across scaled API instances', async () => {
  const readEventForA = waitForEvent<any>(clientA, 'messages_read');

  clientB.emit('messages_read', { conversationId });

  const readEvent = await readEventForA;

  expect(readEvent.conversationId).toBe(conversationId);
  expect(readEvent).toHaveProperty('readBy');
  expect(readEvent).toHaveProperty('updatedCount');
});
```

#### Event coverage summary

| Client emits | Expected on other client | Cross-instance assertion |
|---|---|---|
| `typing_start` | `user_typing_start` on B | Typing fan-out via Redis |
| `send_message` | `new_message` on B + ack on A | Message broadcast via Redis |
| `message_delivered` | `message_delivered` on A | Delivery status via Redis |
| `messages_read` | `messages_read` on A | Read receipt via Redis |

#### How to run

```bash
# 1. Scale to 3 API instances (required)
docker compose --env-file .env up -d --build --scale pulsechat-api=3
docker ps | grep pulsechat-api
curl http://localhost:8080/health

# 2. Ensure .env.test has valid socket tokens (same as §9.7)

# 3. Run sequentially
yarn test:e2e test/multi-instance.socket.e2e-spec.ts --runInBand

# Alternative
npx jest --config ./test/jest-e2e.json test/multi-instance.socket.e2e-spec.ts --runInBand
```

**Recommended order for all Phase 9 socket work:**

```bash
# Step 1 — single-instance smoke test
npx jest --config ./test/jest-e2e.json test/chat.socket.e2e-spec.ts --runInBand

# Step 2 — scale up, then multi-instance adapter test
docker compose --env-file .env up -d --scale pulsechat-api=3
npx jest --config ./test/jest-e2e.json test/multi-instance.socket.e2e-spec.ts --runInBand
```

**Common failures:**

| Symptom | Likely cause |
|---|---|
| §9.7 passes but §9.8 fails | Redis adapter not configured, or only 1 API instance running |
| `Timeout waiting for event: new_message` | Clients on different instances but Redis pub/sub not connected |
| `Timeout waiting for event: authenticated` | Expired JWT in `.env.test` |
| Only 1 `pulsechat-api` container visible | Forgot `--scale pulsechat-api=3` |
| Intermittent failures | Run with `--runInBand`; check Redis container health |

---

### Key Takeaways — Phase 9

- Test the service layer first — it is the source of truth for business rules.
- E2e tests must use a separate `.env.test` pointing to an isolated database — never pollute dev data.
- The critical pattern for socket tests: **set up the listener before emitting** — you can miss events otherwise.
- Single-instance socket tests (§9.7) do not prove horizontal scaling — always run §9.8 with 3 API replicas.
- `--runInBand` is required for socket tests to prevent parallel Jest workers opening competing connections.
- For local Prisma against Docker Postgres, use `localhost:5433` as the host.

---

## Architecture Overview

```
                        Browser / Mobile
                               │
                        localhost:8080
                               │
                           NGINX
                     (ip_hash, WebSocket upgrade)
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
      pulsechat-api-1   pulsechat-api-2   pulsechat-api-3
      (NestJS + Fastify) (NestJS + Fastify) (NestJS + Fastify)
            │                  │                  │
            └──────────────────┼──────────────────┘
                        ┌──────┴──────┐
                        │             │
                   PostgreSQL       Redis
               (durable data)  (presence, pub/sub,
                                socket adapter)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | NestJS + Fastify |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache / Pub-Sub | Redis 7 |
| Realtime | Socket.IO + Redis Adapter |
| Auth | JWT (stateless) |
| Containers | Docker + Docker Compose |
| Reverse Proxy | NGINX |
| Logging | Pino (`nestjs-pino`) |
| Validation | `class-validator` + `class-transformer` |
| Testing | Jest + `socket.io-client` |

---

## License

MIT