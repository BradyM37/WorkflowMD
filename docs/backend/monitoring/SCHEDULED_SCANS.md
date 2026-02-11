# Scheduled Scans Feature

## REQUIREMENT FOR SMITH

Users should be able to schedule automatic workflow scans.

## 1. Scheduling Options
- **Frequency:**
  - Daily (default)
  - Every 12 hours
  - Every 6 hours
  - Weekly
  - Custom cron expression (Pro)

- **Time of Day:** User selects preferred scan time (e.g., 2:00 AM)

- **Scope:**
  - All workflows
  - Selected workflows only
  - Only active workflows

## 2. Database Schema
```sql
CREATE TABLE IF NOT EXISTS scan_schedules (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'daily', -- 'daily' | '12h' | '6h' | 'weekly' | 'custom'
  cron_expression TEXT, -- for custom schedules
  preferred_time TEXT DEFAULT '02:00', -- HH:MM in user's timezone
  timezone TEXT DEFAULT 'America/New_York',
  scan_scope TEXT DEFAULT 'active', -- 'all' | 'active' | 'selected'
  selected_workflow_ids JSON, -- array of workflow IDs if scope='selected'
  last_scan_at TIMESTAMP,
  next_scan_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  schedule_id TEXT,
  location_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'running' | 'completed' | 'failed'
  workflows_scanned INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  summary JSON -- { workflows: [...], total_health_score: X }
);

CREATE INDEX idx_scan_schedules_location ON scan_schedules(location_id);
CREATE INDEX idx_scan_schedules_next ON scan_schedules(next_scan_at);
CREATE INDEX idx_scan_history_location ON scan_history(location_id);
```

## 3. API Endpoints
```
POST /api/schedules              - Create/update scan schedule
GET  /api/schedules              - Get user's scan schedule
DELETE /api/schedules/:id        - Remove schedule

GET  /api/schedules/history      - Get scan history
GET  /api/schedules/next         - Get next scheduled scan time

POST /api/schedules/run-now      - Trigger immediate scan (manual)
```

## 4. Background Job System
```typescript
// Use node-cron or similar
import cron from 'node-cron';

interface ScanJob {
  scheduleId: string;
  locationId: string;
  cronExpression: string;
  scanScope: 'all' | 'active' | 'selected';
  selectedWorkflowIds?: string[];
}

// Job runner
async function runScheduledScan(job: ScanJob) {
  // 1. Get workflows based on scope
  // 2. Run analysis on each
  // 3. Store results in scan_history
  // 4. Send alerts if critical issues found
  // 5. Update last_scan_at and next_scan_at
}
```

## 5. Notification on Completion
When scheduled scan completes:
- Email summary (if enabled)
- In-app notification
- Alert if new critical issues found since last scan

## 6. Frontend UI Needs (for Nova)
- Schedule button on Dashboard
- Schedule configuration modal:
  - Enable/disable toggle
  - Frequency dropdown
  - Time picker
  - Workflow selection (if scope='selected')
- Scan history view
- "Last scanned: X hours ago" indicator on workflows

## Priority: HIGH
