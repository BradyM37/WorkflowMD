# Monitoring System Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Configure Email (Optional)

Add to your `.env` file:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="GHL Workflow Debugger" <alerts@workflowdebugger.com>
```

**Gmail Users:** Get App Password here: https://myaccount.google.com/apppasswords

### Step 2: Start the Server

```bash
npm run dev
```

You should see:
```
✅ Database tables initialized
✅ Scan scheduler initialized
🚀 Server running on port 3000
```

---

## 🧪 Testing the Features

### Test 1: Configure Alert Settings

```bash
# Authenticate first (get access token)
TOKEN="your-token-here"

# Configure alerts
curl -X POST http://localhost:3000/api/alerts/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "failureThreshold": 3,
    "timeWindowHours": 24,
    "alertOnCritical": true,
    "alertEmail": "your-email@gmail.com",
    "webhookUrl": "https://webhook.site/your-unique-url"
  }'
```

### Test 2: Send Test Alert

```bash
curl -X POST http://localhost:3000/api/alerts/test \
  -H "Authorization: Bearer $TOKEN"
```

Check your email! 📧

### Test 3: Log Workflow Execution

```bash
# Log a successful execution
curl -X POST http://localhost:3000/api/workflows/test-workflow-123/executions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "success",
    "executionTimeMs": 1234
  }'

# Log a failure
curl -X POST http://localhost:3000/api/workflows/test-workflow-123/executions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "failed",
    "workflowName": "Test Workflow",
    "failedActionId": "action-456",
    "failedActionName": "Send Email",
    "errorMessage": "SMTP connection failed",
    "executionTimeMs": 567
  }'
```

### Test 4: Get Execution Metrics

```bash
curl -X GET http://localhost:3000/api/workflows/test-workflow-123/metrics \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "failure_rate": 50,
  "avg_execution_time": 900.5,
  "last_failure": {
    "timestamp": "2026-02-11T08:30:00Z",
    "action": "Send Email",
    "error": "SMTP connection failed"
  },
  "failure_trend": "increasing",
  "total_executions": 2,
  "failed_executions": 1
}
```

### Test 5: Create Scan Schedule

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "frequency": "daily",
    "preferredTime": "02:00",
    "timezone": "America/Chicago",
    "scanScope": "active"
  }'
```

### Test 6: Trigger Immediate Scan

```bash
curl -X POST http://localhost:3000/api/schedules/run-now \
  -H "Authorization: Bearer $TOKEN"
```

Watch the logs - you'll see workflows being analyzed! 🔍

### Test 7: View Scan History

```bash
curl -X GET http://localhost:3000/api/schedules/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Real-World Usage

### Scenario: Monitor Production Workflows

1. **Setup Webhooks in GHL**
   - Go to GHL Workflows > Webhook
   - Add webhook URL: `https://your-domain.com/api/workflows/{workflow_id}/executions`
   - Trigger: Workflow execution completes

2. **Configure Alerts**
   - Set `failureThreshold: 3` (alert after 3 failures)
   - Set `timeWindowHours: 6` (within 6 hours)
   - Add your email and Slack webhook

3. **Schedule Daily Scans**
   - Frequency: daily
   - Time: 2:00 AM (off-peak)
   - Scope: active workflows only

4. **Sit Back & Relax** ☕
   - System monitors everything automatically
   - Get alerted only when things break
   - Review scan history weekly

---

## 📊 Database Queries (Debugging)

```sql
-- Check execution logs
SELECT * FROM execution_logs 
ORDER BY executed_at DESC 
LIMIT 10;

-- Check alert settings
SELECT * FROM alert_settings;

-- Check scan schedules
SELECT * FROM scan_schedules;

-- View scan history
SELECT * FROM scan_history 
ORDER BY started_at DESC 
LIMIT 5;

-- Failure rate by workflow
SELECT 
  workflow_id,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(COUNT(CASE WHEN status = 'failed' THEN 1 END)::numeric / COUNT(*) * 100, 2) as failure_rate
FROM execution_logs
GROUP BY workflow_id;
```

---

## 🐛 Troubleshooting

### Problem: Email Not Sending

**Solution:**
1. Check SMTP credentials in `.env`
2. For Gmail, use App Password (not regular password)
3. Check server logs for SMTP errors
4. Test with online SMTP tester

### Problem: Cron Jobs Not Running

**Solution:**
1. Check logs for "Scan scheduler initialized"
2. Verify `next_scan_at` in database
3. Restart server to reload schedules
4. Check system timezone matches configuration

### Problem: Alerts Firing Too Often

**Solution:**
1. Increase `failureThreshold` (e.g., 5 instead of 3)
2. Increase `timeWindowHours` (e.g., 48 instead of 24)
3. Temporarily disable alerts: `enabled: false`

---

## 🚢 Deploying to Production

### Railway/Render Deployment

1. **Set Environment Variables**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=alerts@yourdomain.com
   SMTP_PASS=your-app-password
   SMTP_FROM="Your App Name" <alerts@yourdomain.com>
   FRONTEND_URL=https://your-frontend.com
   ```

2. **Deploy**
   ```bash
   git push railway main
   # or
   git push render main
   ```

3. **Verify**
   ```bash
   curl https://your-api.railway.app/health/detailed
   ```

4. **Test Alerts**
   ```bash
   curl -X POST https://your-api.railway.app/api/alerts/test \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## 📖 API Documentation

Full API docs available at:
```
http://localhost:3000/api-docs
```

Or download OpenAPI spec:
```
http://localhost:3000/openapi.json
```

---

## 📞 Support

**Issues?** Check the logs:
```bash
# Development
npm run dev

# Production (Railway/Render)
# View logs in dashboard or CLI
railway logs
render logs
```

**Questions?** See `MONITORING_SYSTEM_COMPLETE.md` for full documentation.

---

## 🎉 You're Ready!

All three systems are operational:
- ✅ Execution Log Analysis
- ✅ Scheduled Scans
- ✅ Multi-Channel Alerting

Happy monitoring! 🚀
