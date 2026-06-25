## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

# Phase 0 — Project Setup

### Create Nest Js APP

```sh
sudo npm i -g @nestjs/cli
nest new <ProjectName> --strict # to create project in current directory use dot.
yarn add @types/mocha --dev
yarn add @nestjs/swagger
```

- add the following code to `main.ts` for swagger

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
// update the baseUrl: ./ to path

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

### Husky (git hooks)

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

**Run**

- Hooks run automatically on `git commit`.
- After clone or pull, run `yarn` — the `prepare` script installs hooks.
- Test manually: `yarn lint-staged` or `sh .husky/pre-commit`.

### Docker setup

- create the `docker-compose.yml` file
- Add the postgres and redis image
- run the `docker compose up -d` to install the images

### Config

- install config package
- update the `src/app.module.ts` and `src/app.controller.ts`
- run the development enviroment and test the response

```bash
npm install @nestjs/config
```

---

---

### Switch Express → Fastify

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
- In controllers/guards, use `FastifyRequest` / `FastifyReply` instead of Express types.
- E2E tests need `FastifyAdapter` too — see `test/app.e2e-spec.ts`.
- Put static files in `public/` — served at `/public/`.

### Database Setup with Prisma

### Install Prisma

- first install prisma
- then initialie prisma
- update the `prisma/schema.prisma` and add the database url to the datasource db
- Add the Model User to the `schema.prisma`
- Then run migrations

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

## Add Prisma Service in Nest JS

- Cretae prisma module

```sh
nest g module prisma # src/prisma/prisma.module.ts
nest g service prisma # src/prisma/prisma.service.ts
```

---

---

# Phase 1 - Authentication and Jwt Guards

### Authentication

- Registration Flow

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

- Login Flow

```
Client sends email and password
        ↓
Find user by email
        ↓
Compare password with hashed password
        ↓
If valid, return JWT token
```

- Protected Route Flow

```
Client sends Authorization: Bearer <token>
       ↓
JwtAuthGuard checks token
       ↓
If valid, user data is attached to request
       ↓
Controller can access current user
```

### Step - Install Packages

- We are not using `Passport` yet.
- Later we can add `Passport` if needed.

```sh
yarn add @nestjs/jwt bcrypt
yarn add -D @types/bcrypt
yarn add class-validator class-transformer
```

### Step 2 — Add JWT Config to .env

- Add JWT Config to env

```sh
JWT_SECRET="super-secret-change-this-later"
JWT_EXPIRES_IN="7d"
```

### Step 3 — Add Global Validation Pipe

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

### Step 4 — Generate Modules

```sh
nest g module users
nest g service users

nest g module auth
nest g controller auth
nest g service auth
```

### Step 5 — Create DTOs

- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`

### Step 6 — UsersService

- update these files according to the functionality

- `src/users/users.service.ts`
- `src/users/users.module.ts`

### Step 7 - JWT Auth Guard + Current User Decorator

- `src/auth/types/jwt-payload.type.ts`
- `src/auth/guards/jwt-auth.guards.ts`
- `src/auth/decorators/current-user.decorator.ts`
- - with out this decorator

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

---

# Phase 2 - Conversation & Message Data Model

By the end of this phase, we will have:

- ✅ Conversation database schema
- ✅ Message database schema
- ✅ Conversation participants
- ✅ Prisma relationships
- ✅ Migration
- ✅ Prisma Studio verification
- ✅ First Conversation APIs (REST)
- ✅ Swagger documentation

Notice that we are still NOT touching Socket.IO.
Why?
Because Realtime is just a transport layer.
If your database and business logic are poorly designed, Socket.IO will only make those problems happen faster.

## The Big Picture

Imagine WhatsApp. You don't actually send a message directly to another user. The message belongs to a Conversation, not directly to another user.

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

Why?

Because tomorrow you may have:

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

This scales forever

## Database Design

We'll create three new tables.

1. User -> this table already exist
2. Conversation -> Represents a chat
3. ConversationParticipant -> this connects Users and Conversations
4. Message -> this Stores every message ever sent

```
Conversation 1

↓

Haris

↓

Ali
```

## Final Relationship

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

## Why We Need a Join Table

Question: Why not simply do:

```
Conversation

