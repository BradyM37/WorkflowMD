# GHL API Research - Workflow Structure

## Status: ⚠️ PARTIALLY CONFIRMED

## Executive Summary

The GHL API **does have** a workflows endpoint, but the detailed structure documentation is not fully accessible through standard documentation fetching. Here's what we know:

## Confirmed Endpoints

### GET /workflows/{workflowId}
- **Base URL**: `https://services.leadconnectorhq.com`
- **Full Endpoint**: `GET https://services.leadconnectorhq.com/workflows/{workflowId}`
- **Auth**: Bearer token (OAuth 2.0 or Private Integration Token)
- **Documentation**: https://marketplace.gohighlevel.com/docs/ghl/workflows/get-workflow/

## What We Know About GHL Workflow Structure

Based on research and community references:

### 1. **Workflows Contain:**
   - **Triggers** - Events that start the workflow (webhook, form submit, tag added, etc.)
   - **Actions/Steps** - Operations performed (send email, add tag, HTTP request, delays, etc.)
   - **Conditions** - If/else logic branches
   - **Connections** - Links between nodes (implied DAG structure)

### 2. **Workflow Builder Context:**
   - GHL uses a visual workflow builder similar to what we're building
   - Supports multiple triggers per workflow
   - Steps can branch (conditions)
   - Can detect loops (they have built-in cycle detection)
   - Each step has a type (trigger, action, condition, delay, etc.)

### 3. **Expected JSON Structure (Inferred):**

```json
{
  "id": "workflow_123",
  "name": "Lead Nurture Flow",
  "status": "active",
  "locationId": "loc_456",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "triggerType": "contact_tag_added",
      "config": {
        "tagId": "tag_789"
      }
    },
    {
      "id": "node_2",
      "type": "action",
      "actionType": "send_email",
      "config": {
        "templateId": "email_001",
        "subject": "Welcome!",
        "body": "..."
      }
    },
    {
      "id": "node_3",
      "type": "condition",
      "config": {
        "field": "contact.email_opened",
        "operator": "equals",
        "value": true
      }
    }
  ],
  "connections": [
    {
      "from": "node_1",
      "to": "node_2"
    },
    {
      "from": "node_2",
      "to": "node_3"
    },
    {
      "from": "node_3",
      "to": "node_4",
      "branch": "true"
    },
    {
      "from": "node_3",
      "to": "node_5",
      "branch": "false"
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-02-20T14:30:00Z"
}
```

## Action Items for Nova

### Required Data Format for React Flow

React Flow needs nodes and edges in this format:

```typescript
// Nodes
interface ReactFlowNode {
  id: string;
  type: string; // 'trigger', 'action', 'condition', etc.
  position: { x: number; y: number }; // We'll auto-layout or use stored positions
  data: {
    label: string;
    config: any; // The GHL node configuration
    nodeType: string; // Original GHL node type
  };
}

// Edges
interface ReactFlowEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  label?: string; // "true"/"false" for conditions
  animated?: boolean;
  style?: object;
}
```

### API Contract (Proposed)

#### GET /api/workflows/:id/structure

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_123",
    "name": "Lead Nurture Flow",
    "status": "active"
  },
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "position": { "x": 0, "y": 0 },
      "data": {
        "label": "Tag Added: Hot Lead",
        "nodeType": "contact_tag_added",
        "config": { ... }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1_2",
      "source": "node_1",
      "target": "node_2",
      "animated": false
    }
  ]
}
```

#### POST /api/analyze

**Request:**
```json
{
  "workflowId": "workflow_123"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "issues": [
      {
        "type": "loop_detected",
        "severity": "error",
        "nodes": ["node_3", "node_5", "node_7", "node_3"],
        "description": "Infinite loop detected: Contact enters cycle without exit condition"
      },
      {
        "type": "trigger_conflict",
        "severity": "warning",
        "triggers": ["trigger_1", "trigger_2"],
        "description": "Multiple triggers can fire simultaneously for the same contact"
      }
    ],
    "performance": {
      "estimatedSteps": 12,
      "estimatedTime": "4.5s",
      "complexity": "medium",
      "bottlenecks": ["node_8 (API call)", "node_12 (delay 2hrs)"]
    },
    "suggestions": [
      {
        "type": "optimization",
        "nodeId": "node_10",
        "suggestion": "Consider parallelizing steps 10-12 for faster execution"
      }
    ]
  }
}
```

## Next Steps

1. **Test GHL API Call** - Make a real request to `GET /workflows/{workflowId}` with valid auth to see exact response structure
2. **Update Parser** - Build transformer from GHL format → React Flow format
3. **Coordinate with Nova** - Share this data format for frontend implementation
4. **Build Analysis Engine** - Start with loop detection algorithm (DFS with recursion stack)

## Notes for Team

- GHL documentation is partially interactive/JavaScript-rendered (hard to scrape)
- Community suggests workflows can be exported/imported (JSON format exists)
- No public schema documentation found yet - will need live API testing
- Consider reaching out to GHL support for detailed API schema documentation

---

**Updated**: 2026-02-11  
**Author**: Smith (Backend Engineer)
