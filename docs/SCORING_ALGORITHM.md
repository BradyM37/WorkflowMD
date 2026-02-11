# Workflow Health Scoring Algorithm v2.0

**Last Updated:** February 10, 2026  
**Author:** Smith (Backend Engineer)  
**Purpose:** Transparent documentation of the workflow analysis and scoring system

---

## Overview

The GHL Workflow Debugger analyzes workflows and assigns a **Health Score** from 0-100 (higher = better). This score reflects the workflow's reliability, maintainability, and risk of failure in production.

### Key Principles

1. **Penalty-Based System:** Start at 100, subtract penalties for detected issues
2. **Severity-Weighted:** Critical issues have much larger impact than low-priority ones
3. **Context-Aware:** Active workflows and high-contact workflows get stricter scoring
4. **Transparent:** All penalties are clearly documented and justified

---

## Health Score Calculation

```
Health Score = 100 - (Total Penalties × Severity Multiplier)
Minimum Score = 0
```

### Grade Thresholds

| Score Range | Grade | Color | Meaning |
|-------------|-------|-------|---------|
| 90-100 | Excellent | Green | Production-ready, minimal risk |
| 70-89 | Good | Blue | Generally solid, minor improvements possible |
| 50-69 | Needs Attention | Yellow | Has issues that should be addressed |
| 30-49 | High Risk | Orange | Significant problems, may fail in production |
| 0-29 | Critical | Red | Will likely fail, DO NOT activate |

---

## Issue Penalties

### Critical Issues (-30 to -40 points)

These issues **will definitely cause workflow failures** in production.

| Issue | Penalty | Why This Matters |
|-------|---------|-----------------|
| **Infinite Loop** | -40 | Workflow will run forever, consuming resources and never completing |
| **Payment Without Retry** | -35 | Failed payments = lost revenue, no second chance |
| **Missing Required Field** | -30 | Email without recipient, SMS without phone = immediate failure |
| **Broken Webhook URL** | -30 | localhost URLs or invalid endpoints won't work in production |

**Real-World Impact:** These issues will break the workflow for 100% of contacts.

---

### High Severity Issues (-15 to -25 points)

These issues **will likely cause failures** under normal conditions.

| Issue | Penalty | Why This Matters |
|-------|---------|-----------------|
| **Trigger Conflict** | -25 | Multiple triggers firing simultaneously can cause race conditions and data corruption |
| **API Call Without Error Handling** | -20 | External APIs fail ~5-10% of the time; unhandled failures break the workflow |
| **Rate Limit Risk** | -15 | Bulk operations without throttling hit API limits and fail mid-execution |
| **Webhook Without Timeout** | -15 | Slow/hanging external services can stall workflow indefinitely |

**Real-World Impact:** These issues will affect 5-50% of workflow executions depending on external factors.

---

### Medium Severity Issues (-8 to -15 points)

These issues **may cause failures** or reduce workflow quality.

| Issue | Penalty | Why This Matters |
|-------|---------|-----------------|
| **Missing Contact Field Validation** | -15 | Sending to invalid/empty email/phone wastes resources and damages sender reputation |
| **Excessive Wait Time (>7 days)** | -12 | Long waits risk workflow expiration and complicate debugging |
| **Dead Branch** | -10 | Unreachable nodes waste development time and confuse maintainers |
| **No Wait After API Call** | -10 | Race conditions when next action depends on API result |
| **High Complexity** | -10 | Too many branches (>20) make workflow hard to maintain and debug |
| **Duplicate Action** | -8 | Wastes execution time and resources |

**Real-World Impact:** These issues reduce reliability, increase costs, or make workflows harder to maintain.

---

### Low Severity Issues (-3 to -5 points)

These issues **don't cause failures** but affect code quality and maintainability.

| Issue | Penalty | Why This Matters |
|-------|---------|-----------------|
| **Deprecated Action** | -5 | Future compatibility risk; may stop working in future GHL updates |
| **Unused Variable** | -4 | Clutters workflow and wastes memory |
| **Missing Description** | -3 | Makes workflow harder to understand for team members |

**Real-World Impact:** Quality-of-life issues that don't break functionality but make workflows harder to work with.

---

## Severity Multipliers

Penalties are adjusted based on workflow context:

### High Contact Volume (1000+ contacts)

**Multiplier:** 1.5×

**Rationale:** Issues that affect 1% of contacts become critical at scale:
- 1% failure rate on 100 contacts = 1 failed contact (annoying)
- 1% failure rate on 10,000 contacts = 100 failed contacts (business-impacting)