users[]
```

Because relational databases don't store arrays of foreign keys well.

Instead we normalize the data.

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

## Messages

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

Notice: No receiverId.

The conversation already knows who the participants are.

## What About Read Receipts?

Not yet.

We'll add those later.

This is exactly how professional software is built:

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

Each feature gets its own migration.

## Why Aren't We Storing Online Status?

Because online status is temporary.

Database:

```
User

online = true
```

That is `Bad`.

Suppose the server crashes.

Everyone remains: `online = true`

Wrong.

Instead:

Redis

```
user:123

online
```

Redis stores temporary state.

Postgres stores permanent state.

This separation is one of the most important architectural concepts you'll learn.

## Folder Strucutre

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

## Adding Loggers

- There are 2 options

### Option A

- install pacakges `yarn add winston nest-winston` for fastify add this as well `yarn add nestjs-pino pino-http pino-pretty`
- create the `src/common/logger/logger.service.ts`

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

- import it in the `app.module.ts`
- update the `main.ts`

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

- usage

```ts
import { AppLogger } from 'src/common/logger/logger.service';

pubClient.on('connect', () => this.log.log('Redis pub client connected'));
```

## Phase 2 Roadmap

We'll break this into small learning steps, just like we did with authentication.

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

## Phase 2 - Step 1: Prisma Data Model

- Open `Primsa/schema.prisma` and add the models for the `Conversation`, `Message`, `ConversationParticipants`

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

A user can be part of many conversations. But we don’t connect `User` directly to `Conversation`.

We connect through `ConversationParticipant` Because later this table can store extra data like:

```
joinedAt
role
muted
lastReadAt
leftAt
```

`messages Message[]` A User can send many messages

In the `Conversation` model `title` is optional becuase for 1-to-1 chat title can be empty but for group chat title needs to be there "Project Team" etc

`participants ConversationParticipant[]` This means that one conversation can have many participants

`ConversationParticipant` this is the join table

```
conversationId String
userId String
```

This connects: `User ↔ Conversation`

`@@unique([conversationId, userId])` This prevents duplicate participants. So the same user cannot be added twice to the same conversation.

`onDelete: Cascade` If a conversation is deleted, related participants are deleted automatically.
If a user is deleted, their participant rows are deleted automatically.

In the `Message` Model `conversationId String` Message belongs to one conversation.

`content String` For now, we only support text messages.

later we can add:

```
imageUrl
fileUrl
messageType
editedAt
deletedAt
```

- Now we need to run migrations and generate the prisma client and then open the studio to check

```sh
npx prisma migrate dev --name add_conversations_and_messages
npx prisma generate
npx prisma studio
```

in the studio you should now see

```
User
Conversation
ConversationParticipant
Message
```

## Phase 2 — Step 2: Conversation Module + First API

- we will create `POST /conversations`, this api will:

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

in the `conversations.service.ts`:

- `[...new Set([currentUserId, ...dto.participantIds]),];` this reomves duplicate users
- `if (uniqueParticipantIds.length < 2)` A chat with yourself isn't valid for now
- ```
  participants: {
    create: uniqueParticipantIds.map(...)
  }
  ```

this creates the conversation and participant rows together

Now we need to update the `conversation.controller.ts`

```
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
```

Applied at controller level. So all routes inside this controller are protected.
`@CurrentUser() user` this gets the logged in user from the JWT guard

at this point we have called the `/conversation` post request with the following payload

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

if you have notifice the first id is our own, so our duplicate removal functionality also worked

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

- `in similar way we will be creating the messages as well`

## Phase 2 - Step 3 - Pagination to the Messages api

- so far we have added the conversation, getconversationById, get all conversations, create message and get messages by conversations
- now we need to add the pagination to the `getMessageByConversations` api,

### Why Pagination?

Right now, this endpoint returns all messages.

That is fine with 5 messages.

But imagine:

`1 conversation = 50,000 messages`

Bad API:

GET `/messages/:conversationId`
→ returns 50,000 messages

Problems:

```
slow response
high database load
huge frontend memory usage
bad mobile performance
```

So instead we load messages in chunks.

### Pagination Style for Chat

For chat apps, we usually use:

limit
cursor

Example:

GET `/messages/:conversationId?limit=20`

Then for older messages:

GET `/messages/:conversationId?limit=20&cursor=message-id`

This means:

Give me 20 messages older than this message.

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
const items = hasNextPage ? messages.slice(0, limit) : messagescur;
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

---

# Phase 3 - Scoket.io Gateway

- We’ll start with the simplest Socket.IO gateway first, then gradually add JWT auth, rooms, Redis adapter, and message broadcasting
  By the end of this step, we will have:

```
Socket.IO server running
Client can connect
Server logs connection/disconnection
Client can send ping event
Server replies with pong event
```

- No JWT yet. No chat rooms yet. No Redis adapter yet.

```sh
yarn add @nestjs/websockets @nestjs/platform-socket.io socket.io
# socket.io-client only for local testing
yarn add -D socket.io-client
nest g module chat
nest g gateway chat
```

- create the `chat.gateway.ts` and add the connection, disconnect and ping handlers
- create the `socket-test.ts` and install the `tsx` if its not installed

```sh
yarn add -D tsx
# run the code
yarn start:dev
# run the socket-test in separate terminal
npx tsx socket-test.ts
```

- at this point our socket-io server is alive and event round trip is working fine
- now we need to add the JWT for scoket.io

```sh
npx tsx socket-test.ts
# Connected to server
# Pong received from server {
#   socketId: 'OyVKTx92Hf40k6bHAAAB',
#   message: 'Hello from test client',
#   timestamp: '2026-06-21T09:20:30.490Z'
# }
```

## Phase 3 - Step 1 - JWT Authentication for Scoket.io

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

## Phase 3 - step 2 - Join Conversation room

- we will add socket event `join_conversation`
- we will add the dto for the `join-conversation.dto.ts`
- now we need to add service to check "Is this user inside this conversation?" `isUserParticipant` in the `conversation.service.ts`
- Import the `conversation` module into the chat module
- update the chat gateway

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

- now we need to update the `socket-test.ts` from using dummy data to use the actual room conversation

```ts
// ..............
// ..............
// ..............
socket.on('authenticated', () => {
  socket.emit('join_conversation', {
    conversationId,
  });
});

