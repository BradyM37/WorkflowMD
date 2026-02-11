# 🔌 API Reference - GHL Workflow Debugger Backend

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": {
    "timestamp": "2026-02-11T06:20:00.000Z",
    "requestId": "uuid-here"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* only in development */ }
  },
  "meta": {
    "timestamp": "2026-02-11T06:20:00.000Z"
  }
}
```

## Common Error Codes
- `BAD_REQUEST` - Invalid input (400)
- `UNAUTHORIZED` - Authentication required (401)
- `FORBIDDEN` - Access denied (403)
- `NOT_FOUND` - Resource not found (404)
- `VALIDATION_ERROR` - Input validation failed (422)
- `RATE_LIMIT_EXCEEDED` - Too many requests (429)
- `INTERNAL_ERROR` - Server error (500)
- `SERVICE_UNAVAILABLE` - Service temporarily down (503)

---

## 🏥 Health & Status Endpoints

### GET /health
Basic health check - always responds if server is running.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ghl-workflow-debugger",
    "version": "1.0.0",
    "timestamp": "2026-02-11T06:20:00.000Z",
    "environment": "development"
  }
}
```

### GET /health/detailed
Detailed health check with database status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "ghl-workflow-debugger",
    "version": "1.0.0",
    "timestamp": "2026-02-11T06:20:00.000Z",
    "environment": "development",
    "checks": {
      "database": "healthy",
      "memory": {
        "used": 185,
        "total": 188,
        "unit": "MB"
      },
      "uptime": 120
    }
  }
}
```

### GET /ready
Readiness probe for orchestration (checks database).

### GET /live
Liveness probe for orchestration (always 200 if server is up).

---

## 🔐 Authentication Endpoints

### GET /auth/login
Redirect to GHL OAuth login page.

**Response:** 302 Redirect to GHL

---

### GET /auth/callback
OAuth callback handler (called by GHL after authorization).

**Query Params:**
- `code` (required) - Authorization code from GHL
- `state` (optional) - CSRF protection token

**Response:** 302 Redirect to dashboard with session cookie

---

### GET /auth/status
Check current authentication status.

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "locationId": "loc_abc123",
    "companyId": "comp_xyz789",
    "subscription": "pro",
    "memberSince": "2026-01-15T10:30:00.000Z"
  }
}
```

---

### POST /auth/logout
Log out and clear session.

**Response:**
```json
{
  "success": true,
  "data": {
    "loggedOut": true,
    "message": "Successfully logged out"
  }
}
```

---

### POST /auth/refresh
Refresh expired access token.

**Authentication:** Required (cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "refreshed": true,
    "expiresAt": "2026-02-11T08:20:00.000Z"
  }
}
```

---

## 📊 Analysis Endpoints

### GET /api/workflows
List all workflows from GHL for authenticated location.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "wf_123",
        "name": "Lead Nurture Sequence",
        "status": "active",
        "createdAt": "2026-01-10T00:00:00.000Z"
      }
    ],
    "count": 15
  }
}
```

---

### GET /api/workflows/:id/structure
Get workflow structure for React Flow visualization.

**Authentication:** Required

**Path Params:**
- `id` (required) - Workflow ID

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "wf_123",
    "workflowName": "Lead Nurture Sequence",
    "nodes": [
      {
        "id": "node_1",
        "type": "trigger",
        "position": { "x": 100, "y": 100 },
        "data": { "label": "Form Submit", "nodeType": "form_submitted" }
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2"
      }
    ]
  }
}
```

---

### POST /api/analyze
Analyze a workflow and return health score + issues.

**Authentication:** Required

**Request Body:**
```json
{
  "workflowId": "wf_123"
}
```

**Response (Free Tier):**
```json
{
  "success": true,
  "data": {
    "workflowId": "wf_123",
    "workflowName": "Lead Nurture Sequence",
    "healthScore": 65,
    "grade": "Needs Attention",
    "confidence": "High",
    "issuesFound": 8,
    "issuesShown": 3,
    "issues": [
      {
        "type": "high",
        "title": "API call without error handling",
        "description": "webhook action lacks error handling",
        "actionId": "action_5",
        "fix": "Add error handling branch or fallback action",
        "penalty": 20
      }
    ],
    "recommendations": [
      "Fix 2 high-priority issues to improve reliability"
    ],
    "performance": {
      "estimatedSteps": 12,
      "estimatedTime": "45.2s",
      "complexity": "medium",
      "bottlenecks": ["Wait 30m (delay)", "API Call (webhook)"]
    },
    "timestamp": "2026-02-11T06:20:00.000Z",
    "upgrade": {
      "message": "Upgrade to Pro to see 5 more issues and full recommendations",
      "hidden": 5,
      "upgradeUrl": "/api/subscription/checkout"
    }
  }
}
```

**Response (Pro Tier):** Same structure but no `upgrade` field and all issues shown.

---

### GET /api/history
Get analysis history for authenticated location.

**Authentication:** Required

**Query Params:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Results per page
- `workflowId` (optional) - Filter by workflow ID
- `minScore` (optional) - Minimum health score (0-100)
- `maxScore` (optional) - Maximum health score (0-100)

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 42,
        "workflow_id": "wf_123",
        "workflow_name": "Lead Nurture Sequence",
        "health_score": 65,
        "issues_found": 8,
        "created_at": "2026-02-11T06:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    },
    "subscription": {
      "status": "pro",
      "retentionDays": 90
    }
  }
}
```

---

### GET /api/analysis/:id
Get specific analysis result by ID.

**Authentication:** Required

