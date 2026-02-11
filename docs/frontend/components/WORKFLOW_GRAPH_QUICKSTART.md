# 🚀 Workflow Graph - Quick Start Guide

## See It Running in 30 Seconds

### Step 1: Start the Frontend
```bash
cd C:\Users\Bdog3\Desktop\Application\frontend
npm start
```

### Step 2: Open Your Browser
Navigate to:
```
http://localhost:3001/workflow-graph
```

### Step 3: Interact!
- **Zoom:** Mouse wheel or controls (bottom left)
- **Pan:** Click and drag on the canvas
- **Select Node:** Click any workflow step
- **View Details:** Details appear in right drawer
- **MiniMap:** Bottom right corner shows overview

---

## What You're Seeing

### The Workflow Graph (Left Side)
- **Blue nodes** = Triggers (workflow starts)
- **Green nodes** = Actions (things that happen)
- **Purple nodes** = Conditions (if/then branches)
- **Orange nodes** = Delays (wait times)

### Issue Indicators
- **🐌 Red pulsing** = Performance bottleneck
- **⚡ Orange pulsing** = Trigger conflict
- **Dashed animated edge** = Detected loop

### Analysis Panel (Right Side)
- **Overview:** Health score and summary
- **Loops:** Detected infinite loops
- **Conflicts:** Trigger timing issues
- **Performance:** Slow actions
- **Suggestions:** Optimization ideas

---

## Try These Features

1. **Click the "Contact Created" node** → See trigger details
2. **Click the "Create Task" node** → See performance issue warning
3. **Click the dashed edge** → See loop connection info
4. **Zoom out** → See entire workflow at once
5. **Check the MiniMap** → Navigate large workflows
6. **Switch tabs** → Explore different analysis categories

---

## Current Status

✅ **Component is complete and working**  
⏳ **Mock data (will be replaced with real data from Smith)**  
⏳ **API integration pending (waiting on backend)**

---

## For Developers

### Files to Check Out
```
src/components/WorkflowGraph.tsx           - Main component
src/components/nodes/TriggerNode.tsx       - Custom node example
src/pages/WorkflowAnalysis.tsx             - Full page implementation
src/components/WORKFLOW_GRAPH_README.md    - API contract & integration
```

### Adding to Your Page
```typescript
import WorkflowGraph from '../components/WorkflowGraph';

<WorkflowGraph
  workflowId="wf_123"
  data={workflowData}           // From API
  onNodeClick={(node) => {...}}  // Optional callback
  highlightIssues={true}         // Show issue indicators
/>
```

### API Integration (When Ready)
```typescript
// 1. Add to services/api.ts
export const getWorkflowStructure = async (id: string) => {
  return axios.get(`/api/workflows/${id}/structure`);
};

// 2. Use in component
const { data } = useQuery('workflow', () => getWorkflowStructure(id));

// 3. Pass to component
<WorkflowGraph data={data} />
```

---

## Questions?

- **API Contract:** See `src/components/WORKFLOW_GRAPH_README.md`
- **Backend Coordination:** Talk to Smith
- **Design Feedback:** Talk to Archie

---

**Enjoy the demo!** 🎉
