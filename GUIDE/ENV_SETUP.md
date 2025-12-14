# Environment Variables Setup

## ✅ Current Configuration

Your `.env` file is set up with:

### Frontend Variables (Safe for Client-Side)
```env
VITE_SUPABASE_URL=https://aqtovzzjevtfswqraqbl.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HSROPjtaD_t4t9tgSbaNoQ_igk6O8Z9
```

**✅ Safe to use in frontend** - These are API keys protected by RLS

### Backend Variables (Server-Side Only)
```env
DATABASE_URL=postgresql://postgres:Amaresh@8423@db.aqtovzzjevtfswqraqbl.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=sb_secret_nS1l5cIg1oi3qcRK3M6Ldg_gM_s50Y4
```

**❌ NEVER use in frontend!** - These are sensitive credentials

## 🔐 Security Status

- ✅ `.env` is in `.gitignore` - Won't be committed
- ✅ Frontend uses API keys (safe)
- ✅ Backend credentials protected
- ✅ Vite only exposes `VITE_*` variables to frontend

## 📝 Important Notes

### Service Role Key
The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and has full database access.

**Use cases:**
- Backend API routes
- Server-side functions
- Admin operations
- Background jobs

**NEVER:**
- ❌ Import in React components
- ❌ Use in frontend code
- ❌ Expose to client-side

### Database Password
The `DATABASE_URL` contains your database password.

**Use cases:**
- Prisma migrations
- Direct database connections
- Backend operations

**NEVER:**
- ❌ Use in frontend
- ❌ Commit to Git
- ❌ Share publicly

## 🚀 Next Steps

1. **Run SQL Migrations** in Supabase Dashboard
2. **Test Connection** using `testSupabase.ts`
3. **Start Building** your DreamLust platform!

See [NEXT_STEPS.md](./NEXT_STEPS.md) for detailed instructions.

## Scheduled Tasks

For account deletion processing, see [SCHEDULED_TASKS.md](./SCHEDULED_TASKS.md) for detailed setup instructions.

**Quick setup (Windows Task Scheduler):**
```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$PWD\backend\scripts\scheduleAccountDeletion.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"
Register-ScheduledTask -TaskName "Dreamlust Account Deletion" `
    -Action $action -Trigger $trigger -Description "Processes account deletions"
```