**Example:**
```
Base penalty: API without error handling = -20
High-volume multiplier: -20 × 1.5 = -30 points
```

### Active/Published Workflow

**Multiplier:** 1.3×

**Rationale:** Draft workflows can have issues; active workflows are affecting real customers.

**Example:**
```
Base penalty: Trigger conflict = -25
Active multiplier: -25 × 1.3 = -32.5 points
```

### Combined Multipliers

Multipliers **stack** for active, high-volume workflows:

```
Base penalty: Infinite loop = -40
High-volume (1.5×) + Active (1.3×) = 1.95× total
Final penalty: -40 × 1.95 = -78 points

Health Score: 100 - 78 = 22 (CRITICAL)
```

---

## Detection Signals

### What We Check

#### 1. **API Call Error Handling**
```typescript
// Detects: webhook, api, http_request, integration actions
// Checks for: errorHandling config, onError callback, or fallbackActionId
```

**Why:** External APIs fail frequently (network issues, rate limits, server downtime). Without error handling, failures cascade through the workflow.

#### 2. **Contact Field Validation**
```typescript
// Detects: email/SMS using {{contact.field}} merge tags
// Checks for: validateEmail/validatePhone flags or pre-conditions
```

**Why:** Contact data is messy. Empty/invalid fields cause send failures and damage sender reputation.

#### 3. **Webhook Timeout Configuration**
```typescript
// Detects: webhook, http_request actions
// Checks for: timeout config (should be 10-60 seconds)
```

**Why:** External services can be slow or hang. Without timeouts, workflows stall indefinitely.

#### 4. **Excessive Wait Times**
```typescript
// Detects: delay/wait actions
// Threshold: >7 days (604,800 seconds)
```

**Why:** Long waits risk workflow expiration, make debugging harder, and tie up system resources.

#### 5. **Workflow Complexity**
```typescript
// Calculates: Cyclomatic complexity (branches)
// Threshold: >20 branches = high complexity
```

**Why:** Complex workflows are exponentially harder to debug, test, and maintain.

#### 6. **Infinite Loops**
```typescript
// Algorithm: DFS with recursion stack
// Checks for: cycles without exit conditions
```

**Why:** Infinite loops consume resources forever and never complete.

#### 7. **Trigger Conflicts**
```typescript
// Checks for: multiple triggers that can fire simultaneously
// Examples: "contact_tag_added" + "contact_updated"
```

**Why:** Race conditions and duplicate executions cause data corruption.

#### 8. **Dead Branches**
```typescript
// Algorithm: BFS from trigger nodes to find unreachable nodes
```

**Why:** Dead code wastes development time and confuses team members.

---

## Confidence Indicator

The confidence score reflects **how much of the workflow we could analyze**.

### Calculation

```typescript
Confidence = (Analyzed Nodes / Total Nodes) × 100
```

### Thresholds

| Confidence | Coverage | Meaning |
|------------|----------|---------|
| **High** | ≥80% of nodes + ≥5 nodes | We analyzed most of the workflow; score is reliable |
| **Medium** | 50-80% of nodes OR <5 nodes | Partial analysis; score is reasonably accurate |
| **Low** | <50% of nodes | Limited analysis; score may not reflect all issues |

### What Affects Confidence?

- **Unrecognized node types:** Custom/proprietary GHL actions we haven't seen before
- **Malformed workflow data:** Missing required fields that prevent parsing
- **API limitations:** Incomplete workflow data from GHL API

### How to Interpret

- **High Confidence:** Trust the score and act on recommendations
- **Medium Confidence:** Score is directionally correct but may miss some issues
- **Low Confidence:** Use score as a rough estimate; manual review recommended

---

## Example Scoring Scenarios

### Scenario 1: Simple Email Workflow (Draft)

**Workflow:**
- Trigger: Contact tag added
- Action: Send email with merge fields
- Action: Add tag

**Issues:**
- Email without contact validation (-15)

**Penalties:**
- Base: -15
- Multiplier: 1.0 (draft, low volume)
- **Total: -15**

**Score: 85 (Good)**  
**Grade:** Good  
**Confidence:** High

---

### Scenario 2: Active Sales Workflow (5000 contacts)

**Workflow:**
- Trigger: Form submitted
- Action: Webhook to Zapier (no timeout, no error handling)
- Action: Send email
- Delay: 30 days
- Action: Send follow-up SMS

