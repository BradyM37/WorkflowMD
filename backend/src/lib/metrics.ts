/**
 * Metrics Collection & Monitoring
 * Prometheus-compatible metrics with StatsD support preparation
 */

import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from './logger';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ prefix: 'ghl_debugger_' });

/**
 * HTTP Request Metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'ghl_debugger_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10] // seconds
});

export const httpRequestTotal = new Counter({
  name: 'ghl_debugger_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestsInFlight = new Gauge({
  name: 'ghl_debugger_http_requests_in_flight',
  help: 'Current number of HTTP requests in flight'
});

/**
 * Application Metrics
 */
export const workflowAnalysisTotal = new Counter({
  name: 'ghl_debugger_workflow_analysis_total',
  help: 'Total number of workflow analyses performed',
  labelNames: ['status', 'subscription_tier']
});

export const workflowAnalysisDuration = new Histogram({
  name: 'ghl_debugger_workflow_analysis_duration_seconds',
  help: 'Duration of workflow analysis in seconds',
  labelNames: ['subscription_tier'],
  buckets: [0.5, 1, 2, 5, 10, 30]
});

export const workflowHealthScore = new Histogram({
  name: 'ghl_debugger_workflow_health_score',
  help: 'Distribution of workflow health scores',
  labelNames: ['subscription_tier'],
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
});

export const workflowIssuesFound = new Histogram({
  name: 'ghl_debugger_workflow_issues_found',
  help: 'Number of issues found in workflows',
  labelNames: ['issue_type', 'severity'],
  buckets: [0, 1, 3, 5, 10, 20, 50]
});

/**
 * Database Metrics
 */
export const databaseQueryDuration = new Histogram({
  name: 'ghl_debugger_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

export const databaseConnectionsActive = new Gauge({
  name: 'ghl_debugger_database_connections_active',
  help: 'Number of active database connections'
});

export const databaseConnectionsIdle = new Gauge({
  name: 'ghl_debugger_database_connections_idle',
  help: 'Number of idle database connections'
});

export const databaseQueryErrors = new Counter({
  name: 'ghl_debugger_database_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['operation', 'error_type']
});

/**
 * Cache Metrics
 */
export const cacheHits = new Counter({
  name: 'ghl_debugger_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'key_prefix']
});

export const cacheMisses = new Counter({
  name: 'ghl_debugger_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'key_prefix']
});

export const cacheOperationDuration = new Histogram({
  name: 'ghl_debugger_cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'cache_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});

/**
 * External API Metrics (GHL)
 */
export const ghlApiRequests = new Counter({
  name: 'ghl_debugger_ghl_api_requests_total',
  help: 'Total GHL API requests',
  labelNames: ['endpoint', 'status_code']
});

export const ghlApiDuration = new Histogram({
  name: 'ghl_debugger_ghl_api_duration_seconds',
  help: 'Duration of GHL API requests',
  labelNames: ['endpoint'],
  buckets: [0.5, 1, 2, 5, 10, 30]
});

export const ghlApiErrors = new Counter({
  name: 'ghl_debugger_ghl_api_errors_total',
  help: 'Total GHL API errors',
  labelNames: ['endpoint', 'error_type']
});

/**
 * Rate Limit Metrics
 */
export const rateLimitExceeded = new Counter({
  name: 'ghl_debugger_rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'subscription_tier']
});

/**
 * Business Metrics
 */
export const activeUsers = new Gauge({
  name: 'ghl_debugger_active_users',
  help: 'Number of currently active users',
  labelNames: ['subscription_tier']
});

export const subscriptionEvents = new Counter({
  name: 'ghl_debugger_subscription_events_total',
  help: 'Total subscription events',
  labelNames: ['event_type', 'tier']
});

/**
 * HTTP Request Metrics Middleware
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Track in-flight requests
  httpRequestsInFlight.inc();
  
  // Capture route for consistent labeling (removes path params)
  const route = req.route?.path || req.path;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Record duration
    httpRequestDuration.labels(
      req.method,
      route,
      res.statusCode.toString()
    ).observe(duration);
    
    // Count requests
    httpRequestTotal.labels(
      req.method,
      route,
      res.statusCode.toString()
    ).inc();
    
    // Decrement in-flight counter
    httpRequestsInFlight.dec();
  });
  
  next();
}

/**
 * Metrics endpoint handler
 * Exposes metrics in Prometheus format
 */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to collect metrics', {}, error as Error);
    res.status(500).end('Failed to collect metrics');
  }
}

/**
 * Update database connection pool metrics
 */
export function updateDatabaseMetrics(active: number, idle: number): void {
  databaseConnectionsActive.set(active);
  databaseConnectionsIdle.set(idle);
}

/**
 * Record analysis metrics
 */
export function recordAnalysis(
  durationSeconds: number,
  healthScore: number,
  issuesCount: number,
  subscriptionTier: string,
  success: boolean
): void {
  const status = success ? 'success' : 'error';
  
  workflowAnalysisTotal.labels(status, subscriptionTier).inc();
  
  if (success) {
    workflowAnalysisDuration.labels(subscriptionTier).observe(durationSeconds);
    workflowHealthScore.labels(subscriptionTier).observe(healthScore);
  }
}

/**
 * Record cache metrics
 */
export function recordCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'del',
  cacheType: 'redis' | 'memory',
  keyPrefix: string,
  durationMs?: number
): void {
  if (operation === 'hit') {
    cacheHits.labels(cacheType, keyPrefix).inc();
  } else if (operation === 'miss') {
    cacheMisses.labels(cacheType, keyPrefix).inc();
  }
  
  if (durationMs !== undefined) {
    cacheOperationDuration.labels(operation, cacheType).observe(durationMs / 1000);
  }
}

/**
 * Record GHL API call metrics
 */
export function recordGHLApiCall(
  endpoint: string,
  durationSeconds: number,
  statusCode?: number,
  error?: string
): void {
  if (statusCode) {
    ghlApiRequests.labels(endpoint, statusCode.toString()).inc();
  }
  
  ghlApiDuration.labels(endpoint).observe(durationSeconds);
  
  if (error) {
    ghlApiErrors.labels(endpoint, error).inc();
  }
}

/**
 * Record database query metrics
 */
export function recordDatabaseQuery(
  operation: string,
  durationSeconds: number,
  error?: string
): void {
  databaseQueryDuration.labels(operation).observe(durationSeconds);
  
  if (error) {
    databaseQueryErrors.labels(operation, error).inc();
  }
}

/**
 * Get current metrics summary (for internal monitoring)
 */
export async function getMetricsSummary(): Promise<any> {
  const metrics = await register.getMetricsAsJSON();
  
  return {
    timestamp: new Date().toISOString(),
    metrics: metrics.map((m: any) => ({
      name: m.name,
      help: m.help,
      type: m.type,
      values: m.values
    }))
  };
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
  logger.info('All metrics reset');
}
