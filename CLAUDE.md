# Travajos — Claude Instructions

## Project
Travajos — home services marketplace monorepo
Remote: git remote named "tradelink" (not origin)

## Git workflow
- Before starting ANY task:
  1. git checkout main
  2. git pull tradelink main
  3. Create a new branch from the updated main

- Branch naming: type/short-description
  Examples: fix/railway-build, feat/voice-intake
  Types: feat, fix, chore, refactor, docs

- Commit format: "type: short description"
  Always run TypeScript check before committing:
  cd apps/api && pnpm exec tsc --noEmit
  cd apps/web && pnpm exec tsc --noEmit

- After pushing branch:
  1. git checkout main
  2. Confirm you are back on main before stopping
  Never leave the repo on a feature branch between sessions

- Never push directly to main
- Never merge branches — I review and merge on GitHub

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
- Keep pnpm-lock.yaml at repo root
- Remote is named "tradelink" not "origin"
