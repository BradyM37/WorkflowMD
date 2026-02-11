# User Authentication System

## Overview

The GHL Workflow Debugger now features a complete user account system with email/password authentication. Users must create an account BEFORE connecting their GoHighLevel account, adding an additional security layer.

## Architecture

### Authentication Flow

```
1. User Registration
   ├── POST /api/auth/register (email, password, name)
   ├── Create user account
   ├── Generate JWT access token (7 days)
   ├── Generate refresh token (30 days)
   └── Store session in database

2. User Login
   ├── POST /api/auth/login (email, password)
   ├── Verify credentials (bcrypt)
   ├── Generate new JWT tokens
   ├── Update last_login_at
   └── Create session record

3. GHL Connection (Optional)
   ├── GET /api/auth/ghl/login (requires JWT)
   ├── OAuth flow to GHL
   ├── Store encrypted OAuth tokens
   └── Link to user account (user_id foreign key)

4. Protected API Calls
   ├── Extract JWT from Authorization header or cookie
   ├── Verify JWT signature and expiration
   ├── Validate session exists in database
   ├── Attach user context to request
   └── Check GHL connection if needed
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### OAuth Tokens (Updated)
```sql
ALTER TABLE oauth_tokens 
ADD COLUMN user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN subscription_started_at TIMESTAMP,
ADD COLUMN subscription_ends_at TIMESTAMP,
ADD COLUMN subscription_id VARCHAR(255),
ADD COLUMN plan_type VARCHAR(50) DEFAULT 'free',
ADD COLUMN trial_ends_at TIMESTAMP,
ADD COLUMN last_login_at TIMESTAMP;
```

## API Endpoints

### User Account Management

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "companyName": "Acme Corp"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "message": "Account created successfully"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "message": "Login successful"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true
    },
    "ghl": {
      "connected": true,
      "locationId": "ghl-location-id",
      "subscriptionStatus": "pro",
      "planType": "pro"
    }
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "loggedOut": true,
    "message": "Successfully logged out"
  }
}
```

### Password Management

#### Change Password
```http
PUT /api/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewPass456"
}
```

### Email Verification

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Token Management

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

## Middleware

### requireAuth
Requires valid JWT token. Attaches user context to request.

```typescript
import { requireAuth } from '../middleware/auth';

router.get('/protected-route', requireAuth, (req, res) => {
  // req.userId, req.user available
  console.log(req.userId); // User ID
  console.log(req.user.email); // User email
});
```

### requireGHLConnection
Requires user to have connected their GHL account.

```typescript
import { requireAuth, requireGHLConnection } from '../middleware/auth';

router.get('/workflows', requireAuth, requireGHLConnection, (req, res) => {
  // req.locationId available
  console.log(req.locationId); // GHL location ID
});
```

### requirePro
Requires Pro subscription.

```typescript
import { requireAuth, requirePro } from '../middleware/auth';

router.get('/premium-feature', requireAuth, requirePro, (req, res) => {
  // User has Pro subscription
});
```

### optionalAuth
Attaches user context if token present, but doesn't require it.

```typescript
import { optionalAuth } from '../middleware/auth';

router.get('/public-route', optionalAuth, (req, res) => {
  if (req.userId) {
    // User is logged in
  } else {
    // Anonymous user
  }
});
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number

### Token Security
- Access tokens expire in 7 days
- Refresh tokens expire in 30 days
- JWT signed with HS256 algorithm
- Tokens stored as HTTP-only cookies
- Session validation on every request

### Password Hashing
- bcrypt with cost factor 12
- Salted hashes stored in database
- Plain passwords never stored

### Session Management
- Sessions stored in database
- Token hashes stored (not plain tokens)
- Expired sessions cleaned up every 6 hours
- IP address and user agent tracked

## Environment Variables

Add to `.env`:

```bash
# JWT Authentication
JWT_SECRET=generate-64-character-hex-string
JWT_REFRESH_SECRET=generate-64-character-hex-string
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migration

### Running Migrations
```bash
node run-migrations.js
```

This will create:
- `users` table
- `sessions` table
- Update `oauth_tokens` table with user_id link

### Database Initialization
The database initialization in `src/lib/database.ts` automatically creates all necessary tables on server start.

## Testing the System

### 1. Start the Server
```bash
npm run dev
```

### 2. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "name": "Test User"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### 4. Test Protected Route
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token-from-login>"
```

## Frontend Integration

### Storing Tokens
```javascript
// After login/register
const { token, refreshToken } = response.data;

// Option 1: Let server handle cookies (recommended)
// Cookies are automatically set by server as HTTP-only

// Option 2: Store in memory for SPA
let authToken = token;

// Option 3: Store refresh token in localStorage (less secure)
localStorage.setItem('refreshToken', refreshToken);
```

### Making Authenticated Requests
```javascript
// Axios example
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true // Include cookies
});

// Or with Authorization header
api.get('/workflows', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});
```

### Handling Token Refresh
```javascript
// Intercept 401 responses
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401) {
      // Try refreshing token
      try {
        const { data } = await api.post('/auth/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        });
        
        // Update token
        authToken = data.data.token;
        
        // Retry original request
        error.config.headers['Authorization'] = `Bearer ${authToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

## Backward Compatibility

### Legacy Cookie Auth
The system still supports the old `location_id` cookie authentication for backward compatibility. Use `legacyLocationAuth` middleware for old routes.

### Migration Path
1. Old users can continue using location_id cookie
2. When they login, create user account and link their location
3. Gradually migrate all routes to require user authentication

## Session Cleanup

Expired sessions are automatically cleaned up every 6 hours by a cron job. Manual cleanup:

```typescript
import { cleanupExpiredSessions } from './lib/user-auth';
await cleanupExpiredSessions();
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_FIELDS` | Required fields not provided |
| `REGISTRATION_FAILED` | User registration error |
| `LOGIN_FAILED` | Invalid credentials |
| `USER_NOT_FOUND` | User doesn't exist |
| `EMAIL_VERIFICATION_REQUIRED` | Email not verified |
| `GHL_CONNECTION_REQUIRED` | GHL account not connected |
| `SUBSCRIPTION_REQUIRED` | Pro subscription needed |
| `REFRESH_FAILED` | Token refresh failed |
| `PASSWORD_CHANGE_FAILED` | Password change error |

## Best Practices

1. **Always use HTTPS in production** - Tokens transmitted over plain HTTP can be intercepted
2. **Store refresh tokens securely** - Never store in localStorage on client
3. **Implement rate limiting** - Prevent brute force attacks (already implemented)
4. **Validate on every request** - Don't trust client-side validation
5. **Clean up expired sessions** - Run cleanup job regularly
6. **Monitor failed login attempts** - Implement account lockout if needed
7. **Use email verification** - Confirm user email addresses
8. **Implement password reset** - Let users recover accounts

## Troubleshooting

### JWT_SECRET not set
```
Error: JWT_SECRET must be set in production environment
```
Solution: Add JWT_SECRET and JWT_REFRESH_SECRET to .env file

### Session not found
```
Session expired. Please login again.
```
Solution: Session may have expired or been cleaned up. User needs to login again.

### GHL connection required
```
Please connect your GoHighLevel account first
```
Solution: User needs to complete GHL OAuth flow at `/api/auth/ghl/login`

## Next Steps

1. **Email Service Integration** - Send verification and password reset emails
2. **OAuth Providers** - Add Google, Microsoft login
3. **Two-Factor Authentication** - Add 2FA support
4. **Account Lockout** - Prevent brute force attacks
5. **Session Management UI** - Let users see/revoke active sessions
6. **Audit Logging** - Track all auth events
