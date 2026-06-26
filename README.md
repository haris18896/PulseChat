# PulseChat — Learning Guide

PulseChat is a **production-oriented realtime chat backend** built incrementally across nine phases. Each phase introduces one architectural concern, explains the reasoning behind it, and walks through implementation with verifiable checkpoints.

You will build the same system a senior backend engineer would ship: REST APIs, JWT auth, Prisma + PostgreSQL, Redis-backed presence, Socket.IO rooms, horizontal scaling, NGINX, and production hardening.

---

## How to Use This Guide

1. **Work in order.** Later phases assume earlier ones are complete.
2. **Read the concept sections first.** They explain *why* before *how*.
3. **Run every command block.** Type or paste commands exactly as shown.
4. **Complete each checkpoint** before moving to the next section.
5. **Keep Docker running** for Postgres (`localhost:5433`) and Redis after Phase 0.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 22+ | Matches the Docker base image |
| Yarn | Package manager used throughout |
| Docker Desktop | Postgres, Redis, API containers, NGINX |
| NestJS CLI | `npm i -g @nestjs/cli` |
| Basic TypeScript | Classes, decorators, async/await |
| HTTP & REST | Methods, status codes, JSON bodies |

---

## Quick Reference — Daily Commands

```bash
# Install dependencies
yarn install

# Local development (single instance)
yarn start:dev

# Unit / e2e tests
yarn test
yarn test:e2e

# Start infrastructure
docker compose --env-file .env up -d postgres redis

# Scale full stack behind NGINX
docker compose --env-file .env up -d --build --scale pulsechat-api=3

# Local Prisma migrations (host machine → Docker Postgres)
DATABASE_URL=postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public npx prisma migrate dev

# Socket integration tests (requires .env tokens)
npx tsx socket-tests/socket-test-a.ts
npx tsx socket-tests/socket-test-b.ts
```

---

## Curriculum Overview

| Phase | Topic | Outcome |
|-------|-------|---------|
| **0** | Project Setup | NestJS + Fastify + Docker + Prisma foundation |
| **1** | Authentication | Register, login, JWT guards |
| **2** | Data Model & REST | Conversations, messages, pagination |
| **3** | Socket.IO Gateway | Realtime messaging, typing, presence |
| **4** | Redis Adapter | Cross-instance socket sync |
| **5** | Docker Multi-Instance | Containerized, scalable API |
| **6** | NGINX Load Balancing | Single entry point, WebSocket proxy |
| **7** | Production Hardening | Errors, logging, rate limits, security |
| **8** | Chat Product Features | Statuses, receipts, edits, groups |
| **9** | Testing | Unit, e2e, socket, and adapter tests |

---

# Phase 0 — Project Setup

> **Phase goal:** Establish a production-ready NestJS foundation with Fastify, Docker, PostgreSQL, Redis, Prisma, and developer tooling.

### What You Will Learn

- Scaffold a strict-mode NestJS application with Swagger and path aliases
- Configure Husky and lint-staged for consistent code quality on every commit
- Run PostgreSQL and Redis locally with Docker Compose
- Integrate Prisma as the database access layer inside NestJS
- Understand why Fastify is used instead of Express for this project

### Prerequisites

Node.js 22+, Yarn, Docker Desktop, basic TypeScript, and HTTP fundamentals.

---


## 0.1 — Create the NestJS Application

**Concept:** PulseChat starts as a standard NestJS project in strict TypeScript mode. Swagger is added immediately so every endpoint you build can be explored interactively at `/api`.

**Implementation:**

```sh
sudo npm i -g @nestjs/cli
nest new <ProjectName> --strict # to create project in current directory use dot.
yarn add @types/mocha --dev
yarn add @nestjs/swagger
```

- Add the following code to `main.ts` for Swagger:

```ts
// main.ts
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

```typescript
// tsconfig.json
// Update baseUrl: ./ to path

//...............
{
    "compilerOptions" : {
        "paths": {
            "*": ["./*"]
    },
        //............
        "types": ["jest", "node"]
        //................
    },
    "include": ["src/**/*", "test/**/*"]
}
```

## 0.2 — Git Hooks with Husky

**Concept:** Pre-commit hooks catch formatting and lint errors before they enter the repository. This keeps the main branch clean as the project grows.

**Implementation:**

```sh
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

```sh
yarn lint-staged
```

**Usage**

- Hooks run automatically on `git commit`.
- After cloning or pulling, run `yarn` — the `prepare` script installs hooks.
- Test manually: `yarn lint-staged` or `sh .husky/pre-commit`.

## 0.3 — Docker Compose for Postgres and Redis

**Concept:** Chat applications need a relational database for durable data and Redis for ephemeral data (presence, pub/sub). Running both in Docker gives every developer an identical environment.

**Implementation:**

- Create the `docker-compose.yml` file.
- Add the PostgreSQL and Redis images.
- Run `docker compose up -d` to start the containers.

## 0.4 — Environment Configuration

**Concept:** `@nestjs/config` loads `.env` values into a typed configuration service. Never hard-code secrets or connection strings in source files.

**Implementation:**

- Install the config package.
- Update `src/app.module.ts` and `src/app.controller.ts`.
- Run the development environment and verify the response.

```bash
npm install @nestjs/config
```

---

## 0.5 — Switch from Express to Fastify

**Concept:** Fastify is faster and aligns with NestJS’s recommended adapter for high-throughput APIs. PulseChat uses Fastify plugins (`@fastify/helmet`, `@fastify/cors`) instead of Express middleware.

**Implementation:**

```sh
yarn remove @nestjs/platform-express
yarn add @nestjs/platform-fastify @fastify/helmet @fastify/cors @fastify/static
```

```ts
// main.ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false, trustProxy: true }),
  { logger: ['error', 'warn', 'log'] },
);

await app.register(helmet);
await app.register(cors, { origin: true });

await app.listen(port, '0.0.0.0'); // bind all interfaces (Docker-friendly)
```

**Notes**

- Use `@fastify/*` plugins — not Express middleware (`multer` → `@fastify/multipart`).
- In controllers and guards, use `FastifyRequest` / `FastifyReply` instead of Express types.
- E2E tests must also use `FastifyAdapter` — see `test/app.e2e-spec.ts`.
- Place static files in `public/` — they are served at `/public/`.

## 0.6 — Database Setup with Prisma

**Concept:** Prisma is the ORM and migration tool. Schema changes are version-controlled SQL files; the generated client gives type-safe queries in services.

### Install Prisma

- Install Prisma.
- Initialize Prisma.
- Update `prisma/schema.prisma` and add the database URL to the `datasource db` block.
- Add the `User` model to `schema.prisma`.
- Run migrations.

```sh
# installation
yarn add prisma --dev
yarn add @prisma/client

# initialization
npx prisma init

# After changes in prisma schema.prisma - run migrations
npx prisma migrate dev --name init

# Open Prisma Studio on http://localhost:5555
npx prisma generate
npx prisma studio --port 5555
```

## 0.7 — Prisma Service in NestJS

**Concept:** A dedicated `PrismaService` extends the Prisma client and is injected into feature services. This is the only place that should open database connections.

**Implementation:**

- Create the Prisma module:

```sh
nest g module prisma # src/prisma/prisma.module.ts
nest g service prisma # src/prisma/prisma.service.ts
```

---


### Key Takeaways — Phase 0

- A chat backend needs durable infrastructure (Postgres) and ephemeral infrastructure (Redis) from day one.
- Feature-based module layout scales better than organizing purely by file type.
- Binding to `0.0.0.0` and using environment variables prepares the app for container deployment.

---


# Phase 1 — Authentication and JWT Guards

> **Phase goal:** Implement secure user registration, login, and JWT-protected REST endpoints.

