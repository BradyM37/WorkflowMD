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
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

/**
 * Log a webhook event to the database
 */
async function logWebhook(
  source: 'ghl' | 'stripe' | 'other',
  eventType: string,
  payload: any,
  options: {
    locationId?: string;
    headers?: any;
    ipAddress?: string;
    status?: 'received' | 'processed' | 'failed' | 'ignored';
    errorMessage?: string;
    processingTimeMs?: number;
  } = {}
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO webhook_logs (
        source, event_type, location_id, payload, headers, ip_address, 
        status, error_message, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        source,
        eventType,
        options.locationId || null,
        JSON.stringify(payload),
        options.headers ? JSON.stringify(options.headers) : null,
        options.ipAddress || null,
        options.status || 'received',
        options.errorMessage || null,
        options.processingTimeMs || null
      ]
    );
  } catch (error) {
    // Don't fail the webhook if logging fails
    logger.warn('Failed to log webhook', { source, eventType, error: (error as Error).message });
  }
}

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
    const startTime = Date.now();
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      logger.warn('Stripe webhook missing signature', {
        ip: req.ip
      });
      await logWebhook('stripe', 'unknown', { raw: 'signature_missing' }, {
        ipAddress: req.ip,
        status: 'failed',
        errorMessage: 'Missing signature'
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

      // Log the received webhook
      await logWebhook('stripe', event.type, { eventId: event.id }, {
        ipAddress: req.ip,
        status: 'received'
      });
    } catch (err: any) {
      logger.error('Stripe webhook signature verification failed', {
        error: err.message,
        ip: req.ip
      }, err);
      
      await logWebhook('stripe', 'unknown', { error: err.message }, {
        ipAddress: req.ip,
        status: 'failed',
        errorMessage: `Signature verification failed: ${err.message}`
      });
      
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

      // Log successful processing
      await logWebhook('stripe', event.type, { eventId: event.id }, {
        ipAddress: req.ip,
        status: 'processed',
        processingTimeMs: Date.now() - startTime
      });

      return res.json({ received: true });
    } catch (error) {
      logger.error('Error processing Stripe webhook', {
        eventId: event.id,
        eventType: event.type
      }, error as Error);
      
      // Log failed processing
      await logWebhook('stripe', event.type, { eventId: event.id }, {
        ipAddress: req.ip,
        status: 'failed',
        errorMessage: (error as Error).message,
        processingTimeMs: Date.now() - startTime
      });
      
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
 * POST /webhooks/events
 * Handle webhook events (subscriptions, contacts, etc.)
 */
webhookRouter.post('/events', async (req, res) => {
  const startTime = Date.now();
  const signature = req.headers['x-ghl-signature'] as string;
  const eventType = req.body.type || 'unknown';
  const locationId = req.body.locationId || req.body.location_id;
  
  logger.info('GHL webhook received', {
    eventType,
    locationId,
    ip: req.ip
  });

  // Log the incoming webhook
  await logWebhook('ghl', eventType, req.body, {
    locationId,
    headers: {
      'x-ghl-signature': signature ? '[present]' : '[missing]',
      'content-type': req.headers['content-type']
    },
    ipAddress: req.ip,
    status: 'received'
  });

  // Verify webhook signature if shared secret is configured
  if (process.env.GHL_SHARED_SECRET && signature) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.GHL_SHARED_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      logger.warn('GHL webhook signature mismatch', { ip: req.ip });
      await logWebhook('ghl', eventType, req.body, {
        locationId,
        ipAddress: req.ip,
        status: 'failed',
        errorMessage: 'Signature mismatch',
        processingTimeMs: Date.now() - startTime
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    const data = req.body.data || req.body;

    // Process GHL Marketplace subscription/payment events
    switch (eventType) {
      // ========== APP LIFECYCLE EVENTS ==========
      
      case 'app.installed': {
        // App installed on a location - set up with free plan
        const companyId = data.companyId || data.company_id;
        const appId = data.appId || data.app_id;
        
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = 'free',
                   subscription_status = 'active',
                   ghl_company_id = $1,
                   ghl_app_id = $2,
                   installed_at = NOW(),
                   updated_at = NOW() 
               WHERE location_id = $3`,
              [companyId, appId, locationId]
            ),
            3,
            1000
          );
          
          logger.info('🎉 App installed', {
            locationId,
            companyId,
            appId,
            eventType
          });
        }
        break;
      }

      case 'app.uninstalled': {
        // App uninstalled - clean up or mark inactive
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = 'free',
                   subscription_status = 'uninstalled',
                   uninstalled_at = NOW(),
                   updated_at = NOW() 
               WHERE location_id = $1`,
              [locationId]
            ),
            3,
            1000
          );
          
          logger.info('👋 App uninstalled', { locationId, eventType });
        }
        break;
      }

      // ========== SUBSCRIPTION EVENTS ==========

      case 'subscription.created': {
        // New subscription created via GHL Marketplace
        const planId = data.planId || data.plan_id;
        const planName = (data.planName || data.plan_name || '').toLowerCase();
        const subscriptionId = data.subscriptionId || data.subscription_id || data.id;
        
        // Determine plan type from plan name
        let planType: 'free' | 'pro' | 'agency' = 'free';
        if (planName.includes('agency')) {
          planType = 'agency';
        } else if (planName.includes('pro') || planName.includes('premium')) {
          planType = 'pro';
        }
        
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = $1,
                   subscription_status = 'active',
                   ghl_subscription_id = $2,
                   ghl_plan_id = $3,
                   subscription_started_at = NOW(),
                   updated_at = NOW() 
               WHERE location_id = $4`,
              [planType, subscriptionId, planId, locationId]
            ),
            3,
            1000
          );
          
          logger.info('✅ Subscription created', {
            locationId,
            planType,
            planId,
            subscriptionId,
            eventType
          });
        }
        break;
      }

      case 'subscription.updated': {
        // Subscription plan changed (upgrade/downgrade)
        const planId = data.planId || data.plan_id;
        const planName = (data.planName || data.plan_name || '').toLowerCase();
        const subscriptionId = data.subscriptionId || data.subscription_id || data.id;
        const status = data.status?.toLowerCase();
        
        // Determine plan type from plan name
        let planType: 'free' | 'pro' | 'agency' = 'free';
        if (planName.includes('agency')) {
          planType = 'agency';
        } else if (planName.includes('pro') || planName.includes('premium')) {
          planType = 'pro';
        }
        
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = $1,
                   subscription_status = $2,
                   ghl_subscription_id = $3,
                   ghl_plan_id = $4,
                   updated_at = NOW() 
               WHERE location_id = $5`,
              [planType, status || 'active', subscriptionId, planId, locationId]
            ),
            3,
            1000
          );
          
          logger.info('🔄 Subscription updated', {
            locationId,
            planType,
            planId,
            status,
            eventType
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        // Subscription cancelled - downgrade to free
        const subscriptionId = data.subscriptionId || data.subscription_id || data.id;
        const cancelAt = data.cancelAt || data.cancel_at;
        
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = 'free',
                   subscription_status = 'cancelled',
                   subscription_ends_at = $1,
                   updated_at = NOW() 
               WHERE location_id = $2`,
              [cancelAt ? new Date(cancelAt) : new Date(), locationId]
            ),
            3,
            1000
          );
          
          logger.info('❌ Subscription cancelled', {
            locationId,
            subscriptionId,
            cancelAt,
            eventType
          });
        }
        break;
      }

      // ========== LEGACY EVENT SUPPORT ==========
      
      case 'SaasPlanCreate':
      case 'ORDER_COMPLETED': {
        // User subscribed via GHL (legacy)
        const planName = (data.planName || data.plan_name || '').toLowerCase();
        let planType: 'free' | 'pro' | 'agency' = 'free';
        if (planName.includes('agency')) {
          planType = 'agency';
        } else if (planName.includes('pro') || planName.includes('premium')) {
          planType = 'pro';
        }
        
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = $1,
                   subscription_status = 'active', 
                   ghl_subscription_id = $2,
                   updated_at = NOW() 
               WHERE location_id = $3`,
              [planType, data.subscriptionId || data.orderId, locationId]
            ),
            3,
            1000
          );
          
          logger.info('✅ GHL subscription activated (legacy)', {
            locationId,
            planType,
            eventType
          });
        }
        break;
      }

      case 'OrderStatusUpdate': {
        const status = data.status?.toLowerCase();
        const locId = data.locationId || data.location_id;
        
        if (locId) {
          if (status === 'cancelled' || status === 'refunded' || status === 'failed') {
            await retryQuery(
              () => pool.query(
                `UPDATE oauth_tokens 
                 SET plan_type = 'free',
                     subscription_status = $1,
                     updated_at = NOW() 
                 WHERE location_id = $2`,
                [status, locId]
              ),
              3,
              1000
            );
            
            logger.info('❌ GHL subscription status change', {
              locationId: locId,
              status,
              eventType
            });
          }
        }
        break;
      }

      case 'SaasSubscriptionCancel':
      case 'SUBSCRIPTION_CANCELLED': {
        if (locationId) {
          await retryQuery(
            () => pool.query(
              `UPDATE oauth_tokens 
               SET plan_type = 'free',
                   subscription_status = 'cancelled', 
                   subscription_ends_at = NOW(),
                   updated_at = NOW() 
               WHERE location_id = $1`,
              [locationId]
            ),
            3,
            1000
          );
          
          logger.info('❌ GHL subscription cancelled (legacy)', { locationId, eventType });
        }
        break;
      }

      // ========== MESSAGE TRACKING FOR RESPONSE TIME ==========
      
      case 'InboundMessage': {
        // New inbound message - track for response time
        const conversationId = data.conversationId || data.conversation_id;
        const contactId = data.contactId || data.contact_id;
        const messageId = data.messageId || data.message_id || data.id;
        const sentAt = data.dateAdded || data.createdAt || new Date().toISOString();
        const channel = data.type || data.messageType || 'unknown';
        
        if (locationId && conversationId) {
          // Upsert conversation with first inbound time
          await retryQuery(
            () => pool.query(
              `INSERT INTO conversations (
                ghl_conversation_id, location_id, contact_id, channel, 
                first_inbound_at, last_message_at, last_message_direction, message_count
              ) VALUES ($1, $2, $3, $4, $5, $5, 'inbound', 1)
              ON CONFLICT (ghl_conversation_id) DO UPDATE SET
                last_message_at = $5,
                last_message_direction = 'inbound',
                message_count = conversations.message_count + 1,
                first_inbound_at = COALESCE(conversations.first_inbound_at, $5),
                updated_at = NOW()`,
              [conversationId, locationId, contactId, channel, new Date(sentAt)]
            ),
            2,
            500
          );
          
          // Insert message record
          if (messageId) {
            await pool.query(
              `INSERT INTO messages (ghl_message_id, conversation_id, location_id, direction, channel, sent_at)
               SELECT $1, c.id, $2, 'inbound', $3, $4
               FROM conversations c WHERE c.ghl_conversation_id = $5
               ON CONFLICT (ghl_message_id) DO NOTHING`,
              [messageId, locationId, channel, new Date(sentAt), conversationId]
            ).catch(() => {}); // Ignore if conversation doesn't exist yet
          }
          
          logger.info('📥 Inbound message tracked', { locationId, conversationId });
        }
        break;
      }

      case 'OutboundMessage': {
        // Outbound message - calculate response time
        const conversationId = data.conversationId || data.conversation_id;
        const messageId = data.messageId || data.message_id || data.id;
        const sentAt = data.dateAdded || data.createdAt || new Date().toISOString();
        const userId = data.userId || data.user_id;
        const userName = data.userName || data.user_name;
        const channel = data.type || data.messageType || 'unknown';
        
        if (locationId && conversationId) {
          const sentTime = new Date(sentAt);
          
          // Update conversation with first response (if not already set)
          // Calculate response time from first inbound to this outbound
          await retryQuery(
            () => pool.query(
              `UPDATE conversations SET
                first_response_at = COALESCE(first_response_at, $1),
                response_time_seconds = COALESCE(response_time_seconds, 
                  CASE WHEN first_inbound_at IS NOT NULL 
                  THEN EXTRACT(EPOCH FROM ($1::timestamp - first_inbound_at))::INTEGER 
                  ELSE NULL END
                ),
                assigned_user_id = COALESCE(assigned_user_id, $2),
                assigned_user_name = COALESCE(assigned_user_name, $3),
                last_message_at = $1,
                last_message_direction = 'outbound',
                message_count = message_count + 1,
                is_missed = false,
                updated_at = NOW()
              WHERE ghl_conversation_id = $4`,
              [sentTime, userId, userName, conversationId]
            ),
            2,
            500
          );
          
          // Insert message record
          if (messageId) {
            await pool.query(
              `INSERT INTO messages (ghl_message_id, conversation_id, location_id, direction, channel, sent_at, sent_by_user_id, sent_by_user_name)
               SELECT $1, c.id, $2, 'outbound', $3, $4, $5, $6
               FROM conversations c WHERE c.ghl_conversation_id = $7
               ON CONFLICT (ghl_message_id) DO NOTHING`,
              [messageId, locationId, channel, sentTime, userId, userName, conversationId]
            ).catch(() => {});
          }
          
          logger.info('📤 Outbound message tracked', { 
            locationId, 
            conversationId,
            hasResponseTime: true
          });
        }
        break;
      }

      case 'ConversationUnreadUpdate': {
        // Conversation status changed
        const conversationId = data.conversationId || data.conversation_id;
        const unreadCount = data.unreadCount;
        
        if (locationId && conversationId && unreadCount === 0) {
          // Mark as not missed if all messages are read
          await pool.query(
            `UPDATE conversations SET is_missed = false, updated_at = NOW()
             WHERE ghl_conversation_id = $1`,
            [conversationId]
          ).catch(() => {});
        }
        break;
      }

      default:
        logger.debug('Unhandled GHL event type', { eventType, locationId });
    }

    // Log successful processing
    await logWebhook('ghl', eventType, { summary: 'processed' }, {
      locationId,
      ipAddress: req.ip,
      status: 'processed',
      processingTimeMs: Date.now() - startTime
    });

    // Acknowledge receipt
    res.json({ 
      received: true,
      eventType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log failed processing
    await logWebhook('ghl', eventType, req.body, {
      locationId,
      ipAddress: req.ip,
      status: 'failed',
      errorMessage: (error as Error).message,
      processingTimeMs: Date.now() - startTime
    });

    logger.error('GHL webhook processing error', {
      eventType: req.body.type
    }, error as Error);
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

/**
 * GET /webhooks/logs
 * View recent webhook events for debugging
 */
webhookRouter.get(
  '/logs',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const source = req.query.source as string; // 'ghl', 'stripe', or all
    const status = req.query.status as string; // 'received', 'processed', 'failed', 'ignored'
    const eventType = req.query.eventType as string;

    let query = `
      SELECT 
        id,
        source,
        event_type,
        location_id,
        payload,
        ip_address,
        processed_at,
        status,
        error_message,
        processing_time_ms
      FROM webhook_logs
      WHERE (location_id = $1 OR location_id IS NULL)
    `;
    const params: any[] = [locationId];
    let paramIndex = 2;

    // Filter by source
    if (source && ['ghl', 'stripe', 'other'].includes(source)) {
      query += ` AND source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    // Filter by status
    if (status && ['received', 'processed', 'failed', 'ignored'].includes(status)) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by event type (partial match)
    if (eventType) {
      query += ` AND event_type ILIKE $${paramIndex}`;
      params.push(`%${eventType}%`);
      paramIndex++;
    }

    query += ` ORDER BY processed_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE processed_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM webhook_logs
      WHERE location_id = $1 OR location_id IS NULL
    `, [locationId]);

    const stats = statsResult.rows[0];

    return ApiResponse.success(res, {
      logs: result.rows.map(row => ({
        id: row.id,
        source: row.source,
        eventType: row.event_type,
        locationId: row.location_id,
        payload: row.payload,
        ipAddress: row.ip_address,
        processedAt: row.processed_at,
        status: row.status,
        errorMessage: row.error_message,
        processingTimeMs: row.processing_time_ms
      })),
      stats: {
        total: parseInt(stats.total) || 0,
        processed: parseInt(stats.processed) || 0,
        failed: parseInt(stats.failed) || 0,
        last24h: parseInt(stats.last_24h) || 0
      },
      limit
    });
  })
);

/**
 * GET /webhooks/logs/stats
 * Get webhook statistics
 */
webhookRouter.get(
  '/logs/stats',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;

    // Get stats by source
    const bySourceResult = await pool.query(`
      SELECT 
        source,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM webhook_logs
      WHERE (location_id = $1 OR location_id IS NULL)
        AND processed_at > NOW() - INTERVAL '7 days'
      GROUP BY source
    `, [locationId]);

    // Get stats by event type
    const byEventResult = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM webhook_logs
      WHERE (location_id = $1 OR location_id IS NULL)
        AND processed_at > NOW() - INTERVAL '7 days'
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `, [locationId]);

    // Get hourly trend (last 24 hours)
    const hourlyResult = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', processed_at) as hour,
        COUNT(*) as count
      FROM webhook_logs
      WHERE (location_id = $1 OR location_id IS NULL)
        AND processed_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', processed_at)
      ORDER BY hour
    `, [locationId]);

    return ApiResponse.success(res, {
      bySource: bySourceResult.rows.map(row => ({
        source: row.source,
        count: parseInt(row.count) || 0,
        processed: parseInt(row.processed) || 0,
        failed: parseInt(row.failed) || 0
      })),
      byEventType: byEventResult.rows.map(row => ({
        eventType: row.event_type,
        count: parseInt(row.count) || 0,
        failed: parseInt(row.failed) || 0
      })),
      hourlyTrend: hourlyResult.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count) || 0
      }))
    });
  })
);
