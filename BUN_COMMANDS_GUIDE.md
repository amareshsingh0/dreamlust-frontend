# Bun Commands Guide - Where to Run Each Command

## 📁 Project Structure

```
dreamlust-project/
├── frontend/          # React/Vite frontend
│   └── package.json
└── backend/          # Express/Prisma backend
    └── package.json
```

## 🎯 Frontend Commands

**Location:** Run these commands in the `frontend/` directory

```powershell
cd frontend

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run linter
bun run lint

# Add a package
bun add package-name

# Add a dev dependency
bun add -d package-name
```

**Example:**
```powershell
cd frontend
bun install
bun run dev
# Frontend runs on http://localhost:4000
```

## 🔧 Backend Commands

**Location:** Run these commands in the `backend/` directory

```powershell
cd backend

# Install dependencies
bun install

# Start development server
bun run dev

# Start production server
bun start

# Generate Prisma Client
bun run db:generate

# Push schema to database (development)
bun run db:push

# Create migration
bun run db:migrate

# Deploy migrations (production)
bun run db:migrate:deploy

# Open Prisma Studio (database GUI)
bun run db:studio

# Run database seed
bun run db:seed

# Add a package
bun add package-name

# Add a dev dependency
bun add -d package-name
```

**Example:**
```powershell
cd backend
bun install
bun run db:generate
bun run dev
# Backend runs on http://localhost:3001
```

## 🚀 Complete Setup Workflow

### First Time Setup

**1. Install Frontend Dependencies:**
```powershell
cd frontend
bun install
```

**2. Install Backend Dependencies:**
```powershell
cd backend
bun install
```

**3. Generate Prisma Client (Backend):**
```powershell
cd backend
bun run db:generate
```

**4. Set up Database:**
```powershell
cd backend
bun run db:push
# OR
bun run db:migrate
```

### Daily Development

**Terminal 1 - Frontend:**
```powershell
cd frontend
bun run dev
```

**Terminal 2 - Backend:**
```powershell
cd backend
bun run dev
```

## 📦 Adding Packages

### Frontend Package
```powershell
cd frontend
bun add react-router-dom
bun add -d @types/react  # dev dependency
```

### Backend Package
```powershell
cd backend
bun add express
bun add -d @types/express  # dev dependency
```

## ⚠️ Important Notes

1. **Always `cd` into the correct directory first:**
   - Frontend commands → `cd frontend`
   - Backend commands → `cd backend`

2. **Each directory has its own `package.json`:**
   - `frontend/package.json` - Frontend dependencies
   - `backend/package.json` - Backend dependencies

3. **Database commands are backend-only:**
   - `bun run db:generate` → Run in `backend/`
   - `bun run db:push` → Run in `backend/`
   - `bun run db:migrate` → Run in `backend/`

4. **Development servers:**
   - Frontend: `bun run dev` in `frontend/` → Port 4000
   - Backend: `bun run dev` in `backend/` → Port 3001

## 🔍 Quick Reference

| Command | Location | Purpose |
|---------|----------|---------|
| `bun install` | `frontend/` or `backend/` | Install dependencies |
| `bun run dev` | `frontend/` or `backend/` | Start dev server |
| `bun run build` | `frontend/` | Build for production |
| `bun run db:generate` | `backend/` | Generate Prisma Client |
| `bun run db:push` | `backend/` | Push schema to DB |
| `bun run db:migrate` | `backend/` | Create migration |
| `bun add package` | `frontend/` or `backend/` | Add dependency |

## ✅ Verification

**Check if you're in the right directory:**
```powershell
# Should show frontend/package.json
Get-Content package.json | Select-String "dreamlust-frontend"

# OR for backend
Get-Content package.json | Select-String "dreamlust-backend"
```

**Check installed packages:**
```powershell
# In frontend/
bun pm ls

# In backend/
bun pm ls
```

