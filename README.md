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

| Requirement        | Notes                                           |
| ------------------ | ----------------------------------------------- |
| Node.js 22+        | Matches the Docker base image                   |
| Yarn               | Package manager used throughout                 |
| Docker Desktop     | Runs Postgres, Redis, API containers, and NGINX |
| NestJS CLI         | `npm i -g @nestjs/cli`                          |
| TypeScript basics  | Classes, decorators, async/await                |
| HTTP & REST basics | Methods, status codes, JSON bodies              |

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

| Phase | Topic                 | Outcome                                       |
| ----- | --------------------- | --------------------------------------------- |
| **0** | Project Setup         | NestJS + Fastify + Docker + Prisma foundation |
| **1** | Authentication        | Register, login, JWT guards                   |
| **2** | Data Model & REST     | Conversations, messages, cursor pagination    |
| **3** | Socket.IO Gateway     | Realtime messaging, typing, presence          |
| **4** | Redis Adapter         | Cross-instance socket synchronization         |
| **5** | Docker Multi-Instance | Containerized, scalable API                   |
| **6** | NGINX Load Balancing  | Single entry point, WebSocket proxy           |
| **7** | Production Hardening  | Errors, logging, rate limits, security        |
| **8** | Chat Product Features | Statuses, receipts, edits, group management   |
| **9** | Testing               | Unit, e2e, socket, and adapter tests          |

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
    whitelist: true, // Strips extra fields not defined in the DTO
    forbidNonWhitelisted: true, // Throws an error instead of silently stripping
    transform: true, // Converts plain JSON into DTO class instances
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

| Table                     | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `User`                    | Already exists from Phase 1               |
| `Conversation`            | Represents a chat thread                  |
| `ConversationParticipant` | Join table linking users to conversations |
| `Message`                 | Every message ever sent                   |

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
>
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

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| `POST` | `/conversations`            | Create a conversation    |
| `GET`  | `/conversations`            | List my conversations    |
| `GET`  | `/conversations/:id`        | Get conversation details |
| `POST` | `/messages`                 | Send a message           |
| `GET`  | `/messages/:conversationId` | Get paginated messages   |

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

| Event (Client → Server) | Description                      |
| ----------------------- | -------------------------------- |
| `join_conversation`     | Join a conversation room         |
| `send_message`          | Send a message                   |
| `typing_start`          | Notify others you are typing     |
| `typing_stop`           | Notify others you stopped typing |

| Event (Server → Client) | Description                         |
| ----------------------- | ----------------------------------- |
| `authenticated`         | Emitted after successful handshake  |
| `conversation_joined`   | Confirms room entry                 |
| `new_message`           | A new message in a conversation     |
| `message_sent`          | Confirms your own message was saved |
| `user_typing_start`     | Another user started typing         |
| `user_typing_stop`      | Another user stopped typing         |
| `user_online`           | A contact came online               |
| `user_offline`          | A contact went offline              |

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

|                    | `ports`                       | `expose`               |
| ------------------ | ----------------------------- | ---------------------- |
| Accessible from    | Host machine + Docker network | Docker network only    |
| Use when           | Debugging locally             | Behind a reverse proxy |
| Supports `--scale` | ❌ Port conflicts             | ✅ No conflict         |

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

| Endpoint              | Limit              |
| --------------------- | ------------------ |
| `GET /health`         | No limit           |
| `POST /auth/login`    | 5 requests / min   |
| `POST /auth/register` | 5 requests / min   |
| `POST /messages`      | 30 requests / min  |
| General APIs          | 100 requests / min |

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

| Method   | Endpoint                                  | Action             |
| -------- | ----------------------------------------- | ------------------ |
| `PATCH`  | `/conversations/:id/title`                | Rename group       |
| `POST`   | `/conversations/:id/participants`         | Add participant    |
| `DELETE` | `/conversations/:id/participants/:userId` | Remove participant |
| `POST`   | `/conversations/:id/leave`                | Leave conversation |

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

| Test Type                | What It Covers                |
| ------------------------ | ----------------------------- |
| Unit tests               | Service-layer business logic  |
| e2e tests                | Full REST flows with JWT auth |
| Socket integration tests | Events, rooms, presence       |
| Multi-instance tests     | Redis adapter cross-delivery  |

---

### 9.2 — Commands

```bash
# Unit tests
yarn test

# e2e tests
yarn test:e2e

# Socket integration tests (requires tokens in .env)
npx tsx socket-tests/socket-test-a.ts
npx tsx socket-tests/socket-test-b.ts

# Run Prisma Studio against Docker Postgres
npx prisma db pull \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public"

npx prisma studio \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public" \
  --port 5555
```

---

- Recommended Order

```
src/
  messages/
    messages.service.spec.ts      # unit test
    messages.controller.spec.ts   # controller unit test if needed

  conversations/
    conversations.service.spec.ts # unit test

  auth/
    auth.service.spec.ts          # unit test

test/
  app.e2e-spec.ts
  auth.e2e-spec.ts
  conversations.e2e-spec.ts
  messages.e2e-spec.ts
  chat.socket-spec.ts
  multi-instance.socket-spec.ts
  jest-e2e.json
```

So:

- Unit tests stay inside src/feature/\*.spec.ts
- E2E + socket integration tests stay inside /test
- Your manual socket-tests/ folder can stay for development/manual testing.

Phase 9 order

```
9.1 MessagesService unit tests
9.2 ConversationsService unit tests
9.3 Auth REST e2e tests
9.4 Conversations + Messages REST e2e tests
9.5 Socket integration tests
9.6 Multi-instance Redis adapter test
```

- Add test to the `message.service.spec.ts` and then run `yarn test src/messages/messages.service.spec.ts`

### Key Takeaways — Phase 9

- Test the service layer first — it is the source of truth for business rules.
- Socket tests require a running server and valid JWT tokens from `.env`.
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

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Runtime         | Node.js 22                              |
| Framework       | NestJS + Fastify                        |
| Database        | PostgreSQL 16                           |
| ORM             | Prisma                                  |
| Cache / Pub-Sub | Redis 7                                 |
| Realtime        | Socket.IO + Redis Adapter               |
| Auth            | JWT (stateless)                         |
| Containers      | Docker + Docker Compose                 |
| Reverse Proxy   | NGINX                                   |
| Logging         | Pino (`nestjs-pino`)                    |
| Validation      | `class-validator` + `class-transformer` |
| Testing         | Jest + `socket.io-client`               |

---
