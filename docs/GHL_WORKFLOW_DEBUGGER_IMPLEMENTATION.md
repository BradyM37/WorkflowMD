# GHL Workflow Debugger Implementation Guide

## Project Overview

Building a diagnostic tool for GoHighLevel workflows that identifies errors and provides fixes. Ships in 1 week with minimal infrastructure.

## Week 1 Implementation Schedule

### Monday-Tuesday: Foundation

**Backend Tasks (Smith):**
```javascript
// 1. Initialize Express server
const express = require('express');
const app = express();

// 2. Set up PostgreSQL connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 3. Create database schema
CREATE TABLE oauth_tokens (
  location_id VARCHAR(255) PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'free'
);

// 4. Implement OAuth callback
app.post('/auth/callback', async (req, res) => {
  // Exchange code for tokens
  // Store in database
  // Set cookie
  // Redirect to dashboard
});
```

**Frontend Tasks (Nova):**
```javascript
// 1. Create React app
npx create-react-app frontend --template typescript

// 2. Install dependencies
npm install antd react-query react-router-dom axios

// 3. Set up routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 4. Build basic layout
<Layout>
  <Header>GHL Workflow Debugger</Header>
  <Content>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis/:id" element={<Analysis />} />
    </Routes>
  </Content>
</Layout>
```

### Wednesday-Thursday: Core Features

**Analysis Engine (Smith):**
```javascript
// Define analysis rules
const analysisRules = {
  critical: [
    checkMissingFields,
    checkBrokenWebhooks,
    checkInvalidTemplates
  ],
  high: [
    checkNoErrorHandling,
    checkCircularDeps,
    checkInfiniteLoops
  ],
  medium: [
    checkInefficiencies,
    checkDuplicates,
    checkUnusedVars
  ]
};

// Main analysis function
async function analyzeWorkflow(workflowId, locationId) {
  const workflow = await fetchFromGHL(workflowId, locationId);
  
  const issues = [];
  let riskScore = 0;
  
  // Run all rules
  for (const [severity, rules] of Object.entries(analysisRules)) {
    for (const rule of rules) {
      const result = rule(workflow);
      if (result) {
        issues.push({ ...result, severity });
        riskScore += severityScores[severity];
      }
    }
  }
  
  return {
    workflowId,
    riskScore: Math.min(riskScore, 100),
    issues,
    timestamp: new Date()
  };
}
```

**Dashboard UI (Nova):**
```jsx
function Dashboard() {
  const { data: workflows } = useQuery('workflows', fetchWorkflows);
  const [analyzing, setAnalyzing] = useState(false);
  
  const handleAnalyze = async (workflowId) => {
    setAnalyzing(true);
    const result = await analyzeWorkflow(workflowId);
    navigate(`/analysis/${result.id}`);
  };
  
  return (
    <div>
      <h1>Select Workflow to Analyze</h1>
      <List
        dataSource={workflows}
        renderItem={workflow => (
          <List.Item>
            <Card>
              <h3>{workflow.name}</h3>
              <p>{workflow.description}</p>
              <Button 
                onClick={() => handleAnalyze(workflow.id)}
                loading={analyzing}
              >
                Analyze
              </Button>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
```

### Friday: Monetization & Deployment

**Stripe Integration:**
```javascript
// Create checkout session
app.post('/api/subscription/checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_abc123', // $297/month price ID
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${DOMAIN}/dashboard?upgraded=true`,
    cancel_url: `${DOMAIN}/pricing`,
    client_reference_id: req.cookies.location_id,
  });
  
  res.json({ url: session.url });
});

// Handle webhook
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body, sig, WEBHOOK_SECRET
  );
  
  if (event.type === 'checkout.session.completed') {
    await updateSubscriptionStatus(
      event.data.object.client_reference_id,
      'pro'
    );
  }
  
  res.json({ received: true });
});
```

**Feature Gating:**
```javascript
// Backend
function gateProFeatures(issues, subscription) {
  if (subscription === 'free') {
    return {
      issues: issues.slice(0, 3),
      totalFound: issues.length,
      message: `${issues.length - 3} more issues found`,
      upgradeUrl: '/api/subscription/checkout'
    };
  }
  return { issues };
}

