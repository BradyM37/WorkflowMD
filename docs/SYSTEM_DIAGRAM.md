# System Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GHL MARKETPLACE                        │
│                                                          │
│  [Install App] → [OAuth Flow] → [Grant Permissions]     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   WEB APPLICATION                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   FRONTEND   │ ◄────── │   BACKEND    │             │
│  │              │         │              │             │
│  │  • React     │         │  • Express   │             │
│  │  • Ant Design│         │  • Node.js   │             │
│  │  • Dashboard │         │  • Analysis  │             │
│  └──────────────┘         └──────┬───────┘             │
│                                   │                      │
└───────────────────────────────────┼──────────────────────┘
                                   │
                         ┌─────────┼─────────┐
                         ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │   PostgreSQL     │  │   External APIs  │
              │                  │  │                  │
              │  • oauth_tokens  │  │  • GHL API       │
              │  • analysis      │  │  • Stripe        │
              │  • stripe_events │  │                  │
              └──────────────────┘  └──────────────────┘
```

## Data Flow Sequence

```
1. User Installation
   User → GHL Marketplace → OAuth → Our App → Database

2. Workflow Analysis
   User → Dashboard → API Request → GHL API → Analysis Engine → Results

3. Payment Flow  
   User → Upgrade Button → Stripe Checkout → Webhook → Update Status
```

## Component Details

### Frontend (React App)
```
┌─────────────────────────────────────┐
│           React Frontend            │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │   Login   │  │ Dashboard │     │
│  └───────────┘  └───────────┘     │
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │  Analysis │  │  Upgrade  │     │
│  │  Results  │  │   Flow    │     │
│  └───────────┘  └───────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Backend API Structure
```
┌─────────────────────────────────────┐
│         Express Backend             │
├─────────────────────────────────────┤
│                                     │
│  /auth                              │
│    └── /callback (OAuth)            │
│                                     │
│  /api                               │
│    ├── /workflows (GET)             │
│    ├── /analyze (POST)              │
│    └── /history (GET)               │
│                                     │
│  /subscription                      │
│    ├── /checkout (POST)             │
│    └── /portal (POST)               │
│                                     │
│  /webhooks                          │
│    └── /stripe (POST)               │
│                                     │
└─────────────────────────────────────┘
```

### Database Schema
```
┌─────────────────────────────────────┐
│         PostgreSQL Database         │
├─────────────────────────────────────┤
│                                     │
│  oauth_tokens                       │
│  ┌─────────────────────────────┐   │
│  │ location_id (PK)            │   │
│  │ access_token                │   │
│  │ refresh_token               │   │
│  │ stripe_customer_id          │   │
│  │ subscription_status         │   │
│  └─────────────────────────────┘   │
│                                     │
│  analysis_results                   │
│  ┌─────────────────────────────┐   │
│  │ id (PK)                     │   │
│  │ location_id                 │   │
│  │ workflow_id                 │   │
│  │ risk_score                  │   │
│  │ results (JSONB)             │   │
│  │ created_at                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  stripe_events                      │
│  ┌─────────────────────────────┐   │
│  │ id (PK)                     │   │
│  │ processed_at                │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Analysis Engine Flow
```
Workflow Input
      │
      ▼
┌─────────────┐
│   Parser    │ → Convert GHL format
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Validator  │ → Check for errors
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Analyzer  │ → Calculate risk score
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Formatter  │ → Structure results
└─────┬───────┘
      │
      ▼
   Results
```

## Deployment Architecture
```
GitHub Repository
      │
      ▼
Railway Platform
      │
      ├── Web Service (Node.js)
      │   └── Auto-deploy on push
      │
      └── PostgreSQL Database
          └── Managed instance
```

## Security Flow
```
┌──────────────────────────────────────┐
│         Security Layers              │
├──────────────────────────────────────┤
│                                      │
│  1. HTTPS (Railway provides)         │
│     ↓                                │
│  2. Rate Limiting (Express)          │
│     ↓                                │
│  3. Cookie Authentication            │
│     ↓                                │
│  4. Token Encryption (AES-256)       │
│     ↓                                │
│  5. Parameterized SQL Queries        │
│                                      │
└──────────────────────────────────────┘
```

## Scaling Points
```
Current: 1-100 customers
├── Single server
├── PostgreSQL
└── $40/month

Future: 100-500 customers  
├── Add Redis cache
├── Still single server
└── $70/month

Scale: 500+ customers
├── Multiple instances
├── Load balancer
├── Read replicas
└── $200/month
```