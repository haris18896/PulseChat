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

## Authentication

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
