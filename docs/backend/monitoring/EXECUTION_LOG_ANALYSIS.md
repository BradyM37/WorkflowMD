# Execution Log Analysis Feature

## ADDITIONAL REQUIREMENT FOR SMITH

Add execution log analysis to the analysis engine.

## 1. Ingest GHL Execution Logs
- Parse workflow execution history from GHL API
- Track action success/failure rates
- Identify patterns in failures

## 2. Failed Action Detection
- Detect actions that fail repeatedly
- Track failure timestamps and frequency
- Identify which specific step failed and why
- Correlate failures with workflow structure issues

## 3. Alerting System (Toggleable)
- User can enable/disable failure alerts in Settings
- Alert thresholds: e.g., "Alert if >3 failures in 24hrs"
- Alert types:
  - Critical (payment failures)
  - Warning (API errors)
  - Info (timeout)

## 4. New Metrics
```typescript
interface ExecutionMetrics {
  failure_rate: number;      // % of executions that failed
  avg_execution_time: number; // performance baseline in ms
  last_failure: {
    timestamp: string;
    action: string;
    error: string;
  } | null;
  failure_trend: 'increasing' | 'decreasing' | 'stable';
  total_executions: number;
  failed_executions: number;
}
```

## 5. API Endpoints to Add
```
POST /api/workflows/:id/analyze-logs  - Analyze execution history
GET  /api/workflows/:id/failures      - Get recent failures
GET  /api/workflows/:id/metrics       - Get execution metrics
POST /api/alerts/configure            - Set alert preferences
GET  /api/alerts/settings             - Get current alert settings
```

## 6. Database Schema
```sql
CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'failed' | 'partial'
  failed_action_id TEXT,
  failed_action_name TEXT,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_log JSON
);

CREATE INDEX idx_execution_logs_workflow ON execution_logs(workflow_id);
CREATE INDEX idx_execution_logs_status ON execution_logs(status);
CREATE INDEX idx_execution_logs_date ON execution_logs(executed_at);

CREATE TABLE IF NOT EXISTS alert_settings (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  failure_threshold INTEGER DEFAULT 3,
  time_window_hours INTEGER DEFAULT 24,
  alert_on_critical BOOLEAN DEFAULT true,
  alert_on_warning BOOLEAN DEFAULT true,
  alert_on_info BOOLEAN DEFAULT false,
  alert_email TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 7. Health Score Integration
Factor recent failure rates into health score:
```
Execution Penalty = failure_rate * 20 (max 20 points)
Final Health Score = Structure Score - Execution Penalty
```

## 8. GHL API Reference
- Execution logs endpoint: `GET /workflows/{workflowId}/executions`
- Returns: execution history with status, timestamps, errors

## Priority: HIGH
This should be integrated into the main analysis engine.