### What You Will Learn

- Hash passwords with bcrypt before storing them in PostgreSQL
- Issue and verify JWT access tokens with `@nestjs/jwt`
- Validate request bodies globally with `class-validator` and `ValidationPipe`
- Protect routes using a custom `JwtAuthGuard` and `@CurrentUser()` decorator

### Prerequisites

Phase 0 completed. A `User` model must exist in Prisma.

---


## 1.1 — Authentication Flows

Understanding these flows before writing code prevents security mistakes later.

### Registration Flow

```
Client sends email, username, password
       ↓
AuthController receives request
       ↓
AuthService validates data
       ↓
Password is hashed
       ↓
User is saved in Postgres
       ↓
JWT token is returned
```

### Login Flow

```
Client sends email and password
        ↓
Find user by email
        ↓
Compare password with hashed password
        ↓
If valid, return JWT token
```

### Protected Route Flow

```
Client sends Authorization: Bearer <token>
       ↓
JwtAuthGuard checks token
       ↓
If valid, user data is attached to request
       ↓
Controller can access current user
```

## 1.2 — Install Dependencies

**Implementation**

- Passport is not used at this stage.
- It can be added later if needed.

```sh
yarn add @nestjs/jwt bcrypt
yarn add -D @types/bcrypt
yarn add class-validator class-transformer
```

## 1.3 — Configure JWT in `.env`

**Implementation**

- Add JWT configuration to `.env`:

```sh
JWT_SECRET="super-secret-change-this-later"
JWT_EXPIRES_IN="7d"
```

## 1.4 — Enable Global Request Validation

**Concept:** DTOs are useless without enforcement. `ValidationPipe` rejects malformed input before it reaches your services.

**Implementation**

```ts
// main.ts
import { ValidationPipe } from '@nestjs/common';

// Then add this before await app.listen(...):
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Removes extra fields that are not in the DTO.
    forbidNonWhitelisted: true, // Instead of silently removing extra fields, it throws an error.
    transform: true, // Converts incoming plain JSON into DTO class objects.
  }),
);
```

## 1.5 — Generate Auth and Users Modules

**Implementation**

```sh
nest g module users
nest g service users

nest g module auth
nest g controller auth
nest g service auth
```

## 1.6 — Define Data Transfer Objects

**Implementation** — create:

- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`

## 1.7 — Implement UsersService

**Implementation** — update:

- Update these files to implement the required functionality:

- `src/users/users.service.ts`
- `src/users/users.module.ts`

## 1.8 — JWT Guard and `@CurrentUser()` Decorator

**Concept:** Guards run before controllers. The decorator extracts the authenticated user the guard attached to the request.

**Implementation** — create:

- `src/auth/types/jwt-payload.type.ts`
- `src/auth/guards/jwt-auth.guards.ts`
- `src/auth/decorators/current-user.decorator.ts`
- Without this decorator:

```sh
Client sends token
        ↓
JwtAuthGuard checks token
        ↓
Guard extracts userId from token
        ↓
Guard fetches user from database
        ↓
Guard attaches user to request
        ↓
@CurrentUser() reads that user
        ↓
Controller returns current user
```

---


### Key Takeaways — Phase 1

- Authentication belongs in guards and services—not scattered across controllers.
- DTOs with `whitelist` and `forbidNonWhitelisted` prevent mass-assignment vulnerabilities.
- JWT statelessness enables horizontal scaling later without server-side sessions.

---


# Phase 2 — Conversation and Message Data Model

> **Phase goal:** Design and implement the conversation-centric data model and REST APIs for chats and messages.

### What You Will Learn

- Model many-to-many user–conversation relationships with a join table
- Explain why messages belong to conversations—not directly to receivers
- Build CRUD REST endpoints with authorization and membership checks
- Implement cursor-based pagination suitable for chat history
- Separate durable state (Postgres) from ephemeral state (Redis)

### Prerequisites

Phase 1 completed. You should be able to register, log in, and call protected routes.

---


### Deliverables

When you finish this phase, you will have built:

- ✅ Conversation database schema
- ✅ Message database schema
- ✅ Conversation participants
- ✅ Prisma relationships
- ✅ Migration
- ✅ Prisma Studio verification
- ✅ First Conversation APIs (REST)
- ✅ Swagger documentation

Socket.IO is intentionally not introduced in this phase.

Realtime delivery is only a transport layer. If the database schema and business logic are poorly designed, Socket.IO will amplify those problems rather than solve them.

## 2.1 — The Big Picture: Conversations, Not Direct Messages

Imagine a messaging application such as WhatsApp. Messages are not sent directly to another user; they belong to a **conversation**.

```sh
You
 │
 │  "Hello"
 ▼
Conversation
 │
 ├── User A
 ├── User B
 │
 ▼
Message
```

### Why?

Because a conversation may later include multiple participants:

```
You
Ahmed
Ali
Sara
```

All in one conversation. If a message belonged to a receiver instead:

```
Message
--------
senderId
receiverId
```

It completely breaks group chats.
Instead:

```
Conversation
      │
      ▼
Participants
      │
      ▼
Messages
```

This design scales indefinitely.

## 2.2 — Database Design

We will create three new tables (plus the existing `User` table):

1. **User** — already exists
2. **Conversation** — represents a chat
3. **ConversationParticipant** — join table connecting users and conversations
4. **Message** — stores every message sent

```
Conversation 1

↓

Haris

↓

Ali
```

## 2.3 — Entity Relationship

This is a classic many-to-many relationship.

```
User
│
├──────────────┐
│              │
│              ▼
│     ConversationParticipant
│              │
│              ▼
│       Conversation
│              │
│              ▼
└────────── Message
```

## 2.4 — Why a Join Table Is Required

Why not simply do the following?

```
Conversation

users[]
```

Relational databases do not store arrays of foreign keys efficiently.

Instead, we normalize the data.

Example:

Conversation

```
id
1
```

ConversationParticipant

```
conversationId     userId
1                   Haris
1                   Ali
1                   Ahmed
```

Now we can have:

```
2 users
10 users
500 users
```

No schema changes.

## 2.5 — Message Model

Every message belongs to:

- one sender
- one conversation
  Message

```
id
conversationId
senderId
content
createdAt
```

Note: There is no `receiverId`.

The conversation already defines who the participants are.

## 2.6 — Read Receipts (Deferred)

Not in this phase.

Those will be added in a later phase.

This incremental approach reflects how production software is typically built:

```
Version 1

Conversation
Participants
Messages
```

Later:

```
Version 2

Read Receipts

Typing

Presence

Pinned Messages

Attachments

Message Reactions
```

Each feature receives its own migration.

## 2.7 — Online Status Belongs in Redis

Online status is ephemeral by nature.

Database:

```
User

online = true
```

That is `Bad`.

If the server crashes,

every user may remain marked as `online = true`

which is incorrect.

Instead:

Redis

```
user:123

online
```

Redis is used for temporary state.

PostgreSQL stores permanent state.

Separating ephemeral state from durable state is one of the most important architectural concepts in this project.

## 2.8 — Recommended Folder Structure

After this phase, your project will begin to grow into a real backend.

```
src
│
├── auth
├── users
├── prisma
├── redis
│
├── conversations
│     ├── dto
│     ├── conversation.controller.ts
│     ├── conversation.service.ts
│     ├── conversation.module.ts
│
└── messages
      ├── dto
      ├── message.controller.ts
      ├── message.service.ts
      ├── message.module.ts
