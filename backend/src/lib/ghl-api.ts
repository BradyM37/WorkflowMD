import axios from 'axios';
import { pool } from './database';
import { decrypt, encrypt } from './encryption';

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

    // Update tokens in database
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
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

export async function fetchWorkflows(locationId: string): Promise<any[]> {
  try {
    const token = await getValidToken(locationId);
    
    // GHL API endpoint for workflows - v2 API
    console.log('Fetching workflows from GHL:', { locationId, token: token.substring(0, 20) + '...' });
    
    const response = await axios.get(`${GHL_API_BASE}/workflows/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      },
      params: {
        locationId: locationId
      }
    });
    
    console.log('GHL workflows response:', response.status, response.data);

    return response.data.workflows || [];
  } catch (error: any) {
    console.error('Fetch workflows error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params,
      message: error.message
    });
    
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockWorkflows();
    }
    
    throw error;
  }
}

export async function fetchWorkflow(workflowId: string, locationId: string): Promise<any> {
  try {
    const token = await getValidToken(locationId);
    
    const response = await axios.get(`${GHL_API_BASE}/workflows/${workflowId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Fetch workflow error:', error.response?.data || error.message);
    
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      return getMockWorkflow(workflowId);
    }
    
    throw error;
  }
}

// Mock data for development/testing
function getMockWorkflows() {
  return [
    {
      id: 'wf_lead_nurture_v3',
      name: '🔥 Hot Lead - 5 Day Nurture Sequence',
      description: 'Aggressive follow-up for high-intent leads from Facebook ads',
      status: 'active',
      created: new Date('2024-01-15'),
      lastModified: new Date('2024-02-01'),
      category: 'Lead Management',
      stats: { contacts: 2847, conversions: 342 }
    },
    {
      id: 'wf_appt_reminder_sms',
      name: '📅 Appointment Reminder - 24hr + 1hr SMS',
      description: 'Two-touch SMS reminder to reduce no-shows',
      status: 'active',
      created: new Date('2024-01-20'),
      lastModified: new Date('2024-02-05'),
      category: 'Appointments',
      stats: { contacts: 1523, conversions: 1401 }
    },
    {
      id: 'wf_payment_recovery',
      name: '💳 Failed Payment Recovery - 3 Attempt Retry',
      description: 'Automatic payment retry with escalating notifications',
      status: 'active',
      created: new Date('2024-01-25'),
      lastModified: new Date('2024-02-08'),
      category: 'Payments',
      stats: { contacts: 89, conversions: 67 }
    },
    {
      id: 'wf_review_request',
      name: '⭐ Post-Service Review Request',
      description: 'Request Google/Facebook reviews 2 days after service completion',
      status: 'active',
      created: new Date('2024-02-01'),
      lastModified: new Date('2024-02-10'),
      category: 'Reviews',
      stats: { contacts: 456, conversions: 89 }
    },
    {
      id: 'wf_reactivation_90day',
      name: '🔄 90-Day Inactive Client Reactivation',
      description: 'Win-back sequence for clients who haven\'t booked in 90 days',
      status: 'active',
      created: new Date('2024-01-10'),
      lastModified: new Date('2024-02-03'),
      category: 'Retention',
      stats: { contacts: 234, conversions: 45 }
    },
    {
      id: 'wf_birthday_promo',
      name: '🎂 Birthday Special Offer',
      description: 'Automated birthday email with exclusive discount code',
      status: 'draft',
      created: new Date('2024-02-05'),
      lastModified: new Date('2024-02-09'),
      category: 'Promotions',
      stats: { contacts: 0, conversions: 0 }
    },
    {
      id: 'wf_new_client_onboard',
      name: '👋 New Client Onboarding - Welcome Series',
      description: '7-day welcome sequence with intake forms and first appointment booking',
      status: 'active',
      created: new Date('2024-01-05'),
      lastModified: new Date('2024-02-07'),
      category: 'Onboarding',
      stats: { contacts: 892, conversions: 756 }
    },
    {
      id: 'wf_quote_followup',
      name: '📝 Quote Follow-Up - 3 Touch Sequence',
      description: 'Follow up on sent quotes at 1hr, 24hr, and 72hr intervals',
      status: 'active',
      created: new Date('2024-01-18'),
      lastModified: new Date('2024-02-06'),
      category: 'Sales',
      stats: { contacts: 567, conversions: 198 }
    }
  ];
}

function getMockWorkflow(workflowId: string) {
  // Return different mock data based on workflow ID for variety
  const mockWorkflows: Record<string, any> = {
    'wf_lead_nurture_v3': {
      id: 'wf_lead_nurture_v3',
      name: '🔥 Hot Lead - 5 Day Nurture Sequence',
      description: 'Aggressive follow-up for high-intent leads from Facebook ads',
      status: 'active',
      triggers: [
        { id: 'trigger_1', type: 'form_submitted', config: { formId: 'fb_lead_form' } },
        { id: 'trigger_2', type: 'tag_added', config: { tag: 'hot-lead' } }
      ],
      actions: [
        { id: 'action_1', type: 'email', name: 'Instant Response Email', config: { recipient: '{{contact.email}}', templateId: 'hot_lead_instant' } },
        { id: 'action_2', type: 'sms', name: 'Quick SMS Intro', config: { message: 'Hey {{contact.firstName}}! Thanks for reaching out. I\'ll call you in 5 min!' } },
        { id: 'action_3', type: 'wait', config: { duration: '5m' } },
        { id: 'action_4', type: 'voicemail_drop', name: 'Voicemail Drop', config: { audioId: 'vm_intro_001' } },
        { id: 'action_5', type: 'webhook', name: 'Sync to Slack', config: { url: 'http://localhost:3000/webhook', method: 'POST' } }, // localhost = issue
        { id: 'action_6', type: 'wait', config: { duration: '24h' } },
        { id: 'action_7', type: 'email', name: 'Day 1 Value Email', config: { templateId: 'nurture_day1' } },
        { id: 'action_8', type: 'api_call', name: 'Update CRM Status', config: { url: 'https://api.example.com/update' } } // no error handling
      ],
      webhooks: [{ id: 'wh_1', url: 'http://localhost:8080/hook', events: ['workflow.completed'] }],
      connections: [
        { from: 'trigger_1', to: 'action_1' },
        { from: 'trigger_2', to: 'action_1' },
        { from: 'action_1', to: 'action_2' },
        { from: 'action_2', to: 'action_3' },
        { from: 'action_3', to: 'action_4' },
        { from: 'action_4', to: 'action_5' },
        { from: 'action_5', to: 'action_6' },
        { from: 'action_6', to: 'action_7' },
        { from: 'action_7', to: 'action_8' }
      ],
      estimatedContacts: 2847,
      branches: 3,
      externalDependencies: 2
    },
    'wf_payment_recovery': {
      id: 'wf_payment_recovery',
      name: '💳 Failed Payment Recovery - 3 Attempt Retry',
      description: 'Automatic payment retry with escalating notifications',
      status: 'active',
      triggers: [{ id: 'trigger_1', type: 'payment_failed', config: {} }],
      actions: [
        { id: 'action_1', type: 'email', name: 'Payment Failed Notice', config: { templateId: 'payment_failed_1' } },
        { id: 'action_2', type: 'wait', config: { duration: '24h' } },
        { id: 'action_3', type: 'payment', name: 'Retry Payment #1', config: { amount: '{{order.total}}' } }, // no retry logic
        { id: 'action_4', type: 'sms', name: 'Urgent SMS', config: {} }, // missing phone
        { id: 'action_5', type: 'wait', config: { duration: '48h' } },
        { id: 'action_6', type: 'payment', name: 'Retry Payment #2', config: {} },
        { id: 'action_7', type: 'email', name: 'Final Warning', config: { templateId: 'payment_final_warning' } },
        { id: 'action_8', type: 'webhook', name: 'Alert Collections', config: { url: 'http://127.0.0.1/collections' } }
      ],
      webhooks: [],
      connections: [
        { from: 'trigger_1', to: 'action_1' },
        { from: 'action_1', to: 'action_2' },
        { from: 'action_2', to: 'action_3' },
        { from: 'action_3', to: 'action_4' },
        { from: 'action_4', to: 'action_5' },
        { from: 'action_5', to: 'action_6' },
        { from: 'action_6', to: 'action_7' },
        { from: 'action_7', to: 'action_8' }
      ],
      estimatedContacts: 89,
      branches: 1,
      externalDependencies: 1
    }
  };

  // Return specific workflow if found, otherwise return a generic one with the given ID
  if (mockWorkflows[workflowId]) {
    return mockWorkflows[workflowId];
  }

  return {
    id: workflowId,
    name: '🔥 Hot Lead - 5 Day Nurture Sequence',
    description: 'Aggressive follow-up for high-intent leads',
    status: 'active',
    triggers: [{ id: 'trigger_1', type: 'form_submitted', config: {} }],
    actions: [
      { id: 'action_1', type: 'email', name: 'Welcome Email', config: { recipient: '{{contact.email}}', templateId: 'welcome' } },
      { id: 'action_2', type: 'webhook', name: 'Notify CRM', config: { url: 'http://localhost:3000/webhook', method: 'POST' } },
      { id: 'action_3', type: 'sms', name: 'SMS Follow-up', config: { message: 'Thanks for your interest!' } },
      { id: 'action_4', type: 'payment', name: 'Process Payment', config: { amount: 100 } },
      { id: 'action_5', type: 'bulk_email', name: 'Newsletter Blast', config: { recipients: '{{segment.all}}' } }
    ],
    webhooks: [{ id: 'wh_1', url: 'http://127.0.0.1:8080/hook', events: ['workflow.completed'] }],
    connections: [
      { from: 'trigger_1', to: 'action_1' },
      { from: 'action_1', to: 'action_2' },
      { from: 'action_2', to: 'action_3' },
      { from: 'action_3', to: 'action_4' },
      { from: 'action_4', to: 'action_5' }
    ],
    estimatedContacts: 500,
    branches: 2,
    externalDependencies: 2
  };
}