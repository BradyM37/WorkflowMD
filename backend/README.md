# GHL Workflow Debugger - Backend

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to ENCRYPTION_KEY in .env
```

4. **Start development server:**
```bash
npm run dev
```

Server runs on http://localhost:3000

## API Endpoints

### Authentication
- `GET /auth/callback` - OAuth callback
- `POST /auth/logout` - Clear session
- `GET /auth/status` - Check auth status

### API (requires authentication)
- `GET /api/workflows` - List workflows
- `POST /api/analyze` - Analyze workflow
- `GET /api/history` - Get analysis history
- `GET /api/analysis/:id` - Get specific analysis

### Subscription
- `POST /api/subscription/checkout` - Create Stripe checkout
- `POST /api/subscription/portal` - Open customer portal
- `GET /api/subscription/status` - Get subscription status

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/ghl` - GHL webhook handler

## Development

### With mock data (no GHL account needed):
The app includes mock workflows for development. Just run in development mode and the mock data will be used automatically.

### Database setup:
Tables are created automatically on first run. PostgreSQL required.

### Testing analysis:
Visit http://localhost:3000/api/workflows (after auth) to see mock workflows.

## Deployment

1. Set production environment variables
2. Build TypeScript:
```bash
npm run build
```
3. Start production server:
```bash
npm start
```

## Environment Variables

See `.env.example` for all required variables.

Critical ones:
- `DATABASE_URL` - PostgreSQL connection
- `GHL_CLIENT_ID` & `GHL_CLIENT_SECRET` - OAuth credentials
- `ENCRYPTION_KEY` - For token encryption
- `STRIPE_SECRET_KEY` & `STRIPE_PRICE_ID` - Payment processing