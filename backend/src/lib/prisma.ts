import { PrismaClient } from '@prisma/client';

// ⚠️ SECURITY WARNING: This file uses DATABASE_URL which contains database password
// ⚠️ ONLY use this in BACKEND/API routes, NEVER in frontend components!
// ⚠️ For frontend, use Supabase client instead

// Prisma Client singleton pattern with connection pooling
// PrismaClient automatically reads DATABASE_URL from environment variables
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get DATABASE_URL and add connection pool parameters
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  // Use console.error here since logger might not be initialized yet
  console.error('❌ DATABASE_URL is not set in environment variables!');
  console.error('Please add DATABASE_URL to your .env file');
  console.error('Example: DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"');
}

const poolUrl = databaseUrl.includes('?')
  ? `${databaseUrl}&connection_limit=50&pool_timeout=20`
  : `${databaseUrl}?connection_limit=50&pool_timeout=20`;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: poolUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