```

Notice something.

We are organizing by feature, not by file type.

This is the architecture used in most mature NestJS applications because each feature owns its controller, service, DTOs, and related logic.

## 2.9 — Logging Options

There are two options:

### Option A

- Install packages `yarn add winston nest-winston` for fastify add this as well `yarn add nestjs-pino pino-http pino-pretty`
- Create `src/common/logger/logger.service.ts`

```ts
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(
  ({ level, message, timestamp, stack, context, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const err = stack ? `\n${stack}` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${ctx} ${message}${extra}${err}`;
  },
);

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger: Logger;
  private context?: string;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      ),
      transports: [
        // Console: colorized for human reading
        new transports.Console({
          format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat,
          ),
        }),
        // File: structured JSON for parsing/shipping
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: combine(timestamp(), format.json()),
        }),
        new transports.File({
          filename: 'logs/combined.log',
          format: combine(timestamp(), format.json()),
        }),
      ],
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context ?? this.context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, {
      context: context ?? this.context,
      stack: trace,
    });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context ?? this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context ?? this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context ?? this.context });
  }
}
```

- Create `src/common/logger/logger.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';

@Global() // 👈 makes it available everywhere without re-importing
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}
```

- Import it in `app.module.ts`
- Update `main.ts`

```ts
// without fastify
const app = await NestFactory.create(AppModule, { bufferLogs: true });

const logger = app.get(AppLogger);
app.useLogger(logger);

// With Fastify
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false }), // 👈 disable Fastify's built-in Pino logger
  { bufferLogs: true },
);

const logger = app.get(AppLogger);
app.useLogger(logger);
```

- Usage

```ts
import { AppLogger } from 'src/common/logger/logger.service';

pubClient.on('connect', () => this.log.log('Redis pub client connected'));
```

## 2.10 — Phase 2 Roadmap

This phase is broken into small, incremental steps, following the same approach used for authentication.

#### Step 1 — Database Design (Prisma)

- Add `Conversation`
- Add `ConversationParticipant`
- Add `Message`
- Explain every relationship
- Run migration
- Verify in Prisma Studio

#### Step 2 — Conversation Module

- Generate module
- Service
- Controller
- Swagger setup

#### Step 3 — Create Conversation

`POST /conversations`

Learn:

- Business logic
- Transactions
- Duplicate conversation prevention

#### Step 4 — Get My Conversations

`GET /conversations`

Learn:

- Prisma relations
- Includes
- Filtering
- Sorting

#### Step 5 — Conversation Details

`GET /conversations/:id`

Learn:

- Authorization
- Membership checks
- Nested queries

#### Step 6 — Message APIs (REST)

`POST /messages`

`GET /messages/:conversationId`

Learn:

- Pagination
- Ordering
- Sender relationships

## 2.11 — Implement the Prisma Data Model

**Implementation**

- Open `Prisma/schema.prisma` and add the models for the `Conversation`, `Message`, `ConversationParticipants`

```prisma

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  conversations ConversationParticipant[]
  messages Message[]
}



model Conversation {
  id        String   @id @default(uuid())
  title     String?
  isGroup   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  participants ConversationParticipant[]
  messages Message[]
}


model ConversationParticipant {
  id        String   @id @default(uuid())
  conversationId String
  userId String
  joinedAt DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
}


model Message {
  id        String   @id @default(uuid())
  conversationId String
  senderId String
  content String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender User @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```

In the `User` model we have `conversations ConversationParticipant[]`.

A user can be part of many conversations. But Use:n’t connect `User` directly to `Conversation`.

The relationship goes through `ConversationParticipant`, which can later store additional fields such as:

```
joinedAt
role
muted
lastReadAt
leftAt
```

`messages Message[]` — a user can send many messages.

In the `Conversation` model, `title` is optional. One-to-one chats may have no title; group chats typically require one (e.g., "Project Team").

`participants ConversationParticipant[]` — one conversation can have many participants.

`ConversationParticipant` is the join table.

```
conversationId String
userId String
```

This connects: `User ↔ Conversation`

`@@unique([conversationId, userId])` prevents duplicate participants — the same user cannot be added twice to one conversation.

`onDelete: Cascade` — if a conversation is deleted, related participants are removed automatically. If a user is deleted, their participant rows are removed automatically.

In the `Message` model, `conversationId` identifies the conversation the message belongs to.

`content String` — currently, only text messages are supported.

Future fields may include:

```
imageUrl
fileUrl
messageType
editedAt
deletedAt
```

Run migrations, generate the Prisma client, and verify in Prisma Studio:

**Checkpoint:**

```sh
npx prisma migrate dev --name add_conversations_and_messages
npx prisma generate
npx prisma studio
```

Prisma Studio should display:

```
User
Conversation
ConversationParticipant
Message
```

## 2.12 — Conversation Module and First API

**Implementation**

Implement `POST /conversations`. This endpoint will:

```
1. Require JWT auth
2. Read current user from @CurrentUser()
3. Accept participant user IDs
4. Create a conversation
5. Add current user + selected users as participants
```

- Generate Conversation Module

```sh
nest g resource conversation

<OR>

nest g module conversations
nest g controller conversations
nest g service conversations

```

In `conversations.service.ts`:

- `[...new Set([currentUserId, ...dto.participantIds]),];` this removes duplicate users
- `if (uniqueParticipantIds.length < 2)` — a conversation with only one participant is not valid.
- ```
  participants: {
    create: uniqueParticipantIds.map(...)
  }
  ```

This creates the conversation and participant rows in a single operation.

Update `conversations.controller.ts`:

```
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
```

Applied at the controller level, so all routes in this controller are protected. `@CurrentUser() user` injects the authenticated user from the JWT guard.

At this point, `POST /conversations` can be called with the following payload:

```
{
  "participantIds": [
    "5f7ef3ca-9900-4b7e-b95e-07ecc1630645",
    "0b5c401e-980b-4dd0-a194-a5ca0d2e4092"
  ],
  "title": "Testing 001",
  "isGroup": false
}
```

If the first ID is the current user's, duplicate removal has worked correctly:

```
[
    Haris,
    Haris,
    Other User
]

this became

[
    Haris,
    Other User
]
```

Messages are created using the same pattern.

## 2.13 — Cursor Pagination for Messages

**Implementation**

So far, the following endpoints exist: create conversation, get conversation by ID, list conversations, create message, and get messages by conversation. Next, add pagination to `GET /messages/:conversationId`.

### Concept: Why Pagination Is Mandatory

Currently, this endpoint returns all messages.

That is acceptable with a small number of messages.

At scale:

`1 conversation = 50,000 messages`

An unbounded response:

GET `/messages/:conversationId`
→ returns 50,000 messages

Problems include:

```
slow response
high database load
huge frontend memory usage
bad mobile performance
```

Instead, messages are loaded in pages.

### Concept: Cursor-Based Pagination for Chat

Chat applications typically use:

limit
cursor

Example:

GET `/messages/:conversationId?limit=20`

Then for older messages:

GET `/messages/:conversationId?limit=20&cursor=message-id`

Meaning:

Return 20 messages older than the cursor message.

```ts
// message.service.ts
// .........................
const limit = query.limit || 20;

const messages = await this.prisma.message.findMany({
  where: {
    conversationId,
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: limit + 1,
  ...(query.cursor
    ? {
        cursor: {
          id: query.cursor,
        },
        skip: 1,
      }
    : {}),
  include: {
    sender: {
      select: {
        id: true,
        username: true,
        email: true,
      },
    },
  },
});

const hasNextPage = messages.length > limit;
const items = hasNextPage ? messages.slice(0, limit) : messages;
const nextCursor = hasNextPage ? items[items.length - 1].id : null;

return {
  items: items?.reverse(),
  pageInfo: {
    nextCursor,
    hasNextPage,
  },
};
```

---


### Key Takeaways — Phase 2

- Socket.IO is a transport layer; schema and business logic must be correct first.
- ConversationParticipant enables group chats and future metadata (`lastReadAt`, roles).
- Cursor pagination avoids loading entire message histories into memory.

---


# Phase 3 — Socket.IO Gateway

> **Phase goal:** Add realtime messaging, typing indicators, and presence on top of the REST foundation.

### What You Will Learn

- Create a Socket.IO gateway with connection lifecycle handlers
- Authenticate WebSocket connections using JWT in the handshake
- Join conversation rooms and broadcast events only to participants
- Persist messages through the existing service layer—not duplicated in the gateway
- Track online/offline presence in Redis across multiple tabs per user

### Prerequisites

Phase 2 completed. REST conversation and message APIs must work.

---


### Introduction

Realtime messaging is added in layers. Start with the simplest Socket.IO gateway, then progressively add JWT authentication, conversation rooms, the Redis adapter, and message broadcasting.

### Deliverables

When you finish this step, you will have:

```
Socket.IO server running
Client can connect
Server logs connection/disconnection
Client can send ping event
Server replies with pong event
```

JWT authentication, chat rooms, and the Redis adapter are not included yet.

```sh
yarn add @nestjs/websockets @nestjs/platform-socket.io socket.io
# socket.io-client only for local testing
yarn add -D socket.io-client
nest g module chat
nest g gateway chat
```

- Create `chat.gateway.ts` with connection, disconnect, and ping handlers.
- Create `socket-test.ts` and install `tsx` if it is not already installed.

```sh
yarn add -D tsx
# run the code
yarn start:dev
# run the socket-test in separate terminal
npx tsx socket-test.ts
```

At this point, the Socket.IO server is running and the event round-trip works correctly. Next, add JWT authentication for Socket.IO.

```sh
npx tsx socket-test.ts
# Connected to server
# Pong received from server {
#   socketId: 'OyVKTx92Hf40k6bHAAAB',
#   message: 'Hello from test client',
#   timestamp: '2026-06-21T09:20:30.490Z'
# }
```

## 3.1 — JWT Authentication for Socket.IO

**Concept:** HTTP guards do not apply to WebSockets. Validate the JWT during the Socket.IO handshake and attach the user to the socket.

**Flow:**

```
Socket connects
        ↓
Sends JWT token
        ↓
Gateway verifies token
        ↓
Gateway attaches user to socket
        ↓
Only authenticated users can connect
```

## 3.2 — Join Conversation Rooms

**Implementation**

- Add the `join_conversation` socket event.
- Add the DTO in `join-conversation.dto.ts`.
- Add `isUserParticipant` in `conversations.service.ts` to verify membership.
- Import the `ConversationsModule` into the `ChatModule`.
- Update the chat gateway.

```ts
import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjdlZjNjYS05OTAwLTRiN2UtYjk1ZS0wN2VjYzE2MzA2NDUiLCJlbWFpbCI6ImhhcmlzQHlvcG1haWwuY29tIiwiaWF0IjoxNzgyMDQzMzMzLCJleHAiOjE3ODI2NDgxMzN9.pSBLPcYGSgtV0GMVbbGSH7wt2_utQwUR9Pz0O175KRo';

const conversationId = '60c7fbb1-1616-4d85-8722-200f1765a1c5';

const socket = io('http://localhost:3000/chat', {
  transports: ['websocket'],
  auth: {
    token,
  },
});

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('pong', (data) => {
  console.log('Pong received from server', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server', reason);
});
```

- Update `socket-test.ts` to use a real conversation ID instead of dummy data.

```ts
// ..............
// ..............
// ..............
socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_joined', (data) => {
  console.log('here is the conversation data : ', data);

  socket.emit('send_message', {
    conversationId,
    content: 'Testing the new message event',
  });
});

socket.on('message_sent', (data) => {
  console.log('Message sent successfully: ', data);
});

socket.on('new_message', (data) => {
  console.log('New message received: ', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server', reason);
});
// ..............
// ..............
```

## 3.3 — The `send_message` Event

**Concept:** The gateway receives the event, delegates persistence to `MessagesService`, updates `lastMessageAt`, and broadcasts `new_message` to the room.

**Flow:**

This event will:

```
receive socket message
→ verify user is participant
→ save message in Postgres
→ update conversation.lastMessageAt
→ emit new_message to conversation room
```

## 3.4 — Typing Indicators

**Implementation**

Add two socket events:
- When User A starts typing, User B receives `user_typing_start`.
- When User A stops typing, User B receives `user_typing_stop`.

```
typing_start
typing_stop
```

For testing, add the following to test A:

```ts
// ............
// ............
// ............
socket.on('conversation_joined', (data) => {
  console.log('Client A joined conversation:', data);

  socket.emit('typing_start', {
    conversationId,
  });

  setTimeout(() => {
    socket.emit('typing_stop', {
      conversationId,
    });
  }, 3000);
});
// ............
// ............
// ............
```

Add the following to test B:

```ts
// ............
// ............
// ............

// ............
// ............
// ............
```

## 3.5 — Presence System with Redis

**Implementation**

Track the following:

```
online
offline
connected sockets per user
```

### Why Redis?

Presence is temporary. Do not persist it in PostgreSQL:

`user.online = true`

If the server crashes, users may remain incorrectly marked as online.

Redis is the appropriate store for temporary state.

### Presence Logic

A single user may have multiple active sockets:

```
Haris
 ├── Browser tab 1
 ├── Browser tab 2
 └── Mobile app
```

A user should not be marked offline until all of their sockets disconnect.

### Redis Key Design

For each user:

`presence:user:{userId}:sockets`

Example:

`presence:user:5f7ef3ca-9900-4b7e-b95e-07ecc1630645:sockets`

Value:

Set of socket IDs

Example:

```
[
  "socket-1",
  "socket-2"
]
```

### Create Presence Module

```
nest g module presence
nest g service presence
```

- In the presence service, implement `isOnline`, `getSockets`, and `removeSocket` to check online status, retrieve active socket IDs, and remove a socket on disconnect.
- Use these methods in the chat gateway's `handleConnection` and `handleDisconnect` handlers.
- Add a `GET /users/online-status` endpoint to query which users are online.
- Scope presence broadcasting to relevant users only. The current approach likely does:

`this.server.emit('user_online', ...)`

That broadcasts the event to every connected client, which is unsuitable for production.

Instead, the desired behavior is:

```
When Haris comes online
→ notify only users who share conversations with Haris
```

Add the following method to `conversations.service.ts`. It returns all conversation IDs in which the user participates:

```ts
async getConversationIdsForUser(userId: string): Promise<string[]> {
    const participant = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
      },
      select: {
        conversationId: true,
      },
    });

    return participant.map((p) => p.conversationId);
  }
```

Then add a helper method inside `ChatGateway` called `emitPresenceToUserConversation`:

````ts
// ..........
private async emitPresenceToUserConversation(
    userId: string,
    event: 'user_online' | 'user_offline',
    payload: unknown,
  ) {
    const conversationIds =
      await this.conversationsService.getConversationIdsForUser(userId);

    conversationIds.forEach((conversationId) => {
      const room = `conversation-${conversationId}`;
      this.server.to(room).emit(event, payload); // emit to only those users who are in the conversation room
    });
  }
  // .................
  // .................
  // .................
  // .................

// in the handleConnection and handleDisconnect
if (socketCount === 1) {
        await this.emitPresenceToUserConversation(
          client.user.id,
          'user_online',
          {
            user: client.user,
            timestamp: new Date().toISOString(),
          },
        );
      }

      ```
````


### Key Takeaways — Phase 3

- Gateways should orchestrate; services should own business rules.
- Room-based broadcasting scopes events to authorized participants.
- Presence is ephemeral—never store `online = true` in PostgreSQL.

---


# Phase 4 — Redis Adapter for Socket.IO

> **Phase goal:** Synchronize Socket.IO events across multiple Node.js processes using Redis Pub/Sub.

### What You Will Learn

- Understand why a single Node.js process cannot see sockets on another instance
- Configure the official `@socket.io/redis-adapter` in NestJS
- Prove cross-instance delivery with clients on different ports

### Prerequisites

Phase 3 completed. Socket.IO gateway with rooms and JWT must work on one instance.

---


## 4.1 — Why the Redis Adapter Exists

**Purpose:** Enable realtime messaging across multiple backend instances.

This phase adds:

```
Socket.IO Redis adapter
Redis pub/sub clients
custom Socket.IO adapter in NestJS
prove message sync across instances
```

```
Multiple Node.js instances
        ↓
Same Redis Pub/Sub
        ↓
Socket messages sync across all instances
```

Socket.IO’s Redis adapter forwards packets between multiple Socket.IO servers using Redis Pub/Sub; it does not store socket data as Redis keys. Sticky sessions are still needed later when we put instances behind NGINX

```
yarn add @socket.io/redis-adapter ioredis
```

- Create `src/chat/adapters/redis-io.adapter.ts`.
  - Default behavior: Instance A only knows sockets connected to Instance A.
  - Redis adapter behavior: Instance A can emit to rooms containing sockets on Instance B.

### Implementation: Register the Adapter in `main.ts`

```ts
// Add import:
import { RedisIoAdapter } from './chat/adapters/redis-io.adapter';

// Then after app creation and before app.listen():

const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);

// Recommended position:

app.enableShutdownHooks();

const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);

await app.listen(port, '0.0.0.0');
```

### Checkpoint: Cross-Instance Redis Adapter Test

```
Client A → backend port 3000
Client B → backend port 3001

Both join same conversation room

Client A sends message
Client B receives new_message
```

**Checkpoint:**

```sh
PORT=3000 yarn start:dev

# in the separate terminal run
PORT=3001 yarn start:dev
#  <OR>
PORT=3001 npx nest start --watch
```

- Update `socket-test-b.ts` accordingly.

### Why This Proves the Redis Adapter Works

Without Redis adapter:

```
Instance 3000 only knows sockets connected to 3000
Instance 3001 only knows sockets connected to 3001
```

So this would fail:

`this.server.to(room).emit('new_message', message);`
because Client B is not connected to instance 3000.
With Redis adapter:

```
Instance 3000 emits to room
Redis Pub/Sub forwards event
Instance 3001 receives event
Client B receives new_message
```

### Important Note

Presence should also sync because room events now travel through Redis adapter.

But the presence socket count is already stored in Redis, so that part is also cross-instance safe.

```ts
const socket = io('http://localhost:3001/chat', {
  transports: ['websocket'],
  auth: { token },
});
```


### Key Takeaways — Phase 4

- The Redis adapter forwards packets—it does not store socket state as keys.
- Sticky sessions help, but the adapter is what makes multi-instance rooms work.

---


# Phase 5 — Multi-Instance Docker Setup

> **Phase goal:** Containerize the API and run multiple identical backend instances against shared Postgres and Redis.

### What You Will Learn

- Write a multi-stage Dockerfile for NestJS + Prisma
- Connect containers to existing Postgres and Redis services
- Scale API replicas with `docker compose up --scale`
- Run `prisma migrate deploy` on container startup

### Prerequisites

Phases 0–4 completed. Docker Compose already runs Postgres and Redis.

---


**Purpose:** Run multiple PulseChat backend containers.

This phase adds:

```
Dockerfile
multiple backend instances
shared Postgres
shared Redis
environment-based ports
```

```
Run PulseChat API as a Docker container
connect it to existing Postgres + Redis
prepare it for multiple backend instances
```

## 5.1 — Implementation Steps

1. Create .dockerignore
2. Create Dockerfile
3. Update docker-compose.yml
4. Run backend inside Docker
5. Test REST APIs
6. Test Socket.IO from Docker backend
7. Scale to multiple backend containers

After adding the `Dockerfile` and updating `docker-compose.yml`:

**Checkpoint:**

```sh
docker compose down
# <OR Detached>
docker compose up --build -d

# build
docker compose up --build

# Check logs
docker logs -f pulsechat_api

# Test
curl http://localhost:3000/health

# if something goes wrong
# delete every thing
docker compose down
docker builder prune -f
docker compose build --no-cache && docker compose up -d && docker logs -f pulsechat_api
```

After REST API calls succeed in the Docker multi-instance setup, run:

`npx tsx socket-tests/socket-test-a.ts`


### Key Takeaways — Phase 5

- Containers should be stateless; all durable data lives in Postgres.
- Removing fixed `container_name` values is required for scaling.
- Use `expose` internally and publish only the reverse-proxy port.

---


# Phase 6 — NGINX Load Balancing

> **Phase goal:** Place multiple API containers behind NGINX with WebSocket-aware load balancing.

### What You Will Learn

- Configure an upstream block and `proxy_pass` for horizontal scaling
- Forward `Upgrade` and `Connection` headers for Socket.IO
- Use `ip_hash` for sticky sessions during WebSocket handshakes
- Understand `ports` vs `expose` in Docker networking

### Prerequisites

Phase 5 completed. At least one API container runs successfully in Docker.

---


**Purpose:** Place three backend instances behind a single entry point.

This phase adds:

```
NGINX config
WebSocket upgrade headers
load balancing
test clients connected to different instances
```

### Architecture Goal

```
localhost:8080
   ↓
NGINX
   ↓
pulsechat-api-1
pulsechat-api-2
pulsechat-api-3
```

Clients will connect to:

`io('http://localhost:8080/chat')`

Instead of::

`io('http://localhost:3000/chat')`

- Create `nginx/default.conf`.
- Update `docker-compose.yml` to include the NGINX service.

##### 6.1 — Architecture Without a Reverse Proxy

Without NGINX, the architecture looks like this:

```
                Internet
                    │
                    ▼
          localhost:3000
                    │
                    ▼
            NestJS Application
           (REST + Socket.IO)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      PostgreSQL           Redis
```

This is sufficient for development, but consider a production load such as:

```
20,000 users online
5,000 sending messages
10,000 connected via WebSockets
```

Can one NestJS process handle all of them? `No.`

One Node.js process uses only one CPU core.

If your machine has:

```
8 cores
16 cores
32 cores
```

the application uses only `one`.

The key question becomes: `How do we utilize all CPU cores?`

The answer is: `Run multiple instances of the application.`

Instead of:

```
             One Instance

        ┌──────────────────┐
        │  NestJS API       │
        │  Port 3000        │
        └──────────────────┘
```

Use:

```
             Three Instances

        ┌──────────────────┐
        │ API #1           │
        │ Port 3001        │
        └──────────────────┘

        ┌──────────────────┐
        │ API #2           │
        │ Port 3002        │
        └──────────────────┘

        ┌──────────────────┐
        │ API #3           │
        │ Port 3003        │
        └──────────────────┘
```

##### Problem: Routing

When the browser sends a request, where should it go?

```
3001 ?

3002 ?

3003 ?
```

The browser has no way to decide.

NGINX provides the answer.

##### 6.2 — NGINX as a Request Router

Consider an office layout:

```
Customer
   │
   ▼
Receptionist
   │
 ┌─┴──────────────┐
 ▼                ▼
Employee 1    Employee 2
```

The customer does not go directly to an employee. They speak to the receptionist, who routes the request.

NGINX is that receptionist.

Instead of:

```
Browser
   │
   ▼
API #1
```

Use:

```
Browser
   │
   ▼
NGINX
   │
 ┌───────┼───────────────┐
 ▼       ▼               ▼
API1    API2            API3
```

##### 6.3 — Upstream Blocks

**Concept:** An upstream is NGINX’s named list of backend servers—like an array of API instances.

```
upstream pulsechat_api_upstream {

}
```

- An **upstream** is a list of backend servers — conceptually similar to an array.
- In JavaScript, that would be:

```js
const servers = [api1, api2, api3];
```

- NGINX calls this an `upstream`.
- this line `upstream pulsechat_api_upstream {...}` means `Create a backend group called: pulsechat_api_upstream`, you can call it anything like `backend`, `api`, `chat_servers`, `production_cluster`, all are valid names
- this line `server pulsechat-api:3000;` means `inside that group` there is one server `pulsechat-api at port 3000`
- notice something interesting, we never wrote, `localhost` we wrote `pulsechat-api` why?, because Docker Compose automatically creates `DNS`, every service name becomse a hostname inside docker exactly like `google.com`, `github.com`, docker has its own internal DNS
- Later, the upstream block will look like:

```
upstream pulsechat_api_upstream {

    server pulsechat-api-1:3000;

    server pulsechat-api-2:3000;

    server pulsechat-api-3:3000;

}
```

##### 6.4 — Sticky Sessions with `ip_hash`

**Concept:** WebSocket connections must return to the same backend during the handshake window. `ip_hash` routes a client IP consistently.

This is critical for WebSockets. Suppose `User A` connects.

NGINX sends him to `API #2`

They send another request. Without `ip_hash`, NGINX might route them to `API #1`.

The problem?

Their WebSocket connection lives on API #2.

API #1 knows nothing about it.

Connection breaks.

- `ip_hash` ensures that every request from the same client IP is routed to the same backend.

Example:

```
192.168.1.15

↓

API #2

↓

API #2

↓

API #2
```

Always.

This is called **sticky sessions**. The Redis adapter reduces the dependency on sticky sessions, but they remain a good practice.

##### Server Block

This is analogous to a NestJS controller.

In NestJS:

`@Controller('users')`

In NGINX

```
server {

}
```

This block handles incoming HTTP requests.

##### Listen

`listen 80;` means listen on `port 80` inside docker

Outside Docker, Compose maps:

```
8080

↓

80
```

##### Location

This applies to every request path:

```
/

users

auth

chat

socket.io

api
```

all paths

##### Proxy Pass

This is the most important directive: `proxy_pass http://pulsechat_api_upstream;`

It means NGINX does not handle the request itself — it forwards it.

Flow:

```
Browser

↓

NGINX

↓

API
```

NGINX does not generate the response; NestJS does. NGINX forwards the request and returns the response.

##### Why these headers?

proxy_set_header Host $host;

Suppose the browser requested:

chat.example.com

Without forwarding the Host header,

NestJS would receive

localhost

Instead of:

chat.example.com

So NGINX preserves the original request information.

Similarly:

proxy_set_header X-Real-IP $remote_addr;

Without it, every request appears to originate from `127.0.0.1`. With it, NestJS receives the client's real IP address.

This is very important for:

```
Rate limiting
Logging
Auditing
Security
```

##### WebSocket Upgrade

These two directives enable WebSocket support:

proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

A browser initially sends a normal HTTP request:

GET /chat

The client then requests a protocol upgrade to WebSocket. These headers instruct NGINX to allow the upgrade and keep the connection open.

Without them:

HTTP requests work
Swagger works
REST APIs work
❌ Socket.IO fails

##### Timeouts

```sh
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

HTTP requests typically complete in milliseconds.

WebSockets are different.

A user may stay connected for:

```
5 minutes
30 minutes
2 hours
```

With the default timeout (often 60 seconds), NGINX would close an idle WebSocket after one minute.

Setting these to one hour allows long-lived WebSocket connections.

##### Why container_name is removed

This is a critical Docker concept.

Currently:

`container_name: pulsechat_api`

Docker creates exactly one container with that name.

If you try to scale:

docker compose up --scale pulsechat-api=3

Docker attempts to create:

```
pulsechat_api
pulsechat_api
pulsechat_api
```

Three containers with the same name.

That is not possible.

By removing container_name, Docker automatically generates unique names like:

```
pulsechat-pulsechat-api-1
pulsechat-pulsechat-api-2
pulsechat-pulsechat-api-3
```

Scaling becomes possible.

##### Why replace ports with expose

Currently:

```
ports:
  - "3000:3000"
```

This publishes the port to the host machine.

With three API containers, they cannot all bind to host port 3000.

Instead, use:

```
expose:
  - "3000"
```

This keeps port 3000 available inside the Docker network only.

NGINX can still reach each API container, but your host doesn't need direct access to them.

Only NGINX exposes a host port (`8080`), serving as the single entry point.

This phase introduces three foundational production concepts found in nearly every scalable backend:

```
Horizontal scaling — running multiple identical application instances.
Reverse proxying — NGINX sits in front of your application and forwards requests.
Load balancing — distributing incoming traffic across multiple application instances.
```

## 6.2 — Scale the API to Multiple Instances

From this point forward, you will approach problems as both a backend and infrastructure engineer.

- By the end of this step, your architecture will look like this:

```
                    Browser
                       │
                       ▼
               localhost:8080
                       │
                       ▼
                   NGINX
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   PulseChat #1   PulseChat #2   PulseChat #3
        │              │              │
        └──────┬───────┴───────┬──────┘
               ▼               ▼
           PostgreSQL        Redis
```

All three application instances share the same PostgreSQL database and Redis instance.

This is exactly how most production applications work.

##### Before We Change Anything

Let's understand how Docker Compose scaling actually works.

Suppose we have this service:

```
pulsechat-api:
  build: .
```

Normally, Compose creates one container: `pulsechat-api`.

To scale, run:

**Checkpoint:**

```sh
docker compose up --scale pulsechat-api=3
```

Docker creates:

```
pulsechat-api-1

pulsechat-api-2

pulsechat-api-3
```

These are three independent Node.js processes.

Each one has:

```
its own memory
its own Socket.IO server
its own event loop
its own CPU usage
```

But they all connect to:

```
the same PostgreSQL
the same Redis
```

##### Why We Removed ports

Earlier we changed:

```
ports:
  - "3000:3000"
```

to

```
expose:
  - "3000"
```

Consider why this change is necessary.

Suppose three applications all try:

```
API1 → 3000

API2 → 3000

API3 → 3000
```

The host machine has only one port 3000. The second container would fail to bind.

Instead:

Inside Docker

```
API1 :3000

API2 :3000

API3 :3000
```

No conflict.

Only NGINX exposes: `localhost:8080`

##### Why expose Instead of: ports?

This distinction is a common interview topic.

ports

```
ports:
  - "3000:3000"
```

means:

`Publish this port to the outside world.`

Your browser can do: `localhost:3000`

expose

```
expose:
  - "3000"
```

means

`Only other Docker containers may access this port.`

Your browser cannot reach it directly.

NGINX can.

This approach is more secure.

**Checkpoint:**

```sh
docker compose --env-file .env down
docker compose --env-file .env up -d --build --scale pulsechat-api=3
```

##### Expected Problem (And Why It's Good)

Scaling may not work perfectly on the first attempt—and that is expected.

Why?

`Because our current NGINX configuration only knows about one backend:`

`server pulsechat-api:3000;`

It does not yet account for three API instances.

That is intentional.

We will encounter this issue, analyze it, and fix it together—the same workflow you would follow when troubleshooting in a production environment.


### Key Takeaways — Phase 6

- NGINX is the single public entry point; API containers stay on the internal network.
- Long `proxy_read_timeout` values are required for persistent WebSocket connections.
- Production traffic patterns: horizontal scaling, reverse proxying, load balancing.

---


# Phase 7 — Production Hardening

> **Phase goal:** Harden the backend for production with structured errors, logging, validation, and rate limits.

### What You Will Learn

- Return consistent socket and REST error shapes
- Validate Socket.IO payloads explicitly—there is no global pipe
- Replace file logging with stdout-friendly structured logs (Pino)
- Identify instances in logs with `INSTANCE_ID`
- Apply tiered rate limits to auth, messaging, and health endpoints

### Prerequisites

Phase 6 completed. NGINX on port 8080 fronts scaled API containers.

---


**Purpose:** Harden the backend for cleaner, safer production operation.

**Add the following:**

```
response DTOs
better socket error handling
validation for socket payloads
global exception filters
structured logging
rate limiting improvements
message ownership/security checks
.env.example
```

**Recommended implementation order:**

```
socket error handling cleanup
socket payload validation
response DTOs
better logs per API instance
.env.example
final project README/runbook
```

## 7.1 — Socket Error Handling

- Currently, when a socket event fails, the client may not receive a consistent error response.
- All socket errors should follow this structure:

```json
{
  "message": "You are not a participant of this conversation",
  "code": "FORBIDDEN"
}
```

1. Create helper `src/chat/utils/socket-error.util.ts`
2. In `chat.gateway.ts`, replace socket exceptions as follows:

```ts
throw new ForbiddenException('Socket is not authenticated');
// <!-- with the below -->
throw socketError('Socket is not authenticated', 'UNAUTHORIZED');
```

3. Socket Payload Validation

```
Invalid socket payload
→ rejected before business logic
→ clean exception response
```

Example invalid payload:

```
{
  "conversationId": "wrong-id"
}
```

Expected response:

```
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

- Socket.IO payloads are not validated like REST request bodies unless you add explicit validation.
- Apply that validation in `chat.gateway.ts`.

1. Create validation utility `src/chat/utils/validate-socket-payload.util.ts`

- After adding validation, rebuild Docker:

**Checkpoint:**

```sh
docker compose --env-file .env up -d --build --scale pulsechat-api=3
```

## 7.2 — Structured Logging with Pino

##### Why We Don’t Write Log Files in Docker

In Docker, writing logs to files is problematic:

```
logs/error.log
logs/combined.log
```

Containers are ephemeral. If a container restarts or is replaced, those files disappear unless you mount persistent volumes.

**Preferred production flow:**

`App logs → stdout/stderr → Docker logs → CloudWatch / ELK / Grafana / Datadog`

You may write log files locally, but in Docker and production, write to the console only.

##### Why INSTANCE_ID Matters

You now have:

```
pulsechat-api-1
pulsechat-api-2
pulsechat-api-3
```

If an error occurs, this log line is insufficient:

User connected

You need:

```
{
  "instanceId": "pulsechat-pulsechat-api-2",
  "msg": "User connected"
}
```

This tells you exactly which container handled the request or socket connection.

Inside Docker, every container already has a hostname, so use:

```
process.env.INSTANCE_ID || process.env.HOSTNAME
```

If `INSTANCE_ID` is not set manually, Docker assigns each container a unique hostname.

### Install Required Package

```sh
yarn add nestjs-pino pino-http pino
yarn add -D pino-pretty
```

### Replace Logger Module

Create or update `src/common/logger/logger.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

        transport: !isProduction
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
              },
            }
          : undefined,

        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },

        customProps: () => ({
          service: 'pulsechat-api',
          instanceId:
            process.env.INSTANCE_ID || process.env.HOSTNAME || 'local',
          environment: process.env.NODE_ENV || 'development',
        }),
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
```

### Remove Old AppLogger

You can delete or stop using:

`src/common/logger/logger.service.ts`

Do not use Winston for now.

Rebuild Docker:

- `docker compose --env-file .env up -d --build --scale pulsechat-api=3`
- Then verify logs with:
  - `docker logs -f pulsechat-pulsechat-api-3 `
  - `docker logs --tail=30 pulsechat-pulsechat-api-1`

## 7.3 — Global REST Exception Filter

- **Goal:** `All REST errors should return the same clean structure.`

Example:

```
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "path": "/auth/me",
  "timestamp": "2026-06-23T..."
}
```

##### Why This Is Needed

Currently, errors may vary depending on their source:

```
validation errors
Prisma errors
auth errors
unexpected server errors
```

A global exception filter makes REST errors predictable for the frontend.

### Create Filter

- Create `src/common/filters/http-exception.filter.ts`
- Register the global exception filter in `main.ts` as follows: `app.useGlobalFilters(new HttpExceptionFilter(logger));`
- Rebuild Docker: `docker compose --env-file .env up -d --build --scale pulsechat-api=3`
- Test with an invalid route: `curl http://localhost:8080/wrong-route`

## 7.4 — Tiered Rate Limiting

- **Goal**

```
Auth endpoints → strict
Message sending → medium
General APIs → normal
Health check → no limit
```

- **Recommended Limits**

```
/health              no throttle
/auth/login          5 requests / minute
/auth/register       5 requests / minute
/messages POST       30 requests / minute
/conversations GET   100 requests / minute
general APIs         100 requests / minute
```

- In `.env`, these values set the default limit to 100 requests per minute for general APIs:

```.env
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### Auth Strict Limit

```ts
// Auth Controller
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}

