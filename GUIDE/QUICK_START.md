# Quick Start Guide (PowerShell)

## 🚀 Install Dependencies

### Option 1: Install Separately (Recommended)

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

### Option 2: Install Both at Once

```powershell
cd frontend; bun install; cd ..\backend; bun install
```

## 📝 Setup Environment Variables

The `.env` files are already created in each directory:

- `frontend/.env` - Supabase API keys (frontend safe)
- `backend/.env` - Database credentials (backend only)

## 🗄️ Database Setup

### 1. Generate Prisma Client

```powershell
cd backend
bun run db:generate
```

### 2. Run SQL Migrations

Go to **Supabase Dashboard → SQL Editor** and run:
1. `backend/supabase/migrations/001_initial_schema.sql`
2. `backend/supabase/migrations/002_rls_policies.sql`

## ▶️ Start Development

```powershell
cd frontend
bun run dev
```

Frontend will run on `http://localhost:4000`

## 📚 Common Commands

### Frontend
```powershell
cd frontend
bun run dev        # Start dev server
bun run build      # Build for production
bun run preview    # Preview production build
bun run lint       # Run linter
```

### Backend
```powershell
cd backend
bun run db:generate      # Generate Prisma Client
bun run db:push         # Push schema to database
bun run db:migrate      # Create migration
bun run db:studio       # Open Prisma Studio
```

## ⚠️ PowerShell Notes

PowerShell uses different syntax than bash:

- ❌ `&&` - Not supported
- ✅ `;` - Use semicolon to chain commands
- ✅ Separate lines - Run commands separately
- ✅ `..\` - Use backslash for parent directory (Windows)

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Generate Prisma Client
3. ⏭️ Run SQL migrations in Supabase
4. ⏭️ Start developing!

