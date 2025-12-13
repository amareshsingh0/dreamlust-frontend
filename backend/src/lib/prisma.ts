import { PrismaClient } from '@prisma/client';

// ⚠️ SECURITY WARNING: This file uses DATABASE_URL which contains database password
// ⚠️ ONLY use this in BACKEND/API routes, NEVER in frontend components!
// ⚠️ For frontend, use Supabase client instead

// Prisma Client singleton pattern
// PrismaClient automatically reads DATABASE_URL from environment variables
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Prisma automatically reads DATABASE_URL from process.env
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

