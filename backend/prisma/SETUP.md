# Prisma Setup Instructions

## Quick Start

### 1. Create `.env` file in project root

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"
```

**For different databases:**

**PostgreSQL (Recommended):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dreamlust?schema=public"
```

**MySQL:**
```env
DATABASE_URL="mysql://user:password@localhost:3306/dreamlust"
```

**SQLite (Development only):**
```env
DATABASE_URL="file:./dev.db"
```

### 2. Generate Prisma Client

```bash
bun run db:generate
```

### 3. Push schema to database (Development)

```bash
bun run db:push
```

**Note:** `db:push` is for development. It syncs your schema directly to the database without creating migration files.

### 4. Or create a migration (Production)

```bash
bun run db:migrate
```

This creates migration files that can be version controlled and applied to production databases.

### 5. Open Prisma Studio (Optional)

```bash
bun run db:studio
```

Opens a web-based database browser at http://localhost:5555

## Prisma Version

This project uses **Prisma 6.19.1** which supports the traditional schema file format with `url = env("DATABASE_URL")` in the datasource block.

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
- Make sure you've created a `.env` file in the project root
- Verify the `.env` file contains `DATABASE_URL=...`
- Restart your terminal/IDE after creating `.env`

### Error: "Can't reach database server"
- Check that your database server is running
- Verify the connection string is correct
- Check firewall/network settings

### Error: "Database does not exist"
- Create the database first:
  ```sql
  CREATE DATABASE dreamlust;
  ```

## Next Steps

After setting up the database:
1. Start using Prisma Client in your API routes
2. Import from `@/lib/prisma`
3. See `prisma/IMPLEMENTATION_NOTES.md` for usage examples

