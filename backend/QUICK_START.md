# Backend Server Quick Start Guide

## ✅ Current Setup

Your backend uses **Express.js** with **Bun** as the runtime (not Bun's native server). This is a valid and common setup.

## 🚀 Starting the Server

### Development Mode
```bash
# Navigate to backend directory
cd backend

# Start the server
bun run dev
```

This runs: `bun run src/server.ts`

### Production Mode
```bash
bun run start
```

## 📋 Server Configuration

- **Port**: `3001` (from `PORT` env variable, defaults to 3001)
- **Frontend URL**: `http://localhost:4000` (from `FRONTEND_URL` env variable)
- **Server File**: `src/server.ts`
- **Framework**: Express.js
- **Runtime**: Bun

## 🔍 Verify Server is Running

After starting, you should see:
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔗 Frontend URL: http://localhost:4000
```

### Test the Server

1. **Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **API Info**:
   ```bash
   curl http://localhost:3001/
   ```

3. **Test Comments Endpoint** (after fixing Prisma issues):
   ```bash
   curl http://localhost:3001/api/comments/1
   ```

## ⚙️ Environment Variables

Make sure you have a `.env` file in the `backend/` directory with:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_min_32_chars
FRONTEND_URL=http://localhost:4000
API_URL=http://localhost:3001
```

## 📦 Available Scripts

- `bun run dev` - Start development server
- `bun run start` - Start production server
- `bun run db:generate` - Generate Prisma client
- `bun run db:push` - Push schema to database
- `bun run db:migrate` - Run migrations
- `bun run db:studio` - Open Prisma Studio
- `bun run db:seed` - Seed database

## 🛠️ Troubleshooting

### Server won't start?

1. **Check if port 3001 is already in use**:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3001
   
   # Kill process if needed
   taskkill /PID <PID> /F
   ```

2. **Check environment variables**:
   ```bash
   # Make sure .env file exists
   ls backend/.env
   ```

3. **Regenerate Prisma Client**:
   ```bash
   cd backend
   bunx prisma generate
   ```

4. **Check database connection**:
   - Verify `DATABASE_URL` in `.env` is correct
   - Ensure PostgreSQL is running
   - Test connection with Prisma Studio: `bun run db:studio`

### Common Errors

- **"Column does not exist"**: Run `bunx prisma generate` to regenerate client
- **"Port already in use"**: Kill the process using port 3001 or change PORT in `.env`
- **"Environment validation failed"**: Check your `.env` file has all required variables

## 📝 API Endpoints

All API routes are prefixed with `/api`:

- `/api/auth/*` - Authentication
- `/api/search` - Search functionality
- `/api/preferences` - User preferences
- `/api/playlists` - Playlist management
- `/api/content/*` - Content operations
- `/api/analytics/*` - Analytics tracking
- `/api/recommendations/*` - Recommendation engine
- `/api/comments/*` - Comment system

## ✅ Current Status

After recent fixes:
- ✅ Prisma schema mappings fixed (snake_case → camelCase)
- ✅ Enum usage fixed (using string values)
- ✅ All routes registered
- ✅ Server should start successfully

**Next Step**: Run `bun run dev` in the `backend/` directory!