// Frontend
function AnalysisResults({ data }) {
  const { issues, totalFound, upgradeUrl } = data;
  
  return (
    <>
      <IssuesList issues={issues} />
      {upgradeUrl && (
        <Alert
          message={`${totalFound - 3} more issues found`}
          action={
            <Button type="primary" href={upgradeUrl}>
              See All Issues
            </Button>
          }
        />
      )}
    </>
  );
}
```

**Railway Deployment:**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Analysis Rules Implementation

### Critical Issues (25 points each)
```javascript
function checkMissingFields(workflow) {
  const issues = [];
  
  workflow.actions.forEach(action => {
    // Check email actions
    if (action.type === 'email' && !action.config.recipient) {
      issues.push({
        title: 'Email missing recipient',
        description: 'Email will fail to send',
        actionId: action.id,
        fix: 'Add recipient email or merge field'
      });
    }
    
    // Check webhooks
    if (action.type === 'webhook' && !action.config.url) {
      issues.push({
        title: 'Webhook missing URL',
        description: 'Webhook has no destination',
        actionId: action.id,
        fix: 'Add valid webhook URL'
      });
    }
  });
  
  return issues;
}

function checkBrokenWebhooks(workflow) {
  const issues = [];
  
  workflow.webhooks?.forEach(webhook => {
    if (webhook.url?.includes('localhost')) {
      issues.push({
        title: 'Localhost webhook URL',
        description: 'Webhook points to localhost',
        webhookId: webhook.id,
        fix: 'Use public URL for webhook'
      });
    }
  });
  
  return issues;
}
```

### Risk Score Calculation
```javascript
const SEVERITY_SCORES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3
};

function calculateRiskScore(issues) {
  let score = 0;
  
  issues.forEach(issue => {
    score += SEVERITY_SCORES[issue.severity] || 0;
  });
  
  // Add complexity factors
  if (workflow.actions?.length > 50) score += 10;
  if (workflow.branches > 10) score += 5;
  
  return {
    score: Math.min(score, 100),
    grade: getGrade(score),
    level: getRiskLevel(score)
  };
}

function getGrade(score) {
  if (score <= 25) return 'A';
  if (score <= 50) return 'B';
  if (score <= 75) return 'C';
  return 'F';
}

function getRiskLevel(score) {
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Medium';
  if (score <= 75) return 'High';
  return 'Critical';
}
```

## Testing Checklist

### Pre-Launch Testing
- [ ] OAuth flow works end-to-end
- [ ] Can fetch workflows from GHL
- [ ] Analysis identifies real issues
- [ ] Risk score calculation accurate
- [ ] Free tier shows only 3 issues
- [ ] Pro tier shows all issues
- [ ] Stripe checkout works
- [ ] Subscription status updates
- [ ] Error handling graceful
- [ ] Railway deployment successful

### Performance Targets
- [ ] Analysis completes in <5 seconds
- [ ] Dashboard loads in <2 seconds
- [ ] API responses <200ms
- [ ] Error rate <1%

## Environment Variables
```bash
# Production .env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# GHL OAuth
GHL_CLIENT_ID=xxx
GHL_CLIENT_SECRET=xxx
REDIRECT_URI=https://app.example.com/auth/callback

# Encryption
ENCRYPTION_KEY=64-char-hex-string

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
DOMAIN=https://app.example.com
```

## Launch Preparation

### Beta Users (Week 2)
1. Recruit 10 GHL agencies
2. Provide free Pro access
3. Collect feedback
4. Fix critical bugs
5. Refine based on usage

### Marketing Materials
- Landing page copy
- Demo video
- Documentation
- Support email setup
- Billing FAQ

### Success Metrics
- 10 beta users by end of week 2
- 20 paying customers by month 1
- <5% churn rate
- 3% free-to-paid conversion