/**
 * Main Application Entry Point - Production Hardened
 * GHL Workflow Debugger Backend
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Import validation and setup
import { validateEnvironment, validateServices } from './lib/validation';
import './lib/database'; // Initialize database connection

// Import middleware
import { requestId, requestLogger } from './middleware/request-logger';
import { securityHeaders, validateContentType, sanitizeInput } from './middleware/security';
import { errorHandler, notFoundHandler, setupProcessErrorHandlers } from './middleware/error-handler';
import { ensureDatabaseHealth, initDatabaseHealthMonitoring } from './middleware/database-health';
import { logger } from './lib/logger';
import { ApiResponse } from './lib/response';

// Import new Round 2 features
import { metricsMiddleware, metricsHandler } from './lib/metrics';
import { cache } from './lib/cache';
import { openApiSpec } from './lib/openapi';
import { 
  createTieredRateLimiter, 
  createAnalysisRateLimiter, 
  authRateLimiter, 
  webhookRateLimiter,
  rateLimitHeaders 
} from './middleware/rate-limiter';

// Import routes
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';
import { subscriptionRouter } from './routes/subscription';
import { webhookRouter } from './routes/webhooks';
import { testRouter } from './routes/test';
import { monitoringRouter } from './routes/monitoring';
import ghlSsoRouter from './routes/ghl-sso';
import metricsRouter from './routes/metrics';
import testConvRouter from './routes/test-conversations';
import responseSettingsRouter from './routes/response-settings';
import advancedMetricsRouter from './routes/metrics-advanced';
import reportsRouter from './routes/reports';

// Load environment variables
dotenv.config();

// Validate environment on startup
try {
  validateEnvironment();
  validateServices();
} catch (error: any) {
  console.error('❌ Startup validation failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy - required for Render and other reverse proxy setups
// This allows express-rate-limit to correctly identify clients via X-Forwarded-For
app.set('trust proxy', 1);

// Initialize Sentry for error tracking (production)
if (process.env.SENTRY_DSN && NODE_ENV === 'production') {
  Sentry.init({ 
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app })
    ]
  });
  
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  
  logger.info('Sentry initialized');
}

// ===== CORE MIDDLEWARE =====

// ===== COMPRESSION (ROUND 2) =====
// Enable gzip compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024 // Only compress responses > 1KB
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      // Allow embedding in GHL iframes
      frameAncestors: ["'self'", "https://*.gohighlevel.com", "https://*.leadconnectorhq.com", "https://*.highlevel.com"]
    }
  },
  // Disable X-Frame-Options so CSP frame-ancestors takes precedence
  frameguard: false,
  hsts: NODE_ENV === 'production'
}));
app.use(securityHeaders);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Tier', 'X-RateLimit-Limit'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Request parsing
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== METRICS & MONITORING (ROUND 2) =====
app.use(metricsMiddleware);

// Request tracking and logging
app.use(requestId);
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);
app.use(validateContentType);

// ===== RATE LIMIT HEADERS (ROUND 2) =====
app.use(rateLimitHeaders);

// Database health monitoring
app.use(ensureDatabaseHealth);

// ===== METRICS ENDPOINT (ROUND 2) =====

/**
 * Prometheus metrics endpoint
 */
app.get('/metrics', metricsHandler);

/**
 * Cache stats endpoint (internal monitoring)
 */
app.get('/internal/cache-stats', (req, res) => {
  // Basic auth or IP whitelist in production
  const stats = cache.getStats();
  ApiResponse.success(res, stats);
});

// ===== API DOCUMENTATION (ROUND 2) =====

/**
 * Swagger UI for API documentation
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'GHL Workflow Debugger API',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    }
  }
}));

/**
 * OpenAPI spec JSON endpoint
 */
app.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// ===== ROOT ROUTE =====

/**
 * Root route - redirect to API docs or return service info
 */
app.get('/', (_req, res) => {
  ApiResponse.success(res, {
    service: 'GHL Workflow Debugger API',
    version: '1.0.0',
    status: 'running',
    docs: '/api-docs',
    health: '/health'
  });
});

// ===== HEALTH CHECK ENDPOINTS =====

/**
 * Basic health check - always responds if server is running
 */
