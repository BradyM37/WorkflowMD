/**
 * Express Request type extensions
 * Adds custom properties set by middleware
 */

import { PlanType } from '../middleware/plan-gate';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      locationId?: string;
      planType?: PlanType;
      id?: string;
    }
  }
}

export {};
