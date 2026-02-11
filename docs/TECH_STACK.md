# Technology Stack

## Backend

### Core Dependencies
```json
{
  "express": "^4.18.0",
  "typescript": "^5.0.0", 
  "pg": "^8.11.0",
  "stripe": "^13.0.0",
  "axios": "^1.5.0",
  "zod": "^3.22.0",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.0.0",
  "@sentry/node": "^7.0.0"
}
```

### Why These Choices
- **Express:** Simple, well-documented, massive ecosystem
- **PostgreSQL:** Reliable, handles JSON data, good for this use case
- **Direct SQL:** No ORM needed for 3 tables
- **Zod:** Runtime validation for API inputs
- **Sentry:** Error tracking without complexity

## Frontend

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "react-query": "^3.39.0",
  "antd": "^5.0.0",
  "axios": "^1.5.0"
}
```

### Why These Choices
- **React:** Team knows it, GHL compatible
- **Ant Design:** Complete component set, looks professional
- **React Query:** Handles API state management
- **No custom CSS:** Ship faster with pre-built components

## Infrastructure

### Railway Platform
- Git push deployment
- Managed PostgreSQL
- Automatic SSL
- Zero DevOps overhead
- $40/month total cost

### Database Design
- 3 tables only
- JSONB for flexible analysis storage
- Indexed for common queries
- No complex relationships

## Development Tools

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

## What We Don't Use

- **No Redis:** PostgreSQL is fast enough
- **No queues:** 3-5 second sync operations are fine
- **No WebSockets:** Simple loading states work
- **No complex auth:** Cookies + GHL OAuth sufficient
- **No microservices:** Monolith is perfect
- **No Kubernetes:** Railway handles scaling

## Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| Railway hosting | $20 |
| PostgreSQL | $20 |
| **Total** | **$40** |

## Performance Targets

- API response: <200ms
- Analysis completion: <5 seconds
- Uptime: 99.9% (Railway SLA)
- Concurrent users: 100+

## When to Add Complexity

Only add new technology when:
1. Current stack demonstrably fails
2. Customers are complaining
3. You have 100+ paying customers
4. The pain justifies the complexity

Until then, keep it simple.