# Scoring Algorithm - Technical Reference

**Quick reference for developers working on the analysis engine.**

---

## Penalty Constants

Located in `src/lib/analysis-engine.ts`:

```typescript
const ISSUE_PENALTIES = {
  // Critical (-30 to -40)
  infinite_loop: 40,
  missing_required_field: 30,
  broken_webhook_url: 30,
  payment_no_retry: 35,
  
  // High (-15 to -25)
  trigger_conflict: 25,
  api_no_error_handling: 20,
  rate_limit_risk: 15,
  webhook_no_timeout: 15,
  
  // Medium (-8 to -15)
  contact_field_validation: 15,
  no_wait_after_api: 10,
  dead_branch: 10,
  duplicate_action: 8,
  excessive_wait_time: 12,
  high_complexity: 10,
  
  // Low (-3 to -5)
  missing_description: 3,
  deprecated_action: 5,
  unused_variable: 4
};
```

---

## Severity Multipliers

```typescript
function calculateSeverityMultiplier(metadata: any): number {
  let multiplier = 1.0;
  
  // High-contact workflows: 1.5x
  if (metadata.contactCount >= 1000) {
    multiplier *= 1.5;
  }
  
  // Active workflows: 1.3x
  if (metadata.isActive) {
    multiplier *= 1.3;
  }
  
  return multiplier;
}
```

**Max multiplier:** 1.5 × 1.3 = **1.95×**

---

## Confidence Calculation

```typescript
function calculateConfidence(metadata: any, structure: any): 'High' | 'Medium' | 'Low' {
  const coverageRatio = metadata.analyzedNodes / metadata.totalNodes;
  
  if (coverageRatio >= 0.8 && metadata.totalNodes >= 5) {
    return 'High';
  }
  
  if (coverageRatio >= 0.5 || metadata.totalNodes < 5) {
    return 'Medium';
  }
  
  return 'Low';
}
```

---

## Detection Functions

### New in v2.0

| Function | Purpose | Issues Detected |
|----------|---------|-----------------|
| `checkApiErrorHandling()` | Check external API calls | `api_no_error_handling` (-20) |
| `checkContactValidation()` | Validate email/SMS fields | `contact_field_validation` (-15) |
| `checkWebhookTimeouts()` | Check timeout configs | `webhook_no_timeout` (-15) |
| `checkExcessiveWaitTimes()` | Check for >7 day waits | `excessive_wait_time` (-12) |
| `checkComplexity()` | Count branches | `high_complexity` (-10) |
| `detectDeadBranches()` | Find unreachable nodes | `dead_branch` (-10) |

### Existing Functions

| Function | Purpose |
|----------|---------|
| `checkCriticalIssues()` | Missing fields, broken URLs |
| `checkGraphIssues()` | Loops, cycles, trigger conflicts |
| `checkHighPriorityIssues()` | Rate limits, bulk operations |
| `checkMediumPriorityIssues()` | Ordering, duplicates, unused vars |
| `checkLowPriorityIssues()` | Descriptions, deprecated actions |

---

## Health Score Formula

```typescript
healthScore = Math.max(0, 100 - totalPenalties);

totalPenalties = Σ(issue.penalty × severityMultiplier)
```

**Grade Thresholds:**
- 90+ = Excellent
- 70-89 = Good
- 50-69 = Needs Attention
- 30-49 = High Risk
- 0-29 = Critical

---

## Testing Scenarios

### Unit Tests Needed

```typescript
describe('Scoring Algorithm', () => {
  test('infinite loop in active workflow = critical score', () => {
    // -40 base × 1.3 active = -52
    expect(score).toBeLessThan(50);
  });
  
  test('high-volume workflow multiplier applies correctly', () => {
    // contactCount: 5000
    // multiplier should be 1.5
  });
  
  test('confidence is low when <50% nodes analyzed', () => {
    // analyzedNodes: 5, totalNodes: 12
    expect(confidence).toBe('Low');
  });
});
```

