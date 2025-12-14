import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ipRateLimiter } from './middleware/rateLimit';
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
import webhooksRoutes from './routes/webhooks';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
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
app.use('/api/webhooks', webhooksRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
});

export default app;

