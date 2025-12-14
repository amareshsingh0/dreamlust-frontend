# DreamLust Project

## 🔐 Security Notice

**IMPORTANT:** This project uses Supabase with API keys (safe for frontend) and optional Prisma for direct database access (backend only).

- ✅ **Supabase API keys** (`VITE_SUPABASE_ANON_KEY`) - Safe for frontend
- ❌ **Database passwords** (`DATABASE_URL`) - Backend only, never in frontend!

See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## Project Structure

```
dreamlust/
├─ frontend/          # React/Vite frontend application
│  ├─ src/            # Source code
│  ├─ public/         # Static assets
│  ├─ .env           # Frontend environment variables
│  └─ package.json   # Frontend dependencies
│
├─ backend/           # Backend services
│  ├─ prisma/        # Prisma schema and migrations
│  ├─ supabase/      # Supabase SQL migrations
│  ├─ src/           # Backend source code
│  ├─ .env           # Backend environment variables
│  └─ package.json   # Backend dependencies
│
└─ README.md         # This file
```

## Quick Start

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
bun run db:generate  # Generate Prisma Client
```

### 2. Start Development Server

**Frontend (Main Application):**
```powershell
cd frontend
bun run dev
```
Frontend runs on **`http://localhost:4000`**

**Backend (API Server):**
```powershell
cd backend
bun run dev
```
Backend runs on **`http://localhost:3001`**

**Note:** Make sure `.env` files are set up in both `frontend/` and `backend/` directories.

> 📖 **See [BUN_COMMANDS_GUIDE.md](./BUN_COMMANDS_GUIDE.md) for detailed command reference**

## Environment Variables

### Frontend (.env in `frontend/` directory)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Backend (.env in `backend/` directory)

```env
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## Development

### Running Frontend

```powershell
cd frontend
bun run dev
```

### Running Backend Commands

```powershell
cd backend
bun run db:generate    # Generate Prisma Client
bun run db:push       # Push schema to database
bun run db:migrate    # Create migration
bun run db:studio     # Open Prisma Studio
```

## Technologies

### Frontend
- React 19.2.3
- Vite 7.2.7
- TypeScript
- Tailwind CSS
- shadcn-ui
- Supabase Client

### Backend
- Prisma 6.19.1
- Supabase
- PostgreSQL

## Security

- ✅ Frontend uses Supabase API keys (safe)
- ✅ Backend credentials protected
- ✅ `.env` files in `.gitignore`
- ✅ Separate environments for frontend/backend

See [SECURITY.md](./SECURITY.md) for more details.

## Documentation

- [SECURITY.md](./SECURITY.md) - Security best practices
- [NEXT_STEPS.md](./NEXT_STEPS.md) - Setup instructions
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables guide
- [frontend/README.md](./frontend/README.md) - Frontend documentation
- [backend/prisma/README.md](./backend/prisma/README.md) - Database schema

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Bun installed - [install Bun](https://bun.sh/docs/installation)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install frontend dependencies.
cd frontend
bun install

# Step 4: Install backend dependencies.
cd ..\backend
bun install

# Step 5: Start the development server.
cd ..\frontend
bun run dev
```

## What technologies are used for this project?

This project is built with:

- Bun 1.3.4
- Vite 7.2.7
- TypeScript
- React 19.2.1
- shadcn-ui
- Tailwind CSS
- Prisma
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
