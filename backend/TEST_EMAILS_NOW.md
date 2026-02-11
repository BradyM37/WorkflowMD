# Test AWS SES Emails RIGHT NOW! 🚀

## Quick 3-Minute Setup

### Step 1: Update .env File (30 seconds)

```bash
# Add to your .env file:
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
AWS_REGION=us-east-1
SES_FROM_EMAIL=your-verified-email@gmail.com
SES_FROM_NAME=GHL Workflow Debugger
FRONTEND_URL=http://localhost:3001
```

**Don't have AWS credentials yet?** See `AWS_SES_SETUP.md` (15 min setup)

---

### Step 2: Start Backend (10 seconds)

```bash
cd C:\Users\Bdog3\Desktop\Application\backend
npm run dev
```

Wait for: `Server running on port 3000 ✅`

---

### Step 3: Test All Email Templates (2 minutes)

#### Option A: Use Provided Test Script

```bash
# Test all emails at once
node test-all-emails.js
```

#### Option B: Test Individually with curl

**1. Test AWS SES Connection:**
```bash
curl -X POST http://localhost:3000/api/test/email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\"}"
```

**2. Password Reset Email:**
```bash
curl -X POST http://localhost:3000/api/test/email/password-reset ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\"}"
```

**3. Email Verification:**
```bash
curl -X POST http://localhost:3000/api/test/email/verification ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\"}"
```

**4. Welcome Email:**
```bash
curl -X POST http://localhost:3000/api/test/email/welcome ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\", \"name\": \"John Doe\"}"
```

**5. Workflow Alert (Warning):**
```bash
curl -X POST http://localhost:3000/api/test/email/alert ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\", \"severity\": \"warning\"}"
```

**6. Workflow Alert (Critical):**
```bash
curl -X POST http://localhost:3000/api/test/email/alert ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\", \"severity\": \"critical\"}"
```

**7. Scheduled Scan Report:**
```bash
curl -X POST http://localhost:3000/api/test/email/report ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"your-email@gmail.com\"}"
```

---

### Step 4: Check Your Inbox! 📧

