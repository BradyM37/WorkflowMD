# Freemium Features

## Pricing Structure

### Free Tier - $0/month
**Purpose:** Let users experience value immediately

**Features:**
- 1 sub-account analysis
- 3 issues shown per scan
- Basic risk score (A-F grade)
- 7-day history
- Issue count teaser ("12 more issues found")
- Documentation access

**Limitations:**
- Cannot see full issue list
- No PDF export
- No white-label reports
- No automated scanning
- Basic support only

### Pro Tier - $297/month
**Purpose:** Full-featured tool for serious agencies

**Features:**
- Unlimited sub-accounts
- All issues revealed with detailed fixes
- Complete risk score breakdown
- White-label PDF reports
- Weekly automated health reports
- 90-day history with trends
- Revenue impact estimation
- Priority email support
- Bulk workflow analysis
- Export to CSV

## Feature Comparison Table

| Feature Category | Free | Pro ($297) |
|-----------------|------|------------|
| **Analysis Limits** |
| Sub-accounts | 1 | Unlimited |
| Issues shown | 3 | All |
| Issue details | Basic | Full with fixes |
| Risk score | Grade only | Full breakdown |
| **Reporting** |
| View in app | ✅ | ✅ |
| PDF export | ❌ | ✅ |
| White-label | ❌ | ✅ |
| CSV export | ❌ | ✅ |
| Automated reports | ❌ | Weekly |
| **History & Trends** |
| History retention | 7 days | 90 days |
| Trend analysis | ❌ | ✅ |
| Before/after comparison | ❌ | ✅ |
| **Advanced Features** |
| Bulk analysis | ❌ | ✅ |
| Revenue impact calc | ❌ | ✅ |
| Custom recommendations | ❌ | ✅ |
| API access | ❌ | Coming soon |
| **Support** |
| Documentation | ✅ | ✅ |
| Email support | ❌ | Priority |
| Onboarding call | ❌ | ✅ |

## Implementation Strategy

### Free Tier Experience
```javascript
// User runs analysis
const analysis = await runFullAnalysis(workflow);

// Gate the results
if (subscription === 'free') {
  return {
    riskScore: analysis.riskScore,
    grade: analysis.grade,
    issuesFound: analysis.issues.length,
    issuesShown: analysis.issues
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3),
    upgradePrompt: {
      message: `${analysis.issues.length - 3} more issues detected`,
      cta: "See all issues and fixes",
      url: "/upgrade"
    }
  };
}
```

### Pro Tier Experience
```javascript
// Pro users get everything
return {
  riskScore: analysis.riskScore,
  grade: analysis.grade,
  breakdown: {
    critical: analysis.critical.length,
    high: analysis.high.length,
    medium: analysis.medium.length,
    low: analysis.low.length
  },
  issues: analysis.issues.map(issue => ({
    ...issue,
    fix: getDetailedFix(issue),
    impact: estimateRevenuImpact(issue)
  })),
  recommendations: generateRecommendations(analysis),
  exportOptions: {
    pdf: true,
    csv: true,
    whiteLabel: true
  }
};
```

## Upgrade Prompts

### Strategic Upgrade Points

**1. After Free Analysis**
```
Found 15 issues in your workflow
Showing top 3 critical issues:
[List 3 issues]

━━━━━━━━━━━━━━━━━━━━━
🔒 12 more issues hidden
Including 2 that could impact revenue
[Upgrade to Pro - See All Issues]
━━━━━━━━━━━━━━━━━━━━━
```

**2. Multiple Sub-Accounts**
```
You have 8 sub-accounts
Free tier analyzes 1 only

Pro members analyze all sub-accounts
in a single click

[Upgrade - Analyze All Sub-Accounts]
```

**3. Report Request**
```
Want to share these results?

Pro members get:
• White-label PDF reports
• Your logo & branding
• Client-ready format

[Upgrade - Get Professional Reports]
```

## Value Messaging

### Free Tier Messaging
**Headline:** "Free Workflow Health Check"
**Value Prop:** "Instantly identify your top 3 critical workflow issues"
**Call to Action:** "Start Free Analysis"

### Pro Tier Messaging
**Headline:** "Complete Workflow Analysis for Serious Agencies"
**Value Prop:** "Save 10+ hours monthly. Prevent revenue loss. Impress clients with white-label reports."
**Call to Action:** "Unlock Full Analysis - $297/month"

### ROI Calculator
```
Average agency hourly rate: $100
Hours saved per month: 10+
Value of time saved: $1,000+

Cost of Pro tier: $297
ROI: 237% minimum

Plus: Prevented workflow failures
Plus: Client retention from reports
```

## Conversion Optimization

### Free to Pro Journey
1. **Awareness:** User discovers tool in GHL marketplace
2. **Trial:** Runs free analysis, sees immediate value
3. **Limitation:** Hits free tier limit (3 issues only)
4. **Desire:** Sees hidden issue count, wants full access
5. **Action:** Clicks upgrade, enters Stripe checkout
6. **Success:** Immediate access to all features

### Psychological Triggers
- **Loss Aversion:** "12 issues hidden that could cost you money"
- **Social Proof:** "Join 100+ agencies using Pro"
- **Urgency:** "Risk Score: HIGH - Get full report now"
- **Authority:** "Recommended by GHL experts"
- **Reciprocity:** Free tier provides real value first

## Success Metrics

### Target Performance
| Metric | Target | Measurement |
|--------|--------|-------------|
| Free sign-ups | 200/month | OAuth installs |
| Free → Pro conversion | 3-5% | Stripe subscriptions |
| Churn rate | <5% monthly | Cancellations |
| Avg time to convert | <7 days | Install to payment |
| Feature usage (Pro) | >60% | Active analysis |

### Key Indicators
- Users hitting free tier limit: >80%
- Upgrade page views: >30% of free users
- Checkout completion: >50%
- First-week activation: >90%

## Technical Implementation

### Feature Flags
```javascript
const FEATURES = {
  FREE: {
    maxSubAccounts: 1,
    maxIssuesShown: 3,
    historyDays: 7,
    pdfExport: false,
    whiteLabel: false,
    automatedReports: false
  },
  PRO: {
    maxSubAccounts: Infinity,
    maxIssuesShown: Infinity,
    historyDays: 90,
    pdfExport: true,
    whiteLabel: true,
    automatedReports: true
  }
};

function getFeatures(subscription) {
  return FEATURES[subscription.toUpperCase()] || FEATURES.FREE;
}
```

### Database Tracking
```sql
-- Track feature usage
CREATE TABLE feature_usage (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(255),
  feature_name VARCHAR(100),
  subscription_tier VARCHAR(50),
  used_at TIMESTAMP DEFAULT NOW()
);

-- Track conversion events
CREATE TABLE conversion_events (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(255),
  event_type VARCHAR(50), -- 'viewed_upgrade', 'started_checkout', 'completed_purchase'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```