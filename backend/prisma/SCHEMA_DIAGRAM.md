# Prisma Schema Entity Relationship Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER MODEL                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • id, email, username, password                          │  │
│  │ • displayName, avatar, bio, location                      │  │
│  │ • theme, language, preferences                            │  │
│  │ • role, status, isCreator                                 │  │
│  │ • deletedAt (soft delete)                                 │  │
│  │ • version (optimistic locking)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ 1:1                │ 1:*                │ 1:*
         ▼                    ▼                    ▼
┌──────────────┐    ┌─────────────────┐   ┌──────────────┐
│   CREATOR    │    │  ENGAGEMENT     │   │  COLLECTIONS │
│              │    │  (Views/Likes/  │   │  (Playlists) │
│ • handle     │    │   Comments)     │   │              │
│ • verified   │    │                 │   │ • name       │
│ • stats      │    │ • contentId     │   │ • items      │
│ • monetized  │    │ • userId        │   │ • public     │
└──────────────┘    └─────────────────┘   └──────────────┘
         │                    │                    │
         │ 1:*                │ *:1                │ *:1
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CONTENT MODEL                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • title, description, type (VIDEO/PHOTO/VR)               │  │
│  │ • mediaUrl, thumbnail, duration                          │  │
│  │ • viewCount, likeCount, commentCount                     │  │
│  │ • isPublic, isNSFW, isPremium                            │  │
│  │ • publishedAt, scheduledAt                              │  │
│  │ • deletedAt (soft delete)                                │  │
│  │ • version (optimistic locking)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │
         │ *:*                 │ *:*
         ▼                    ▼
┌──────────────┐      ┌──────────────┐
│  CATEGORY    │      │     TAG      │
│              │      │              │
│ • name       │      │ • name       │
│ • slug       │      │ • slug       │
│ • icon       │      │ • usageCount │
└──────────────┘      └──────────────┘
```

## Detailed Relationships

### User Relationships
```
User (1) ────────────< (1) Creator
User (1) ────────────< (*) View
User (1) ────────────< (*) Like
User (1) ────────────< (*) Comment
User (1) ────────────< (*) Playlist
User (1) ────────────< (*) Subscription (as subscriber)
User (1) ────────────< (*) Subscription (as creator)
User (1) ────────────< (*) Transaction
User (1) ────────────< (*) Notification
User (1) ────────────< (*) Report (as reporter)
User (1) ────────────< (*) Report (as reported user)
```

### Creator Relationships
```
Creator (1) ────────────< (*) Content
Creator (1) ────────────< (*) Subscription
Creator (*) ────────────>─< (*) Category (many-to-many)
```

### Content Relationships
```
Content (*) ────────────>─< (*) Category (many-to-many)
Content (*) ────────────>─< (*) Tag (many-to-many)
Content (1) ────────────< (*) View
Content (1) ────────────< (*) Like
Content (1) ────────────< (*) Comment
Content (1) ────────────< (*) PlaylistItem
Content (1) ────────────< (*) Report
```

### Subscription & Monetization
```
Subscription (1) ────────────< (*) Transaction
```

## Index Strategy

### Composite Indexes (for frequent queries)
- `User`: `[id, createdAt]` - User activity timeline
- `Content`: `[creatorId, createdAt]` - Creator content feed
- `Content`: `[id, viewCount]` - Trending content queries
- `View`: `[contentId, createdAt]` - Content views over time
- `Comment`: `[contentId, createdAt]` - Content comments timeline
- `Playlist`: `[userId, createdAt]` - User playlists
- `Subscription`: `[subscriberId, createdAt]` - User subscriptions
- `Transaction`: `[userId, createdAt]` - User transaction history
- `Notification`: `[userId, isRead]` - Unread notifications
- `Notification`: `[userId, createdAt]` - Notification timeline
- `PlaylistItem`: `[playlistId, sortOrder]` - Playlist ordering

### Single Field Indexes
- Email, username lookups
- Status filtering
- DeletedAt for soft delete queries
- Foreign key relationships

## Soft Delete Strategy

Models with `deletedAt`:
- **User** - Account deactivation
- **Creator** - Creator profile removal
- **Content** - Content moderation
- **Playlist** - Playlist deletion
- **Comment** - Comment moderation
- **Category** - Category management

Query pattern:
```typescript
where: { deletedAt: null } // Only active records
```

## Optimistic Locking Strategy

Models with `version` field:
- **User** - Profile updates
- **Creator** - Creator profile updates
- **Content** - Content metadata updates
- **Comment** - Comment edits
- **Playlist** - Playlist modifications
- **Subscription** - Subscription status changes
- **Transaction** - Transaction updates
- **Report** - Report status changes

Update pattern:
```typescript
await prisma.user.update({
  where: { id, version },
  data: { 
    ...updates,
    version: { increment: 1 }
  }
})
```

## Data Flow Examples

### Content Creation Flow
```
User → Creator → Content → Categories/Tags → Published
```

### Engagement Flow
```
User → View/Like/Comment → Content (stats updated)
```

### Monetization Flow
```
User → Subscription → Creator → Transaction
```

### Moderation Flow
```
User → Report → Content/User → Moderation Action
```

