# Prisma Database Schema

This directory contains the complete Prisma schema for the DreamLust platform.

## Schema Overview

The schema includes all essential models with proper relationships, indexes, soft deletes, and optimistic locking:

### Core Models

- **User** - Authentication, profile, and preferences
- **Creator** - Creator profiles with verification and stats
- **Content** - Video/photo/VR content with metadata and streaming support
- **Category** & **Tag** - Content categorization with many-to-many relationships
- **View, Like, Comment** - User engagement tracking
- **Playlist** & **PlaylistItem** - User content collections
- **Subscription** & **Transaction** - Monetization and payments
- **Notification** - User notifications system
- **Report** - Content moderation and reporting

## Key Features

### ✅ Indexes for Performance
- Composite indexes for frequent queries (userId + createdAt, contentId + views)
- Single field indexes for common lookups
- Optimized for trending content queries

### ✅ Soft Deletes
- `deletedAt` fields on critical models (User, Creator, Content, Playlist, Comment)
- Allows content moderation without permanent deletion
- Enables data recovery and audit trails

### ✅ Optimistic Locking
- `version` fields on models with critical updates (User, Creator, Content, Comment, Playlist, Subscription, Transaction, Report)
- Prevents race conditions and concurrent update conflicts
- Ensures data integrity

### ✅ Relationships
- Proper foreign key constraints
- Cascade deletes where appropriate
- Many-to-many relationships for Categories and Tags

## Setup

1. **Install Dependencies** (already done)
   ```bash
   bun install
   ```

2. **Set up Database URL**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"
   ```

3. **Generate Prisma Client**
   ```bash
   bun run db:generate
   ```

4. **Push Schema to Database** (for development)
   ```bash
   bun run db:push
   ```

   Or create a migration (for production):
   ```bash
   bun run db:migrate
   ```

5. **Open Prisma Studio** (optional - database GUI)
   ```bash
   bun run db:studio
   ```

## Database Providers

The schema is configured for PostgreSQL by default, but can be changed to:
- **MySQL**: Change `provider = "mysql"` in `schema.prisma`
- **SQLite**: Change `provider = "sqlite"` in `schema.prisma` (for development)

## Usage in Code

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Example: Get user with creator profile
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { creator: true }
})

// Example: Get trending content
const trending = await prisma.content.findMany({
  where: { 
    isPublic: true,
    deletedAt: null 
  },
  orderBy: { viewCount: 'desc' },
  take: 10
})
```

## Entity Relationships

```
User (1) ──< (1) Creator
User (1) ──< (*) View, Like, Comment, Playlist, Subscription, Transaction, Notification, Report
Creator (1) ──< (*) Content
Content (*) ──<─> (*) Category (many-to-many)
Content (*) ──<─> (*) Tag (many-to-many)
Content (1) ──< (*) View, Like, Comment, PlaylistItem
Playlist (1) ──< (*) PlaylistItem
Subscription (1) ──< (*) Transaction
```

## Next Steps

1. Set up your database (PostgreSQL recommended)
2. Configure `DATABASE_URL` in `.env`
3. Run `bun run db:push` to create tables
4. Start using Prisma Client in your backend/API

## Notes

- All timestamps use `DateTime` type
- Decimal types are used for monetary values
- BigInt is used for large numbers (view counts, file sizes)
- JSON fields allow flexible metadata storage
- Enums provide type safety for status fields

