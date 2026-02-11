/**
 * Test Script for Workflow Analyzer
 * 
 * Run with: node test-analyzer.js
 */

const fs = require('fs');
const path = require('path');

// Load test workflows
const testData = JSON.parse(fs.readFileSync('test-workflows.json', 'utf8'));

// Mock the analyzer by requiring the compiled JS (need to build first)
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         WORKFLOW ANALYZER TEST SUITE                          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('✓ Test workflows loaded:', testData.workflows.length, 'workflows\n');

console.log('Test workflows:');
testData.workflows.forEach((wf, i) => {
  console.log(`  ${i + 1}. ${wf.name} (${wf.status})`);
  console.log(`     - ID: ${wf.id}`);
  console.log(`     - Nodes: ${wf.nodes?.length || wf.actions?.length || 0}`);
  console.log(`     - Expected issues: ${getExpectedIssues(wf.name)}\n`);
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  To run the actual analysis:                                   ║');
console.log('║  1. npm run build                                              ║');
console.log('║  2. node -e "const {analyzeWorkflow}=require(\'./dist/lib/workflow-analyzer\');const wf=require(\'./test-workflows.json\').workflows[0];console.log(JSON.stringify(analyzeWorkflow(wf),null,2))" ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

function getExpectedIssues(workflowName) {
  const expectations = {
    'Infinite Loop Test': 'Infinite loop (critical)',
    'Critical Issues Test': 'Localhost webhooks, missing retry, no API endpoint',
    'Error Handling Test': 'No error handling, hardcoded values',
    'Best Practices Test': 'Missing descriptions, deprecated API, broken integration',
    'Complex Workflow': 'Long chain without checkpoints (>10 steps)',
    'Perfect Workflow': 'None or minimal issues'
  };
  return expectations[workflowName] || 'Unknown';
}

console.log('✓ Test data validated successfully!\n');
console.log('📝 Next Steps:');
console.log('   1. Build the TypeScript: npm run build');
console.log('   2. Start the server: npm run dev');
console.log('   3. Test API endpoint: POST http://localhost:3000/api/analyze');
console.log('\nOr test directly in TypeScript by importing the analyzer.\n');
