# GHL Workflow Test Fixtures

This directory contains realistic test fixtures based on actual GHL (GoHighLevel) workflow API response formats.

## Files

### `fixture-simple.json`
**Basic 3-step workflow**
- Trigger: Contact Created
- Action: Send Email  
- Action: Add Tag
- Clean, well-configured workflow
- Expected score: 85-100

### `fixture-complex.json`
**Complex workflow with branches (15+ actions)**
- Multiple triggers (FormSubmitted, TagAdded)
- Conditional branches (IfElse)
- Webhooks with proper configuration
- Delays and timing
- Multiple touchpoints (email, SMS, CRM sync)
- Demonstrates real-world nurture campaign structure
- Expected score: varies based on validation issues

### `fixture-problematic.json`
**Workflow with known issues**
- ❌ Missing required fields (email recipient, SMS phone)
- ❌ Localhost webhooks (http://localhost:3000, http://127.0.0.1:8080)
- ❌ Payment action without retry logic
- ❌ API calls without error handling
- ❌ Excessive wait time (45 days)
- ❌ Infinite loop in connections
- ❌ Deprecated integrations
- ❌ Missing descriptions
- ❌ Hardcoded values
- Expected score: < 50 (Critical/High Risk)

### `fixture-perfect.json`
**Well-configured workflow with best practices**
- ✅ Proper error handling
- ✅ Timeouts configured
- ✅ Field validation enabled
- ✅ Retry logic on webhooks
- ✅ Descriptive names and documentation
- ✅ Uses merge fields correctly
- ✅ Proper conditional logic
- ✅ Rate limit checks
- Expected score: 90+ (Excellent)

## GHL Format Specifications

These fixtures match the real GHL API response format:

### Node IDs
- UUID format: `78559bb3-b920-461e-b010-7b2a2816d2a9`
- Prefixed format: `action-send-email-1`, `trigger-contact-created`

### Action Types (PascalCase)
- `SendEmail` - Email actions
- `SendSMS` - SMS actions
- `CustomWebhook` - Webhook/API calls
- `ChargeCustomer` - Payment processing
- `AddTag` / `RemoveTag` - Tag management
- `UpdateContact` - Contact field updates
- `CreateTask` - Task creation
- `CreateOpportunity` - Pipeline management
- `AssignToUser` - User assignment
- `Wait` - Delays
- `IfElse` - Conditional branches
- `AddToCampaign` - Campaign enrollment
- `SendNotification` - Internal notifications

### Trigger Types (PascalCase)
- `FormSubmitted` - Form submission trigger
- `ContactCreated` - New contact trigger
- `ContactUpdated` - Contact update trigger
- `TagAdded` - Tag addition trigger

### Timestamp Format
- ISO 8601: `"2024-01-15T10:30:00.000Z"`

### Config Structure
Actions include a `config` object with action-specific settings:
```json
{
  "type": "SendEmail",
  "config": {
    "recipient": "{{contact.email}}",
    "subject": "Welcome!",
    "validateEmail": true,
    "trackOpens": true
  }
}
```

### Webhook Configuration
```json
{
  "url": "https://api.example.com/endpoint",
  "method": "POST",
  "timeout": 30000,
  "retryCount": 3,
  "errorHandling": {
    "onTimeout": "continue",
    "on4xx": "log_and_continue",
    "on5xx": "retry"
  }
}
```

## Usage in Tests

Import fixtures in TypeScript tests:

```typescript
import simpleWorkflow from './src/test-fixtures/fixture-simple.json';
import complexWorkflow from './src/test-fixtures/fixture-complex.json';
import problematicWorkflow from './src/test-fixtures/fixture-problematic.json';
import perfectWorkflow from './src/test-fixtures/fixture-perfect.json';

const result = analyzeWorkflow(simpleWorkflow);
```

## Analysis Engine Compatibility

The analysis engine has been updated to recognize both:
- Internal format: lowercase (`email`, `sms`, `webhook`)
- GHL format: PascalCase (`SendEmail`, `SendSMS`, `CustomWebhook`)

A `normalizeActionType()` function handles the conversion automatically.

## Test Coverage

These fixtures are used in 12 GHL-specific tests in `test-analysis-engine.ts`:
- ✅ Simple workflow analysis
- ✅ Complex workflow with 15+ actions
- ✅ Problematic workflow issue detection
- ✅ Localhost webhook detection
- ✅ Infinite loop detection
- ✅ Perfect workflow scoring
- ✅ GHL action type recognition
- ✅ GHL trigger type recognition
- ✅ GHL node ID format handling
- ✅ Missing required field detection
- ✅ Timestamp format handling
- ✅ Performance metrics calculation
