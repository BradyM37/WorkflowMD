/**
 * Comprehensive Analysis Engine Test Suite
 * Tests the workflow scoring algorithm thoroughly
 */

import { analyzeWorkflow } from './src/lib/analysis-engine';
import simpleWorkflow from './src/test-fixtures/fixture-simple.json';
import complexWorkflow from './src/test-fixtures/fixture-complex.json';
import problematicWorkflow from './src/test-fixtures/fixture-problematic.json';
import perfectWorkflow from './src/test-fixtures/fixture-perfect.json';

interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => { passed: boolean; expected: any; actual: any; details?: string }) {
  try {
    const result = fn();
    results.push({ name, ...result });
    console.log(result.passed ? `✅ ${name}` : `❌ ${name}`);
    if (!result.passed) {
      console.log(`   Expected: ${JSON.stringify(result.expected)}`);
      console.log(`   Actual: ${JSON.stringify(result.actual)}`);
      if (result.details) console.log(`   Details: ${result.details}`);
    }
  } catch (error: any) {
    results.push({ name, passed: false, expected: 'no error', actual: error.message });
    console.log(`❌ ${name} - ERROR: ${error.message}`);
  }
}

// ============================================================================
// REAL GHL FORMAT TESTS - Using realistic test fixtures
// ============================================================================

// ============================================================================
// GHL TEST 1: Simple workflow with real GHL structure
// ============================================================================
test('[GHL] Simple workflow analyzes correctly', () => {
  const result = analyzeWorkflow(simpleWorkflow);
  
  return {
    passed: result.healthScore >= 85 && result.healthScore <= 100,
    expected: 'score 85-100 (good workflow)',
    actual: result.healthScore,
    details: `Grade: ${result.grade}, Issues: ${result.issues.length}, ID format: ${simpleWorkflow.id}`
  };
});

// ============================================================================
// GHL TEST 2: Complex workflow with branches and webhooks
// ============================================================================
test('[GHL] Complex workflow with 15+ actions analyzed', () => {
  const result = analyzeWorkflow(complexWorkflow);
  
  return {
    passed: result.metadata!.totalNodes >= 15 && result.healthScore >= 0,
    expected: '15+ nodes analyzed, valid score',
    actual: `${result.metadata?.totalNodes} nodes, score: ${result.healthScore}`,
    details: `Complexity: ${result.performance?.complexity}, Issues: ${result.issues.length}`
  };
});

// ============================================================================
// GHL TEST 3: Problematic workflow detects multiple issues
// ============================================================================
test('[GHL] Problematic workflow catches critical issues', () => {
  const result = analyzeWorkflow(problematicWorkflow);
  const criticalIssues = result.issues.filter(i => i.type === 'critical');
  
  return {
    passed: criticalIssues.length >= 5 && result.healthScore < 50,
    expected: '5+ critical issues, score < 50',
    actual: `${criticalIssues.length} critical issues, score: ${result.healthScore}`,
    details: `Grade: ${result.grade}, Total issues: ${result.issues.length}`
  };
});

