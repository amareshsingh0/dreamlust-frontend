/**
 * Swagger/OpenAPI Configuration
 * Auto-generates API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DreamLust API',
      version: '1.0.0',
      description: 'Adult content platform API documentation',
      contact: {
        name: 'API Support',
        email: 'passionfantasia@gmail.com',
      },
    },
    servers: [
      {
        url: env.API_URL || 'http://localhost:3001',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            displayName: { type: 'string' },
            avatar: { type: 'string', format: 'uri' },
            role: { type: 'string', enum: ['USER', 'CREATOR', 'MODERATOR', 'ADMIN'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Content: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['VIDEO', 'PHOTO', 'VR', 'LIVE_STREAM'] },
            status: { type: 'string', enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'DELETED'] },
            thumbnail: { type: 'string', format: 'uri' },
            mediaUrl: { type: 'string', format: 'uri' },
            viewCount: { type: 'integer' },
            likeCount: { type: 'integer' },
            isPremium: { type: 'boolean' },
            price: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Unauthorized', message: 'Authentication required', statusCode: 401 },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Forbidden', message: 'Insufficient permissions', statusCode: 403 },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Not Found', message: 'Resource not found', statusCode: 404 },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Validation Error', message: 'Invalid input', statusCode: 400 },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Rate Limit', message: 'Too many requests', statusCode: 429 },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and registration' },
      { name: 'Content', description: 'Content management' },
      { name: 'Upload', description: 'File upload operations' },
      { name: 'Users', description: 'User management' },
      { name: 'Creators', description: 'Creator profiles and tools' },
      { name: 'Search', description: 'Search and discovery' },
      { name: 'Analytics', description: 'Analytics and insights' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Subscriptions', description: 'Subscription management' },
      { name: 'Moderation', description: 'Content moderation' },
      { name: 'Admin', description: 'Admin operations' },
      { name: 'GDPR', description: 'GDPR/CCPA compliance' },
      { name: 'DMCA', description: 'DMCA takedown management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'DreamLust API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};
