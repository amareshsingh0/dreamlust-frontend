import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ipRateLimiter } from './middleware/rateLimit';
import { securityMiddleware } from './middleware/security';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import searchRoutes from './routes/search';
import preferencesRoutes from './routes/preferences';
import playlistRoutes from './routes/playlists';
import contentRoutes from './routes/content';
import analyticsRoutes from './routes/analytics';
import recommendationsRoutes from './routes/recommendations';
import commentsRoutes from './routes/comments';
import tipsRoutes from './routes/tips';
import earningsRoutes from './routes/earnings';
import payoutsRoutes from './routes/payouts';
import webhooksRoutes from './routes/webhooks';
import privacyRoutes from './routes/privacy';
import moderationRoutes from './routes/moderation';
import uploadRoutes from './routes/upload';
import creatorsRoutes from './routes/creators';
import liveRoutes from './routes/live';
import paymentsRoutes from './routes/payments';
import subscriptionsRoutes from './routes/subscriptions';
import plansRoutes from './routes/plans';
import razorpayRoutes from './routes/razorpay';
import { createServer } from 'http';
import { initializeSocketServer } from './socket/socketServer';

const app = express();

// Security middleware - comprehensive security headers
app.use(...securityMiddleware);

// CORS configuration - allow frontend origin and localhost in development
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Compression middleware - gzip/brotli for text responses
app.use(compression({
  filter: (req, res) => {
    // Compress text responses
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IP rate limiting (applied to all routes)
app.use(ipRateLimiter);

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dreamlust API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
      },
      oauth: {
        google: 'GET /api/auth/oauth/google',
        twitter: 'GET /api/auth/oauth/twitter',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/creators', creatorsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/razorpay', razorpayRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10);

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocketServer(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`✅ Server ready to accept connections`);
  console.log(`🔌 WebSocket server initialized`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Please free the port or change PORT in .env`);
    console.error(`   To find what's using the port: Get-NetTCPConnection -LocalPort ${PORT}`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections (prevents server crashes)
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit - let the error handler middleware handle it
  // This prevents the server from crashing on async errors
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Only exit on truly unexpected errors
  // Most errors should be caught by asyncHandler
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

