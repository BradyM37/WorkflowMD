# Workflow Graph Component - Integration Guide

## Overview
The WorkflowGraph component is now **ready and functional** with mock data. This document defines the API contract Smith needs to implement for real workflow data integration.

## Component Location
- **Main Component:** `src/components/WorkflowGraph.tsx`
- **Custom Nodes:** `src/components/nodes/`
- **Demo Page:** `src/pages/WorkflowAnalysis.tsx`

## Current Status ✅
- ✅ React Flow installed and configured
- ✅ Interactive workflow visualization with zoom, pan, minimap
- ✅ Custom node types (Trigger, Action, Condition, Delay)
- ✅ Visual issue highlighting (loops, conflicts, performance)
- ✅ Click handlers for nodes and edges
- ✅ Mock data working perfectly
- ✅ Responsive design with side panel for analysis

## Access the Demo
Run the frontend and navigate to: **`/workflow-graph`**

```bash
cd frontend
npm start
```

Then visit: `http://localhost:3001/workflow-graph`

---

## API Contract for Smith

### Endpoint Required
```
GET /api/workflows/:id/structure
```

### Expected Response Format

```typescript
{
  "id": "workflow_123",
  "name": "Lead Nurture Sequence",
  "nodes": [
    {
      "id": "1",
      "type": "trigger" | "action" | "condition" | "delay",
      "position": { "x": 250, "y": 50 },
      "data": {
        "label": "Contact Created",
        "triggerType": "contact_created",  // For triggers
        "actionType": "send_email",         // For actions
        "conditionType": "email_opened",    // For conditions
        "duration": "1h",                   // For delays
        "icon": "👤",                       // Emoji or icon identifier
        "status": "active" | "warning" | "error",  // Optional
        "hasIssue": true,                   // Optional - for performance issues
        "hasConflict": true                 // Optional - for trigger conflicts
      }
    }
    // ... more nodes
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "Yes",                       // Optional - for condition branches
      "type": "smoothstep" | "default",     // Optional
      "animated": true,                     // Optional
      "style": {                            // Optional
        "stroke": "#10b981",
        "strokeDasharray": "5,5"
      }
    }
    // ... more edges
  ]
}
```

### Node Types

#### 1. **Trigger Node**
```json
{
  "type": "trigger",
  "data": {
    "label": "Contact Created",
    "triggerType": "contact_created",
    "icon": "👤",
    "status": "active",
    "hasConflict": false
  }
}
```

#### 2. **Action Node**
```json
{
  "type": "action",
  "data": {
    "label": "Send Email",
    "actionType": "send_email",
    "icon": "📧",
    "hasIssue": false
  }
}
```

#### 3. **Condition Node**
```json
{
  "type": "condition",
  "data": {
    "label": "Email Opened?",
    "conditionType": "email_opened",
    "icon": "🔀"
  }
}
```

#### 4. **Delay Node**
```json
{
  "type": "delay",
  "data": {
    "label": "Wait 1 Hour",
    "duration": "1h",
    "icon": "⏱️"
  }
}
```

### Analysis Results API

For the analysis panel, we also need:

```
GET /api/workflows/:id/analysis
```

```typescript
{
  "loops": [
    {
      "id": "loop-1",
      "nodes": ["4", "5", "12"],
      "severity": "high" | "medium" | "low",
      "description": "Infinite loop detected",
      "suggestion": "Add exit criteria"
    }
  ],
  "conflicts": [
    {
      "id": "conflict-1",
      "triggers": ["Contact Created", "Link Clicked"],
      "severity": "high" | "medium" | "low",
      "description": "Simultaneous triggers detected",
      "suggestion": "Add delay or mutex"
    }
  ],
  "performance": {
    "score": 72,
    "issues": [
      {
        "id": "perf-1",
        "nodeId": "9",
        "type": "slow_action",
        "description": "High execution time",
        "suggestion": "Use async processing"
      }
    ]
  },
  "suggestions": [
    {
      "id": "sugg-1",
      "title": "Consolidate actions",
      "description": "Combine similar actions",
      "impact": "high" | "medium" | "low",
      "effort": "low" | "medium" | "high"
    }
  ]
}
```

