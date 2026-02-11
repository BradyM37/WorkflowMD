# GoHighLevel Marketplace App Setup

## Step 1: Create Your App in GHL Developer Portal

1. Go to [GHL Marketplace Developer Portal](https://marketplace.gohighlevel.com/)
2. Sign in with your GHL Agency account
3. Click **"Create App"**

### App Details:
- **App Name:** WorkflowMD
- **App Logo:** Upload your logo
- **Description:** Analyze and debug GoHighLevel workflows to find configuration errors, performance issues, and optimization opportunities.
- **App Type:** Private App (for testing) or Public App (for marketplace)

## Step 2: Configure OAuth Settings

### Scopes Required:
Select these scopes when configuring your app:

```
workflows.readonly     - Read workflow configurations
locations.readonly     - Access location data
users.readonly         - Get user info for SSO
```

### Redirect URIs:
Add these callback URLs:

**Development:**
```
http://localhost:3000/auth/callback
```

**Production:**
```
https://your-backend-domain.com/auth/callback
```

### SSO URL (Custom Menu Link):
This is where users go when they click your app in GHL sidebar:

```
https://your-backend-domain.com/ghl/sso
```

## Step 3: Get Your Credentials

After creating the app, you'll receive:

1. **Client ID** - Looks like: `6xxxxxxxxxxxxx.apps.highlevellabs.com`
2. **Client Secret** - A long string (keep this secret!)

## Step 4: Update Environment Variables

Add to your `.env` file:

```env
# GHL OAuth Configuration
GHL_CLIENT_ID=your-client-id-here
GHL_CLIENT_SECRET=your-client-secret-here
REDIRECT_URI=http://localhost:3000/auth/callback

# Frontend URL (for redirects after SSO)
FRONTEND_URL=http://localhost:3001
```

## Step 5: Configure Custom Menu Link (Optional)

To add your app to the GHL sidebar:

1. In the Developer Portal, go to **"Distribute"** > **"Marketplace Listing"**
2. Enable **"Custom Menu Link"**
3. Set the **SSO URL:** `https://your-domain.com/ghl/sso`
4. Choose an **Icon** and **Display Name**

## OAuth Flow Diagram

```
┌──────────────┐     1. Click app      ┌──────────────┐
│     User     │ ──────────────────────▶│   GHL App    │
└──────────────┘                        └──────────────┘
                                               │
                                               │ 2. SSO request with ssoKey
                                               ▼
                                        ┌──────────────┐
                                        │ Your Backend │
                                        │ /ghl/sso     │
                                        └──────────────┘
                                               │
                                               │ 3. Exchange ssoKey for user info
                                               ▼
                                        ┌──────────────┐
                                        │   GHL API    │
                                        └──────────────┘
                                               │
                                               │ 4. Return user/location info
                                               ▼
                                        ┌──────────────┐
                                        │ Your Backend │
                                        │ Creates JWT  │
                                        └──────────────┘
                                               │
                                               │ 5. Redirect to dashboard with session
                                               ▼
                                        ┌──────────────┐
                                        │  Your App    │
                                        │  Dashboard   │
                                        └──────────────┘
```

## Testing the Integration

### 1. Start your backend:
```bash
cd backend
npm run dev
```

### 2. Test OAuth callback:
Visit GHL and install your app to a location. The OAuth flow will:
- Redirect to your callback URL
- Exchange code for tokens
- Store tokens in database
- Redirect to your frontend

### 3. Test SSO:
Click your app in the GHL sidebar. It should:
- Send ssoKey to `/ghl/sso`
- Create/login user
- Redirect to dashboard

## Troubleshooting

### "Invalid SSO request"
- Make sure `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET` are set correctly

### "No tokens found for location"
- The user needs to complete OAuth first
- Check that tokens are being stored in `oauth_tokens` table

### Token refresh failures
- Ensure `ENCRYPTION_KEY` is the same across deployments
- Check that refresh_token was stored correctly

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ghl/sso` | GET | SSO entry point (receives ssoKey) |
| `/auth/callback` | GET | OAuth callback (receives code) |
| `/api/workflows` | GET | List workflows for location |
| `/api/workflows/:id` | GET | Get workflow details |
| `/api/analyze/:id` | POST | Analyze a workflow |

## GHL API Documentation

- [OAuth 2.0 Flow](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0/index.html)
- [Workflows API](https://marketplace.gohighlevel.com/docs/ghl/workflows/get-workflow/index.html)
- [SSO Documentation](https://marketplace.gohighlevel.com/docs/Authorization/SSO/index.html)
