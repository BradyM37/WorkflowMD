/**
 * Comprehensive Workflow Analyzer Test Suite
 * Runs all test workflows and validates results
 */

const { analyzeWorkflow } = require('./dist/lib/workflow-analyzer');
const testData = require('./test-workflows.json');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         WORKFLOW ANALYZER - COMPREHENSIVE TEST SUITE          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const results = [];

testData.workflows.forEach((workflow, index) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${index + 1}: ${workflow.name}`);
  console.log('='.repeat(70));
  
  try {
    const result = analyzeWorkflow(workflow);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   Workflow ID:     ${result.workflowId}`);
    console.log(`   Health Score:    ${result.healthScore}/100`);
    console.log(`   Grade:           ${result.grade}`);
    console.log(`   Confidence:      ${result.confidence}`);
    console.log(`   Status:          ${result.metadata.isActive ? '🟢 ACTIVE' : '⚪ INACTIVE'}`);
    
    console.log(`\n🔍 ISSUE SUMMARY:`);
    console.log(`   Critical:        ${result.issuesSummary.critical} (${result.issuesSummary.critical * 25} points)`);
    console.log(`   High:            ${result.issuesSummary.high} (${result.issuesSummary.high * 15} points)`);
    console.log(`   Medium:          ${result.issuesSummary.medium} (${result.issuesSummary.medium * 5} points)`);
    console.log(`   Low:             ${result.issuesSummary.low} (${result.issuesSummary.low * 2} points)`);
    console.log(`   ─────────────────────────────────────────────────────`);
    console.log(`   Total Issues:    ${result.issuesSummary.total}`);
    
    const expectedPenalty = 
      result.issuesSummary.critical * 25 +
      result.issuesSummary.high * 15 +
      result.issuesSummary.medium * 5 +
      result.issuesSummary.low * 2;
    const expectedScore = Math.max(0, 100 - expectedPenalty);
    const scoreMatch = expectedScore === result.healthScore;
    
    console.log(`\n🧮 SCORING VALIDATION:`);
    console.log(`   Expected Penalty: ${expectedPenalty} points`);
    console.log(`   Expected Score:   ${expectedScore}/100`);
    console.log(`   Actual Score:     ${result.healthScore}/100`);
    console.log(`   Match:            ${scoreMatch ? '✅ PASS' : '❌ FAIL'}`);
    
    if (result.issues.length > 0) {
      console.log(`\n⚠️  ISSUES DETECTED:`);
      result.issues.forEach((issue, i) => {
        const icon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '⚪'
        }[issue.type];
        console.log(`   ${i + 1}. ${icon} [${issue.type.toUpperCase()}] ${issue.title}`);
      });
    } else {
      console.log(`\n✅ NO ISSUES DETECTED`);
    }
    
    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      result.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   Estimated Steps: ${result.performance.estimatedSteps}`);
    console.log(`   Estimated Time:  ${result.performance.estimatedTime}`);
    console.log(`   Complexity:      ${result.performance.complexity.toUpperCase()}`);
    if (result.performance.bottlenecks.length > 0) {
      console.log(`   Bottlenecks:     ${result.performance.bottlenecks[0]}`);
    }
    
    results.push({
      name: workflow.name,
      score: result.healthScore,
      grade: result.grade,
      issues: result.issuesSummary.total,
      passed: scoreMatch
    });
    
    console.log(`\n✅ TEST PASSED`);
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED:`, error.message);
    console.error(error.stack);
    results.push({
      name: workflow.name,
      error: error.message,
      passed: false
    });
  }
});

// Final Summary
console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL SUMMARY                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const passedTests = results.filter(r => r.passed);
const failedTests = results.filter(r => !r.passed);

console.log('📊 TEST RESULTS:\n');
console.log('┌─────────────────────────────────────┬───────┬──────────┬────────┬────────┐');
console.log('│ Workflow Name                       │ Score │ Grade    │ Issues │ Status │');
console.log('├─────────────────────────────────────┼───────┼──────────┼────────┼────────┤');

results.forEach(r => {
  if (r.error) {
    console.log(`│ ${r.name.padEnd(35)} │   N/A │ N/A      │    N/A │ ❌ FAIL│`);
  } else {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`│ ${r.name.padEnd(35)} │ ${String(r.score).padStart(5)} │ ${r.grade.padEnd(8)} │ ${String(r.issues).padStart(6)} │ ${status}│`);
  }
});

console.log('└─────────────────────────────────────┴───────┴──────────┴────────┴────────┘\n');

console.log(`✅ Tests Passed: ${passedTests.length}/${results.length}`);
console.log(`❌ Tests Failed: ${failedTests.length}/${results.length}`);

if (failedTests.length > 0) {
  console.log('\n⚠️  Failed Tests:');
  failedTests.forEach(t => console.log(`   - ${t.name}: ${t.error || 'Scoring mismatch'}`));
}

console.log('\n' + '═'.repeat(70));
console.log(`🎯 OVERALL STATUS: ${failedTests.length === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log('═'.repeat(70) + '\n');

if (failedTests.length === 0) {
  console.log('🚀 The workflow analyzer is PRODUCTION READY!\n');
  console.log('Next steps:');
  console.log('  1. Start the server: npm run dev');
  console.log('  2. Test with real GHL workflows');
  console.log('  3. Monitor performance and accuracy\n');
}
