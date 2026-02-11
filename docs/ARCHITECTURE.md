# System Architecture

## Overview

A web application that analyzes GoHighLevel workflows for configuration errors and provides actionable insights.

## Components

### Frontend
- React application embedded in GHL marketplace
- Ant Design component library
- Displays workflow list and analysis results
- Stripe checkout integration

### Backend  
- Express API server
- PostgreSQL database
- Synchronous workflow analysis
- OAuth token management

### Database Schema
```sql
CREATE TABLE oauth_tokens (
  location_id VARCHAR(255) PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50)
);

CREATE TABLE analysis_results (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(255),
  workflow_id VARCHAR(255),
  risk_score INTEGER,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stripe_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

## Data Flow

1. User installs app via GHL marketplace
2. OAuth flow grants access to workflows
3. User selects workflow to analyze
4. Backend fetches workflow configuration
5. Analysis engine checks for issues
6. Results stored in PostgreSQL
7. Frontend displays findings

## Authentication

- GHL OAuth 2.0 for access
- Location ID stored in httpOnly cookie
- Tokens encrypted in database

## Analysis Engine

Detects:
- Missing required fields
- Broken webhook URLs
- Invalid email templates
- Circular dependencies
- Missing error handling
- Excessive external API calls

## Deployment

- Single Docker container
- Railway platform hosting
- PostgreSQL on Railway
- Automatic SSL/deployment

## Scaling

Current infrastructure handles:
- 500+ customers
- 10,000+ analyses per day
- 100+ concurrent users

All on $40/month infrastructure.