// message Controller
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Get(':conversationId')

// app.controller
@SkipThrottle()
@Get('health')
```

Login and register endpoints are expensive and sensitive, so they use stricter limits.

Message sending can be frequent but should still be protected from spam.

General APIs require standard protection.

### 7.5 — Message Ownership and Security Checks

We already enforce: `Only conversation participants can send/read messages`

Next, tighten edge cases:

1. Validate that the conversation exists
2. Prevent sending empty or whitespace-only messages
3. Prevent users from accessing messages outside their conversations
4. Standardize `Forbidden` vs `NotFound` responses

**Recommended security rule:** `If user is not a participant, return 404 or 403?`

For chat applications, return **404** for conversation access: `Conversation not found`

A **403** response confirms the conversation exists.

For the following endpoints:

```
GET /conversations/:id
GET /messages/:conversationId
POST /messages
```

return `404 Conversation not found` when the user is not a participant.


### Key Takeaways — Phase 7

- In Docker, log to stdout—containers are ephemeral.
- Return 404 (not 403) for unauthorized conversation access to avoid leaking existence.
- Auth endpoints deserve the strictest throttle limits.

---


# Phase 8 — Chat Product Features

> **Phase goal:** Implement product-grade chat features: statuses, read receipts, previews, edits, deletes, and group management.

### What You Will Learn

- Model message lifecycle: SENT → DELIVERED → READ
- Denormalize `lastMessagePreview` for fast conversation lists
- Compute unread counts from `ConversationParticipant.lastReadAt`
- Use soft delete and edit timestamps for auditability
- Expose group management via REST first, then broadcast over Socket.IO

### Prerequisites

Phases 1–7 completed. Multi-instance realtime stack must be stable.

---


### Features in This Phase

Optional but valuable additions:

```
Message Statuses
Delivered Status
Read Receipts
Last Message Preview
Unread Counts
Edit Message
Delete Message
Group Management
Leave Conversation
```

## 8.1 — Message Statuses

**Concept:** Message status (`SENT`, `DELIVERED`, `READ`) is the foundation for delivery receipts, read receipts, and unread counts. Store status on the row—not in a separate events table—for simpler queries.

This is the foundation for nearly all subsequent features.

Instead of storing only:

```
Message
-------
id
content
senderId
createdAt
```

The schema will support:

```
Message
-------
id
content
senderId

