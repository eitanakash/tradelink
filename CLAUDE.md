# Travajos — Claude Instructions

## Project
Travajos — home services marketplace monorepo
Remote: git remote named "tradelink" (not origin)

## Git workflow
- Never push directly to main
- Always create a feature/fix/chore branch first
- Branch naming: type/short-description
  Examples: fix/railway-build, feat/voice-intake
- Commit format: "type: short description"
  Types: feat, fix, chore, refactor, docs
- Always run TypeScript check before committing:
  cd apps/api && pnpm exec tsc --noEmit
  cd apps/web && pnpm exec tsc --noEmit
- Push branch, never merge — I review and merge on GitHub

## Stack
- Monorepo: pnpm workspaces
- API: Fastify + TypeScript + Prisma + PostgreSQL + Redis
- Web: React + Vite + TailwindCSS
- Admin: React + Vite + TailwindCSS
- Deploy: Railway (3 services)
- Domain: travajos.com on Cloudflare

## Commands
- Run locally: pnpm dev (from root)
- Type check: pnpm exec tsc --noEmit (from app folder)
- DB migrate: pnpm --filter api db:migrate
- Seed prod: pnpm --filter api seed:prod

## Important rules
- Never hardcode localhost URLs — use env vars
- Never commit .env files
- All API calls need credentials: "include" for cookies
- Keep pnpm-lock.yaml at repo root, never in app subfolders
