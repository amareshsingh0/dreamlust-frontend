# How to Run DreamLust Project

## 🚀 Quick Start

### Prerequisites
- Bun installed ([install Bun](https://bun.sh/docs/installation))
- Supabase account and database set up
- Environment variables configured

## 📋 Step-by-Step Instructions

### 1. Install Dependencies

**Frontend:**
```powershell
cd frontend
bun install
```

**Backend:**
```powershell
cd backend
bun install
```

### 2. Set Up Environment Variables

**Frontend `.env`** (in `frontend/` directory):
```env
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraqbl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HSROPjtaD_t4t9tgSbaNoQ_igk6O8Z9
```

**Backend `.env`** (in `backend/` directory):
```env
DATABASE_URL=postgresql://postgres:Amaresh@8423@db.aqtovzzjevtfswqraqbl.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=sb_secret_nS1l5cIg1oi3qcRK3M6Ldg_gM_s50Y4
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraqbl.supabase.co
```

### 3. Generate Prisma Client (Backend)

```powershell
cd backend
bun run db:generate
```

### 4. Run SQL Migrations (One-time setup)

Go to **Supabase Dashboard → SQL Editor** and run:
1. `backend/supabase/migrations/001_initial_schema.sql`
2. `backend/supabase/migrations/002_rls_policies.sql`

### 5. Start Frontend Development Server

```powershell
cd frontend
bun run dev
```

**Frontend will run on:** `http://localhost:4000`

## 🎯 Common Commands

### Frontend Commands

```powershell
cd frontend

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run linter
bun run lint
```

### Backend Commands

```powershell
cd backend

# Generate Prisma Client
bun run db:generate

# Push schema to database (development)
bun run db:push

# Create migration
bun run db:migrate

# Open Prisma Studio (database GUI)
bun run db:studio
```

## 🔄 Running Both Frontend and Backend

### Option 1: Separate Terminals (Recommended)

**Terminal 1 - Frontend:**
```powershell
cd frontend
bun run dev
```

**Terminal 2 - Backend (if needed):**
```powershell
cd backend
# Run backend commands as needed
```

### Option 2: PowerShell Background Jobs

```powershell
# Start frontend in background
cd frontend
Start-Job -ScriptBlock { bun run dev }

# Check running jobs
Get-Job

# Stop job when done
Stop-Job -Name Job1
Remove-Job -Name Job1
```

## ✅ Verification Checklist

- [ ] Dependencies installed in both `frontend/` and `backend/`
- [ ] `.env` files created in both directories
- [ ] Prisma Client generated (`bun run db:generate`)
- [ ] SQL migrations run in Supabase Dashboard
- [ ] Frontend dev server starts without errors
- [ ] App loads in browser at `http://localhost:4000`

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file exists in `frontend/` directory
- Verify variable names match exactly
- Restart dev server after updating `.env`

### "Prisma Client not generated"
```powershell
cd backend
bun run db:generate
```

### "Port 4000 already in use"
- Change port in `frontend/vite.config.ts`
- Or stop the process using port 4000

### "Module not found"
- Make sure you're in the correct directory
- Run `bun install` in the appropriate directory
- Check `package.json` exists

## 📚 Next Steps

After the app is running:
1. Test Supabase connection using `frontend/src/lib/testSupabase.ts`
2. Verify database tables in Supabase Dashboard
3. Start building your features!

## 🎉 You're Ready!

Once the frontend dev server is running, open your browser to:
**http://localhost:4000**

Happy coding! 🚀