status
editedAt
deletedAt

createdAt
updatedAt

where

SENT
DELIVERED
READ
```

All other features build on this model.

- Update `prisma/schema.prisma` and add the `MessageStatus` enum
- In the `Message` model, add `status MessageStatus @default(SENT)`. Every new message starts as `SENT`. Later: `Receiver gets message → DELIVERED
Receiver opens chat → READ`
- `editedAt DateTime?` — `null` means the message was never edited.
- `deletedAt DateTime?` — `null` means the message is active. When set, the message is soft-deleted.
- Rows are not hard-deleted; chat history requires auditability and consistency.

```sh
# Run Migrations
docker compose --env-file .env up -d postgres redis

docker compose --env-file .env run --rm pulsechat-api npx prisma migrate dev --name add_message_status_lifecycle
npx prisma generate
```

## 8.2 — Delivered Status

**Concept:** When a receiver’s client acknowledges receipt, the server promotes `SENT → DELIVERED` and broadcasts the update to the conversation room.

```
Flow:

Sender
   │
send_message
   │
Server
   │
save DB
   │
emit new_message
   │
Receiver joins
   │
Receiver ACK
   │
Server
   │
update Delivered
   │
broadcast status
```

- **`SENT → DELIVERED`:** When a receiver receives a message, their client emits `message_delivered`.
  The server then:

```
checks participant
checks receiver is not sender
updates message status to DELIVERED
broadcasts message_delivered
```

- `src/chat/dto/message-delivered.dto.ts`

## 8.3 — Read Receipts

**Concept:** Opening a conversation means the user has seen messages. Mark all others’ messages as `READ` and broadcast `messages_read` to participants.

When a conversation opens, emit `mark_messages_read`:

```
Server