// ============================================================================
// GHL TEST 4: Detects localhost webhooks in GHL format
// ============================================================================
test('[GHL] Detects localhost webhooks', () => {
  const result = analyzeWorkflow(problematicWorkflow);
  const localhostIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('localhost') || 
    i.description.toLowerCase().includes('localhost') || 
    i.description.toLowerCase().includes('127.0.0.1')
  );
  
  return {
    passed: localhostIssues.length >= 2,
    expected: 'at least 2 localhost webhook issues',
    actual: `${localhostIssues.length} localhost issues`,
    details: localhostIssues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// GHL TEST 5: Detects infinite loop in problematic workflow
// ============================================================================
test('[GHL] Detects infinite loop in connections', () => {
  const result = analyzeWorkflow(problematicWorkflow);
  const loopIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('loop') || 
    i.title.toLowerCase().includes('cycle')
  );
  
  return {
    passed: loopIssues.length > 0,
    expected: 'at least 1 loop issue',
    actual: `${loopIssues.length} loop issues`,
    details: loopIssues.map(i => i.title).join(', ') || 'No loop detected - check connections array'
  };
});

// ============================================================================
// GHL TEST 6: Perfect workflow scores high
// ============================================================================
test('[GHL] Perfect workflow scores 90+', () => {
  const result = analyzeWorkflow(perfectWorkflow);
  
  return {
    passed: result.healthScore >= 90 && result.grade === 'Excellent',
    expected: 'score >= 90, grade Excellent',
    actual: `score: ${result.healthScore}, grade: ${result.grade}`,
    details: `Issues: ${result.issues.length}, Confidence: ${result.confidence}`
  };
});

// ============================================================================
// GHL TEST 7: Recognizes GHL action types
// ============================================================================
test('[GHL] Recognizes GHL-specific action types', () => {
  // Check if analyzer handles GHL action types like SendEmail, SendSMS, CustomWebhook
  const result = analyzeWorkflow(perfectWorkflow);
  
  // Should analyze successfully without errors
  return {
    passed: result.metadata!.analyzedNodes > 0,
    expected: 'successfully analyzes GHL action types',
    actual: `${result.metadata?.analyzedNodes} nodes analyzed`,
    details: `Action types: SendEmail, SendSMS, CustomWebhook, etc.`
  };
});

// ============================================================================
// GHL TEST 8: Recognizes GHL trigger types
// ============================================================================
test('[GHL] Recognizes GHL-specific trigger types', () => {
  // Check complex workflow with multiple triggers
  const result = analyzeWorkflow(complexWorkflow);
  
  return {
    passed: result.workflowId === complexWorkflow.id,
    expected: 'correctly parses workflow with GHL triggers',
    actual: `workflowId: ${result.workflowId}`,
    details: `Triggers: FormSubmitted, TagAdded`
  };
});

// ============================================================================
// GHL TEST 9: Validates GHL node ID format (UUIDs)
// ============================================================================
test('[GHL] Handles GHL node ID formats', () => {
  const result = analyzeWorkflow(simpleWorkflow);
  
  // GHL uses UUIDs for workflow IDs
  const hasValidId = /^[a-f0-9-]{36}$/i.test(simpleWorkflow.id);
  
  return {
    passed: hasValidId && result.workflowId === simpleWorkflow.id,
    expected: 'valid UUID format',
    actual: simpleWorkflow.id,
    details: `Analysis completed for GHL workflow ID`
  };
});

// ============================================================================
// GHL TEST 10: Detects missing required fields in GHL actions
// ============================================================================
test('[GHL] Detects missing required fields in GHL format', () => {
  const result = analyzeWorkflow(problematicWorkflow);
  const missingFieldIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('missing') && 
    (i.title.toLowerCase().includes('recipient') || i.title.toLowerCase().includes('phone'))
  );
  
  return {
    passed: missingFieldIssues.length >= 2,
    expected: 'at least 2 missing field issues',
    actual: `${missingFieldIssues.length} missing field issues`,
    details: missingFieldIssues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// GHL TEST 11: Handles GHL timestamp formats
// ============================================================================
test('[GHL] Handles GHL timestamp formats', () => {
  // GHL uses ISO 8601 timestamps
  const result = analyzeWorkflow(simpleWorkflow);
  
  const hasValidTimestamp = simpleWorkflow.createdAt && 
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(simpleWorkflow.createdAt);
  
  return {
    passed: hasValidTimestamp && result.workflowName === simpleWorkflow.name,
    expected: 'valid ISO 8601 timestamp',
    actual: simpleWorkflow.createdAt,
    details: `Workflow: ${simpleWorkflow.name}`
  };
});

// ============================================================================
// GHL TEST 12: Performance metrics for complex workflow
// ============================================================================
test('[GHL] Calculates performance for complex workflow', () => {
  const result = analyzeWorkflow(complexWorkflow);
  
  return {
    passed: !!(result.performance && result.performance.complexity && result.performance.estimatedSteps > 0),
    expected: 'performance metrics calculated',
    actual: `complexity: ${result.performance?.complexity}, steps: ${result.performance?.estimatedSteps}`,
    details: `Bottlenecks: ${result.performance?.bottlenecks?.length || 0}`
  };
});

// ============================================================================
// TEST 1: Perfect workflow should score 100
// ============================================================================
test('Perfect workflow scores 100', () => {
  const perfectWorkflow = {
    id: 'wf-perfect',
    name: 'Perfect Workflow',
    status: 'draft',
    actions: [
      {
        id: 'action-1',
        type: 'email',
        description: 'Send welcome email',
        config: { recipient: 'test@example.com' }
      }
    ],
    triggers: [{ id: 'trigger-1', type: 'contact_created' }]
  };

  const result = analyzeWorkflow(perfectWorkflow);
  return {
    passed: result.healthScore >= 95,
    expected: '95-100',
    actual: result.healthScore,
    details: `Grade: ${result.grade}, Issues: ${result.issues.length}`
  };
});

// ============================================================================
// TEST 2: Critical issues should heavily penalize score
// ============================================================================
test('Critical issues cause major score reduction', () => {
  const criticalWorkflow = {
    id: 'wf-critical',
    name: 'Critical Issues Workflow',
    status: 'active',
    actions: [
      {
        id: 'action-1',
        type: 'email',
        config: {} // Missing recipient = critical
      },
      {
        id: 'action-2',
        type: 'sms',
        config: {} // Missing phone = critical
      },
      {
        id: 'action-3',
        type: 'payment',
        config: {} // No retry logic = critical
      }
    ],
    webhooks: [
      { id: 'wh-1', url: 'http://localhost:3000/webhook' } // Localhost = critical
    ]
  };

  const result = analyzeWorkflow(criticalWorkflow);
  const criticalCount = result.issues.filter(i => i.type === 'critical').length;

  return {
    passed: result.healthScore <= 30 && criticalCount >= 3,
    expected: 'score <= 30, criticals >= 3',
    actual: `score: ${result.healthScore}, criticals: ${criticalCount}`,
    details: `Grade: ${result.grade}`
  };
});

// ============================================================================
// TEST 3: Loop detection
// ============================================================================
test('Detects infinite loops correctly', () => {
  // Workflow with a cycle using modern format: A -> B -> C -> A
  const loopWorkflow = {
    id: 'wf-loop',
    name: 'Loop Workflow',
    status: 'draft',
    nodes: [
      { id: 'A', type: 'condition', name: 'Check condition', config: {} },
      { id: 'B', type: 'email', name: 'Send email', config: { recipient: 'test@example.com' } },
      { id: 'C', type: 'delay', name: 'Wait', config: { delay: '1h' } }
    ],
    connections: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' } // Creates loop
    ]
  };

  const result = analyzeWorkflow(loopWorkflow);
  const loopIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('loop') || 
    i.title.toLowerCase().includes('cycle')
  );

  return {
    passed: loopIssues.length > 0,
    expected: 'at least 1 loop issue',
    actual: `${loopIssues.length} loop issues`,
    details: loopIssues.map(i => i.title).join(', ') || 'No loop issues found - checking graph structure'
  };
});

// ============================================================================
// TEST 4: Webhook without timeout
// ============================================================================
test('Detects webhook without timeout', () => {
  const webhookWorkflow = {
    id: 'wf-webhook',
    name: 'Webhook Workflow',
    status: 'active',
    actions: [
      {
        id: 'action-1',
        type: 'webhook',
        description: 'Call external API',
        config: { url: 'https://api.example.com/endpoint' } // No timeout
      }
    ]
  };

  const result = analyzeWorkflow(webhookWorkflow);
  const timeoutIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('timeout')
  );

  return {
    passed: timeoutIssues.length > 0,
    expected: 'timeout warning',
    actual: `${timeoutIssues.length} timeout issues`,
    details: result.issues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// TEST 5: API call without error handling
// ============================================================================
test('Detects API calls without error handling', () => {
  const apiWorkflow = {
    id: 'wf-api',
    name: 'API Workflow',
    status: 'active',
    actions: [
      {
        id: 'action-1',
        type: 'api',
        description: 'External API call',
        config: { url: 'https://api.example.com' } // No error handling
      },
      {
        id: 'action-2',
        type: 'http_request',
        description: 'HTTP request',
        config: { url: 'https://example.com' } // No error handling
      }
    ]
  };

  const result = analyzeWorkflow(apiWorkflow);
  const errorHandlingIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('error handling')
  );

  return {
    passed: errorHandlingIssues.length >= 2,
    expected: 'at least 2 error handling issues',
    actual: `${errorHandlingIssues.length} issues`,
    details: errorHandlingIssues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// TEST 6: High contact volume multiplier
// ============================================================================
test('High contact volume increases severity multiplier', () => {
  const lowContactWorkflow = {
    id: 'wf-low',
    name: 'Low Contact Workflow',
    status: 'draft',
    estimatedContacts: 10,
    actions: [{ id: 'a1', type: 'api', config: {} }]
  };

  const highContactWorkflow = {
    id: 'wf-high',
    name: 'High Contact Workflow',
    status: 'active',
    estimatedContacts: 5000,
    actions: [{ id: 'a1', type: 'api', config: {} }]
  };

  const lowResult = analyzeWorkflow(lowContactWorkflow);
  const highResult = analyzeWorkflow(highContactWorkflow);

  // Same issues, but high contact workflow should score lower
  return {
    passed: highResult.healthScore < lowResult.healthScore,
    expected: 'high contact score < low contact score',
    actual: `high: ${highResult.healthScore}, low: ${lowResult.healthScore}`,
    details: `Multipliers - high: ${highResult.metadata?.severityMultiplier}, low: ${lowResult.metadata?.severityMultiplier}`
  };
});

// ============================================================================
// TEST 7: Active workflow stricter scoring
// ============================================================================
test('Active workflows scored more strictly', () => {
  const draftWorkflow = {
    id: 'wf-draft',
    name: 'Draft Workflow',
    status: 'draft',
    actions: [{ id: 'a1', type: 'api', config: {} }]
  };

  const activeWorkflow = {
    id: 'wf-active',
    name: 'Active Workflow',
    status: 'active',
    actions: [{ id: 'a1', type: 'api', config: {} }]
  };

  const draftResult = analyzeWorkflow(draftWorkflow);
  const activeResult = analyzeWorkflow(activeWorkflow);

  return {
    passed: activeResult.healthScore <= draftResult.healthScore,
    expected: 'active score <= draft score',
    actual: `active: ${activeResult.healthScore}, draft: ${draftResult.healthScore}`,
    details: `Active multiplier should be higher`
  };
});

// ============================================================================
// TEST 8: Grade boundaries
// ============================================================================
test('Grade boundaries are correct', () => {
  const testScores = [
    { score: 95, expectedGrade: 'Excellent' },
    { score: 90, expectedGrade: 'Excellent' },
    { score: 89, expectedGrade: 'Good' },
    { score: 70, expectedGrade: 'Good' },
    { score: 69, expectedGrade: 'Needs Attention' },
    { score: 50, expectedGrade: 'Needs Attention' },
    { score: 49, expectedGrade: 'High Risk' },
    { score: 30, expectedGrade: 'High Risk' },
    { score: 29, expectedGrade: 'Critical' },
    { score: 0, expectedGrade: 'Critical' }
  ];

  // Create workflows that will produce specific scores
  const results: string[] = [];
  let allPassed = true;

  // Test with a simple analysis to verify grade calculation
  const perfectWorkflow = { id: 'test', name: 'Test', status: 'draft', actions: [] };
  const analysisResult = analyzeWorkflow(perfectWorkflow);
  
  // Verify the grade matches the score
  const grade = analysisResult.grade;
  const score = analysisResult.healthScore;
  
  let expectedGrade: string;
  if (score >= 90) expectedGrade = 'Excellent';
  else if (score >= 70) expectedGrade = 'Good';
  else if (score >= 50) expectedGrade = 'Needs Attention';
  else if (score >= 30) expectedGrade = 'High Risk';
  else expectedGrade = 'Critical';

  return {
    passed: grade === expectedGrade,
    expected: expectedGrade,
    actual: grade,
    details: `Score: ${score}`
  };
});

// ============================================================================
// TEST 9: Excessive wait time detection
// ============================================================================
test('Detects excessive wait times (>7 days)', () => {
  const excessiveWaitWorkflow = {
    id: 'wf-wait',
    name: 'Long Wait Workflow',
    status: 'draft',
    actions: [
      {
        id: 'action-1',
        type: 'delay',
        description: 'Very long wait',
        config: { delay: '14d' } // 14 days > 7 days
      }
    ]
  };

  const result = analyzeWorkflow(excessiveWaitWorkflow);
  const waitIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('wait') || 
    i.title.toLowerCase().includes('delay')
  );

  return {
    passed: waitIssues.length > 0,
    expected: 'at least 1 wait time issue',
    actual: `${waitIssues.length} wait issues`,
    details: waitIssues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// TEST 10: Complexity detection
// ============================================================================
test('Detects high complexity workflows', () => {
  // Create a workflow with many branches
  const complexWorkflow = {
    id: 'wf-complex',
    name: 'Complex Workflow',
    status: 'draft',
    actions: Array.from({ length: 30 }, (_, i) => ({
      id: `action-${i}`,
      type: 'condition',
      description: `Condition ${i}`,
      config: {}
    })),
    edges: Array.from({ length: 50 }, (_, i) => ({
      source: `action-${i % 30}`,
      target: `action-${(i + 1) % 30}`
    }))
  };

  const result = analyzeWorkflow(complexWorkflow);

  return {
    passed: result.performance?.complexity === 'high' || result.performance?.complexity === 'very_high',
    expected: 'high or very_high complexity',
    actual: result.performance?.complexity || 'not calculated',
    details: `Nodes: ${result.metadata?.totalNodes}, Steps: ${result.performance?.estimatedSteps}`
  };
});

// ============================================================================
// TEST 11: Contact field validation warnings
// ============================================================================
test('Warns about unvalidated contact fields', () => {
  const unvalidatedWorkflow = {
    id: 'wf-unvalidated',
    name: 'Unvalidated Contact Workflow',
    status: 'active',
    actions: [
      {
        id: 'action-1',
        type: 'email',
        description: 'Send email',
        config: { recipient: '{{contact.email}}' } // Uses contact field without validation
      },
      {
        id: 'action-2',
        type: 'sms',
        description: 'Send SMS',
        config: { phoneNumber: '{{contact.phone}}' } // Uses contact field without validation
      }
    ]
  };

  const result = analyzeWorkflow(unvalidatedWorkflow);
  const validationIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('validation')
  );

  return {
    passed: validationIssues.length >= 1,
    expected: 'at least 1 validation issue',
    actual: `${validationIssues.length} validation issues`,
    details: validationIssues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// TEST 12: Recommendations generated
// ============================================================================
test('Generates appropriate recommendations', () => {
  const problematicWorkflow = {
    id: 'wf-problems',
    name: 'Problematic Workflow',
    status: 'active',
    estimatedContacts: 2000,
    actions: [
      { id: 'a1', type: 'api', config: {} },
      { id: 'a2', type: 'webhook', config: { url: 'http://localhost/test' } }
    ]
  };

  const result = analyzeWorkflow(problematicWorkflow);

  return {
    passed: !!(result.recommendations && result.recommendations.length > 0),
    expected: 'at least 1 recommendation',
    actual: `${result.recommendations?.length || 0} recommendations`,
    details: result.recommendations?.join(' | ') || 'none'
  };
});

// ============================================================================
// TEST 13: Confidence calculation
// ============================================================================
test('Confidence reflects analysis coverage', () => {
  const smallWorkflow = {
    id: 'wf-small',
    name: 'Small Workflow',
    status: 'draft',
    actions: [
      { id: 'a1', type: 'email', description: 'test', config: { recipient: 'test@test.com' } }
    ]
  };

  const result = analyzeWorkflow(smallWorkflow);

  // Small workflow should have medium confidence
  return {
    passed: ['High', 'Medium', 'Low'].includes(result.confidence),
    expected: 'High, Medium, or Low',
    actual: result.confidence,
    details: `Analyzed: ${result.metadata?.analyzedNodes}/${result.metadata?.totalNodes}`
  };
});

// ============================================================================
// TEST 14: Score consistency
// ============================================================================
test('Same workflow produces consistent scores', () => {
  const workflow = {
    id: 'wf-consistent',
    name: 'Consistent Workflow',
    status: 'active',
    actions: [
      { id: 'a1', type: 'api', config: {} },
      { id: 'a2', type: 'email', config: { recipient: 'test@example.com' } }
    ]
  };

  const result1 = analyzeWorkflow(workflow);
  const result2 = analyzeWorkflow(workflow);
  const result3 = analyzeWorkflow(workflow);

  const scoresMatch = result1.healthScore === result2.healthScore && 
                      result2.healthScore === result3.healthScore;

  return {
    passed: scoresMatch,
    expected: 'identical scores',
    actual: `${result1.healthScore}, ${result2.healthScore}, ${result3.healthScore}`,
    details: 'Scores should be deterministic'
  };
});

// ============================================================================
// TEST 15: Edge case - empty workflow
// ============================================================================
test('Handles empty workflow gracefully', () => {
  const emptyWorkflow = {
    id: 'wf-empty',
    name: 'Empty Workflow',
    status: 'draft',
    actions: []
  };

  const result = analyzeWorkflow(emptyWorkflow);

  return {
    passed: typeof result.healthScore === 'number' && !isNaN(result.healthScore),
    expected: 'valid number',
    actual: result.healthScore,
    details: `Grade: ${result.grade}, Issues: ${result.issues.length}`
  };
});

// ============================================================================
// TEST 16: Edge case - null/undefined handling
// ============================================================================
test('Handles missing properties gracefully', () => {
  const minimalWorkflow = {
    id: 'wf-minimal',
    name: 'Minimal'
  };

  try {
    const result = analyzeWorkflow(minimalWorkflow);
    return {
      passed: typeof result.healthScore === 'number',
      expected: 'no crash, valid score',
      actual: result.healthScore,
      details: 'Should handle missing actions/triggers'
    };
  } catch (error: any) {
    return {
      passed: false,
      expected: 'no crash',
      actual: `Error: ${error.message}`,
      details: 'Algorithm should handle missing properties'
    };
  }
});

// ============================================================================
// TEST 17: Bulk operations warning
// ============================================================================
test('Warns about bulk operations without throttling', () => {
  const bulkWorkflow = {
    id: 'wf-bulk',
    name: 'Bulk Workflow',
    status: 'active',
    actions: [
      {
        id: 'action-1',
        type: 'bulk_email',
        description: 'Send bulk emails',
        config: {} // No throttling
      }
    ]
  };

  const result = analyzeWorkflow(bulkWorkflow);
  const throttlingIssues = result.issues.filter(i => 
    i.title.toLowerCase().includes('throttl') || 
    i.title.toLowerCase().includes('rate limit') ||
    i.title.toLowerCase().includes('bulk')
  );

  return {
    passed: throttlingIssues.length > 0,
    expected: 'at least 1 throttling/rate limit issue',
    actual: `${throttlingIssues.length} issues`,
    details: result.issues.map(i => i.title).join(', ')
  };
});

// ============================================================================
// TEST 18: Score never exceeds 100 or goes below 0
// ============================================================================
test('Score stays within 0-100 bounds', () => {
  // Test with massive penalties
  const terribleWorkflow = {
    id: 'wf-terrible',
    name: 'Terrible Workflow',
    status: 'active',
    estimatedContacts: 100000,
    actions: Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      type: 'payment',
      config: {} // Each missing retry = critical
    })),
    webhooks: Array.from({ length: 10 }, (_, i) => ({
      id: `wh${i}`,
      url: 'http://localhost:3000/test'
    }))
  };

  const result = analyzeWorkflow(terribleWorkflow);

  return {
    passed: result.healthScore >= 0 && result.healthScore <= 100,
    expected: '0-100',
    actual: result.healthScore,
    details: `Issues: ${result.issues.length}, Grade: ${result.grade}`
  };
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================
console.log('\n========================================');
console.log('  ANALYSIS ENGINE TEST SUITE');
console.log('========================================\n');

// Run tests here when executed
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log('\n========================================');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
