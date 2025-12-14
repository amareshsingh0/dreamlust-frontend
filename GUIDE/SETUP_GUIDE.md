# Project Setup Guide

## 📁 New Project Structure

```
dreamlust/
├─ frontend/          # React/Vite frontend
│  ├─ src/            # Frontend source code
│  ├─ public/         # Static assets
│  ├─ .env           # Frontend env vars (Supabase API keys)
│  └─ package.json   # Frontend dependencies
│
├─ backend/           # Backend services
│  ├─ prisma/        # Database schema
│  ├─ supabase/      # SQL migrations
│  ├─ src/           # Backend source code
│  ├─ .env           # Backend env vars (DB password, service key)
│  └─ package.json   # Backend dependencies
```

## 🚀 Initial Setup

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

**Or install both (PowerShell):**
```powershell
cd frontend; bun install; cd ..\backend; bun install
```

### 2. Environment Variables

**Frontend `.env`** (already created):
```env
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraqbl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HSROPjtaD_t4t9tgSbaNoQ_igk6O8Z9
```

**Backend `.env`** (already created):
```env
DATABASE_URL=postgresql://postgres:Amaresh@8423@db.aqtovzzjevtfswqraqbl.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=sb_secret_nS1l5cIg1oi3qcRK3M6Ldg_gM_s50Y4
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraqbl.supabase.co
```

### 3. Generate Prisma Client

```powershell
cd backend
bun run db:generate
```

### 4. Run SQL Migrations

Go to **Supabase Dashboard → SQL Editor** and run:
1. `backend/supabase/migrations/001_initial_schema.sql`
2. `backend/supabase/migrations/002_rls_policies.sql`

### 5. Start Development

**Frontend:**
```powershell
cd frontend
bun run dev
```

Frontend runs on `http://localhost:4000`

## 📝 Development Workflow

### Frontend Development
- Work in `frontend/src/`
- Uses Supabase client for data access
- Environment variables in `frontend/.env`

### Backend Development
- Database schema in `backend/prisma/schema.prisma`
- SQL migrations in `backend/supabase/migrations/`
- Backend code in `backend/src/`
- Environment variables in `backend/.env`

## 🔐 Security Notes

- ✅ Frontend `.env` - Safe API keys (can be in frontend)
- ❌ Backend `.env` - Sensitive credentials (backend only)
- ✅ Both `.env` files are in `.gitignore`

## 📦 Package Management

Each directory has its own `package.json`:

- **Frontend**: React, Vite, UI libraries, Supabase client
- **Backend**: Prisma, Supabase admin, database tools

Install dependencies separately in each directory.

## 🎯 Next Steps

1. ✅ Project structure created
2. ✅ Dependencies split
3. ✅ Environment variables configured
4. ⏭️ Run SQL migrations in Supabase
5. ⏭️ Start developing!

See [NEXT_STEPS.md](./NEXT_STEPS.md) for detailed instructions.

