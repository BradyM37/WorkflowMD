# AWS SES Email Setup Guide

## Why AWS SES?

**Cost Comparison:**
- **AWS SES:** $0.10 per 1,000 emails = **$1.00 for 10,000 emails/month**
- **SendGrid:** $20/month for 40,000 emails = **$5.00 for 10,000 emails/month**
- **Mailgun:** $15/month for 50,000 emails = **$3.00 for 10,000 emails/month**

**AWS SES is 5x cheaper than competitors!**

---

## Prerequisites

- AWS Account (create at https://aws.amazon.com)
- Domain name (for production email sending)
- Credit card (AWS requires it, but SES has a free tier)

---

## Part 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click **Create an AWS Account**
3. Follow the registration steps:
   - Email address
   - Password
   - AWS account name (can be your company name)
   - Contact information
   - Payment method (required, but won't be charged for free tier usage)
4. Complete phone verification
5. Choose **Basic Support Plan** (free)

**Free Tier:** 
- 62,000 emails per month FREE when sent from EC2
- 3,000 emails per month FREE when sent from other sources
- After that: $0.10 per 1,000 emails

---

## Part 2: Set Up IAM User for SES

AWS best practice: Don't use root account credentials. Create an IAM user.

### 2.1 Create IAM User

1. Log into AWS Console: https://console.aws.amazon.com
2. Search for **IAM** in the services search bar
3. Click **Users** in the left sidebar
4. Click **Create user**
5. User name: `ses-smtp-user`
6. Click **Next**

### 2.2 Attach SES Permissions

1. Select **Attach policies directly**
2. Search for `AmazonSESFullAccess`
3. Check the box next to **AmazonSESFullAccess**
4. Click **Next**
5. Click **Create user**

### 2.3 Create Access Keys

1. Click on the user you just created (`ses-smtp-user`)
2. Go to **Security credentials** tab
3. Scroll down to **Access keys**
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next**
7. Add description: "GHL Workflow Debugger SES"
8. Click **Create access key**

**⚠️ IMPORTANT: Save these credentials immediately!**

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
```

You will need these for your `.env` file. AWS will **never show the secret key again**.

---

## Part 3: Verify Your Email Domain

AWS SES starts in "Sandbox Mode" - you can only send to verified emails. To send to any email, you need to:

1. Verify your domain
2. Request production access

### 3.1 Verify a Domain (Recommended for Production)

1. Go to **SES Console**: https://console.aws.amazon.com/ses
2. Select your region (e.g., `us-east-1`)
3. Click **Verified identities** in left sidebar
4. Click **Create identity**
5. Select **Domain**
6. Enter your domain: `ghlworkflowdebugger.com`
7. Check **Use a custom MAIL FROM domain** (optional)
8. Click **Create identity**

### 3.2 Add DNS Records

AWS will provide DNS records you need to add to your domain:

**Example DNS Records:**
```
Type: TXT
Name: _amazonses.ghlworkflowdebugger.com
Value: [verification token from AWS]

Type: CNAME
Name: [random-string]._domainkey.ghlworkflowdebugger.com
Value: [dkim value from AWS]

Type: CNAME
Name: [random-string]._domainkey.ghlworkflowdebugger.com
Value: [dkim value from AWS]

Type: CNAME
Name: [random-string]._domainkey.ghlworkflowdebugger.com
Value: [dkim value from AWS]
```

**Where to add DNS records:**
- **Namecheap:** Domain List → Manage → Advanced DNS
- **GoDaddy:** My Products → DNS → Manage DNS
- **Cloudflare:** Select domain → DNS → Add record

**Verification time:** 5 minutes to 72 hours (usually < 1 hour)

### 3.3 Verify a Single Email (For Testing)

If you don't have a domain yet, verify a single email for testing:

1. Go to **Verified identities**
2. Click **Create identity**
3. Select **Email address**
4. Enter your email: `your-email@gmail.com`
5. Click **Create identity**
6. Check your inbox for verification email
7. Click the verification link

You can now send emails from and to this address in sandbox mode.

---

## Part 4: Request Production Access

By default, SES is in "Sandbox Mode" - you can only send to verified emails.

### 4.1 Submit Production Access Request

1. Go to **SES Console** → **Account dashboard**
2. Click **Request production access** button
3. Fill out the form:

**Mail Type:** Transactional

**Website URL:** `https://yourdomain.com` (or GitHub repo if no website yet)

**Use Case Description:**
```
We are building a workflow debugging tool for GoHighLevel users. 
We send the following transactional emails:
- Email verification after user registration
- Password reset requests
- Workflow failure alerts (triggered by system issues)
- Scheduled scan reports (daily/weekly summaries)

All emails are opt-in and users can unsubscribe at any time.
We expect to send ~1,000-5,000 emails per month.
```

**How you handle bounces/complaints:**
```
We monitor bounce rates and immediately remove invalid email addresses.
We provide an easy unsubscribe link in all emails.
We comply with CAN-SPAM and GDPR regulations.
```

**Acknowledge:** Check all boxes

4. Click **Submit request**

**Approval time:** Usually 24 hours (can take up to 48 hours)

AWS will email you when approved.

---

## Part 5: Configure Your Application

### 5.1 Update .env File

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1

# Email sender configuration
SES_FROM_EMAIL=noreply@ghlworkflowdebugger.com
SES_FROM_NAME=GHL Workflow Debugger

# Frontend URL for email links
FRONTEND_URL=https://yourdomain.com
```

### 5.2 Update FROM_EMAIL

**Before production access:** Must be a verified email
```
SES_FROM_EMAIL=your-verified-email@gmail.com
```

**After production access:** Use your domain
```
SES_FROM_EMAIL=noreply@ghlworkflowdebugger.com
```

---

## Part 6: Test Email Configuration

### 6.1 Test via API Endpoint

```bash
# Start your backend
npm run dev

# Test email sending (create this endpoint)
curl -X POST http://localhost:3000/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@gmail.com"}'
```

### 6.2 Create Test Endpoint (Optional)

Add to `src/routes/test.ts`:

```typescript
import { testEmailConfiguration } from '../lib/email-service';

router.post('/email', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email required', 400);
  }

  const success = await testEmailConfiguration(email);
  
  return ApiResponse.success(res, {
    success,
    message: success ? 'Test email sent!' : 'Email configuration failed'
  });
}));
```

---

## Part 7: Monitor Email Sending

### 7.1 SES Dashboard Metrics

1. Go to **SES Console** → **Account dashboard**
2. View metrics:
   - Emails sent
   - Bounce rate (should be < 5%)
   - Complaint rate (should be < 0.1%)

### 7.2 Set Up CloudWatch Alarms (Optional)

Monitor for high bounce/complaint rates:

1. Go to **CloudWatch** → **Alarms**
2. Create alarm for:
   - `Reputation.BounceRate > 5%`
   - `Reputation.ComplaintRate > 0.1%`

---

## Part 8: Cost Estimation

### Pricing Structure

**Free Tier:**
- 3,000 emails/month FREE (when not from EC2)
- 62,000 emails/month FREE (when from EC2/Lambda)

**After Free Tier:**
- $0.10 per 1,000 emails sent
- $0.12 per 1,000 emails received (if configured)

### Monthly Cost Examples

| Usage | Cost |
|-------|------|
| 1,000 emails/month | **FREE** |
| 5,000 emails/month | **$0.20** |
| 10,000 emails/month | **$0.70** |
| 50,000 emails/month | **$4.70** |
| 100,000 emails/month | **$9.70** |

**Attachment Costs:** $0.12 per GB

---

## Part 9: Best Practices

### 9.1 Bounce Management

```typescript
// Track and remove invalid emails
const bouncedEmails = new Set<string>();

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  for (const email of toAddresses) {
    if (bouncedEmails.has(email)) {
      logger.warn(`Skipping bounced email: ${email}`);
      continue;
    }
  }
  // ... send email
}
```

### 9.2 Rate Limiting

Already implemented in `email-service.ts`:
- Max 10 emails per hour per address
- Prevents spam and abuse

### 9.3 Unsubscribe Links

All emails include unsubscribe footer:
```html
<a href="${FRONTEND_URL}/unsubscribe">Unsubscribe</a>
```

### 9.4 Email Categories

Track email types for analytics:
- Transactional (password reset, verification)
- Alerts (workflow failures)
- Reports (scheduled scans)
- Marketing (if applicable)

---

## Part 10: Troubleshooting

### Error: "Email address is not verified"

**Solution:** Verify the sender email or request production access

### Error: "Daily sending quota exceeded"

**Solution:** Your account has sending limits. Check SES console → Account dashboard → Sending quota

**Default limits:**
- Sandbox: 200 emails/day
- Production: 50,000 emails/day (can request increase)

### Error: "InvalidParameterValue: Missing final '@domain'"

**Solution:** Check email format in `.env` file:
```bash
# Wrong
SES_FROM_EMAIL="My App" <noreply@domain.com>

