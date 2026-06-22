FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile

COPY . .

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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]