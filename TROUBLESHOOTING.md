# Troubleshooting Guide

## "Failed to fetch" Error

If you're seeing a "Failed to fetch" error when trying to sign in or sign up, follow these steps:

### 1. Check if Backend Server is Running

The backend server should be running on `http://localhost:3001`. 

**To start the backend:**
```bash
cd backend
bun run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔗 Frontend URL: http://localhost:4000
```

### 2. Check Frontend API URL

The frontend needs to know where the backend is. Check your `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3001
```

If this file doesn't exist, create it. The frontend defaults to `http://localhost:3001` if not set.

### 3. Verify CORS Configuration

The backend CORS is configured to allow:
- `http://localhost:4000` (default frontend)
- `http://localhost:3000`
- The value from `FRONTEND_URL` in backend `.env`

**Backend `.env` should have:**
```env
FRONTEND_URL=http://localhost:4000
```

### 4. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for detailed error messages
- **Network tab**: Check if the request is being made and what the response is

### 5. Common Issues

#### Issue: Backend not running
**Solution**: Start the backend server with `bun run dev` in the backend directory

#### Issue: Wrong port
**Solution**: 
- Backend should run on port 3001
- Frontend should run on port 4000
- Check `PORT` in backend `.env` and `VITE_API_URL` in frontend `.env`

#### Issue: CORS blocking
**Solution**: 
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check browser console for CORS errors
- In development, CORS allows localhost origins

#### Issue: Network connectivity
**Solution**:
- Check if you can access `http://localhost:3001/health` directly in browser
- Should return: `{"success":true,"message":"API is healthy",...}`

### 6. Test Backend Health

Open in browser: `http://localhost:3001/health`

Expected response:
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "..."
}
```

### 7. Test API Endpoint Directly

You can test the login endpoint directly using curl:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 8. Check Environment Variables

**Backend `.env` should have:**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:4000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key...
```

**Frontend `.env` should have:**
```env
VITE_API_URL=http://localhost:3001
```

### 9. Restart Both Servers

If issues persist:
1. Stop both frontend and backend servers
2. Restart backend: `cd backend && bun run dev`
3. Restart frontend: `cd frontend && bun run dev`
4. Clear browser cache and try again

### 10. Check Database Connection

Ensure your database is running and accessible:
```bash
# If using PostgreSQL
# Check if database is running
# Verify DATABASE_URL in backend .env
```

## Still Having Issues?

1. Check server logs for detailed error messages
2. Check browser console for network errors
3. Verify all environment variables are set correctly
4. Ensure both servers are running on the correct ports
5. Try accessing the API directly (curl or Postman) to isolate frontend vs backend issues