socket.on('conversation_Joined', (data) => {
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

## Phase 3 - Step 3 - Socket send_message

- this event will

```
receive socket message
→ verify user is participant
→ save message in Postgres
→ update conversation.lastMessageAt
→ emit new_message to conversation room
```

## Phase 3 - Step 4 - Typing Indicators

- We will add two socket events
- When User A starts typing, User B receives `user_typing_start`
- When User A stops typing, User B receives `user_typing_stop`

```
typing_start
typing_stop
```

- for testing add the below to the test - a

```ts
// ............
// ............
// ............
socket.on('conversation_Joined', (data) => {
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

- and add this to the test- b

```ts
// ............
// ............
// ............

// ............
// ............
// ............
```

## Phase 3 - Step 5 - Presence System with Redis

We will track

```
online
offline
connected sockets per user
```

Why Redis?

Presence is temporary.

Do not save this in Postgres:

`user.online = true`

Because if the server crashes, users may remain incorrectly online.

Redis is better for temporary state.

### Presence Logic

One user can have multiple sockets:

```
Haris
 ├── Browser tab 1
 ├── Browser tab 2
 └── Mobile app
```

So we should not mark user offline until all sockets disconnect.

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

- in the presence service we need to add the following funcitonalites `isOnline`, `getSockets` `removeSocket` to check online status, get the total count of the online sockets and remove socket
- then we uitilize these in the `chat` service handle connect and handle disconnect
- Afther this we need to add `/users/online-status` api to check which users are online
- After that we need to improve the online-offline presence broadcasting relevant to users only
  Right now we are probably doing:

`this.server.emit('user_online', ...)`

That sends the event to everyone connected.

Bad for production.

Instead, we want:

```
When Haris comes online
→ notify only users who share conversations with Haris
```

we need to add this funciton to the `conversation.service.ts`, This finds all conversations where this user is a participant.

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

Then we need to add helper method inside the chatGateway `emitPresenceToUserConversation`

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

// in the hanleConnection and handleDisconnect
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

# Phase 4 — Redis Adapter for Socket.IO

Purpose: make realtime work across multiple backend instances.
We will add:

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

- create `src/chat/adapters/redis-io.adapter.ts`
  Default behavior: `Instance A only knows Instance A sockets`
  Redis adapter behavior: `Instance A can emit to rooms containing sockets on Instance B`

### Register Adapter in main.ts

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

### Cross-instance Redis Adapter test

```
Client A → backend port 3000
Client B → backend port 3001

Both join same conversation room

Client A sends message
Client B receives new_message
```

```sh
PORT=3000 yarn start:dev

# in the separate terminal run
PORT=3001 yarn start:dev
#  <OR>
PORT=3001 npx nest start --watch
```

- update the `scoket-test-b.ts`

Why this proves Redis Adapter

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

# Phase 5 — Multi-instance Docker Setup

Purpose: run multiple PulseChat backend containers.

We will add:

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

Phase 5 Steps

1. Create .dockerignore
2. Create Dockerfile
3. Update docker-compose.yml
4. Run backend inside Docker
5. Test REST APIs
6. Test Socket.IO from Docker backend
7. Scale to multiple backend containers

- After adding the `Dockerfile` and updating the `Docker-compose.yml` file

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

- after successful api calls on the docker multi-instance setup
- test the `npx tsx sockets-tests/socket-test-a.ts`

# Phase 6 — NGINX Load Balancing

Purpose: put 3 backend instances behind one entry point.

We will add:

```
NGINX config
WebSocket upgrade headers
load balancing
test clients connected to different instances
```

- Goal

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

instead of:

`io('http://localhost:3000/chat')`

- create `nginx/default.conf`
- update the `docker-compose.yml` file for the nginx

##### Without Nginx

- without nginx, your architecture looks like this

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

This is perfect for development, but imagine you have:

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

your application is only using `one`.

So the first question becomes: `How do we utilize all CPU cores?`

The answer is: `Run multiple instances of the application.`

- instead of this

```
             One Instance

        ┌──────────────────┐
        │  NestJS API       │
        │  Port 3000        │
        └──────────────────┘
```

we do this

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

- Problem #1

If the browser sends a request...

Where should it go?

```
3001 ?

3002 ?

3003 ?
```

The browser doesn't know.

That's where NGINX comes in.

- Think of NGINX like a Receptionist

Imagine an office.

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

The customer never directly goes to Employee 1.

He talks to the receptionist.

The receptionist decides.

NGINX is that receptionist.

instead of

```
Browser
   │
   ▼
API #1
```

we do

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

What is an Upstream?

```
upstream pulsechat_api_upstream {

}
```

- Upsteadm is simply `A list of backend servers.` Think of it like an array.
- in javascript it will be

```js
const servers = [api1, api2, api3];
```

- Nginx calls this: `upsteam`
- this line `upstream pulsechat_api_upstream {...}` means `Create a backend group called: pulsechat_api_upstream`, you can call it anything like `backend`, `api`, `chat_servers`, `production_cluster`, all are valid names
- this line `server pulsechat-api:3000;` means `inside that group` there is one server `plusechat-api at port 3000`
- notice something intersting, we never wrote, `localhost` we wrote `pulsechat-api` why?, ebcuase Docker Comppose automaitcaly creates `DNS`, every service name becomse a hostname inside docker exactly like `google.com`, `github.com`, docker has its own internal DNS
- later we will simply do

```
upstream pulsechat_api_upstream {

    server pulsechat-api-1:3000;

    server pulsechat-api-2:3000;

    server pulsechat-api-3:3000;

}
```

##### What does ip_hash do?

- This is extremely important for WebSockets.
  Suppose: `User A` connects.

NGINX sends him to `API #2`

Now he sends another request. Without `ip_hash` NGINX might send him to `API #1`

The problem?

His WebSocket lives on API #2.

API #1 knows nothing about it.

Connection breaks.

- ip_hash says `Every request from the same client IP should always go to the same backend.`
  example

```
192.168.1.15

↓

API #2

↓

API #2

↓

API #2
```

Always

- this is called `Sticky Sessions`, Later we'll discuss why Redis Adapter makes sticky sessions less critical, but it's still a good practice.

##### Server Block

- This is exactly like a NestJS controller.
  In Nest:

`@Controller('users')`

In NGINX

```
server {

}
```

means

Handle incoming HTTP requests.

##### Listen

`listen 80;` means listen on `port 80` inside docker

- outside docker compose maps it

```
8080

↓

80
```

##### Location

For every request.

```
/

users

auth

chat

socket.io

api
```

everything

##### Proxy Pass

- This is the most important line. `proxy_pass http://pulsechat_api_upstream;`
  this means `Don't handle the request yourself.` forward it

Think of it like:

```
Browser

↓

NGINX

↓

API
```

NGINX doesn't generate the response.

NestJS does.

NGINX simply forwards the request and returns the response.

##### Why these headers?

proxy_set_header Host $host;

Suppose browser requested

chat.example.com

Without forwarding the Host header,

NestJS would receive

localhost

instead of

chat.example.com

So NGINX preserves the original request information.

Similarly:

proxy_set_header X-Real-IP $remote_addr;

Without it,

every request appears to come from

127.0.0.1

Instead,

NestJS receives the user's real IP.

This is very important for:

```
Rate limiting
Logging
Auditing
Security
```

##### WebSocket Upgrade

These two lines are the magic behind WebSockets:

proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

A browser initially sends a normal HTTP request:

GET /chat

Then it says:

"I don't want HTTP anymore. Please upgrade this connection to WebSocket."

These headers tell NGINX:

"Allow the protocol upgrade and keep the connection open."

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

Normally, HTTP requests finish in milliseconds.

WebSockets are different.

A user may stay connected for:

```
5 minutes
30 minutes
2 hours
```

If NGINX had the default timeout (often 60 seconds), it would close an idle WebSocket after one minute.

Setting these to one hour allows long-lived WebSocket connections.

##### Why container_name is removed

This is one of the most important Docker concepts.

Currently:

`container_name: pulsechat_api`

means Docker creates exactly one container with that name.

If you try to scale:

docker compose up --scale pulsechat-api=3

Docker attempts to create:

```
pulsechat_api
pulsechat_api
pulsechat_api
```

Three containers with the same name.

That's impossible.

By removing container_name, Docker automatically generates unique names like:

```
pulsechat-pulsechat-api-1
pulsechat-pulsechat-api-2
pulsechat-pulsechat-api-3
```

Now scaling becomes possible.

##### Why replace ports with expose

Currently:

```
ports:
  - "3000:3000"
```

This publishes the port to your Mac.

With three API containers, they can't all bind to host port 3000.

Instead, use:

```
expose:
  - "3000"
```

This keeps port 3000 available inside the Docker network only.

NGINX can still reach each API container, but your host doesn't need direct access to them.

Only NGINX exposes a host port (8080), becoming the single entry point.

This phase introduces three foundational production concepts you'll see in almost every scalable backend:

```
Horizontal scaling — running multiple identical application instances.
Reverse proxying — NGINX sits in front of your application and forwards requests.
Load balancing — distributing incoming traffic across multiple application instances.
```

## Phase 6 — Step 2: Scale the API to Multiple Instances

From this point, you'll start thinking like a Backend + Infrastructure Engineer, which is a huge skill upgrade.

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

- Notice something important: `All three applications share the same database and the same Redis instance.`

This is exactly how most production applications work.

##### Before We Change Anything

Let's understand how Docker Compose scaling actually works.

Suppose we have this service:

```
pulsechat-api:
  build: .
```

Normally, Compose creates: `pulsechat-api`

one container.

But if we execute:

```sh
docker compose up --scale pulsechat-api=3
```

Docker creates:

```
pulsechat-api-1

pulsechat-api-2

pulsechat-api-3
```

These are three completely independent Node.js applications.

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

Let's understand why.

Suppose three applications all try:

```
API1 → 3000

API2 → 3000

API3 → 3000
```

Your Mac has only one port 3000.

The second application immediately fails.

Instead:

Inside Docker

```
API1 :3000

API2 :3000

API3 :3000
```

No conflict.

Only NGINX exposes: `localhost:8080`

##### Why expose instead of ports?

This is a very common interview question.

ports

```
ports:
  - "3000:3000"
```

means

`Publish this port to the outside world.`

Your browser can do: `localhost:3000`

expose

```
expose:
  - "3000"
```

means

`Only other Docker containers may access this port.`

Your browser cannot.

NGINX can.

This is more secure.

```sh
docker compose --env-file .env down
docker compose --env-file .env up -d --build --scale pulsechat-api=3
```

##### Expected Problem (And Why It's Good)

I actually expect the scaling to not work perfectly on the first try.

Why?

`Because our current NGINX configuration only knows about one backend:`

`server pulsechat-api:3000;`

It doesn't yet know there are three API instances.

That's intentional.

We're going to hit that issue, analyze it, and then fix it together. It's exactly how you'd troubleshoot this in a real production environment.

# Phase 7 — Production Hardening

Purpose: make the backend cleaner and safer.

We should add:

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

Recommended order:

```
socket error handling cleanup
socket payload validation
response DTOs
better logs per API instance
.env.example
final project README/runbook
```

## Step 1 — Socket Error Handling

- Right now, if something fails inside a socket event, the client may not always get a clean response.
- We want all socket errors to look like this:

```json
{
  "message": "You are not a participant of this conversation",
  "code": "FORBIDDEN"
}
```

1. Create helper `src/chat/utils/socket-error.util.ts`
2. Replace socket exceptions in the `chat.gateways.ts` replace it like this

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

Example bad payload:

```
{
  "conversationId": "wrong-id"
}
```

Should return:

```
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

- But Socket.IO payloads are not being validated like REST bodies unless we explicitly validate them.
- Then use that validation in the `chat.gateway.ts`

1. Create validation utility `src/chat/utils/validate-socket-payload.util.ts`

- After adding the validations rebuild the docker

```sh
docker compose --env-file .env up -d --build --scale pulsechat-api=3
```

## Phase 7 - Step 2 - Strucutred Logging

##### Why we don’t write files in Docker

In Docker, this is bad:

```
logs/error.log
logs/combined.log
```

Because containers are temporary. If the container restarts or is replaced, those files can disappear unless you mount volumes.

Better production flow:

`App logs → stdout/stderr → Docker logs → CloudWatch / ELK / Grafana / Datadog`

So locally you may write files, but in Docker/production, output to console only.

##### Why INSTANCE_ID matters

You now have:

```
pulsechat-api-1
pulsechat-api-2
pulsechat-api-3
```

If an error happens, this log is not enough:

User connected

You need:

```
{
  "instanceId": "pulsechat-pulsechat-api-2",
  "msg": "User connected"
}
```

Then you know exactly which container handled the request/socket.

Inside Docker, every container already has a hostname, so we can use:

```
process.env.INSTANCE_ID || process.env.HOSTNAME
```

If INSTANCE_ID is not manually provided, Docker gives each container a unique hostname.

### Install required package

```sh
yarn add nestjs-pino pino-http pino
yarn add -D pino-pretty
```

### Replace logger module

Create/Update the `src/common/logger/logger.module.ts`

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

### Remove old AppLogger

You can delete or stop using:

`src/common/logger/logger.service.ts`

Do not use Winston for now.

rebuild docker

- `docker compose --env-file .env up -d --build --scale pulsechat-api=3`
- Then run this to test the logs
- - `docker logs -f pulsechat-pulsechat-api-3 `
- - `docker logs --tail=30 pulsechat-pulsechat-api-1`

## Phase 7 - Step 2 - Global Exception

- Goal `All REST errors should return the same clean structure.`

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

Why we need this

Right now errors may look different depending on where they come from:

```
validation errors
Prisma errors
auth errors
unexpected server errors
```

A global exception filter makes REST errors predictable for frontend.

### Create Filter

- Create `src/common/filters/http-exception.filter.ts`
- Register that Global Exception filter in the `main.ts` like this `app.useGlobalFilters(new HttpExceptionFilter(logger));`
- Rebuild the docker `docker compose --env-file .env up -d --build --scale pulsechat-api=3`
- test it using wrong route `curl http://localhost:8080/wrong-route`

## Phase 7 - Step 4 - Rate Limiting Improvements.

- Goal

```
Auth endpoints → strict
Message sending → medium
General APIs → normal
Health check → no limit
```

- Recommended Limits

```
/health              no throttle
/auth/login          5 requests / minute
/auth/register       5 requests / minute
/messages POST       30 requests / minute
/conversations GET   100 requests / minute
general APIs         100 requests / minute
```

- .env -> this means normal APIs get 100 requests per minute

```.env
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### Auth strict limit

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

Login/register are expensive and sensitive, so stricter.

Message sending can be frequent, but should still be protected from spam.

General APIs need normal protection.

### Message Ownership / Security Checks

We already check: `Only conversation participants can send/read messages`

Now we should tighten edge cases:

1. validate conversation exists
2. prevent sending empty/whitespace messages
3. prevent users from accessing messages outside their conversations
4. standardize Forbidden vs NotFound

Recommended security rule: `If user is not a participant, return 404 or 403?`

For chat apps, I recommend 404 for conversation access: `Conversation not found`

Because 403 confirms the conversation exists.

So for:

```
GET /conversations/:id
GET /messages/:conversationId
POST /messages
```

we should return: `404 Conversation not found`

when the user is not a participant.

# Phase 8 — Chat Product Features

Optional but useful:

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

## Phase 8.1 — Message Statuses

This is the foundation for almost everything else.

Instead of only storing:

```
Message
-------
id
content
senderId
createdAt

We'll support:

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

Everything else builds on this.

- update the `prisma/schema.prisma` and add the MessageStatus enum
- in the `Message` model we then add `status MessageStatus @default(SENT)`, Every new message starts as SENT. Later `Receiver gets message → DELIVERED
Receiver opens chat → READ`
- `editedAt DateTime?` Null means message was never edited.
- `deletedAt DateTime?` Null means message is active. If set, the message is soft-deleted.
- We are not deleting rows because chat history needs auditability and consistency.

```sh
# Run Migrations
docker compose --env-file .env up -d postgres redis

docker compose --env-file .env run --rm pulsechat-api npx prisma migrate dev --name add_message_status_lifecycle
npx prisma generate
```

## Phase 8.2 — Delivered Status

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

- `SENT → DELIVERED`, When a receiver gets a message, their client emits: `message_delivered`
  Then server:

```
checks participant
checks receiver is not sender
updates message status to DELIVERED
broadcasts message_delivered
```

- `src/chat/dto/message-delivered.dto.ts`

## Phase 8.3 — Read Receipts

After conversation opens: `mark_messages_read`

```
Server

↓

UPDATE Message
SET status = READ

↓

broadcast

messages_read

```

- `DELIVERED → READ`, When a user opens a conversation, the client emits: `message_read`, Then backend marks all messages in that conversation as READ, except the user’s own messages.
- `src/chat/dto/message-read.dto.ts`
- Add method in MessagesService `markConversationMessagesRead`
- Add socket event in ChatGateway `handleMessagesRead`

## Phase 8.4 — Last Message Preview

Instead of calculating every time: `Conversation`

stores

```
lastMessageId
lastMessagePreview
lastMessageAt
```

Conversation list becomes extremely fast.

- Add to Prisma `Conversation`

```
lastMessageId      String?
lastMessagePreview String?
lastMessageAt      DateTime?
```

```sh
docker compose --env-file .env up -d postgres redis

docker compose --env-file .env run --rm pulsechat-api npx prisma migrate dev --name add_last_message_preview
npx prisma generate
```

## Phase 8.5 — Unread Counts

This is the first "hard" feature.

There are several possible database designs.

We'll choose the scalable one used by large chat systems.

- Add this to the `ConversationParticipants`: `lastReadAt DateTime?`

Why?

Unread count for a user becomes:

```
messages after participant.lastReadAt
AND senderId != currentUserId
```

- In `markConversationMessagesRead`, after `updateMany`, also update participant:

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

## Phase 8.6 — Edit Message

Only sender can edit.

Store `editedAt`

Frontend shows `Edited`

- Goal

```
Only the sender can edit their own message.
Deleted messages cannot be edited.
Empty content is not allowed
Edited messages keep the same row.
editedAt is updated
We update content + editedAt.
Socket room receives message_edited event
```

- We will add `PATCH /messages/:messageId`
- and later a socket event: `message_edited`
- Recommended flow `REST first → then Socket.IO broadcast`

##### Why this is good

We are not duplicating edit logic inside the gateway.

This line:

`this.messagesService.updateMessage(...)`

already handles:

```
sender ownership
conversation membership
empty content
deleted message protection
editedAt update
```

The gateway only handles realtime broadcasting.

## Phase 8.7 — Delete Message

Soft delete.

Instead of removing row:

```
content = NULL

deletedAt = now()
```

Frontend displays

```
This message was deleted
```

- We’ll implement soft delete, not hard delete.

```
deletedAt = now()
content = null or "This message was deleted"
```

- Since your current Prisma content is probably required String, we’ll keep it simple for now:

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

## Phase 8.8 — Group Management

Endpoints

```
Add participant

Remove participant

Rename group

Update avatar
```

- We will add these REST APIs first:

```
PATCH /conversations/:id/title
POST  /conversations/:id/participants
DELETE /conversations/:id/participants/:userId
```

- Rules

```
Only participants can manage group
Only group conversations can be managed
Cannot remove the last participant
Cannot add duplicate participant
```

## Phase 8.9 — Leave Conversation

`DELETE /conversations/:id/leave`

or

`POST /leave`

depending on API style.

# Phase 9 — Testing

We should add:

```
unit tests for services
e2e tests for REST APIs
socket integration tests
multi-instance Redis adapter test
```
