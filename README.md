# Backend (NestJS)

## Stack
- NestJS
- Prisma + PostgreSQL
- Redis (room livestream runtime state)
- JWT (access/refresh)
- Swagger

## Setup
```bash
cd /Users/admin/Desktop/run-with-codeX/backend
cp .env.example .env
yarn install
```

Main `.env` values:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code-x?schema=public`
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`
- `REDIS_DB=2`

## Run
```bash
npx prisma generate
yarn prisma:migrate --name init
yarn prisma:seed
yarn start:dev
```

## Endpoints
- Base: `http://localhost:3000`
- Swagger: `http://localhost:3000/swagger`
- OpenAPI JSON: `http://localhost:3000/api-json`

## Core APIs
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/profile`
- Products: `GET /products`, `POST /products`
- Orders: `POST /orders`, `GET /orders/me`
- Livestream REST:
  - `POST /livestream/rooms`
  - `POST /livestream/rooms/:roomId/join`
  - `POST /livestream/rooms/:roomId/start`
  - `POST /livestream/rooms/:roomId/stop`
  - `GET /livestream/rooms/:roomId`
  - `GET /livestream/rooms/:roomId/viewers`

## Realtime (Socket.IO)
- Namespace: `/livestream`
- Events: `join_room`, `send_comment`, `share_product`, `stream_signal`

# product-api-v1
