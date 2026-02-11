# GHL Workflow Debugger

Analyze and optimize your GoHighLevel workflows. Find issues, improve performance, and prevent failures before they happen.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.x-61dafb)

## Features

- 🔍 **30+ Workflow Checks** - Detect loops, missing fields, broken webhooks, payment issues
- 📊 **Health Scoring** - 0-100 score with A-F grading
- 🔄 **Loop Detection** - Find infinite loops and circular dependencies
- ⚡ **Performance Analysis** - Identify bottlenecks and optimization opportunities
- 📱 **Mobile Responsive** - Works on all devices
- 🌙 **Dark Mode** - Easy on the eyes
- 📄 **PDF Reports** - Professional branded reports
- 🔔 **Email Alerts** - Get notified of workflow issues

## Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL
- Redis (optional caching)
- AWS SES (email)
- Stripe (payments)

**Frontend:**
- React 18 + TypeScript
- Ant Design
- React Flow (workflow visualization)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- (Optional) Redis for caching

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# GHL OAuth
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS SES
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
SES_FROM_EMAIL=noreply@yourdomain.com

# JWT
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3000
```

## Deployment

### Render (Backend)

1. Connect GitHub repo
2. Set root directory: `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Add environment variables

### Netlify (Frontend)

1. Connect GitHub repo
2. Set root directory: `frontend`
3. Build: `npm run build`
4. Publish: `build`
5. Add `REACT_APP_API_URL`

## Branch Strategy

- `main` - Production
- `staging` - Pre-production testing
- `develop` - Development

## API Documentation

See [docs/backend/api/API_REFERENCE.md](docs/backend/api/API_REFERENCE.md)

## License

MIT