### Integration Test Cases

1. **Perfect workflow:** Should score 95-100
2. **Infinite loop:** Should score <30 (Critical)
3. **Active + High-volume + API issues:** Should apply 1.95× multiplier
4. **Malformed data:** Should handle gracefully, return Low confidence

---

## Performance Considerations

### Time Complexity

- **Loop Detection (DFS):** O(V + E) where V = nodes, E = edges
- **Dead Branch Detection (BFS):** O(V + E)
- **Topological Sort:** O(V + E)
- **Issue Checks:** O(N) where N = actions

**Total:** O(V + E + N) - typically <100ms for workflows with <100 nodes

### Memory Usage

- Adjacency list: O(V + E)
- Visited sets: O(V)
- Issue array: O(number of issues)

**Peak:** ~1-2 MB per analysis

---

## Debugging Tips

### Add Logging

```typescript
console.log('[SCORING] Base penalties:', basePenalties);
console.log('[SCORING] Multiplier:', multiplier);
console.log('[SCORING] Final score:', healthScore);
```

### Test Individual Issues

```typescript
const testWorkflow = {
  id: 'test',
  actions: [
    { type: 'webhook', config: { url: 'http://api.example.com' } } // missing timeout & error handling
  ]
};

const result = analyzeWorkflow(testWorkflow);
console.log(result.issues);
```

### Validate Detection Logic

```typescript
// Should detect: api_no_error_handling (-20)
const apiAction = { type: 'webhook', config: {} };
const issues = checkApiErrorHandling({ actions: [apiAction] });
expect(issues.length).toBe(1);
expect(issues[0].penalty).toBe(20);
```

---

## Adding New Detection Signals

### Step 1: Define Penalty

```typescript
const ISSUE_PENALTIES = {
  // ... existing
  my_new_issue: 12, // medium severity
};
```

### Step 2: Create Detection Function

```typescript
function checkMyNewIssue(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    if (/* condition to detect issue */) {
      issues.push({
        type: 'medium', // or 'critical', 'high', 'low'
        title: 'Human-readable title',
        description: 'What the problem is',
        actionId: action.id,
        fix: 'How to fix it',
        penalty: ISSUE_PENALTIES.my_new_issue
      });
    }
  });
  
  return issues;
}
```

### Step 3: Call in analyzeWorkflow()

```typescript
export function analyzeWorkflow(workflow: any): AnalysisResult {
  // ... existing checks
  issues.push(...checkMyNewIssue(workflow));
  // ...
}
```

### Step 4: Add Tests

```typescript
describe('checkMyNewIssue', () => {
  test('detects the new issue', () => {
    const workflow = { /* test data */ };
    const issues = checkMyNewIssue(workflow);
    expect(issues.length).toBe(1);
  });
});
```

### Step 5: Update Documentation

Add to `docs/SCORING_ALGORITHM.md`:
- Penalty amount and severity tier
- Why it matters (real-world impact)
- Detection logic explanation

---

## API Response Schema

```typescript
interface AnalysisResult {
  workflowId: string;
  workflowName: string;
  healthScore: number; // 0-100
  grade: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical';
  confidence: 'High' | 'Medium' | 'Low'; // NEW in v2.0
  issues: WorkflowIssue[];
  timestamp: Date;
  recommendations?: string[];
  performance?: {...};
  metadata?: { // NEW in v2.0
    isActive: boolean;
    contactCount: number;
    severityMultiplier: number;
    analyzedNodes: number;
    totalNodes: number;
  };
}
```

---

## Changelog

### v2.0 (2026-02-10)
- Added `confidence` indicator
- Added `metadata` object with multiplier info
- New detection functions for v2.0 requirements
- Enhanced penalty weights

### v1.0
- Initial implementation

---

## See Also

- `docs/SCORING_ALGORITHM.md` - Full user-facing documentation
- `src/lib/loop-detector.ts` - Graph analysis algorithms
- `src/lib/workflow-parser.ts` - Workflow parsing logic
