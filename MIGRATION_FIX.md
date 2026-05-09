# Prisma Schema Sync Migration

## Problem
The Railway production database was missing columns defined in `schema.prisma`:
- `User.name` (required)
- `User.deletedAt` (optional, for soft deletes)

This caused the register endpoint to fail with Prisma P2022.

## Solution
Created migration `20260508183330_add_missing_user_columns` which:
1. **Adds `User.name` column** (TEXT, NOT NULL)
   - Uses safe default value 'User'
   - Backfills existing users using firstName+lastName or email prefix
   - Never null after migration

2. **Adds `User.deletedAt` column** (TIMESTAMP, nullable)
   - Enables soft deletes for future user account deletions
   - Defaults to NULL for all existing users

## Deployment

### Automatic (Railway)
✅ **Already configured** — The API service runs `pnpm --filter api prisma:deploy` on every deploy
- **File**: `apps/api/railway.json` line 8
- **Command**: `prisma:deploy` → `prisma migrate deploy`

**Steps to deploy:**
1. Merge this branch to main
2. Railway automatically redeploys API service
3. Migration runs before app starts

### Manual Testing (Before Merge)
To test locally with Railway's production database:

```bash
# Set DATABASE_URL to Railway public DB
export DATABASE_URL="postgresql://user:pass@prod-db-host/dbname"

# Run the migration
cd apps/api
pnpm prisma:deploy

# Verify the schema
pnpm prisma db execute --stdin < <(echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='User' ORDER BY column_name;")
```

### Commands Reference
```bash
# View pending migrations
pnpm --filter api prisma migrate status

# Check for drift (if using local dev DB)
pnpm --filter api prisma migrate diff --from-migrations apps/api/prisma/migrations --to-schema-datamodel apps/api/prisma/schema.prisma

# Regenerate Prisma Client
pnpm --filter api db:generate
```

## Migration Details
- **File**: `apps/api/prisma/migrations/20260508183330_add_missing_user_columns/migration.sql`
- **Safety**: 
  - ✅ Non-destructive (adds columns only)
  - ✅ Backward compatible (defaults for existing rows)
  - ✅ No data loss
  - ✅ Safe for production

## Next Steps
1. Push branch to GitHub
2. Create PR and review
3. Merge to main
4. Railway redeploys API and runs migration automatically
5. Verify register endpoint works