**Path Params:**
- `id` (required) - Analysis ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "location_id": "loc_abc123",
    "workflow_id": "wf_123",
    "workflow_name": "Lead Nurture Sequence",
    "health_score": 65,
    "issues_found": 8,
    "results": { /* full analysis object */ },
    "created_at": "2026-02-11T06:15:00.000Z"
  }
}
```

---

### DELETE /api/analysis/:id
Delete an analysis result.

**Authentication:** Required

**Path Params:**
- `id` (required) - Analysis ID

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": 42
  }
}
```

---

## 💳 Subscription Endpoints

### POST /api/subscription/checkout
Create Stripe checkout session for Pro subscription.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/c/pay/cs_...",
    "sessionId": "cs_test_..."
  }
}
```

---

### POST /api/subscription/portal
Create Stripe customer portal session for managing subscription.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/p/session/..."
  }
}
```

---

### GET /api/subscription/status
Get current subscription status.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "pro",
    "hasPaymentMethod": true,
    "manageUrl": "/api/subscription/portal",
    "upgradeUrl": null,
    "endsAt": null,
    "stripe": {
      "id": "sub_...",
      "status": "active",
      "currentPeriodEnd": "2026-03-11T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    },
    "features": {
      "unlimitedAnalysis": true,
      "fullIssueDetails": true,
      "historyRetention": 90,
      "prioritySupport": true
    }
  }
}
```

---

### POST /api/subscription/cancel
Cancel subscription (ends at period end, not immediately).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "cancelled": true,
    "endsAt": "2026-03-11T00:00:00.000Z",
    "message": "Your subscription will remain active until the end of the current billing period"
  }
}
```

---

## 🧪 Test Endpoints (Development Only)

### POST /test/analyze
Analyze a mock workflow using the real analysis engine.

**Request Body:**
```json
{
  "workflowType": "critical"
}
```

or

```json
{
  "customWorkflow": {
    "id": "custom_001",
    "name": "My Test Workflow",
    "status": "active",
    "actions": [...],
    "triggers": [...],
    "connections": [...]
  }
}
```

**Response:** Same as POST /api/analyze

---

### GET /test/workflows
List available mock workflow types.

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "type": "critical",
        "id": "mock_critical_001",
        "name": "Broken Payment Flow",
        "status": "active",
        "description": "A workflow with multiple critical issues",
        "stats": {
          "triggers": 1,
          "actions": 5,
          "connections": 6,
          "estimatedContacts": 5000
        },
        "expectedIssues": [
          "Infinite loop detected",
          "Email missing recipient",
          "Webhook points to localhost"
        ]
      }
    ],
    "count": 3,
    "usage": "POST /test/analyze with { \"workflowType\": \"critical|medium|healthy\" }"
  }
}
```

---

### GET /test/history
Get test analysis history.

**Query Params:**
- `locationId` (optional, default: "loc_test_123")
- `limit` (optional, default: 20)

**Response:** Same as GET /api/history

---

### DELETE /test/history
Clear test analysis data.

**Query Params:**
- `locationId` (optional, default: "loc_test_123")

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "count": 15,
    "locationId": "loc_test_123",
    "message": "Cleared 15 test analysis results"
  }
}
```

---

### GET /test/health
Test endpoint health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "endpoints": {
      "analyze": "POST /test/analyze",
      "workflows": "GET /test/workflows",
      "history": "GET /test/history",
      "clearHistory": "DELETE /test/history"
    },
    "mockWorkflows": ["critical", "medium", "healthy"]
  }
}
```

---

## 🔗 Webhook Endpoints

### POST /webhooks/stripe
Stripe webhook handler (called by Stripe).

**Headers:**
- `stripe-signature` (required) - Webhook signature

**Body:** Raw Stripe event JSON

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

**Response:**
```json
{
  "received": true
}
```

---

### POST /webhooks/ghl
GHL webhook handler (for future use).

**Response:**
```json
{
  "received": true,
  "eventType": "workflow.updated",
  "timestamp": "2026-02-11T06:20:00.000Z"
}
```

---

### GET /webhooks/health
Webhook endpoint health check.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "endpoints": {
      "stripe": "configured",
      "ghl": "ready"
    }
  }
}
```

---

## 🚦 Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| `/api/*` | 30 requests | 1 minute |
| `/auth/*` | 5 requests | 15 minutes |
| Global | 100 requests | 1 minute |

**Rate Limit Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

Headers:
- `Retry-After: 900` (seconds until retry allowed)

---

## 🔑 Authentication

Most endpoints require authentication via `location_id` cookie set during OAuth flow.

**Cookie Details:**
- Name: `location_id`
- HttpOnly: `true`
- Secure: `true` (production)
- SameSite: `strict`
- Max-Age: 30 days

---

## 📝 Examples

### cURL Examples

```bash
# Health check
curl http://localhost:3000/health

# List workflows (authenticated)
curl -b cookies.txt http://localhost:3000/api/workflows

# Analyze workflow
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"workflowId":"wf_123"}'

# Test analysis (development)
curl -X POST http://localhost:3000/test/analyze \
  -H "Content-Type: application/json" \
  -d '{"workflowType":"critical"}'
```

### JavaScript/Fetch Examples

```javascript
// Health check
const health = await fetch('http://localhost:3000/health');
const data = await health.json();

// Analyze workflow (authenticated)
const analysis = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  credentials: 'include', // Send cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workflowId: 'wf_123' })
});
const result = await analysis.json();
```

---

Generated: 2026-02-11T06:25:00Z
Version: 1.0.0
Status: Production Ready ✅
