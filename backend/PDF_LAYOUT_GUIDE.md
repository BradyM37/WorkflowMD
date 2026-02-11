# PDF Report Layout Guide

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ████████████████ PURPLE GRADIENT HEADER ███████████████████ │
│ GHL                                                          │
│ Workflow Analysis Report                                    │
└─────────────────────────────────────────────────────────────┘

Generated: Tuesday, February 11, 2026 at 10:16 AM

Workflow: 💳 Failed Payment Recovery - BROKEN
Workflow ID: wf_payment_recovery_broken

┌──────────────────────┐  ┌──────────────────────┐
│     HEALTH SCORE     │  │       GRADE          │
│                      │  │                      │
│         0            │  │     Critical         │
│                      │  │                      │
│    (0-100 scale)     │  │  Confidence: High    │
└──────────────────────┘  └──────────────────────┘
    (Color: Red)              (Border: Red)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY
─────────────────
This workflow "💳 Failed Payment Recovery - BROKEN" has 
received a health score of 0/100 (Critical), indicating 
the workflow is in need of immediate improvement. The 
analysis detected 13 total issue(s): 6 critical issue(s), 
4 high-priority issue(s), 2 medium-priority issue(s), 
1 low-priority issue(s). The workflow contains 12 node(s) 
and is currently active. Performance analysis indicates 
high complexity with an estimated execution time of ~8.5s.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ISSUE BREAKDOWN
───────────────

┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│    6    │  │    4    │  │    2    │  │    1    │
│         │  │         │  │         │  │         │
│Critical │  │  High   │  │ Medium  │  │   Low   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
  (Red bg)   (Orange bg)  (Yellow bg)  (Green bg)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETECTED ISSUES
───────────────

┌─────────────────────────────────────────────────┐
│ ┌───────────┐                                   │
│ │ CRITICAL  │  Infinite Loop Detected           │
│ └───────────┘                                   │
│                                                  │
│ The workflow contains an infinite loop          │
│ between action_1 → action_2 → ... → action_1.   │
│ This will cause the workflow to run forever.    │
│                                                  │
│ Fix: Break the loop by adding a condition or    │
│ removing the connection back to action_1.       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ┌───────────┐                                   │
│ │ CRITICAL  │  Invalid Webhook URL              │
│ └───────────┘                                   │
│                                                  │
│ Webhook URL uses localhost (http://localhost)   │
│ which won't work in production.                 │
│                                                  │
│ Fix: Replace with a publicly accessible URL.    │
└─────────────────────────────────────────────────┘

[... more issues ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDATIONS
───────────────

1. Fix infinite loops immediately to prevent workflow 
   execution issues.

2. Update all webhook URLs to use publicly accessible 
   endpoints.

3. Add error handling to all API calls to prevent 
   workflow failures.

4. Implement retry logic for payment-related actions.

[... more recommendations ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERFORMANCE METRICS
───────────────────

Estimated Steps: 12
Estimated Time: ~8.5s
Complexity: HIGH
Bottlenecks: API calls without delays, payment processing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            Generated by GHL Workflow Debugger
                        Page 1 of 2

```

## Color Coding

### Severity Colors
- **Critical**: `#dc2626` (Red) - Bright red for urgent attention
- **High**: `#ea580c` (Orange) - Orange for important issues
- **Medium**: `#eab308` (Yellow) - Yellow for moderate concerns
- **Low**: `#22c55e` (Green) - Green for minor improvements

### Brand Colors
- **Primary**: `#667eea` (Purple) - Main brand color for headers
- **Secondary**: `#764ba2` (Dark Purple) - Gradient accent
- **Text**: `#1f2937` (Dark Gray) - Primary text
- **Text Light**: `#6b7280` (Medium Gray) - Secondary text
- **Background**: `#f9fafb` (Light Gray) - Subtle backgrounds
- **White**: `#ffffff` - Clean white for contrast

### Health Score Colors
The health score box changes color based on the score:
- **90-100**: Green (#22c55e) - Excellent
- **75-89**: Yellow (#eab308) - Good
- **50-74**: Orange (#ea580c) - Needs Attention
- **0-49**: Red (#dc2626) - Critical/High Risk

## Typography

- **Header Title**: 28pt Helvetica-Bold, White
- **Section Titles**: 16pt Helvetica-Bold, Dark Gray
- **Health Score**: 48pt Helvetica-Bold, White (on colored background)
- **Grade**: 24pt Helvetica-Bold, Colored (matches health score)
- **Body Text**: 11pt Helvetica, Dark Gray
- **Issue Titles**: 12pt Helvetica-Bold, Dark Gray
- **Issue Descriptions**: 10pt Helvetica, Dark Gray
- **Metadata/Footer**: 9-10pt Helvetica, Medium Gray

## Page Layout

- **Page Size**: US Letter (8.5" × 11")
- **Margins**:
  - Top: 50pt
  - Bottom: 70pt (extra space for footer)
  - Left: 50pt
  - Right: 50pt
- **Header Height**: 120pt (purple gradient)
- **Footer Height**: ~30pt

## Responsive Elements

### Automatic Pagination
- New page triggered when content reaches 150pt from bottom
- Footer added to each page before creating new page
- Content flows naturally across pages

### Issue Cards
Each issue is displayed in a card format:
- Bordered box with severity color
- Severity badge (colored, uppercase)
- Issue title (bold)
- Description (regular)
- Fix recommendation (lighter text, italicized label)
- Minimum 15pt spacing between cards

### Breakdown Chart
Four boxes in a row:
- Width: 110pt each
- Height: 60pt
- Rounded corners: 5pt radius
- Translucent background (10% opacity of severity color)
- Large number (24pt)
- Small label below (10pt)

## File Output

- **Format**: PDF (application/pdf)
- **Compression**: Automatic by PDFKit
- **Typical Size**: 6-12 KB depending on issue count
- **Filename Pattern**: `workflow-report-{id}.pdf`

## Accessibility

- Clear hierarchy with consistent styling
- High contrast text (WCAG AA compliant)
- Logical reading order
- Color coding supplemented with text labels
- Professional fonts for readability

---

**Last Updated**: February 11, 2026
**Created By**: Smith (Backend Engineer)
**Status**: Production Ready ✅
