# Pivot: Response Time Tracker for GHL

## Product Vision
**Speed-to-Lead Analytics** — Help GHL agencies track response times, identify missed leads, and improve team performance.

### Core Value Prop
"You're losing leads. Your average response time is 47 minutes. Industry benchmark: 5 minutes. Here's who's slipping."

---

## What We Keep ✅
- OAuth flow (working)
- User auth system (JWT, sessions)
- Stripe billing infrastructure
- Database (PostgreSQL)
- Basic UI framework (React, Ant Design)
- Deployment (Render, Netlify)

## What We Replace 🔄
- Workflow analysis → Conversation analysis
- Workflow graph → Response time dashboard
- Health scores → Speed metrics

---

## GHL API Endpoints Needed

### Conversations
- `GET /conversations/` — List conversations
- `GET /conversations/{id}` — Get conversation details
- `GET /conversations/{id}/messages` — Get messages in conversation

### Contacts
- `GET /contacts/` — List contacts (for context)

### Users
- `GET /users/` — List team members (for per-user metrics)

### Webhooks (Real-time)
- `InboundMessage` — New message received
- `OutboundMessage` — Message sent
- `ConversationUnreadUpdate` — Conversation status change

---

## Core Metrics to Track

### Speed Metrics
1. **First Response Time** — Time from first inbound message to first outbound reply
2. **Average Response Time** — Mean time to respond across all conversations
3. **Response Time by User** — Per-team-member breakdown
4. **Response Time by Channel** — SMS vs Email vs Facebook vs etc.
5. **Response Time by Hour/Day** — When is the team slowest?

### Volume Metrics
1. **Total Conversations** — Daily/weekly/monthly
2. **Missed Conversations** — Inbound with no reply after X hours
3. **Conversations per User** — Workload distribution
4. **Channel Breakdown** — Where are leads coming from?

### Alerts
1. **Slow Response Alert** — Conversation open > 15 min with no reply
2. **Missed Lead Alert** — No response after 1 hour
3. **Team Member Slipping** — Individual response time degrading

---

## Database Schema Changes

```sql
-- Track conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  ghl_conversation_id VARCHAR(255) UNIQUE NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(255),
  channel VARCHAR(50), -- sms, email, facebook, instagram, etc.
  first_inbound_at TIMESTAMP,
  first_response_at TIMESTAMP,
  response_time_seconds INTEGER,
  assigned_user_id VARCHAR(255),
  assigned_user_name VARCHAR(255),
  status VARCHAR(50), -- open, won, lost, etc.
  is_missed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track individual messages for detailed analysis
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  ghl_message_id VARCHAR(255) UNIQUE NOT NULL,
  direction VARCHAR(10), -- inbound, outbound
  channel VARCHAR(50),
  sent_at TIMESTAMP,
  sent_by_user_id VARCHAR(255),
  sent_by_user_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily aggregates for fast dashboard loading
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_inbound INTEGER DEFAULT 0,
  total_outbound INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  median_response_time_seconds INTEGER,
  missed_conversations INTEGER DEFAULT 0,
  conversations_under_5min INTEGER DEFAULT 0,
  conversations_under_15min INTEGER DEFAULT 0,
  conversations_over_1hr INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, date)
);

-- Per-user daily metrics
CREATE TABLE user_daily_metrics (
  id UUID PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  date DATE NOT NULL,
  total_responses INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  missed_conversations INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, user_id, date)
);
```

---

## New API Endpoints

### Dashboard
- `GET /api/metrics/overview` — Summary stats (avg response time, missed, etc.)
- `GET /api/metrics/daily?days=30` — Daily trend data
- `GET /api/metrics/users` — Per-user breakdown
- `GET /api/metrics/channels` — Per-channel breakdown

### Conversations
- `GET /api/conversations?status=missed` — List conversations needing attention
- `GET /api/conversations/:id` — Conversation detail with messages

### Sync
- `POST /api/sync/conversations` — Manual sync trigger
- `POST /webhooks/ghl` — Real-time webhook receiver

---

## Frontend Pages

1. **Dashboard** — Overview metrics, charts, alerts
2. **Team Performance** — Per-user leaderboard and metrics
3. **Missed Leads** — List of conversations needing follow-up
4. **Settings** — Alert thresholds, notification preferences

---

## Implementation Order

### Phase 1: Core Data (Today)
1. Update GHL scopes in app settings
2. Add database tables
3. Build conversation sync from GHL API
4. Basic metrics calculation

### Phase 2: Dashboard (Tomorrow)
1. New dashboard UI with metrics
2. Charts (response time trend, channel breakdown)
3. Missed leads list

### Phase 3: Real-time (Day 3)
1. Webhook handlers for live updates
2. Alert system
3. Team performance view

### Phase 4: Polish (Day 4)
1. Email/SMS alerts
2. PDF reports
3. Benchmarking

---

## Renamed Product?

Options:
- **LeadSpeed** — Speed-to-lead tracker
- **ResponseIQ** — Response intelligence
- **LeadPulse** — Monitor your lead response pulse
- **SpeedToLead** — Obvious but clear

Current: WorkflowMD → could rebrand or keep infra name

---

## Success Metrics

1. User can connect GHL account ✅ (already works)
2. User sees their avg response time
3. User sees missed conversations
4. User sees team breakdown
5. User gets alerts for slow responses