↓

UPDATE Message
SET status = READ

↓

broadcast

messages_read

```

- **`DELIVERED → READ`:** When a user opens a conversation, the client emits `message_read`. The backend then marks all messages in that conversation as `READ`, except the user's own messages.
- `src/chat/dto/message-read.dto.ts`
- Add method in `MessagesService`: `markConversationMessagesRead`
- Add socket event in `ChatGateway`: `handleMessagesRead`

## 8.4 — Last Message Preview

**Concept:** Conversation lists should not join the full messages table on every request. Denormalize `lastMessageId`, `lastMessagePreview`, and `lastMessageAt` on `Conversation`.

Instead of computing the preview on every request, the `Conversation` model stores:

```
lastMessageId
lastMessagePreview
lastMessageAt
```

This makes the conversation list extremely fast to load.

- Add the following fields to the Prisma `Conversation` model:

```
lastMessageId      String?
lastMessagePreview String?
lastMessageAt      DateTime?
```

**Checkpoint:**

```sh
docker compose --env-file .env up -d postgres redis

docker compose --env-file .env run --rm pulsechat-api npx prisma migrate dev --name add_last_message_preview
npx prisma generate
```

## 8.5 — Unread Counts

**Concept:** Store `lastReadAt` on `ConversationParticipant`. Unread count = messages after that timestamp where `senderId ≠ currentUserId`.

This is the first substantially complex feature.

Several database designs are possible.

We will use the scalable approach employed by large chat systems.

- Add to `ConversationParticipants`: `lastReadAt DateTime?`

**Why?**

Unread count for a user becomes:

```
messages after participant.lastReadAt
AND senderId != currentUserId
```

- In `markConversationMessagesRead`, after `updateMany`, also update the participant:

```ts
await this.prisma.conversationParticipant.update({
  where: {
    conversationId_userId: {
      conversationId,
      userId: currentUserId,
    },
  },
  data: {
    lastReadAt: new Date(),
  },
});
```

- Add unread count to `getMyConversations`

## 8.6 — Edit Message

**Concept:** Only the sender may edit. Set `editedAt` and update `content` in place—never insert a new row. Implement via REST first; the gateway broadcasts `message_edited`.

Only the sender may edit a message.

Store `editedAt`.

The frontend displays `Edited`.

- **Goal**

```
Only the sender can edit their own message.
Deleted messages cannot be edited.
Empty content is not allowed
Edited messages keep the same row.
editedAt is updated
We update content + editedAt.
Socket room receives message_edited event
```

- Add `PATCH /messages/:messageId`
- Add a socket event: `message_edited`
- **Recommended flow:** `REST first → then Socket.IO broadcast`

##### Why This Approach Works

Edit logic is not duplicated inside the gateway.

This call:

`this.messagesService.updateMessage(...)`

already handles:

```
sender ownership
conversation membership
empty content
deleted message protection
editedAt update
```

The gateway is responsible only for realtime broadcasting.

## 8.7 — Delete Message (Soft Delete)

**Concept:** Hard deletes break audit trails. Set `deletedAt` and replace content with a placeholder string. Deleted messages cannot be edited.

Use soft delete.

Instead of removing the row:

```
content = NULL