# Right
SES_FROM_EMAIL=noreply@domain.com
```

### High Bounce Rate

**Causes:**
- Invalid email addresses
- Typos in email field
- Fake/temporary emails

**Solutions:**
- Implement email validation
- Use email verification service
- Remove bounced emails from your list

---

## Part 11: Migration from SendGrid/SMTP

### 11.1 Remove Old Dependencies

```bash
npm uninstall @sendgrid/mail nodemailer
```

### 11.2 Update Environment Variables

Remove:
```bash
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SENDGRID_API_KEY=...
```

Add:
```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
SES_FROM_EMAIL=...
```

### 11.3 Test All Email Flows

- [ ] Registration → Email verification
- [ ] Forgot password → Reset email
- [ ] Workflow failure → Alert email
- [ ] Scheduled scan → Report email

---

## Security Checklist

- [ ] AWS credentials stored in `.env` (not committed to Git)
- [ ] IAM user has minimal permissions (only SES)
- [ ] Rate limiting enabled (10 emails/hour per address)
- [ ] Email validation implemented
- [ ] Unsubscribe link in all emails
- [ ] DKIM/SPF/DMARC configured for domain
- [ ] Monitor bounce/complaint rates
- [ ] CloudWatch alarms set up

---

## Support & Resources

**AWS SES Documentation:**
- https://docs.aws.amazon.com/ses/

**AWS SES Pricing:**
- https://aws.amazon.com/ses/pricing/

**AWS SES FAQs:**
- https://aws.amazon.com/ses/faqs/

**Email Best Practices:**
- https://docs.aws.amazon.com/ses/latest/dg/best-practices.html

**Need Help?**
- AWS Support (if you have paid plan)
- AWS Forums: https://repost.aws/
- Stack Overflow: Tag `amazon-ses`

---

## Quick Start Summary

1. ✅ Create AWS account
2. ✅ Create IAM user with SES permissions
3. ✅ Get AWS access key & secret key
4. ✅ Verify email or domain
5. ✅ Update `.env` with credentials
6. ✅ Test email sending
7. ✅ Request production access (for real users)
8. ✅ Monitor bounce/complaint rates

**You're ready to send emails at 1/5th the cost!** 🎉
