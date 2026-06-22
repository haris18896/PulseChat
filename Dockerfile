FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile

COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"


RUN npx prisma generate
RUN yarn build

# -------

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated


EXPOSE 3000

CMD ["sh", "-c", "node dist/main.js"]