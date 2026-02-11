import { z } from 'zod';

/**
 * Request validation schemas using Zod
 * Ensures all inputs are validated and sanitized
 */

// Analysis request validation
export const analyzeWorkflowSchema = z.object({
  workflowId: z.string()
    .min(1, 'Workflow ID is required')
    .max(255, 'Workflow ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid workflow ID format'),
  locationId: z.string().min(1).max(255).optional()
});

// Workflow structure request validation
export const workflowStructureParamsSchema = z.object({
  id: z.string()
    .min(1, 'Workflow ID is required')
    .max(255, 'Workflow ID too long')
});

// Subscription checkout validation
export const checkoutSchema = z.object({
  locationId: z.string().min(1).max(255).optional(),
  priceId: z.string().optional()
});

// Test analysis validation
export const testAnalysisSchema = z.object({
  workflowType: z.enum(['critical', 'medium', 'healthy'], {
    errorMap: () => ({ message: 'Invalid workflow type. Must be: critical, medium, or healthy' })
  }).optional(),
  customWorkflow: z.object({
    id: z.string().min(1).max(255),
    name: z.string().min(1).max(500),
    status: z.string().optional(),
    actions: z.array(z.any()).optional(),
    triggers: z.array(z.any()).optional(),
    connections: z.array(z.any()).optional(),
    estimatedContacts: z.number().int().min(0).optional()
  }).optional(),
  locationId: z.string().max(255).optional()
}).refine(data => data.workflowType || data.customWorkflow, {
  message: 'Either workflowType or customWorkflow must be provided'
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// History query schema
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  workflowId: z.string().max(255).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional()
});

// Location ID validation
export const locationIdSchema = z.string()
  .min(1, 'Location ID is required')
  .max(255, 'Location ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid location ID format');

// Analysis ID validation
export const analysisIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('Invalid analysis ID')
});

// Workflow ID param validation
export const workflowIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Workflow ID is required')
    .max(255, 'Workflow ID too long')
});

// Generic string ID param
export const stringIdParamSchema = z.object({
  id: z.string().min(1).max(255)
});

/**
 * Sanitize string input - remove potential XSS/injection vectors
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize object - recursively sanitize all string values
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate environment variables on startup
 */
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'GHL_CLIENT_ID',
    'GHL_CLIENT_SECRET',
    'REDIRECT_URI'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate ENCRYPTION_KEY length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error('❌ ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('❌ DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Warn about missing optional vars
  const optionalVars = ['STRIPE_SECRET_KEY', 'SENTRY_DSN', 'FRONTEND_URL', 'STRIPE_PRICE_ID'];
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Optional environment variables not set: ${missingOptional.join(', ')}`);
    console.warn('   Some features may be disabled');
  }

  console.log('✅ Environment variables validated');
}

/**
 * Validate required services on startup
 */
export function validateServices(): void {
  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.warn(`⚠️  Node.js ${nodeVersion} detected. Recommended: Node.js 18+`);
  }
  
  console.log(`✅ Node.js ${nodeVersion}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
}
