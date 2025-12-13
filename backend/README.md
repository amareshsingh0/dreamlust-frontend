# Dreamlust Backend API

Complete backend API for Dreamlust platform with authentication, authorization, rate limiting, and validation.

## Features

- ✅ **REST API** with Express.js
- ✅ **JWT Authentication** (Access: 15min, Refresh: 7 days)
- ✅ **Role-Based Access Control** (User, Creator, Moderator, Admin)
- ✅ **Rate Limiting** (100 req/min per user, 1000/min per IP)
- ✅ **Request Validation** with Zod schemas
- ✅ **Standardized Error Handling**
- ✅ **Session Management** (In-memory, Redis-ready)
- ✅ **2FA Support** (TOTP for creators/premium users)
- ✅ **OAuth** (Google, Twitter)
- ✅ **Password Security** (bcrypt with 12+ rounds)
- ✅ **CSRF Protection** (httpOnly cookies)
- ✅ **Optimistic Locking** (version fields)

## Setup

### 1. Install Dependencies

```bash
cd backend
bun install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT (minimum 32 characters)

### 3. Database Setup

```bash
# Generate Prisma Client
bun run db:generate

# Push schema to database
bun run db:push

# Or run migrations
bun run db:migrate
```

### 4. Run Server

```bash
# Development
bun run dev

# Production
bun start
```

Server runs on `http://localhost:3001` by default.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

### OAuth

- `GET /api/auth/oauth/google` - Google OAuth login
- `GET /api/auth/oauth/google/callback` - Google OAuth callback
- `GET /api/auth/oauth/twitter` - Twitter OAuth login
- `GET /api/auth/oauth/twitter/callback` - Twitter OAuth callback

## Authentication Flow

1. **Register/Login**: User provides credentials
2. **Tokens Generated**: Access token (15min) + Refresh token (7 days)
3. **Refresh Token**: Stored in httpOnly cookie (secure, sameSite: strict)
4. **Access Token**: Sent in `Authorization: Bearer <token>` header
5. **Token Refresh**: Use refresh token to get new access token

## Rate Limiting

- **User Rate Limit**: 100 requests per minute (authenticated users)
- **IP Rate Limit**: 1000 requests per minute (all requests)
- **Strict Rate Limit**: 10 requests per minute (sensitive endpoints)

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Security Features

- ✅ Password hashing with bcrypt (12+ rounds)
- ✅ JWT tokens with expiration
- ✅ httpOnly cookies for refresh tokens
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation with Zod
- ✅ Role-based access control
- ✅ Secure headers (Helmet)
- ✅ CORS configuration

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── lib/              # Library functions
│   │   ├── auth/         # Authentication utilities
│   │   └── errors.ts     # Error handling
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── schemas/          # Zod validation schemas
│   └── server.ts         # Express app
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json
```

## Production Considerations

1. **Use Redis** for session management (replace in-memory store)
2. **Set secure cookies** (`secure: true` in production)
3. **Use environment variables** for all secrets
4. **Enable HTTPS** for all endpoints
5. **Monitor rate limits** and adjust as needed
6. **Set up logging** (Winston, Pino, etc.)
7. **Add request ID tracking** for debugging
8. **Implement database connection pooling**

## License

MIT