You should receive 7 beautiful, branded emails with:
- ✅ Purple gradient header (#667eea → #764ba2)
- ✅ Responsive mobile design
- ✅ Clear call-to-action buttons
- ✅ Professional styling
- ✅ Unsubscribe footer

---

## 🎨 What Each Email Looks Like

### 1. Configuration Test Email
- **Subject:** ✅ AWS SES Test Email
- **Content:** Confirmation that AWS SES is working
- **CTA:** None (just confirmation)

### 2. Password Reset Email
- **Subject:** 🔐 Reset Your Password - GHL Workflow Debugger
- **Content:** Secure reset link with 1-hour expiration
- **CTA:** Big "Reset Password" button
- **Warning:** "Didn't request this?" section

### 3. Email Verification
- **Subject:** ✉️ Verify Your Email - GHL Workflow Debugger
- **Content:** Verification link with benefits list
- **CTA:** "Verify Email" button
- **Expiry:** 24 hours

### 4. Welcome Email
- **Subject:** 🎉 Welcome to GHL Workflow Debugger!
- **Content:** Friendly welcome + 4-step quick start guide
- **CTA:** "Go to Dashboard" button
- **Extra:** Pro tips included

### 5. Workflow Alert (Warning)
- **Subject:** ⚠️ WARNING: Test Payment Workflow
- **Content:** Warning-level alert with orange styling
- **CTA:** "View Workflow" button
- **Details:** Issue description + recommendation

### 6. Workflow Alert (Critical)
- **Subject:** 🚨 CRITICAL: Test Payment Workflow
- **Content:** Critical alert with red styling
- **CTA:** "View Workflow" button
- **Urgency:** Immediate attention needed

### 7. Scheduled Scan Report
- **Subject:** 📊 Workflow Health Report: 12 workflows scanned
- **Content:** Summary stats + health scores
- **Sections:**
  - Total workflows scanned
  - Issues found
  - Critical issues
  - Average health score
  - Top 5 workflows needing attention
- **CTA:** "View Full Report" button

---

## 🐛 Troubleshooting

### Error: "Email address is not verified"

**Solution:** You're in AWS SES Sandbox mode. Either:
1. Verify your email in AWS SES Console
2. Request production access (see `AWS_SES_SETUP.md`)

**Quick fix for testing:**
```bash
# Use your AWS console to verify your email:
# 1. Go to AWS SES Console
# 2. Verified Identities → Create Identity
# 3. Select "Email address"
# 4. Enter your email
# 5. Check your inbox for verification link
```

### Error: "Missing credentials in config"

**Solution:** Check your `.env` file has:
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
```

### Error: "Could not load credentials from any providers"

**Solution:** Your AWS credentials are invalid. Generate new ones:
1. AWS Console → IAM → Users → Your User
2. Security Credentials → Create Access Key
3. Copy both keys to `.env`

### Emails Not Arriving

**Check:**
1. Spam/Junk folder
2. AWS SES Console → Email sending → Sending statistics
3. Backend console logs for errors

---

## 📊 Expected Response Format

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Test email sent successfully to your-email@gmail.com. Check your inbox!",
    "provider": "AWS SES",
    "cost": "$0.0001 per email"
  }
}
```

---

## 🎯 Quick Checklist

Before testing, make sure:
- [ ] Backend is running (`npm run dev`)
- [ ] `.env` has AWS credentials
- [ ] AWS SES is configured (or email verified for sandbox)
- [ ] Email address in command is correct
- [ ] Port 3000 is not blocked by firewall

---

## 💡 Pro Tips

**Test all templates at once:**
```bash
# Replace YOUR_EMAIL with your actual email
$EMAIL="your-email@gmail.com"

curl -X POST http://localhost:3000/api/test/email -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\"}"
curl -X POST http://localhost:3000/api/test/email/password-reset -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\"}"
curl -X POST http://localhost:3000/api/test/email/verification -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\"}"
curl -X POST http://localhost:3000/api/test/email/welcome -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\", \"name\": \"Test User\"}"
curl -X POST http://localhost:3000/api/test/email/alert -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\", \"severity\": \"warning\"}"
curl -X POST http://localhost:3000/api/test/email/report -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\"}"
```

**Use Postman/Insomnia:**
- Import collection: `POST http://localhost:3000/api/test/email`
- Body: `{"email": "your-email@gmail.com"}`
- Much easier for repeated testing!

**Check email sending stats:**
```bash
curl http://localhost:3000/api/test/email/templates
```

---

## 🚀 Real User Flow Testing

### Test Registration Flow:
```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"newuser@gmail.com\", \"password\": \"SecurePass123!\", \"name\": \"New User\"}"
```

**Sends 2 emails:**
1. Email verification
2. Welcome email

### Test Password Reset Flow:
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"newuser@gmail.com\"}"
```

**Sends 1 email:**
1. Password reset with secure token

---

## 📧 All Test Endpoints

| Endpoint | Method | Body | Email Sent |
|----------|--------|------|------------|
| `/test/email` | POST | `{"email": "..."}` | Configuration Test |
| `/test/email/password-reset` | POST | `{"email": "..."}` | Password Reset |
| `/test/email/verification` | POST | `{"email": "..."}` | Email Verification |
| `/test/email/welcome` | POST | `{"email": "...", "name": "..."}` | Welcome |
| `/test/email/alert` | POST | `{"email": "...", "severity": "..."}` | Workflow Alert |
| `/test/email/report` | POST | `{"email": "..."}` | Scan Report |
| `/test/email/templates` | GET | None | (Returns list) |

---

## ⏱️ Time Investment

- **Setup .env:** 30 seconds
- **Start backend:** 10 seconds
- **Test one email:** 5 seconds
- **Test all emails:** 2 minutes
- **Total:** **3 minutes to see all templates!**

---

## 🎉 What You'll See

After testing, you'll have 7 professional emails in your inbox:
1. ✅ Configuration test
2. 🔐 Password reset
3. ✉️ Email verification
4. 🎉 Welcome email
5. ⚠️ Warning alert
6. 🚨 Critical alert
7. 📊 Scan report

**All with beautiful purple gradient branding and responsive design!**

---

## 📞 Need Help?

1. Check `AWS_SES_SETUP.md` for detailed AWS setup
2. Check `AWS_SES_INTEGRATION_COMPLETE.md` for full documentation
3. Check backend console logs for detailed errors
4. Check AWS SES Console → Sending Statistics for delivery metrics

---

**Ready? Start testing now!** 🚀

```bash
npm run dev
# Then run the curl commands above!
```
