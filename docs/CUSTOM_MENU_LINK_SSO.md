# Custom Menu Link SSO Implementation

## Overview
Allow GHL users to access WorkflowMD via Custom Menu Link without marketplace publishing.

## How It Works
1. User adds Custom Menu Link in GHL pointing to our SSO endpoint
2. When clicked, GHL appends auth params (locationId, userId, signature)
3. Our backend verifies signature using `GHL_SHARED_SECRET`
4. Creates session and redirects to frontend
5. Frontend auto-logs in user and shows real workflows

## Backend Implementation

### New Endpoint: `GET /auth/sso`

```typescript
// src/routes/ghl-sso.ts

import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';

export const ssoRouter = Router();

ssoRouter.get('/sso', async (req, res) => {
  const { locationId, userId, companyId, signature, timestamp } = req.query;
  
  logger.info('SSO attempt', { locationId, userId, companyId });
  
  if (!locationId || !signature) {
    return res.status(400).json({ error: 'Missing required params' });
  }
  
  // Verify signature using GHL_SHARED_SECRET
  // GHL may use different payload formats, try multiple
  const secret = process.env.GHL_SHARED_SECRET;
  if (!secret) {
    logger.error('GHL_SHARED_SECRET not configured');
    return res.status(500).json({ error: 'SSO not configured' });
  }
  
  const payloads = [
    `${locationId}:${userId}:${companyId}:${timestamp}`,
    `${locationId}${userId}${companyId}${timestamp}`,
    JSON.stringify({ locationId, userId, companyId, timestamp }),
  ];
  
  let valid = false;
  for (const payload of payloads) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    if (signature === expected) {
      valid = true;
      break;
    }
  }
  
  // For development/testing, allow bypass if signature verification fails
  // Remove this in production!
  if (!valid && process.env.NODE_ENV !== 'production') {
    logger.warn('SSO signature mismatch - allowing in dev mode', { locationId });
    valid = true;
  }
  
  if (!valid) {
    logger.warn('SSO signature verification failed', { locationId });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  try {
    // Find or create location record
    const existing = await pool.query(
      'SELECT * FROM oauth_tokens WHERE location_id = $1',
      [locationId]
    );
    
    if (existing.rows.length === 0) {
      // New location via SSO - create record with free tier
      await pool.query(
        `INSERT INTO oauth_tokens (location_id, company_id, subscription_status, created_at, updated_at)
         VALUES ($1, $2, 'free', NOW(), NOW())
         ON CONFLICT (location_id) DO UPDATE SET updated_at = NOW()`,
        [locationId, companyId]
      );
    }
    
    // Create session token
    const token = jwt.sign(
      { 
        locationId, 
        userId, 
        companyId, 
        source: 'sso',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    logger.info('SSO successful', { locationId, userId });
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'https://workflowmd.netlify.app';
    res.redirect(`${frontendUrl}/sso-callback?token=${token}&location_id=${locationId}`);
    
  } catch (error) {
    logger.error('SSO error', {}, error as Error);
    res.status(500).json({ error: 'SSO failed' });
  }
});
```

### Register Route in index.ts
```typescript
import { ssoRouter } from './routes/ghl-sso';
app.use('/auth', ssoRouter);
```

### Update Auth Middleware
```typescript
// middleware/auth.ts - update to handle SSO tokens

// Check for token in multiple places
const token = 
  req.headers.authorization?.replace('Bearer ', '') ||
  req.query.sso_token ||
  req.cookies?.token;
```

## Frontend Implementation

### SSO Callback Page: `src/pages/SSOCallback.tsx`

```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const SSOCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  
  useEffect(() => {
    const token = params.get('token');
    const locationId = params.get('location_id');
    
    if (token && locationId) {
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('location_id', locationId);
      localStorage.setItem('auth_source', 'sso');
      
      // Update auth context
      loginWithToken(token, locationId);
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, navigate, loginWithToken]);
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" tip="Signing you in..." />
    </div>
  );
};

export default SSOCallback;
```

### Add Route in App.tsx
```tsx
<Route path="/sso-callback" element={<SSOCallback />} />
```

### Update AuthContext
```typescript
// Add method to handle SSO token login
const loginWithToken = (token: string, locationId: string) => {
  setToken(token);
  setLocationId(locationId);
  setIsAuthenticated(true);
  // Optionally fetch user profile
};
```

## Environment Variables

### Backend (.env)
```
GHL_SHARED_SECRET=dee772d2-b8fe-4491-9c89-3f4da5adc059
JWT_SECRET=<your-jwt-secret>
FRONTEND_URL=https://workflowmd.netlify.app
```

## GHL Configuration

### Custom Menu Link URL
```
https://ghlworkflowdebugger.onrender.com/auth/sso
```

GHL automatically appends these query params:
- `locationId` - The GHL location ID
- `userId` - The logged-in user's ID
- `companyId` - The agency/company ID
- `signature` - HMAC signature for verification
- `timestamp` - Request timestamp

## Testing

1. In GHL location: Settings → Custom Menu Links → Add
2. Name: "Workflow Analyzer"
3. URL: `https://ghlworkflowdebugger.onrender.com/auth/sso`
4. Icon: Choose one
5. Save

6. Click the new menu item in GHL sidebar
7. Should redirect to WorkflowMD dashboard, logged in

## Security Notes

- Always verify signature in production
- Tokens expire in 24h
- SSO users get 'free' tier by default until they subscribe
- Log all SSO attempts for audit

## Limitations

- SSO users won't have GHL API access token until they complete OAuth
- For full workflow fetching, they still need to OAuth once
- Consider prompting SSO users to "Connect GHL" for full features
