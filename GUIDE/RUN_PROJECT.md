# 🚀 How to Run DreamLust Project

## Quick Start (3 Steps)

### Step 1: Install Dependencies

**Open PowerShell and run:**

```powershell
# Install frontend dependencies
cd frontend
bun install

# Install backend dependencies  
cd ..\backend
bun install
bun run db:generate
```

### Step 2: Verify Environment Variables

Check that `.env` files exist:
- ✅ `frontend/.env` - Should have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- ✅ `backend/.env` - Should have `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Start the Frontend

```powershell
cd frontend
bun run dev
```

**🎉 Open your browser to:** `http://localhost:4000`

## 📝 Detailed Instructions

### First Time Setup

1. **Install Dependencies:**
   ```powershell
   cd frontend
   bun install
   cd ..\backend
   bun install
   ```

2. **Generate Prisma Client:**
   ```powershell
   cd backend
   bun run db:generate
   ```

3. **Run SQL Migrations** (One-time, in Supabase Dashboard):
   - Go to: Supabase Dashboard → SQL Editor
   - Run: `backend/supabase/migrations/001_initial_schema.sql`
   - Run: `backend/supabase/migrations/002_rls_policies.sql`

4. **Start Frontend:**
   ```powershell
   cd frontend
   bun run dev
   ```

### Daily Development

**Just run:**
```powershell
cd frontend
bun run dev
```

That's it! The app will be available at `http://localhost:4000`

## 🎯 Available Commands

### Frontend (`cd frontend`)

```powershell
bun run dev        # Start development server (port 4000)
bun run build      # Build for production
bun run preview    # Preview production build
bun run lint       # Run linter
```

### Backend (`cd backend`)

```powershell
bun run db:generate    # Generate Prisma Client
bun run db:push        # Push schema to database
bun run db:migrate     # Create migration
bun run db:studio      # Open Prisma Studio (database GUI)
```

## ✅ Verification

After running `bun run dev` in the frontend directory, you should see:

```
  VITE v7.2.7  ready in XXX ms

  ➜  Local:   http://localhost:4000/
  ➜  Network: http://XXX.XXX.XXX.XXX:4000/
```

Open `http://localhost:4000` in your browser to see the app!

## 🐛 Troubleshooting

### "Command not found: bun"
- Install Bun: https://bun.sh/docs/installation

### "Missing environment variables"
- Check `.env` files exist in `frontend/` and `backend/` directories
- Restart dev server after updating `.env`

### "Port 4000 is in use"
- Change port in `frontend/vite.config.ts` (line 10: `port: 4000`)

### "Module not found"
- Run `bun install` in the directory where the error occurs
- Make sure you're in the correct directory (`frontend/` or `backend/`)

## 📚 More Information

- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Detailed setup guide
- [QUICK_START.md](./QUICK_START.md) - PowerShell quick reference
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions

