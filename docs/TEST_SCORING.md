# Health Score Testing Guide

## Quick Test Scenarios

### 1. Perfect Workflow (Score: 100)
```json
{
  "healthScore": 100,
  "grade": "Excellent",
  "issues": []
}
```
**Expected:**
- ✅ Color: Green (#52c41a)
- ✅ Label: "Excellent"
- ✅ Badge: Success/Green

---

### 2. Good Workflow (Score: 75)
```json
{
  "healthScore": 75,
  "grade": "Good",
  "issues": [
    { "type": "medium", "title": "Inefficient action ordering" },
    { "type": "medium", "title": "Unused variable" },
    { "type": "low", "title": "Missing description" }
  ]
}
```
**Expected:**
- ✅ Color: Blue (#1890ff)
- ✅ Label: "Good"
- ✅ Badge: Primary/Blue

**Calculation:** 100 - (8 + 8 + 3) = 81 → Should show ~75-80

---

### 3. Needs Attention (Score: 55)
```json
{
  "healthScore": 55,
  "grade": "Needs Attention",
  "issues": [
    { "type": "high", "title": "No error handling" },
    { "type": "medium", "title": "Duplicate action" },
    { "type": "medium", "title": "Inefficient ordering" },
    { "type": "low", "title": "Missing description" }
  ]
}
```
**Expected:**
- ✅ Color: Yellow (#faad14)
- ✅ Label: "Needs Attention"
- ✅ Badge: Warning/Yellow

**Calculation:** 100 - (15 + 8 + 8 + 3) = 66 → Should show ~55-65

---

### 4. High Risk (Score: 35)
```json
{
  "healthScore": 35,
  "grade": "High Risk",
  "issues": [
    { "type": "critical", "title": "Payment webhook missing retry" },
    { "type": "high", "title": "Infinite loop detected" },
    { "type": "high", "title": "No error handling" },
    { "type": "medium", "title": "Duplicate action" }
  ]
}
```
**Expected:**
- ✅ Color: Orange (#fa8c16)
- ✅ Label: "High Risk"
- ✅ Badge: Warning/Orange

**Calculation:** 100 - (25 + 15 + 15 + 8) = 37 → Should show ~30-40

---

### 5. Critical (Score: 15)
```json
{
  "healthScore": 15,
  "grade": "Critical",
  "issues": [
    { "type": "critical", "title": "Webhook points to localhost" },
    { "type": "critical", "title": "Payment webhook missing retry" },
    { "type": "critical", "title": "SMS missing phone number" },
    { "type": "high", "title": "Infinite loop detected" }
  ]
}
```
**Expected:**
- ✅ Color: Red (#ff4d4f)
- ✅ Label: "Critical"
- ✅ Badge: Error/Red

**Calculation:** 100 - (25 + 25 + 25 + 15) = 10 → Should show ~10-20

---

## Manual Testing Steps

### Backend API Test
```bash
# Start backend
cd backend
npm run dev

# Test analyze endpoint (use real GHL workflow or mock)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"workflowId": "test_workflow"}'

# Check response has healthScore (not riskScore)
# Verify grade matches score range
```

### Frontend UI Test
```bash
# Start frontend
cd frontend
npm run dev

# Navigate to: http://localhost:5173/dashboard
# 1. Check that health scores display correctly
# 2. Verify colors match grades:
#    - 90-100: Green
#    - 70-89: Blue
#    - 50-69: Yellow
#    - 30-49: Orange
#    - 0-29: Red
# 3. Confirm progress bars show correct percentage
# 4. Verify timeline/history uses correct colors
```

### Database Verification
```sql
-- Check that health_score column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'analysis_results' 
  AND column_name = 'health_score';

-- Verify scores are in valid range (0-100)
SELECT 
  workflow_name,
  health_score,
  issues_found,
  created_at
FROM analysis_results
ORDER BY created_at DESC
LIMIT 10;

-- Check score distribution
SELECT 
  CASE 
    WHEN health_score >= 90 THEN 'Excellent (90-100)'
    WHEN health_score >= 70 THEN 'Good (70-89)'
    WHEN health_score >= 50 THEN 'Needs Attention (50-69)'
    WHEN health_score >= 30 THEN 'High Risk (30-49)'
    ELSE 'Critical (0-29)'
  END as grade_category,
  COUNT(*) as count
FROM analysis_results
GROUP BY grade_category
ORDER BY MIN(health_score) DESC;
```

---

## Expected Behavior Matrix

| Issues | Severity | Penalty | Final Score | Grade | Color |
|--------|----------|---------|-------------|-------|-------|
| None | - | 0 | 100 | Excellent | 🟢 Green |
| 1 Low | Low | -3 | 97 | Excellent | 🟢 Green |
| 1 Medium | Medium | -8 | 92 | Excellent | 🟢 Green |
| 1 High | High | -15 | 85 | Good | 🔵 Blue |
| 1 Critical | Critical | -25 | 75 | Good | 🔵 Blue |
| 2 Critical | Critical | -50 | 50 | Needs Attention | 🟡 Yellow |
| 3 Critical | Critical | -75 | 25 | Critical | 🔴 Red |
| 2 Critical + 2 High | Mixed | -80 | 20 | Critical | 🔴 Red |

---

## Common Edge Cases

### Zero Issues Workflow
- **Score:** 100
- **Grade:** Excellent
- **Should NOT show:** Any warnings or concerns

### Maximum Penalty (>100 points)
- **Score:** 0 (capped at 0, not negative)
- **Grade:** Critical
- **Should show:** "Immediate attention required" message

### Exactly on Threshold
- **Score: 90** → Excellent (inclusive)
- **Score: 89** → Good
- **Score: 70** → Good (inclusive)
- **Score: 69** → Needs Attention

---

## Regression Testing

Before deploying, verify these don't break:
- [ ] OAuth flow still works
- [ ] GHL API integration fetches workflows correctly
- [ ] Loop detection algorithm unchanged
- [ ] Trigger conflict detection unchanged
- [ ] Performance metrics still calculate
- [ ] Subscription gating (free vs pro) still works
- [ ] Export/download report functionality

---

## User Acceptance Testing

Ask a beta user:
1. "Does the score make sense when you look at the issues?"
2. "Is it clear that higher score = better?"
3. "Do the color codes feel intuitive?"
4. "Does the grade label (Excellent/Good/etc.) match your expectation?"

---

**Status:** Ready for testing  
**Last Updated:** 2026-02-10
