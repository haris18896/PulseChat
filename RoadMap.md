# Project Roadmap: Realtime Chat App with Presence

## Phase 0 — Project Setup

Goal: clean foundation.

Steps:

1. Create NestJS project
2. Add Docker Compose
3. Setup Postgres
4. Setup Redis
5. Setup Prisma or TypeORM
6. Add basic health check API

You will learn:

NestJS structure, Docker, environment config, DB connection.

---

## Phase 1 — Authentication

Goal: users can register and login.

Steps:

1. User entity/table
2. Register API
3. Login API
4. JWT authentication
5. Auth guards
6. Current user endpoint

You will learn:

JWT, guards, password hashing, user identity in WebSockets.

---

## Phase 2 — Basic Chat REST APIs

Goal: messages are saved before realtime starts.

Steps:

1. Create conversations
2. Add users to conversation
3. Send message through REST
4. Get message history
5. Pagination

You will learn:

Postgres schema design, message persistence, relations.

---

## Phase 3 — Socket.IO Gateway

Goal: realtime connection works.

Steps:

1. Create ChatGateway
2. Authenticate socket connection
3. Join user to socket room
4. Join conversation room
5. Send message through socket
6. Broadcast message to conversation users

You will learn:

WebSocket lifecycle, rooms, events, socket authentication.

---

## Phase 4 — Message Persistence with Socket.IO

Goal: realtime messages are saved in DB.

Steps:

1. Receive socket message
2. Validate payload
3. Save to Postgres
4. Emit saved message
5. Handle failed messages properly

You will learn:

Realtime + database consistency.

---

## Phase 5 — Presence System

Goal: online/offline status.

Steps:

1. Track connected users in Redis
2. Mark user online on connect
3. Mark user offline on disconnect
4. Broadcast presence updates
5. Handle multiple tabs/devices correctly

You will learn:

Presence logic, Redis sets, connection counting.

---

## Phase 6 — Typing Indicators

Goal: show “user is typing”.

Steps:

1. Emit typing start
2. Emit typing stop
3. Use timeout fallback
4. Broadcast only to conversation room

You will learn:

Ephemeral realtime events vs persisted events.

---

## Phase 7 — Redis Pub/Sub Scaling

Goal: multiple app instances sync messages.

Steps:

1. Add Socket.IO Redis adapter
2. Publish events across instances
3. Verify rooms work across instances
4. Test user connected to different instances

You will learn:

Horizontal scaling, Redis adapter, distributed WebSockets.

---

## Phase 8 — NGINX Load Balancing

Goal: run 3 Node instances behind NGINX.

Steps:

1. Dockerize NestJS app
2. Run 3 replicas
3. Add NGINX reverse proxy
4. Enable WebSocket upgrade headers
5. Test chat across instances

You will learn:

Load balancing WebSockets, reverse proxy config.

---

## Phase 9 — Production-Level Improvements

Goal: make it professional.

Steps:

1. Message read receipts
2. Delivery status
3. Rate limiting
4. Validation with DTOs
5. Error handling
6. Logging
7. Basic tests

You will learn:

Clean architecture and production reliability.

---

## Final Phase Output

At the end, you should have:

A NestJS realtime chat backend with:

- JWT auth
- Postgres message persistence
- Socket.IO realtime chat
- Online/offline presence
- Typing indicators
- Redis Pub/Sub scaling
- 3 Node instances behind NGINX