deletedAt = now()
```

The frontend displays:

```
This message was deleted
```

- Implement soft delete, not hard delete.

```
deletedAt = now()
content = null or "This message was deleted"
```

- Because the current Prisma `content` field is likely a required `String`, keep the initial implementation simple:

```
content = "This message was deleted"
deletedAt = now()
```

`DELETE /messages/:messageId`

```
Only sender can delete
Already deleted messages should not be deleted again
Deleted messages cannot be edited
Conversation room receives message_deleted
```

## 8.8 — Group Management

**Concept:** Group operations (rename, add/remove participants) are authorization-sensitive. Enforce rules in the service layer, expose REST endpoints, then broadcast socket events.

**Endpoints:**

```
Add participant

Remove participant

Rename group

Update avatar
```

- Add these REST APIs first:

```
PATCH /conversations/:id/title
POST  /conversations/:id/participants
DELETE /conversations/:id/participants/:userId
```

- **Rules**

```
Only participants can manage group
Only group conversations can be managed
Cannot remove the last participant
Cannot add duplicate participant
```

## 8.9 — Leave Conversation

**Concept:** A participant may leave a group voluntarily, but the last member cannot leave—otherwise the conversation becomes orphaned.

`DELETE /conversations/:id/leave`

or

`POST /conversations/:id/leave`

depending on your API style.

```
Only participants can leave
Only group conversations can be left
Cannot leave if you are the last participant
```

- After completing all Phase 8 work, run migrations locally and regenerate the Prisma client:

**Checkpoint:**

```sh
npx prisma migrate dev --name phase_8_chat_product_features
npx prisma generate