**Issues:**
- Webhook without timeout (-15)
- Webhook without error handling (-20)
- Excessive wait time (-12)
- SMS without phone validation (-15)

**Penalties:**
- Base: -62
- Multiplier: 1.5 (high volume) × 1.3 (active) = 1.95
- **Total: -120.9 → capped at -100**

**Score: 0 (Critical)**  
**Grade:** Critical  
**Confidence:** High

**Recommendations:**
- ⚠️ This workflow is ACTIVE - prioritize fixes immediately
- Add error handling for webhook calls
- Configure webhook timeout (30 seconds recommended)
- Validate phone numbers before sending SMS
- Consider splitting long wait into separate workflow

---

### Scenario 3: Complex Automation (Active, 500 contacts)

**Workflow:**
- 3 triggers (conflict detected)
- 45 nodes, 25 branches
- Loop with exit condition
- Multiple API calls without error handling

**Issues:**
- Trigger conflict (-25)
- Loop with exit condition (-15)
- High complexity (-10)
- 3× API without error handling (-20 each = -60)
- No wait after API calls (-10 × 3 = -30)

**Penalties:**
- Base: -140
- Multiplier: 1.3 (active)
- **Total: -182 → capped at -100**

**Score: 0 (Critical)**  
**Grade:** Critical  
**Confidence:** High

**Recommendations:**
- Fix trigger conflicts before activating
- Add comprehensive error handling
- Add delays after API calls
- Consider breaking into smaller workflows

---

## Algorithm Validation

### Test Cases

We validate the algorithm against real-world workflows:

1. **Known-Good Workflows:** Should score ≥85
2. **Known-Broken Workflows:** Should score ≤30
3. **Edge Cases:** Malformed data, empty workflows, circular references

### Continuous Improvement

We track:
- **False Positives:** Issues flagged that weren't actual problems
- **False Negatives:** Real issues we missed
- **User Feedback:** Manual overrides and corrections

Algorithm weights are adjusted quarterly based on production data.

---

## API Response Format

```json
{
  "workflowId": "wf_123",
  "workflowName": "Sales Follow-up",
  "healthScore": 72,
  "grade": "Good",
  "confidence": "High",
  "issues": [
    {
      "type": "medium",
      "title": "Email sent without contact field validation",
      "description": "Could send to invalid/empty email addresses",
      "actionId": "action_456",
      "fix": "Add condition to check email field is not empty and valid",
      "penalty": 15
    }
  ],
  "recommendations": [
    "Validate contact fields before sending emails/SMS to avoid failures"
  ],
  "metadata": {
    "isActive": true,
    "contactCount": 500,
    "severityMultiplier": 1.3,
    "analyzedNodes": 12,
    "totalNodes": 12
  }
}
```

---

## FAQ

### Why did my score drop after making the workflow active?

Active workflows have a 1.3× severity multiplier because they affect real customers. Issues that were minor in draft become more serious in production.

### Why do high-volume workflows get penalized more?

Issues that affect 1% of contacts become critical at scale. A minor bug on 10,000 contacts = 100 failed contacts.

### Can I override the score?

No, but you can dispute individual issues. If our algorithm flagged something incorrectly, report it and we'll refine the detection logic.

### What if my confidence is Low?

Low confidence means we couldn't analyze large portions of your workflow (usually due to custom/unrecognized actions). The score is a rough estimate; consider manual review.

### Why doesn't the algorithm catch [specific issue]?

We're constantly improving detection. If you found an issue we missed, please report it! We'll add detection logic in the next update.

---

## Changelog

### v2.0 (February 10, 2026)
- ✅ Refined penalty weights based on real-world impact
- ✅ Added severity multipliers for active workflows and high-volume contacts
- ✅ Added confidence indicator (High/Medium/Low)
- ✅ New detection signals:
  - API calls without error handling
  - Email/SMS without contact validation
  - Webhook calls without timeout
  - Excessive wait times (>7 days)
  - Complexity scoring (branch counting)
  - Dead branch detection

### v1.0 (Initial Release)
- Basic loop detection
- Trigger conflict detection
- Missing field validation
- Simple penalty system

---

## Contact

Questions or feedback about the scoring algorithm?

- **Smith (Backend Engineer)** - Responsible for analysis engine
- **Archie (Architect)** - For system design questions
- **Scout (Product Lead)** - For feature requests

---

**Remember:** The goal of this algorithm is to **prevent workflow failures**, not to achieve a perfect score. A score of 70+ ("Good") is production-ready for most use cases. Focus on fixing Critical and High-severity issues first.
