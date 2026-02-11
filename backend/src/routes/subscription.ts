/**
 * Subscription Routes - Hardened Production Version
 * Stripe integration for subscription management with enhanced error handling
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { pool } from '../lib/database';
import { requireAuth } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import { retryQuery } from '../middleware/database-health';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-08-16',
  typescript: true,
  maxNetworkRetries: 3
});

export const subscriptionRouter = Router();

// All subscription routes require authentication
subscriptionRouter.use(requireAuth);

/**
 * POST /api/subscription/checkout
 * Create Stripe checkout session for Pro subscription
 */
subscriptionRouter.post('/checkout', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    logger.error('Stripe not configured', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID
    });
    
    return ApiResponse.error(
      res,
      'Payment system not configured',
      503,
      'PAYMENT_UNAVAILABLE'
    );
  }

  logger.info('Creating checkout session', {
    locationId,
    requestId: req.id
  });

  try {
    // Get or create Stripe customer
    const result = await retryQuery(
      () => pool.query(
        'SELECT stripe_customer_id, subscription_status FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      ),
      2,
      500
    );
    
    let customerId = result.rows[0]?.stripe_customer_id;
    const currentStatus = result.rows[0]?.subscription_status;

    // Check if already subscribed
    if (currentStatus === 'pro') {
      logger.warn('User already has Pro subscription', {
        locationId,
        requestId: req.id
      });
      
      return ApiResponse.error(
        res,
        'You already have an active Pro subscription',
        400,
        'ALREADY_SUBSCRIBED',
        { manageUrl: '/api/subscription/portal' }
      );
    }
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          metadata: {
            location_id: locationId
          }
        });
        
        customerId = customer.id;
        
        // Save customer ID
        await retryQuery(
          () => pool.query(
            'UPDATE oauth_tokens SET stripe_customer_id = $1 WHERE location_id = $2',
            [customerId, locationId]
          ),
          3,
          1000
        );

        logger.info('Stripe customer created', {
          locationId,
          customerId,
          requestId: req.id
        });
      } catch (stripeError: any) {
        logger.error('Failed to create Stripe customer', {
          locationId,
          errorMessage: stripeError.message,
          requestId: req.id
        }, stripeError);
        
        return ApiResponse.error(
          res,
          'Failed to create payment customer',
          500,
          'STRIPE_ERROR'
        );
      }
    }
    
    // Create checkout session
    const successUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/dashboard?upgraded=true`
      : '/dashboard?upgraded=true';
    
    const cancelUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/pricing`
      : '/pricing';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: locationId,
      metadata: {
        location_id: locationId
      },
      subscription_data: {
        metadata: {
          location_id: locationId
        }
      }
    });

    logger.info('Checkout session created', {
      locationId,
      customerId,
      sessionId: session.id,
      requestId: req.id
    });

    return ApiResponse.success(res, {
      url: session.url,
      sessionId: session.id
    });

  } catch (error: any) {
    logger.error('Checkout error', {
      locationId,
      errorType: error.type,
      errorMessage: error.message,
      requestId: req.id
    }, error);
    
    if (error.type === 'StripeCardError') {
      return ApiResponse.error(res, error.message, 400, 'CARD_ERROR');
    }
    
    return ApiResponse.error(
      res,
      'Failed to create checkout session',
      500,
      'CHECKOUT_ERROR'
    );
  }
}));

/**
 * POST /api/subscription/portal
 * Create Stripe customer portal session for managing subscription
 */
