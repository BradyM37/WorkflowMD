/**
 * Webhook Routes - Hardened Production Version
 * Handles Stripe and GHL webhooks with idempotency and comprehensive error handling
 */

import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';
import { ApiResponse } from '../lib/response';
import { retryQuery } from '../middleware/database-health';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-08-16',
  typescript: true,
  maxNetworkRetries: 3
});

export const webhookRouter = Router();

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 */
webhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      logger.warn('Stripe webhook missing signature', {
        ip: req.ip
      });
      return res.status(400).send('Missing signature');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).send('Webhook not configured');
    }

    let event: Stripe.Event;

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      logger.info('Stripe webhook received', {
        eventId: event.id,
        eventType: event.type,
        ip: req.ip
      });
    } catch (err: any) {
      logger.error('Stripe webhook signature verification failed', {
        error: err.message,
        ip: req.ip
      }, err);
      
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check - prevent duplicate processing
    try {
      const existingEvent = await retryQuery(
        () => pool.query(
          'SELECT id, processed_at FROM stripe_events WHERE id = $1',
          [event.id]
        ),
        2,
        500
      );
      
      if (existingEvent.rows.length > 0) {
        logger.info('Stripe webhook already processed', {
          eventId: event.id,
          eventType: event.type,
          processedAt: existingEvent.rows[0].processed_at
        });
        
        return res.json({ received: true, alreadyProcessed: true });
      }

      // Store event to prevent duplicate processing
      await retryQuery(
        () => pool.query(
          `INSERT INTO stripe_events (id, type, data, processed_at) 
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [event.id, event.type, JSON.stringify(event.data)]
        ),
        3,
        1000
      );
    } catch (error) {
      logger.error('Failed to check/store Stripe event', {
        eventId: event.id
      }, error as Error);
      
      // Continue processing anyway - better to potentially duplicate than miss
      logger.warn('Continuing with event processing despite storage error');
    }

    // Process event
    try {
      await processStripeEvent(event);
      
      logger.info('Stripe webhook processed successfully', {
        eventId: event.id,
        eventType: event.type
      });

      return res.json({ received: true });
    } catch (error) {
      logger.error('Error processing Stripe webhook', {
        eventId: event.id,
        eventType: event.type
      }, error as Error);
      
      return res.status(500).json({ 
        error: 'Webhook processing failed',
        eventId: event.id 
      });
    }
  }
);

/**
 * Process Stripe webhook events
 */
async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const locationId = session.client_reference_id || session.metadata?.location_id;
      
      if (!locationId) {
        logger.warn('Checkout session missing location_id', {
          sessionId: session.id,
          eventId: event.id
        });
        return;
      }

      logger.info('Processing checkout completion', {
        sessionId: session.id,
        locationId,
        customerId: session.customer,
        eventId: event.id
      });

      // Activate Pro subscription
      await retryQuery(
        () => pool.query(
          `UPDATE oauth_tokens 
           SET subscription_status = $1, updated_at = NOW() 
           WHERE location_id = $2`,
          ['pro', locationId]
        ),
        3,
        1000
      );

      logger.info('✅ Subscription activated', {
        locationId,
        eventId: event.id
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      logger.info('Processing subscription deletion', {
        subscriptionId: subscription.id,
        customerId,
        eventId: event.id
      });

      // Find location by customer ID
      const result = await retryQuery(
        () => pool.query(
          'SELECT location_id FROM oauth_tokens WHERE stripe_customer_id = $1',
          [customerId]
        ),
        2,
        500
      );
      
      if (result.rows.length === 0) {
        logger.warn('No location found for deleted subscription', {
          customerId,
          subscriptionId: subscription.id,
          eventId: event.id
        });
        return;
      }

      const locationId = result.rows[0].location_id;

      // Downgrade to free tier
      await retryQuery(
        () => pool.query(
          `UPDATE oauth_tokens 
           SET subscription_status = $1, subscription_ends_at = NOW(), updated_at = NOW() 
           WHERE location_id = $2`,
          ['free', locationId]
        ),
        3,
        1000
      );

      logger.info('❌ Subscription cancelled', {
        locationId,
        customerId,
        eventId: event.id
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      logger.info('Processing subscription update', {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        eventId: event.id
      });

      // Find location by customer ID
      const result = await retryQuery(
        () => pool.query(
          'SELECT location_id FROM oauth_tokens WHERE stripe_customer_id = $1',
          [customerId]
        ),
        2,
        500
      );
      
      if (result.rows.length === 0) {
        logger.warn('No location found for subscription update', {
          customerId,
          subscriptionId: subscription.id,
          eventId: event.id
        });
        return;
      }

      const locationId = result.rows[0].location_id;
      
      // Determine status based on subscription state
      let status = 'free';
      let endsAt: Date | null = null;
      
      if (subscription.status === 'active') {
        status = 'pro';
      } else if (subscription.cancel_at_period_end) {
        status = 'pro'; // Still active until period end
        endsAt = new Date(subscription.current_period_end * 1000);
      }

      await retryQuery(
        () => pool.query(
          `UPDATE oauth_tokens 
           SET subscription_status = $1, subscription_ends_at = $2, updated_at = NOW() 
           WHERE location_id = $3`,
          [status, endsAt, locationId]
        ),
        3,
        1000
      );

      logger.info('🔄 Subscription updated', {
        locationId,
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        endsAt: endsAt?.toISOString(),
        eventId: event.id
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      logger.warn('Payment failed', {
        invoiceId: invoice.id,
        customerId,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count,
        eventId: event.id
      });

      // Find location
      const result = await retryQuery(
        () => pool.query(
          'SELECT location_id FROM oauth_tokens WHERE stripe_customer_id = $1',
          [customerId]
        ),
        2,
        500
      );
      
      if (result.rows.length > 0) {
        const locationId = result.rows[0].location_id;
        
        logger.error('⚠️ Payment failed for subscription', {
          locationId,
          customerId,
          invoiceId: invoice.id,
          eventId: event.id
        });
        
        // TODO: Send notification email to user
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      logger.info('Payment succeeded', {
        invoiceId: invoice.id,
        customerId,
        amount: invoice.amount_paid,
        eventId: event.id
      });
      break;
    }

    default:
      logger.debug('Unhandled Stripe event type', {
        eventType: event.type,
        eventId: event.id
      });
  }
}

/**
 * POST /webhooks/ghl
 * Handle GHL webhook events (for future use)
 */
webhookRouter.post('/ghl', async (req, res) => {
  logger.info('GHL webhook received', {
    body: req.body,
    headers: req.headers,
    ip: req.ip
  });

  // TODO: Implement GHL webhook signature verification
  // TODO: Process workflow update events
  // TODO: Sync workflow changes in real-time

  try {
    const eventType = req.body.type || req.headers['x-ghl-event-type'];
    const locationId = req.body.locationId || req.body.location_id;

    logger.info('GHL event details', {
      eventType,
      locationId
    });

    // Acknowledge receipt immediately
    res.json({ 
      received: true,
      eventType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('GHL webhook processing error', {}, error as Error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * GET /webhooks/health
 * Webhook endpoint health check
 */
webhookRouter.get('/health', (_req, res) => {
  const configured = {
    stripe: !!process.env.STRIPE_WEBHOOK_SECRET,
    ghl: true // GHL webhooks don't require secret for now
  };

  return ApiResponse.success(res, {
    status: 'healthy',
    endpoints: {
      stripe: configured.stripe ? 'configured' : 'not_configured',
      ghl: 'ready'
    }
  });
});
