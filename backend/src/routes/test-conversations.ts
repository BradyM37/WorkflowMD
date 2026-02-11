/**
 * Test endpoint to verify GHL Conversations API returns usable data
 * DELETE THIS FILE after confirming API works
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { searchConversations, getConversationMessages } from '../lib/ghl-conversations';

const testConvRouter = Router();

/**
 * GET /api/test-conv/verify
 * Test that GHL conversations API returns the data we need
 */
testConvRouter.get(
  '/verify',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    console.log('=== TESTING GHL CONVERSATIONS API ===');
    console.log('Location ID:', locationId);
    
    // Step 1: Get conversations
    const { conversations } = await searchConversations(locationId, { limit: 5 });
    
    console.log('Conversations found:', conversations.length);
    console.log('Sample conversation:', JSON.stringify(conversations[0], null, 2));
    
    // Step 2: Get messages from first conversation
    let messagesData = null;
    if (conversations.length > 0) {
      const messages = await getConversationMessages(conversations[0].id, locationId, { limit: 10 });
      console.log('Messages found:', messages.length);
      console.log('Sample message:', JSON.stringify(messages[0], null, 2));
      messagesData = {
        count: messages.length,
        sample: messages[0],
        hasDateAdded: messages[0]?.dateAdded !== undefined,
        hasDirection: messages[0]?.direction !== undefined,
        allMessages: messages
      };
    }
    
    // Return everything for inspection
    return ApiResponse.success(res, {
      test: 'GHL Conversations API Verification',
      conversationsEndpoint: {
        works: conversations.length > 0,
        count: conversations.length,
        sample: conversations[0],
        hasLastMessageDate: conversations[0]?.lastMessageDate !== undefined,
        hasType: conversations[0]?.type !== undefined,
        allFields: conversations[0] ? Object.keys(conversations[0]) : []
      },
      messagesEndpoint: messagesData,
      verdict: {
        canTrackResponseTime: messagesData?.hasDateAdded && messagesData?.hasDirection,
        recommendation: messagesData?.hasDateAdded && messagesData?.hasDirection 
          ? '✅ API returns needed data - we can build this!'
          : '❌ API missing critical fields'
      }
    });
  })
);

export default testConvRouter;
