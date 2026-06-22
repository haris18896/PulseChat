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

socket.on('message_Sent', (data) => {
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
```

# Phase 6 — NGINX Load Balancing

Purpose: put 3 backend instances behind one entry point.

We will add:

```
NGINX config
WebSocket upgrade headers
load balancing
test clients connected to different instances
```

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

# Phase 8 — Chat Product Features

Optional but useful:

```
read receipts
delivered status
message edited/deleted
unread counts
last message preview
group conversation management
leave conversation
add/remove participants
```

# Phase 9 — Testing

We should add:

```
unit tests for services
e2e tests for REST APIs
socket integration tests
multi-instance Redis adapter test
```
