# Quick Start Guide - Workflow Analyzer

**Status:** ✅ Ready to Test  
**Last Build:** SUCCESS

---

## 🚀 Start the Server

```bash
# Terminal 1: Start backend server
cd C:\Users\Bdog3\Desktop\Application\backend
npm run dev
```

Server will start on: `http://localhost:3000`

---

## 🧪 Test the Analyzer

### Option 1: Test with Mock Data (No GHL Required)

```bash
# Run comprehensive test suite
node run-all-tests.js
```

**Expected Output:**
```
✅ Tests Passed: 6/6
❌ Tests Failed: 0/6
🎯 OVERALL STATUS: ✅ ALL TESTS PASSED
```

### Option 2: Test Single Workflow

```bash
# Test workflow 1 (Infinite Loop)
node -e "const {analyzeWorkflow}=require('./dist/lib/workflow-analyzer');const wf=require('./test-workflows.json').workflows[0];console.log(JSON.stringify(analyzeWorkflow(wf),null,2))"

# Test workflow 2 (Critical Issues)
node -e "const {analyzeWorkflow}=require('./dist/lib/workflow-analyzer');const wf=require('./test-workflows.json').workflows[1];console.log(JSON.stringify(analyzeWorkflow(wf),null,2))"

# Test workflow 6 (Perfect Workflow - should score 98/100)
node -e "const {analyzeWorkflow}=require('./dist/lib/workflow-analyzer');const wf=require('./test-workflows.json').workflows[5];console.log(JSON.stringify(analyzeWorkflow(wf),null,2))"
```

### Option 3: Test API Endpoint with cURL

**Prerequisites:**
1. Server running (`npm run dev`)
2. Valid GHL access token

```bash
# Test with workflow ID
curl -X POST http://localhost:3000/api/workflows/YOUR_WORKFLOW_ID/analyze \
  -H "Authorization: Bearer YOUR_GHL_TOKEN" \
  -H "Content-Type: application/json"

# Test with workflow JSON body (legacy endpoint)
curl -X POST http://localhost:3000/api/analyze \
  -H "Authorization: Bearer YOUR_GHL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowId": "YOUR_WORKFLOW_ID"}'
```

### Option 4: Test with Postman

**Import this collection:**

```json
{
  "info": {
    "name": "Workflow Analyzer Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Analyze Workflow by ID",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{ghl_token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/workflows/:workflowId/analyze",
          "host": ["http://localhost:3000"],
          "path": ["api", "workflows", ":workflowId", "analyze"],
          "variable": [
            {
              "key": "workflowId",
              "value": "YOUR_WORKFLOW_ID"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 📊 Understanding the Results

### Health Score Scale

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | 🟢 Excellent | Production-ready, minimal issues |
| 70-89 | 🔵 Good | Generally safe, minor improvements needed |
| 50-69 | 🟡 Needs Attention | Several issues to address |
| 30-49 | 🟠 High Risk | Major issues, not recommended for production |
| 0-29 | 🔴 Critical | Severe issues, will likely fail |

### Issue Priority

| Type | Points | Priority | Action |
|------|--------|----------|--------|
| 🔴 Critical | 25 | URGENT | Fix immediately |
| 🟠 High | 15 | Important | Fix soon |
| 🟡 Medium | 5 | Moderate | Address when possible |
| ⚪ Low | 2 | Nice to have | Fix if time permits |

---

## 🔍 What Gets Analyzed?

### Critical Checks (25 pts each)
- Infinite loops (no exit condition)
- Webhooks pointing to localhost
- Payment actions without retry logic
- Broken/missing API configurations

### High Priority (15 pts each)
- External API calls without error handling
- Trigger conflicts (overlapping triggers)
- Rapid actions without delays (rate limit risk)
- Hardcoded values (emails, phones, API keys)

### Medium Priority (5 pts each)
- Long chains (>10 steps) without checkpoints
- Critical actions without fallback
- Deprecated API versions (v1, v2, beta)
- Missing timeouts on external calls

### Low Priority (2 pts each)
- Missing descriptions/documentation
- Suboptimal action ordering
- Unused branches/dead code
- Disconnected nodes

---

## 🎯 Example Analysis

**Input Workflow:**
```json
{
  "id": "test-workflow-1",
  "name": "Lead Nurture",
  "status": "active",
  "actions": [
    {
      "id": "payment-1",
      "type": "payment",
      "name": "Charge Customer",
      "config": { "amount": 99.99 }
    },
    {
      "id": "webhook-1",
      "type": "webhook",
      "name": "Send to CRM",
      "config": { "url": "http://localhost:3000/api/callback" }
    }
  ]
}
```

**Output:**
```json
{
  "healthScore": 50,
  "grade": "Needs Attention",
  "issues": [
    {
      "type": "critical",
      "title": "Webhook Points to Localhost",
      "description": "Webhook not accessible from external services"
    },
    {
      "type": "critical",
      "title": "Payment Action Without Retry Logic",
      "description": "Failed payments will result in lost revenue"
    }
  ],
  "recommendations": [
    "🚨 URGENT: Fix 2 critical issues immediately",
    "Verify all webhook URLs are publicly accessible"
  ]
}
```

**Scoring:**
- 2 Critical × 25 = 50 points penalty
- Health Score: 100 - 50 = **50** (Needs Attention)

---

## 🐛 Troubleshooting

### Server Won't Start

**Error:** `Cannot find module './dist/lib/workflow-analyzer'`  
**Solution:** Run `npm run build` first

**Error:** `Database connection failed`  
**Solution:** Check `.env` file has correct database credentials

### Analysis Fails

**Error:** `Workflow not found`  
**Solution:** Verify workflow ID exists in GHL account

**Error:** `Authentication failed`  
**Solution:** Check GHL token is valid and not expired

### Unexpected Score

**Issue:** Score doesn't match expected value  
**Debug:**
```javascript
// Check issue summary
console.log('Critical:', result.issuesSummary.critical * 25);
console.log('High:', result.issuesSummary.high * 15);
console.log('Medium:', result.issuesSummary.medium * 5);
console.log('Low:', result.issuesSummary.low * 2);
console.log('Total penalty:', 
  result.issuesSummary.critical * 25 +
  result.issuesSummary.high * 15 +
  result.issuesSummary.medium * 5 +
  result.issuesSummary.low * 2
);
```

---

## 📚 Additional Resources

- **Full Documentation:** `WORKFLOW_ANALYZER_DOCS.md`
- **Test Report:** `ANALYZER_TEST_REPORT.md`
- **Deployment Summary:** `DEPLOYMENT_COMPLETE.md`
- **Test Workflows:** `test-workflows.json`
- **API Reference:** `API_REFERENCE.md`

---

## ✅ Pre-flight Checklist

Before testing with real GHL workflows:

- [x] Backend built successfully (`npm run build`)
- [x] All tests pass (`node run-all-tests.js`)
- [x] Server starts without errors
- [ ] GHL access token obtained
- [ ] Test with at least 3 real workflows
- [ ] Verify scores match expectations
- [ ] Check recommendations are relevant

---

## 🚀 Ready to Go!

The analyzer is fully functional. Run the tests, start the server, and begin analyzing workflows!

**Commands Summary:**
```bash
# Build
npm run build

# Test
node run-all-tests.js

# Start server
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/api/workflows/WORKFLOW_ID/analyze \
  -H "Authorization: Bearer TOKEN"
```

**Happy analyzing! 🎉**