---

## Integration Steps (When API is Ready)

### Step 1: Create API Service
Add to `src/services/api.ts`:

```typescript
export const getWorkflowStructure = async (workflowId: string) => {
  const response = await axios.get(`/api/workflows/${workflowId}/structure`);
  return response.data;
};

export const getWorkflowAnalysis = async (workflowId: string) => {
  const response = await axios.get(`/api/workflows/${workflowId}/analysis`);
  return response.data;
};
```

### Step 2: Update WorkflowAnalysis Page
Replace mock data with API call:

```typescript
import { useQuery } from 'react-query';
import { getWorkflowStructure, getWorkflowAnalysis } from '../services/api';

// Inside component:
const { data: workflowData, isLoading } = useQuery(
  ['workflow', workflowId],
  () => getWorkflowStructure(workflowId)
);

const { data: analysisData } = useQuery(
  ['analysis', workflowId],
  () => getWorkflowAnalysis(workflowId)
);
```

### Step 3: Pass Real Data to Component
```typescript
<WorkflowGraph
  workflowId={workflowId}
  data={workflowData}
  onNodeClick={handleNodeClick}
  onEdgeClick={handleEdgeClick}
  highlightIssues={true}
/>
```

---

## Position Calculation for Smith

**Important:** Node positions need to be calculated by the backend for consistent layout.

### Recommended Approach:
1. Use a **graph layout algorithm** (Dagre, ELK, or similar)
2. Calculate positions server-side based on workflow structure
3. Return pre-calculated `x, y` coordinates in the API response

### Why Server-Side Layout?
- Consistent visualization across users
- Better performance (no client-side calculation)
- Easier to cache and optimize

### Example Position Logic:
- Vertical spacing: 100px between steps
- Horizontal spacing: 150px for branches
- Start position: `{ x: 250, y: 50 }`

---

## Testing Checklist

### Frontend (Already Done ✅)
- ✅ Component renders with mock data
- ✅ Nodes are interactive (click, drag)
- ✅ Edges connect properly
- ✅ Zoom and pan work
- ✅ MiniMap shows overview
- ✅ Visual indicators (loops, conflicts, issues)
- ✅ Side panel shows analysis
- ✅ Responsive design

### Backend (Smith's TODO)
- ⏳ GET /api/workflows/:id/structure returns correct format
- ⏳ Node positions are calculated
- ⏳ Edge connections are accurate
- ⏳ Analysis results are generated
- ⏳ Error handling for invalid workflow IDs

---

## Questions for Smith

1. **GHL Workflow Data Structure:** What's the internal format of GHL workflows?
2. **Node Position Calculation:** Can you use Dagre or similar for layout?
3. **Analysis Timing:** Should analysis run on-demand or be cached?
4. **Rate Limiting:** How many analysis requests per user per day?

---

## Next Steps

### For Nova (Me) 🎨
- [x] Build React Flow component
- [x] Create custom node types
- [x] Add analysis results panel
- [x] Document API contract
- [ ] Wait for Smith's endpoint
- [ ] Integrate real data
- [ ] Add loading states
- [ ] Add error boundaries

### For Smith (Backend) 🔧
- [ ] Review API contract above
- [ ] Implement GET /api/workflows/:id/structure
- [ ] Implement GET /api/workflows/:id/analysis
- [ ] Calculate node positions (Dagre recommended)
- [ ] Test with sample GHL workflow data
- [ ] Share endpoint for integration testing

---

## Support

Questions? Ping Nova or Smith in the team channel.

**Demo is live now at `/workflow-graph` - check it out!** 🚀
