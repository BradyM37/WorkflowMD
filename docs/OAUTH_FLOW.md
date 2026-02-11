# OAuth Flow

## GHL OAuth 2.0 Implementation

### Overview
The application uses OAuth 2.0 Authorization Code Grant flow to securely access GHL workflows on behalf of users.

## OAuth Flow Diagram

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│   User   │          │     GHL      │          │   Our App    │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                          │
     │  1. Click Install     │                          │
     ├──────────────────────►│                          │
     │                       │                          │
     │  2. Show Permissions  │                          │
     │◄──────────────────────┤                          │
     │                       │                          │
     │  3. Approve Access    │                          │
     ├──────────────────────►│                          │
     │                       │                          │
     │                       │  4. Redirect with Code   │
     │                       ├─────────────────────────►│
     │                       │                          │
     │                       │  5. Exchange Code        │
     │                       │◄─────────────────────────┤
     │                       │                          │
     │                       │  6. Return Tokens        │
     │                       ├─────────────────────────►│
     │                       │                          │
     │  7. Redirect to App   │                          │
     │◄──────────────────────┬──────────────────────────┤
     │                       │                          │
```

## Configuration

### GHL Marketplace App Settings
```
App Name: GHL Workflow Debugger
App Type: Public (Private for testing)
Target User: Sub-account
Installation: Both Agency & Sub-account
Listing Type: Standard
```

### Required OAuth Scopes
```
workflows.readonly       - View workflow configurations
workflows.write         - Update workflow settings (future)
contacts.readonly       - Analyze contact flow
opportunities.readonly  - Pipeline analysis
webhooks.write         - Subscribe to events
locations.readonly     - Basic location details
```

### URLs Configuration
```
Redirect URI: https://yourdomain.com/auth/callback
Installation URL: (Provided by GHL)
```

## Implementation Code

### Step 1: OAuth Callback Handler
```javascript
app.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        user_type: 'Location',
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    // Store encrypted tokens in database
    await storeTokens(tokens);
    
    // Set session cookie
    res.cookie('location_id', tokens.locationId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/error?message=authentication_failed');
  }
});
```

### Step 2: Token Storage
```javascript
async function storeTokens(tokens) {
  const encrypted = {
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
  };
  
  await pg.query(
    `INSERT INTO oauth_tokens 
     (location_id, company_id, access_token, refresh_token, expires_at) 
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (location_id) 
     DO UPDATE SET 
       access_token = $3, 
       refresh_token = $4,
       expires_at = $5,
       updated_at = NOW()`,
    [
      tokens.locationId,
      tokens.companyId,
      encrypted.access_token,
      encrypted.refresh_token,
      new Date(Date.now() + tokens.expires_in * 1000)
    ]
  );
}
```

### Step 3: Token Refresh Strategy
```javascript
async function getValidToken(locationId) {
  const tokens = await getStoredTokens(locationId);
  
  // Check if token expires in next 5 minutes
  const expiresIn5Min = tokens.expires_at < new Date(Date.now() + 5 * 60 * 1000);
  
  if (expiresIn5Min) {
    return await refreshAccessToken(locationId);
  }
  
  return decrypt(tokens.access_token);
}

async function refreshAccessToken(locationId) {
  const tokens = await getStoredTokens(locationId);
  
  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: decrypt(tokens.refresh_token),
      user_type: 'Location',
    }),
  });
  
  const newTokens = await response.json();
  await storeTokens({ ...newTokens, locationId });
  
  return newTokens.access_token;
}
```

### Step 4: Making Authenticated Requests
```javascript
async function fetchWorkflow(workflowId, locationId) {
  const accessToken = await getValidToken(locationId);
  
  const response = await fetch(
    `https://services.leadconnectorhq.com/workflows/${workflowId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (response.status === 401) {
    // Token might be revoked, handle error
    throw new Error('Authentication failed');
  }
  
  return response.json();
}
```

## Token Encryption

### Encryption Implementation
```javascript
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

## Environment Variables
```bash
# GHL OAuth
GHL_CLIENT_ID=your-client-id-here
GHL_CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=https://yourdomain.com/auth/callback

# Encryption
ENCRYPTION_KEY=generate-64-char-hex-string

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Error Handling

### Common OAuth Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_grant` | Code expired or used | Request new authorization |
| `invalid_client` | Wrong credentials | Verify client ID/secret |
| `insufficient_scope` | Missing permissions | Update app scopes |
| `access_denied` | User rejected | Show explanation |

## Security Best Practices

1. **Always use HTTPS** for redirect URIs
2. **Encrypt tokens** before database storage
3. **Implement token refresh** before expiry
4. **Use httpOnly cookies** for sessions
5. **Validate all inputs** from OAuth callbacks
6. **Log authentication events** for auditing

## Testing OAuth Flow

### Local Development
1. Use ngrok for public URL
2. Update redirect URI in GHL app
3. Test with test location

### Production
1. Verify SSL certificate
2. Test token refresh
3. Monitor error rates
4. Set up alerts for failures