subscriptionRouter.post('/portal', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  
  if (!process.env.STRIPE_SECRET_KEY) {
    return ApiResponse.error(
      res,
      'Payment system not configured',
      503,
      'PAYMENT_UNAVAILABLE'
    );
  }

  logger.info('Creating portal session', {
    locationId,
    requestId: req.id
  });

  try {
    const result = await retryQuery(
      () => pool.query(
        'SELECT stripe_customer_id FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      ),
      2,
      500
    );
    
    const customerId = result.rows[0]?.stripe_customer_id;
    
    if (!customerId) {
      logger.warn('No Stripe customer found for portal access', {
        locationId,
        requestId: req.id
      });
      
      return ApiResponse.error(
        res,
        'No subscription found. Please subscribe first.',
        400,
        'NO_SUBSCRIPTION'
      );
    }
    
    const returnUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/dashboard`
      : '/dashboard';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    logger.info('Portal session created', {
      locationId,
      customerId,
      requestId: req.id
    });

    return ApiResponse.success(res, {
      url: session.url
    });

  } catch (error: any) {
    logger.error('Portal error', {
      locationId,
      errorType: error.type,
      errorMessage: error.message,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(
      res,
      'Failed to create portal session',
      500,
      'PORTAL_ERROR'
    );
  }
}));

/**
 * GET /api/subscription/status
 * Get current subscription status
 */
subscriptionRouter.get('/status', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  
  logger.debug('Fetching subscription status', {
    locationId,
    requestId: req.id
  });

  try {
    const result = await retryQuery(
      () => pool.query(
        'SELECT subscription_status, stripe_customer_id, subscription_ends_at FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      ),
      2,
      500
    );
    
    const data = result.rows[0] || {};
    const status = data.subscription_status || 'free';
    const hasCustomer = !!data.stripe_customer_id;

    // If has Stripe customer, verify with Stripe
    let stripeStatus: any = null;
    if (hasCustomer && process.env.STRIPE_SECRET_KEY) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: data.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          stripeStatus = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end
          };

          // Update local database if status mismatch
          if (sub.status === 'active' && status !== 'pro') {
            await pool.query(
              'UPDATE oauth_tokens SET subscription_status = $1 WHERE location_id = $2',
              ['pro', locationId]
            );
            
            logger.info('Subscription status synced from Stripe', {
              locationId,
              oldStatus: status,
              newStatus: 'pro'
            });
          }
        }
      } catch (stripeError) {
        logger.warn('Failed to fetch Stripe subscription', {
          locationId,
          error: (stripeError as Error).message
        });
        // Continue anyway - use database status
      }
    }

    return ApiResponse.success(res, {
      status: stripeStatus ? 'pro' : status,
      hasPaymentMethod: hasCustomer,
      manageUrl: hasCustomer ? '/api/subscription/portal' : null,
      upgradeUrl: hasCustomer ? null : '/api/subscription/checkout',
      endsAt: data.subscription_ends_at,
      stripe: stripeStatus,
      features: {
        unlimitedAnalysis: status === 'pro',
        fullIssueDetails: status === 'pro',
        historyRetention: status === 'pro' ? 90 : 7,
        prioritySupport: status === 'pro'
      }
    });

  } catch (error) {
    logger.error('Failed to fetch subscription status', {
      locationId,
      requestId: req.id
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Failed to get subscription status');
  }
}));

/**
 * POST /api/subscription/cancel
 * Cancel subscription (mark for cancellation at period end)
 */
subscriptionRouter.post('/cancel', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  
  if (!process.env.STRIPE_SECRET_KEY) {
    return ApiResponse.error(
      res,
      'Payment system not configured',
      503,
      'PAYMENT_UNAVAILABLE'
    );
  }

  logger.info('Cancellation requested', {
    locationId,
    requestId: req.id
  });

  try {
    const result = await retryQuery(
      () => pool.query(
        'SELECT stripe_customer_id FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      ),
      2,
      500
    );
    
    const customerId = result.rows[0]?.stripe_customer_id;
    
    if (!customerId) {
      return ApiResponse.error(
        res,
        'No subscription found',
        400,
        'NO_SUBSCRIPTION'
      );
    }

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return ApiResponse.error(
        res,
        'No active subscription found',
        400,
        'NO_ACTIVE_SUBSCRIPTION'
      );
    }

    const subscription = subscriptions.data[0];

    // Cancel at period end (not immediately)
    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    logger.info('Subscription cancelled', {
      locationId,
      subscriptionId: subscription.id,
      endsAt: new Date(updated.current_period_end * 1000).toISOString(),
      requestId: req.id
    });

    return ApiResponse.success(res, {
      cancelled: true,
      endsAt: new Date(updated.current_period_end * 1000).toISOString(),
      message: 'Your subscription will remain active until the end of the current billing period'
    });

  } catch (error: any) {
    logger.error('Cancellation error', {
      locationId,
      errorMessage: error.message,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(
      res,
      'Failed to cancel subscription',
      500,
      'CANCELLATION_ERROR'
    );
  }
}));
