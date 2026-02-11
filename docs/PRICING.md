# Pricing & Features

## Pricing Tiers

### Free Tier - $0/month
- 1 sub-account analysis
- See 3 issues maximum
- Basic risk score
- 7-day history
- Teaser showing total issues found

### Pro Tier - $297/month
- Unlimited sub-accounts
- All issues revealed
- Detailed risk breakdown
- White-label PDF reports
- Weekly automated reports
- 90-day history
- Priority support

## Feature Comparison

| Feature | Free | Pro |
|---------|------|-----|
| Sub-accounts | 1 | Unlimited |
| Issues shown | 3 | All |
| Risk score detail | Basic | Complete |
| PDF reports | ❌ | ✅ |
| White-label | ❌ | ✅ |
| Automated reports | ❌ | Weekly |
| History | 7 days | 90 days |
| Support | Docs only | Priority email |

## Value Proposition

**Free Tier:** Quick health check to identify critical issues

**Pro Tier:** Complete analysis for agencies managing multiple clients

### ROI Calculation
- 10+ hours saved monthly = $1,000+ value
- One prevented workflow failure = More than monthly cost
- White-label reports = Client retention tool

## Implementation

### Free Tier Logic
```javascript
if (subscription === 'free') {
  return {
    issues: allIssues.slice(0, 3),
    totalFound: allIssues.length,
    teaser: `${allIssues.length - 3} more issues found`
  };
}
```

### Upgrade Prompts
1. After analysis: "12 more issues found - see all"
2. Multiple accounts: "Analyze all 10 sub-accounts"
3. Report request: "Download white-label PDF"

## Conversion Strategy

**Target Metrics:**
- 3-5% free to paid conversion
- <5% monthly churn
- 20 paying customers in month 1

**Upgrade Path:**
1. Free user sees value (3 critical issues)
2. Teased with hidden issues count
3. One-click Stripe checkout
4. Immediate access to full features