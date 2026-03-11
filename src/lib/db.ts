// DB client setup for Phase 2+
// Prisma 7 requires an adapter (e.g., @prisma/pg-worker) passed to PrismaClient.
// This module will be activated when Supabase/PostgreSQL is connected.
//
// Usage (after DB setup):
//   import { PrismaClient } from '@/generated/prisma/client'
//   import PrismaPg from '@prisma/pg-worker'
//
//   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
//   export const prisma = new PrismaClient({ adapter })

export {}
