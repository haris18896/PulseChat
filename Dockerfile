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
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"

COPY package.json yarn.lock ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile --production --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma



EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