app.get('/health', (_req, res) => {
  ApiResponse.success(res, {
    status: 'healthy',
    service: 'ghl-workflow-debugger',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

/**
 * Detailed health check - includes database and cache status
 */
app.get('/health/detailed', async (req, res) => {
  const { pool } = await import('./lib/database');
  
  const health: any = {
    status: 'healthy',
    service: 'ghl-workflow-debugger',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    checks: {
      database: 'unknown',
      cache: 'unknown',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      uptime: Math.round(process.uptime())
    }
  };

  // Check database
  try {
    await pool.query('SELECT NOW()');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
    logger.error('Database health check failed', {}, error as Error);
  }

  // Check cache (Redis or in-memory)
  try {
    const cacheStats = cache.getStats();
    
    if (cacheStats.type === 'redis') {
      // Redis is connected
      if (cacheStats.connected) {
        health.checks.cache = {
          status: 'healthy',
          type: 'redis',
          connected: true
        };
      } else {
        health.checks.cache = {
          status: 'degraded',
          type: 'redis',
          connected: false,
          message: 'Redis disconnected, using in-memory fallback'
        };
        health.status = 'degraded';
      }
    } else {
      // Using in-memory cache (fallback or no Redis configured)
      health.checks.cache = {
        status: 'healthy',
        type: 'in-memory',
        size: cacheStats.size,
        message: process.env.REDIS_URL ? 'Redis unavailable, using fallback' : 'Redis not configured'
      };
      
      // Only mark as degraded if Redis was configured but unavailable
      if (process.env.REDIS_URL) {
        health.status = 'degraded';
      }
    }
  } catch (error) {
    health.checks.cache = {
      status: 'unhealthy',
      message: 'Cache system error'
    };
    health.status = 'degraded';
    logger.error('Cache health check failed', {}, error as Error);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  ApiResponse.success(res, health, statusCode);
});

/**
 * Readiness check - for k8s/orchestration
 */
app.get('/ready', async (_req, res) => {
  const { pool } = await import('./lib/database');
  
  try {
    await pool.query('SELECT 1');
    ApiResponse.success(res, { ready: true });
  } catch (error) {
    logger.error('Readiness check failed', {}, error as Error);
    ApiResponse.serviceUnavailable(res, 'Service not ready');
  }
});

/**
 * Liveness check - for k8s/orchestration
 */
app.get('/live', (_req, res) => {
  ApiResponse.success(res, { alive: true });
});

// ===== API ROUTES (WITH VERSIONING - ROUND 2) =====

// Apply tiered rate limiting
const tieredRateLimiter = createTieredRateLimiter();
const analysisRateLimiter = createAnalysisRateLimiter();

// Auth routes with strict rate limiting
app.use('/auth', authRateLimiter, authRouter);

// GHL SSO route (custom menu link handler)
app.use('/', ghlSsoRouter);

// API v1 routes (current version)
app.use('/api', tieredRateLimiter, apiRouter);
app.use('/api/subscription', tieredRateLimiter, subscriptionRouter);
app.use('/api/metrics', tieredRateLimiter, metricsRouter);
app.use('/api/metrics', tieredRateLimiter, advancedMetricsRouter);
app.use('/api/settings/response', tieredRateLimiter, responseSettingsRouter);
app.use('/api/reports', tieredRateLimiter, reportsRouter);
app.use('/api/test-conv', testConvRouter); // TEMP: Remove after verifying API works
app.use('/api', tieredRateLimiter, monitoringRouter);

// Analysis endpoint gets its own stricter rate limit
app.use('/api/analyze', analysisRateLimiter);

// Webhook routes (separate rate limit)
app.use('/webhooks', webhookRateLimiter, webhookRouter);

// ===== LEGACY ROUTES (for backwards compatibility) =====
// These will be deprecated in future versions
logger.info('Legacy routes mounted for backwards compatibility');

// Test routes (only in development)
if (NODE_ENV === 'development') {
  app.use('/test', testRouter);
  logger.info('Test routes enabled (development mode)');
}

// ===== ERROR HANDLING =====

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN && NODE_ENV === 'production') {
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// ===== SERVER STARTUP =====

// Initialize database health monitoring
initDatabaseHealthMonitoring();

// Setup process-level error handlers
setupProcessErrorHandlers();

// Run database migrations on startup
(async () => {
  try {
    const { runMigrations } = await import('./lib/migrations');
    await runMigrations();
  } catch (error) {
    logger.error('Failed to run migrations', {}, error as Error);
  }
})();

// Initialize scan scheduler
(async () => {
  try {
    const { initializeSchedules } = await import('./lib/scan-scheduler');
    await initializeSchedules();
    logger.info('Scan scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize scan scheduler', {}, error as Error);
  }
})();

// Initialize session cleanup scheduler
(async () => {
  try {
    const { scheduleSessionCleanup } = await import('./lib/session-cleanup');
    scheduleSessionCleanup();
    logger.info('Session cleanup scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize session cleanup', {}, error as Error);
  }
})();

// Initialize response sync scheduler
(async () => {
  try {
    const { startSyncScheduler } = await import('./lib/response-sync-scheduler');
    startSyncScheduler();
    logger.info('Response sync scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize response sync scheduler', {}, error as Error);
  }
})();

// Initialize missed leads checker
(async () => {
  try {
    const { startMissedLeadsChecker } = await import('./lib/missed-leads-checker');
    startMissedLeadsChecker();
    logger.info('Missed leads checker initialized');
  } catch (error) {
    logger.error('Failed to initialize missed leads checker', {}, error as Error);
  }
})();

// Start server
const server = app.listen(PORT, () => {
  logger.info('🚀 Server started', {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid
  });
  
  console.log('='.repeat(50));
  console.log('🚀 GHL Workflow Debugger Backend');
  console.log('='.repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Node.js ${process.version}`);
  console.log(`🔐 Security: Enhanced`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});

// Graceful shutdown handler (ENHANCED - ROUND 2)
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close cache connection
      await cache.close();
      logger.info('Cache connection closed');
      
      // Close database pool
      const { pool } = await import('./lib/database');
      await pool.end();
      logger.info('Database pool closed');
      
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {}, error as Error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