# docker
docker compose --env-file .env up -d --build --scale pulsechat-api=3

# Confirm migration inside docker
docker logs --tail=80 pulsechat-pulsechat-api-1
npx prisma studio
```


### Key Takeaways — Phase 8

- Each product feature gets its own Prisma migration.
- REST services own business rules; gateways only broadcast results.
- Soft delete preserves history while hiding content from users.

---


# Phase 9 — Testing

> **Phase goal:** Plan and execute a testing strategy covering services, REST, sockets, and multi-instance behavior.

### What You Will Learn

- Write unit tests for service-layer business logic
- Add e2e tests for REST flows with authentication
- Build socket integration tests with `socket.io-client`
- Verify Redis adapter behavior across instances
- Inspect the database with Prisma Studio against Docker Postgres

### Prerequisites

All prior phases completed or the feature under test is implemented.

---


Add the following test coverage:

```
unit tests for services
e2e tests for REST APIs
socket integration tests
multi-instance Redis adapter test
```

1. Run Prisma Studio against the Docker database:

```sh
# first pull the tables to check if we are getting the tables
npx prisma db pull \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public"

# Then run the studio
npx prisma studio \
  --url="postgresql://chat_user:chat_password@localhost:5433/pulsechat?schema=public" \
  --port 5555
```

### Key Takeaways — Phase 9

- Test the service layer first—it is the source of truth for business rules.
- Socket tests require running servers and valid JWT tokens from `.env`.
- For local Prisma against Docker Postgres, use `localhost:5433` as the host.

---

