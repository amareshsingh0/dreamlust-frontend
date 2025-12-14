# Dreamlust Project

A comprehensive video/content platform with authentication, content management, and moderation features.

## 🚀 Quick Start

### Backend

```powershell
cd backend
bun run dev
```

Or use the startup script:
```powershell
cd backend
.\start-server.ps1
```

### Frontend

```powershell
cd frontend
bun run dev
```

## 📋 Recent Fixes Applied

All backend connection and setup issues have been comprehensively fixed:

- ✅ **Prisma Field Names** - Fixed all camelCase/snake_case mismatches (29 files)
- ✅ **Server Startup** - Improved error handling and port conflict resolution
- ✅ **Authentication** - Fixed login/logout functionality
- ✅ **CORS** - Verified and configured properly
- ✅ **Server Scripts** - Created automated startup and monitoring scripts

See `FIXES_APPLIED.md` and `README_FIXES.md` for complete details.

## 🛠️ Key Features

- User authentication (Sign In/Sign Up)
- Content upload and management
- Video processing with Mux/Cloudflare Stream
- Image storage with S3/R2
- Background job processing (BullMQ)
- Content moderation
- CDN integration
- Real-time recommendations

## 📁 Project Structure

```
dreamlust-project/
├── backend/          # Express.js backend
│   ├── src/
│   ├── prisma/
│   └── scripts/
├── frontend/         # React frontend
│   ├── src/
│   └── public/
└── GUIDE/           # Documentation
```

## 🔧 Setup

1. **Backend:**
   ```powershell
   cd backend
   bun install
   cp .env.example .env
   # Edit .env with your credentials
   bunx prisma generate
   bun run dev
   ```

2. **Frontend:**
   ```powershell
   cd frontend
   bun install
   bun run dev
   ```

## 📚 Documentation

- `FIXES_APPLIED.md` - Complete list of fixes
- `KEEP_SERVER_RUNNING.md` - How to keep server running
- `backend/START_SERVER.md` - Server startup guide
- `backend/COMPREHENSIVE_FIX.md` - Root cause analysis
- `GUIDE/` - Additional guides and documentation

## 🐛 Troubleshooting

If you see connection errors:

1. **Check if server is running:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3001/health"
   ```

2. **Use the monitor script:**
   ```powershell
   cd backend
   bun run start:monitor
   ```

3. **See `QUICK_FIX.md` for quick solutions**

## 📝 License

[Your License Here]

## 👤 Author

[Your Name/Organization]
