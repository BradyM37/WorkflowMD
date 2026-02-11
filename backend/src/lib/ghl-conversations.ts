/**
 * GHL Conversations API
 * Fetch conversations and messages for response time analysis
 */

import axios from 'axios';
import { pool } from './database';
import { decrypt } from './encryption';
import { logger } from './logger';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

async function getValidToken(locationId: string): Promise<string> {
  const result = await pool.query(
    'SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE location_id = $1',
    [locationId]
  );

  if (result.rows.length === 0) {
    throw new Error('No tokens found for location');
  }

  const { access_token, refresh_token, expires_at } = result.rows[0];
  
  // Check if token expires in next 5 minutes
  const expiresIn5Min = new Date(expires_at) < new Date(Date.now() + 5 * 60 * 1000);
  
  if (expiresIn5Min) {
    return await refreshAccessToken(locationId, decrypt(refresh_token));
  }
  
  return decrypt(access_token);
}

async function refreshAccessToken(locationId: string, refreshToken: string): Promise<string> {
  try {
    const response = await axios.post(`${GHL_API_BASE}/oauth/token`, {
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      user_type: 'Location'
    });

    const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
    const { encrypt } = await import('./encryption');

    await pool.query(
      `UPDATE oauth_tokens 
       SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE location_id = $4`,
      [
        encrypt(access_token),
        encrypt(newRefreshToken),
        new Date(Date.now() + expires_in * 1000),
        locationId
      ]
    );

    return access_token;
  } catch (error: any) {
    logger.error('Token refresh error', { locationId }, error);
    throw new Error('Failed to refresh access token');
  }
}

// Types
export interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  assignedTo?: string;
  status?: string;
  type: string; // SMS, Email, FB, IG, etc.
  unreadCount: number;
  dateAdded: string;
  dateUpdated: string;
  lastMessageType?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageDirection?: string;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  locationId: string;
  contactId: string;
  type: number; // Message type code
  direction: string; // inbound, outbound
  status: string;
  body?: string;
  dateAdded: string;
  userId?: string; // Who sent it (for outbound)
}

export interface GHLUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Search conversations for a location
 */
export async function searchConversations(
  locationId: string,
  options: {
    limit?: number;
    startAfter?: string;
    status?: string;
  } = {}
): Promise<{ conversations: GHLConversation[]; nextCursor?: string }> {
  try {
    const token = await getValidToken(locationId);
    
    const params: any = {
      locationId,
      limit: options.limit || 100
    };
    
    if (options.startAfter) {
      params.startAfterId = options.startAfter;
    }
    if (options.status) {
      params.status = options.status;
    }

    logger.info('Fetching conversations from GHL', { locationId, params });

    const response = await axios.get(`${GHL_API_BASE}/conversations/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      params
    });

    logger.info('GHL conversations response', { 
      locationId, 
      count: response.data.conversations?.length,
      total: response.data.total
    });

    return {
      conversations: response.data.conversations || [],
      nextCursor: response.data.nextCursor
    };
  } catch (error: any) {
    logger.error('Fetch conversations error', {
      locationId,
      status: error.response?.status,
      data: error.response?.data
    }, error);
    throw error;
  }
}

/**
 * Get a single conversation with details
 */
export async function getConversation(
  conversationId: string,
  locationId: string
): Promise<GHLConversation | null> {
  try {
    const token = await getValidToken(locationId);

    const response = await axios.get(`${GHL_API_BASE}/conversations/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    return response.data.conversation;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.error('Get conversation error', { conversationId, locationId }, error);
    throw error;
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  locationId: string,
  options: { limit?: number; lastMessageId?: string } = {}
): Promise<GHLMessage[]> {
  try {
    const token = await getValidToken(locationId);

    const params: any = {
      limit: options.limit || 50
    };
    if (options.lastMessageId) {
      params.lastMessageId = options.lastMessageId;
    }

    const response = await axios.get(`${GHL_API_BASE}/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      params
    });

    return response.data.messages || [];
  } catch (error: any) {
    logger.error('Get messages error', { conversationId, locationId }, error);
    throw error;
  }
}

/**
 * Get users for a location (for team metrics)
 */
export async function getLocationUsers(locationId: string): Promise<GHLUser[]> {
  try {
    const token = await getValidToken(locationId);

    const response = await axios.get(`${GHL_API_BASE}/users/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      params: { locationId }
    });

    return response.data.users || [];
  } catch (error: any) {
    logger.error('Get users error', { locationId }, error);
    return [];
  }
}

/**
 * Get contact details
 */
export async function getContact(
  contactId: string,
  locationId: string
): Promise<any | null> {
  try {
    const token = await getValidToken(locationId);

    const response = await axios.get(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    return response.data.contact;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.error('Get contact error', { contactId, locationId }, error);
    return null;
  }
}
