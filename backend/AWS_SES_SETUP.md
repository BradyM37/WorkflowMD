# AWS SES Setup Guide

Complete guide for setting up Amazon Simple Email Service (SES) for the GHL Workflow Debugger application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create AWS Account](#create-aws-account)
3. [Create IAM User for SES](#create-iam-user-for-ses)
4. [Configure SES](#configure-ses)
5. [Request Production Access](#request-production-access)
6. [Get Credentials for .env](#get-credentials-for-env)
7. [Environment Variables](#environment-variables)
8. [Testing](#testing)
9. [Cost Estimates](#cost-estimates)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)

---

## 1. Prerequisites

Before you begin, ensure you have:

- **Valid Email Address**: For AWS account creation and email verification
- **Credit/Debit Card**: Required for AWS account verification (won't be charged for free tier usage)
- **Domain Name (Optional but Recommended)**: 
  - If you own a domain, you can verify it for professional email sending
  - Alternatively, you can verify individual email addresses
- **Access to DNS Settings**: If verifying a domain, you'll need to add DNS records
- **Basic Command Line Knowledge**: For testing the integration

---

## 2. Create AWS Account

### Step-by-Step Process:

1. **Navigate to AWS Signup**
   - Go to: [https://aws.amazon.com/](https://aws.amazon.com/)
   - Click the **"Create an AWS Account"** button in the top-right corner

2. **Enter Account Information**
   - Provide your email address
   - Choose an AWS account name (e.g., "GHL-Debugger-Production")
   - Create a strong root password
   - Click **"Continue"**

3. **Contact Information**
   - Select account type: **"Personal"** or **"Professional"**
   - Fill in your contact details (name, phone, address)
   - Read and accept the AWS Customer Agreement
   - Click **"Continue"**

4. **Payment Information**
   - Enter credit/debit card details
   - AWS will charge $1 temporarily to verify the card (refunded immediately)
   - Click **"Verify and Continue"**

5. **Identity Verification**
   - Choose verification method: **SMS** or **Voice call**
   - Enter your phone number
   - Enter the verification code you receive
   - Click **"Continue"**

6. **Select Support Plan**
   - Choose **"Basic support - Free"** (sufficient for most use cases)
   - Click **"Complete sign up"**

7. **Account Activation**
   - Wait a few minutes for account activation
   - You'll receive a confirmation email
   - Sign in to the AWS Management Console: [https://console.aws.amazon.com/](https://console.aws.amazon.com/)

---

## 3. Create IAM User for SES

**Why?** Never use your root AWS account credentials in applications. IAM users provide secure, limited access.

### Steps:

1. **Navigate to IAM Console**
   - Sign in to AWS Management Console
   - Search for "IAM" in the top search bar
   - Click **"IAM"** (Identity and Access Management)

2. **Create New User**
   - In the left sidebar, click **"Users"**
   - Click **"Create user"** button
   - Enter username: `ses-ghl-debugger` (or your preferred name)
   - Click **"Next"**

3. **Set Permissions**
   - Select **"Attach policies directly"**
   - In the search box, type: `AmazonSESFullAccess`
   - Check the box next to **"AmazonSESFullAccess"** policy
   - Click **"Next"**
   - Review and click **"Create user"**

4. **Create Access Keys**
   - After user is created, click on the username to view details
   - Click the **"Security credentials"** tab
   - Scroll down to **"Access keys"** section
   - Click **"Create access key"**
   - Select use case: **"Application running outside AWS"**
   - Check the confirmation box
   - Click **"Next"**
   - (Optional) Add a description tag: "GHL Debugger SES Access"
   - Click **"Create access key"**

5. **Save Access Keys Securely**
   - **⚠️ CRITICAL**: This is the ONLY time you'll see the secret access key
   - Copy the **Access key ID** (starts with `AKIA`)
   - Copy the **Secret access key** (long random string)
   - Click **"Download .csv file"** for backup
   - Store these securely (password manager, encrypted file, etc.)
   - Click **"Done"**

---

## 4. Configure SES

### 4.1 Navigate to SES Console

1. In AWS Management Console, search for "SES"
2. Click **"Amazon Simple Email Service"**
3. **Important**: Select your region from the top-right dropdown
   - **Recommended**: `us-east-1` (US East - N. Virginia)
   - Ensure your region matches what you'll set in `.env` later

### 4.2 Verify Email Address (Quick Start)

**Use this method for testing or if you don't have a domain.**

1. In SES Console, click **"Verified identities"** in left sidebar
2. Click **"Create identity"**
3. Select **"Email address"**
4. Enter the email you want to send FROM (e.g., `noreply@yourdomain.com` or your personal email)
5. Click **"Create identity"**
6. Check your inbox for verification email from AWS
7. Click the verification link in the email
8. Return to SES console - status should show **"Verified"**

### 4.3 Verify Domain (Production/Professional)

**Use this method for production use with your own domain.**

1. In SES Console, click **"Verified identities"** in left sidebar
2. Click **"Create identity"**
3. Select **"Domain"**
4. Enter your domain: `yourdomain.com` (without www)
5. Check **"Use a custom MAIL FROM domain"** (optional but recommended)
6. Select **"Easy DKIM"** with 2048-bit keys
7. Click **"Create identity"**

8. **Add DNS Records**
   - AWS will provide DNS records (TXT, CNAME, MX)
   - Copy these records
   - Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
   - Add the DNS records provided by AWS
   - **DKIM Records**: Add 3 CNAME records for authentication
   - **Verification Record**: Add 1 TXT record
   - **(Optional) MAIL FROM**: Add MX and TXT records for custom MAIL FROM

9. **Wait for Verification**
   - DNS propagation can take 5 minutes to 72 hours
   - Typically completes within 15-30 minutes
   - Check "Verified identities" page - status will change to **"Verified"**

### Domain Verification Example:

If your domain is `example.com`, AWS might provide records like:

```
Type: TXT
Name: _amazonses.example.com
Value: [long verification string]

Type: CNAME
Name: abc123._domainkey.example.com
Value: abc123.dkim.amazonses.com

Type: CNAME
Name: def456._domainkey.example.com
Value: def456.dkim.amazonses.com

Type: CNAME
Name: ghi789._domainkey.example.com
Value: ghi789.dkim.amazonses.com
```

---

## 5. Request Production Access

### Why?

By default, AWS SES starts in **Sandbox Mode**, which has severe limitations:
- ❌ Can only send TO verified email addresses
- ❌ Can only send FROM verified email addresses/domains
- ❌ Limited to 200 emails per day
- ❌ 1 email per second send rate

Production access removes these limits.

### How to Request:

1. **Navigate to Account Dashboard**
   - In SES Console, click **"Account dashboard"** in left sidebar
   - Look for the alert: *"Your account is in the sandbox"*

2. **Open Support Case**
   - Click **"Request production access"** button
   - Or go to: [https://console.aws.amazon.com/support/home#/case/create](https://console.aws.amazon.com/support/home#/case/create)

3. **Fill Out Request Form**
   - **Mail Type**: Select **"Transactional"** (for workflow notifications, alerts)
   - **Website URL**: Your application URL or landing page
   - **Use Case Description**: Write a clear explanation. Example:

     ```
     We are building a SaaS application called "GHL Workflow Debugger" that helps
     GoHighLevel users analyze and optimize their marketing automation workflows.
     
     We need to send transactional emails for:
     - User registration confirmations
     - Password reset requests
     - Workflow analysis completion notifications
     - Critical system alerts
     
     We have implemented double opt-in for all users and will monitor bounce/complaint
     rates carefully. We expect to send approximately 1,000-5,000 emails per month
     initially, growing as our user base expands.
     
     We will only send emails to users who have explicitly signed up for our service.
     ```

   - **How you handle bounces/complaints**: Explain your process. Example:

     ```
     We will monitor the SES bounce and complaint rates via CloudWatch. Any email
     with a hard bounce will be automatically removed from our mailing list. We
     provide an unsubscribe link in every email and honor all opt-out requests
     immediately.
     ```

   - **Compliance**: Confirm you comply with AWS policies
   - Click **"Submit"**

4. **Wait for Approval**
   - **Typical approval time**: 24-48 hours (business days)
   - AWS may ask follow-up questions - respond promptly
   - You'll receive email notification when approved
   - Once approved, sandbox restrictions are removed

### While Waiting:

You can still develop and test using verified email addresses in sandbox mode.

---

## 6. Get Credentials for .env

You'll need three pieces of information for your `.env` file:

### Access Key ID

- Found in IAM Console → Users → [your user] → Security credentials → Access keys
- Starts with `AKIA`
- Example: `AKIAIOSFODNN7EXAMPLE`

### Secret Access Key

- Only shown once when you created the access key
- If you lost it, you must create a new access key (delete old one first)
- Long random string
- Example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

### AWS Region

- Must match the region where you verified your email/domain
- Common regions:
  - `us-east-1` (US East - N. Virginia) - **Recommended**
  - `us-west-2` (US West - Oregon)
  - `eu-west-1` (Europe - Ireland)
  - `ap-southeast-1` (Asia Pacific - Singapore)

### SES From Email

- Must be a verified email address or from a verified domain
- Examples:
  - `noreply@yourdomain.com` (domain verified)
  - `support@yourdomain.com` (domain verified)
  - `your-email@gmail.com` (email address verified)

---

## 7. Environment Variables

### Add to `.env` file:

Create or edit `C:\Users\Bdog3\Desktop\Application\backend\.env`:

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtn...
AWS_REGION=us-east-1

# SES Email Settings
SES_FROM_EMAIL=noreply@yourdomain.com
SES_FROM_NAME=GHL Workflow Debugger
```

### Example with Real Values:

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# SES Email Settings
SES_FROM_EMAIL=noreply@ghl-debugger.com
SES_FROM_NAME=GHL Workflow Debugger
```

### Security Reminders:

- ✅ Add `.env` to `.gitignore`
- ✅ Never commit `.env` to version control
- ✅ Never share these credentials publicly
- ✅ Use different credentials for dev/staging/production

---

## 8. Testing

### 8.1 Test SES Integration (Backend Running)

If your backend server is running locally:

```bash
# Test email sending endpoint
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email from GHL Debugger",
    "body": "If you receive this, AWS SES is configured correctly!"
  }'
```

### 8.2 Test with AWS CLI (Optional)

Install AWS CLI and configure with your credentials:

```bash
# Configure AWS CLI
aws configure
# Enter your Access Key ID, Secret Access Key, and region

# Send test email
aws ses send-email \
  --from noreply@yourdomain.com \
  --destination "ToAddresses=your-email@example.com" \
  --message "Subject={Data='Test Email',Charset=utf8},Body={Text={Data='This is a test email.',Charset=utf8}}" \
  --region us-east-1
```

### 8.3 Check Email Delivery

1. Check the recipient inbox (may take 1-2 minutes)
2. **If not received**, check:
   - Spam/junk folder
   - SES Console → "Account dashboard" → Check sending statistics
   - CloudWatch logs for errors
   - Verify the recipient email is verified (if in sandbox mode)

### 8.4 Verify Integration Status

Your application should have these endpoints:

```bash
# Check SES connection status
curl http://localhost:3000/api/email/status

# Send workflow analysis notification
curl -X POST http://localhost:3000/api/email/workflow-complete \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "workflowName": "Welcome Sequence",
    "analysisUrl": "https://app.ghl-debugger.com/analysis/abc123"
  }'
```

---

## 9. Cost Estimates

### Free Tier

- **62,000 emails per month** when sending from:
  - Amazon EC2 instance
  - AWS Elastic Beanstalk
  - AWS Lambda
- **Free forever** (not just 12 months)

### Standard Pricing (After Free Tier or from Non-AWS)

- **$0.10 per 1,000 emails**
- No upfront costs
- Pay only for what you send

### Monthly Cost Examples

| Emails/Month | Cost (Within Free Tier) | Cost (No Free Tier) |
|--------------|-------------------------|---------------------|
| 1,000        | $0.00                   | $0.10               |
| 10,000       | $0.00                   | $1.00               |
| 62,000       | $0.00                   | $6.20               |
| 100,000      | $3.80*                  | $10.00              |
| 500,000      | $43.80*                 | $50.00              |

*First 62,000 free, remainder at $0.10/1,000

### Additional Costs

- **Receiving emails**: $0.10 per 1,000 emails (if using SES for inbound)
- **Dedicated IP addresses**: $24.95/month per IP (optional, for high-volume senders)
- **Data transfer**: Typically negligible (included in EC2 costs)

### Cost Optimization Tips

1. **Use EC2 or Lambda**: Take advantage of the 62,000/month free tier
2. **Monitor bounce rates**: Reduce wasted sends
3. **Implement email preferences**: Let users choose notification frequency
4. **Batch non-urgent emails**: Send daily digests instead of individual emails

---

## 10. Troubleshooting

### Error: "Email address is not verified"

**Problem**: Sending to an unverified address in sandbox mode.

**Solution**:
1. Verify the recipient email address in SES Console, OR
2. Request production access (see Section 5)

```bash
# Verify in SES Console:
# 1. Go to "Verified identities"
# 2. Click "Create identity"
# 3. Select "Email address"
# 4. Enter recipient email
# 5. Check their inbox for verification link
```

### Error: "MessageRejected: Email address is not verified"

**Problem**: The FROM email is not verified.

**Solution**:
1. Verify the sender email/domain in SES Console
2. Ensure `SES_FROM_EMAIL` in `.env` matches verified identity
3. Wait for domain DNS verification to complete

### Sandbox Mode Limitations

**Problem**: Can only send to verified emails.

**Solution**:
- **For testing**: Verify your test email addresses
- **For production**: Request production access (Section 5)

### Error: "InvalidParameterValue: Missing credentials"

**Problem**: AWS credentials not configured properly.

**Solution**:
1. Check `.env` file has correct values
2. Restart your backend server
3. Verify no extra spaces or quotes around credentials
4. Ensure `.env` is in the correct directory

```bash
# Check credentials are loaded
node -e "require('dotenv').config(); console.log(process.env.AWS_ACCESS_KEY_ID)"
```

### Error: "Throttling: Rate exceeded"

**Problem**: Sending emails too quickly.

**Solution**:
- Sandbox: Limit to 1 email/second
- Production: Default 14 emails/second (can request increase)
- Implement retry logic with exponential backoff
- Use SES sending rate quotas

### IAM Permission Errors

**Problem**: "AccessDenied" or "UnauthorizedOperation"

**Solution**:
1. Verify IAM user has `AmazonSESFullAccess` policy attached
2. Check the IAM user is active
3. Regenerate access keys if necessary

### Emails Going to Spam

**Problem**: High spam complaint or bounce rate.

**Solution**:
1. Verify your domain (improves sender reputation)
2. Enable DKIM signing (done automatically with Easy DKIM)
3. Set up SPF record for your domain:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:amazonses.com ~all
   ```
4. Set up DMARC record:
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```
5. Use professional email content (avoid spam trigger words)
6. Include unsubscribe link
7. Monitor bounce/complaint rates in SES Console

### DNS Verification Taking Too Long

**Problem**: Domain verification stuck for hours.

**Solution**:
1. Verify DNS records were entered correctly (no typos)
2. Ensure no trailing dots in record names (unless required)
3. Check DNS propagation: [https://dnschecker.org/](https://dnschecker.org/)
4. Wait up to 72 hours for full global propagation
5. Try removing and re-adding DNS records

### CloudWatch Logging

Enable detailed logging for debugging:

```javascript
// In your backend code
const AWS = require('aws-sdk');
AWS.config.logger = console;

// Or set debug level
AWS.config.update({ logger: console, logLevel: 'debug' });
```

---

## 11. Security Best Practices

### Never Commit Credentials

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
aws-credentials.csv
```

Verify before committing:
```bash
git status
git diff
# Never see AWS credentials in output
```

### Use IAM Roles in Production

When deploying to AWS (EC2, Lambda, ECS):
1. Create an IAM role with `AmazonSESFullAccess`
2. Attach role to your compute resource
3. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from `.env`
4. AWS SDK will automatically use the role credentials

### Rotate Keys Periodically

Best practice: Rotate access keys every 90 days.

```bash
# IAM Console → Users → [user] → Security credentials
# 1. Create new access key
# 2. Update .env with new credentials
# 3. Test application
# 4. Delete old access key
```

### Principle of Least Privilege

For production, create a custom policy instead of `AmazonSESFullAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

This only allows sending emails, not modifying SES configuration.

### Monitor Bounce and Complaint Rates

AWS will suspend your account if rates are too high:
- **Bounce rate**: Keep below 5%
- **Complaint rate**: Keep below 0.1%

Set up CloudWatch alarms:
1. SES Console → Account dashboard → Reputation metrics
2. Create alarms for bounce/complaint thresholds
3. Automatically pause sending if rates spike

### Implement Email Verification

Use double opt-in for user signups:
1. User registers
2. Send confirmation email
3. User clicks link to verify
4. Only then add to mailing list

### Secure Error Handling

Never expose credentials in logs:

```javascript
// ❌ BAD
console.log('AWS Error:', error);

// ✅ GOOD
console.log('AWS Error:', {
  code: error.code,
  message: error.message,
  requestId: error.requestId
});
```

### Use Environment-Specific Credentials

```bash
# .env.development
AWS_ACCESS_KEY_ID=AKIA_DEV_KEY
SES_FROM_EMAIL=dev@yourdomain.com

# .env.production
AWS_ACCESS_KEY_ID=AKIA_PROD_KEY
SES_FROM_EMAIL=noreply@yourdomain.com
```

Never use production credentials in development.

### Enable MFA on AWS Account

1. AWS Console → Account (top-right) → Security Credentials
2. Multi-factor authentication → Activate MFA
3. Use authenticator app (Authy, Google Authenticator, 1Password)

### Monitor with CloudWatch

Set up monitoring:
- Failed send attempts
- Bounces and complaints
- API call patterns (detect unauthorized usage)
- Cost alerts (detect abuse)

### Regular Security Audits

Monthly checklist:
- [ ] Review IAM user access (remove unused accounts)
- [ ] Check active access keys
- [ ] Review SES sending statistics
- [ ] Verify DNS records still correct
- [ ] Review CloudWatch logs for anomalies
- [ ] Check AWS bill for unexpected charges

---

## Next Steps

✅ AWS account created
✅ IAM user configured
✅ SES verified (email or domain)
✅ Production access requested
✅ Credentials added to `.env`
✅ Integration tested

### You're ready to:

1. Integrate with your backend code (see `emailService.js`)
2. Test sending emails from your application
3. Monitor sending statistics in SES Console
4. Scale as your user base grows

### Useful Links

- [SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [SES API Reference](https://docs.aws.amazon.com/ses/latest/APIReference/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html)
- [SES Sending Limits](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)

---

**Questions or issues?** Check the Troubleshooting section or consult AWS Support.

**Last Updated**: 2025
