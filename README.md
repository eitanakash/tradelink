# Tradelink

pnpm monorepo with Fastify API and React web app.

## Structure

```
tradelink/
├── apps/
│   ├── api/          # Fastify + TypeScript + Prisma (port 3000)
│   └── web/          # React + Vite + TailwindCSS (port 5173)
└── packages/
    └── types/        # Shared TypeScript interfaces
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## Setup

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Edit `.env` as needed (defaults work with the Docker Compose setup).

**3. Start infrastructure**

```bash
docker compose up -d
```

This starts Postgres on port 5432 and Redis on port 6379.

**4. Run database migrations**

```bash
pnpm --filter api db:migrate
```

On first run this will prompt for a migration name (e.g. `init`).

**5. Start development servers**

```bash
pnpm dev
```

Both apps start concurrently:
- API: http://localhost:3000
- Web: http://localhost:5173

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/tradelink` | Postgres connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Node environment |

## API

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |

## Database

Prisma schema is at `apps/api/prisma/schema.prisma`.

Useful commands (run from repo root):

```bash
pnpm --filter api db:migrate   # create and apply a migration
pnpm --filter api db:push      # push schema changes without a migration file
pnpm --filter api db:generate  # regenerate Prisma client after schema changes
```
