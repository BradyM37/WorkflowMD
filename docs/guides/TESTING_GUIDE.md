# Authentication System Testing Guide

## Quick Start Testing

### Prerequisites
```bash
cd C:\Users\Bdog3\Desktop\Application\frontend
npm install
npm start
```

The app will open at `http://localhost:3000`

---

## Test Scenarios

### 1. New User Registration Flow

**Steps:**
1. Navigate to `http://localhost:3000` → Should redirect to `/login`
2. Click "Register here" link
3. Fill out the registration form:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Company: "Test Company" (optional)
   - Password: "password123"
   - Confirm Password: "password123"
4. Click "Create Account"

**Expected Results:**
- ✅ Form validates all fields
- ✅ Password strength check works
- ✅ Success message appears
- ✅ Redirects to `/email-verification-sent`
- ✅ Shows confirmation with email address

---

### 2. Login Flow (First Time)

**Steps:**
1. Go to `/login`
2. Enter credentials:
   - Email: "john@example.com"
   - Password: "password123"
3. Check "Remember me"
4. Click "Login"

**Expected Results:**
- ✅ Success message appears
- ✅ Redirects to `/connect-ghl` (no GHL connected yet)
- ✅ Shows welcome message with user name
- ✅ User can connect GHL or skip for demo

---

### 3. GHL Connection Flow

**On `/connect-ghl` page:**

**Option A: Connect GHL**
1. Click "Connect with GoHighLevel" button

**Expected Results:**
- ✅ (In production) Redirects to GHL OAuth
- ✅ (Demo mode) Sets GHL connected flag
- ✅ Redirects to `/dashboard`

**Option B: Skip for Demo**
1. Click "Skip for now (Demo Mode)" link

**Expected Results:**
- ✅ Sets demo GHL flag
- ✅ Redirects to `/dashboard`

---

### 4. Subsequent Login (GHL Already Connected)

**Steps:**
1. Logout from dashboard
2. Go to `/login`
3. Enter same credentials
4. Click "Login"

**Expected Results:**
- ✅ Success message appears
- ✅ Redirects directly to `/dashboard` (skips GHL connection)
- ✅ Dashboard loads normally

---

### 5. Forgot Password Flow

**Steps:**
1. On `/login`, click "Forgot password?" link
2. Enter email: "john@example.com"
3. Click "Send Reset Link"

**Expected Results:**
- ✅ Success message appears
- ✅ Shows "Check Your Email" confirmation
- ✅ Displays the email address
- ✅ Can click "try again" to resend

**Reset Password:**
1. Navigate to `/reset-password/mock-token-123`
2. Enter new password: "newpassword123"
3. Confirm password: "newpassword123"
4. Click "Reset Password"

**Expected Results:**
- ✅ Success message appears
- ✅ Shows success screen
- ✅ Auto-redirects to `/login` after 2 seconds
- ✅ Can login with new password

---

### 6. User Profile Dropdown

**Steps:**
1. Login and go to dashboard
2. Click on the user avatar/name in the header (top right)

**Expected Results:**
- ✅ Dropdown menu appears
- ✅ Shows user name, email, company
- ✅ Shows subscription badge (FREE or PRO)
- ✅ Shows GHL connection status
- ✅ Menu items work:
  - Profile Settings → `/settings`
  - Manage GHL Connection → `/connect-ghl`
  - Upgrade to Pro → `/pricing` (if free tier)
  - Logout → clears session and redirects to `/login`

---

### 7. Protected Routes

**Test without login:**
1. Open incognito window
2. Try to access:
   - `/dashboard`
   - `/settings`
   - `/workflow-graph`
   - `/connect-ghl`

**Expected Results:**
- ✅ All redirect to `/login`
- ✅ Shows login page
- ✅ After login, returns to attempted page (if applicable)

**Test with login:**
1. Login normally
2. Try to access:
   - `/login` → redirects to `/dashboard`
   - `/register` → redirects to `/dashboard`
   - `/forgot-password` → redirects to `/dashboard`

**Expected Results:**
- ✅ Auth pages redirect to dashboard when already logged in

---

### 8. Remember Me Functionality

**Steps:**
1. Login with "Remember me" checked
2. Close browser completely
3. Reopen browser and go to `http://localhost:3000`

**Expected Results:**
- ✅ Still logged in (no redirect to login)
- ✅ Goes directly to dashboard
- ✅ User info still in header

---

### 9. Logout Functionality

**Steps:**
1. Login to dashboard
2. Click user avatar → "Logout"

**Expected Results:**
- ✅ Redirects to `/login`
- ✅ User info cleared from header
- ✅ Cannot access protected routes
- ✅ localStorage cleared:
  - `user`
  - `auth_token`
  - `demo_mode`
  - `location_id`
  - `ghl_connected`

---

### 10. Form Validations

**Test Registration Form:**
- [ ] Empty name → Error
- [ ] Invalid email format → Error
- [ ] Password < 8 chars → Error
- [ ] Passwords don't match → Error
- [ ] All valid → Success

**Test Login Form:**
- [ ] Empty email → Error
- [ ] Invalid email format → Error
- [ ] Empty password → Error
- [ ] Valid credentials → Success

**Test Forgot Password:**
- [ ] Empty email → Error
- [ ] Invalid email format → Error
- [ ] Valid email → Success

**Test Reset Password:**
- [ ] Empty password → Error
- [ ] Password < 8 chars → Error
- [ ] Passwords don't match → Error
- [ ] All valid → Success

---

### 11. Mobile Responsiveness

**Test on mobile viewport (resize browser to 375px width):**

**Expected Results:**
- ✅ Login page responsive
- ✅ Register form stacks vertically
- ✅ Header adjusts (padding reduced)
- ✅ Cards full width
- ✅ Buttons full width
- ✅ User dropdown works on mobile
- ✅ No horizontal scroll

---

### 12. Dark Mode Compatibility

**Steps:**
1. Login to dashboard
2. Toggle dark mode (sun/moon icon in header)

**Expected Results:**
- ✅ All auth pages support dark mode
- ✅ Forms readable in dark mode
- ✅ Cards adjust colors
- ✅ Text contrast maintained
- ✅ Gradients still visible

---

### 13. Browser Compatibility

**Test in:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest, if on Mac)

**All features should work:**
- [ ] Login/Register
- [ ] Password show/hide
- [ ] Form validation
- [ ] Navigation
- [ ] Profile dropdown

---

### 14. Error Handling

**Test Invalid Credentials:**
1. Go to `/login`
2. Enter wrong password
3. Click "Login"

**Expected Results:**
- ✅ Error message appears
- ✅ Form doesn't clear
- ✅ User can try again

**Test Network Errors (simulate):**
1. Disconnect internet
2. Try to login

**Expected Results:**
- ✅ Error message appears
- ✅ Doesn't crash app
- ✅ User can retry when connection restored

---

### 15. Session Persistence

**Test Page Refresh:**
1. Login to dashboard
2. Refresh page (F5)

**Expected Results:**
- ✅ Still logged in
- ✅ Dashboard loads normally
- ✅ User info still in header

**Test Navigation:**
1. Login and go to settings
2. Click browser back button
3. Navigate to different pages

**Expected Results:**
- ✅ Auth state maintained
- ✅ No unexpected logouts
- ✅ User info consistent

---

## Common Issues & Solutions

### Issue: Build Errors
**Solution:** 
```bash
rm -rf node_modules
npm install
npm start
```

### Issue: Port Already in Use
**Solution:**
```bash
# Kill process on port 3000
npx kill-port 3000
npm start
```

### Issue: LocalStorage Not Clearing
**Solution:**
1. Open DevTools (F12)
2. Application → Local Storage
3. Right-click → Clear
4. Refresh page

### Issue: Routing Not Working
**Solution:**
- Ensure BrowserRouter is wrapping App
- Check route paths match exactly
- Verify PrivateRoute logic

---

## Debug Mode

**View Auth State:**
1. Open DevTools (F12)
2. Console tab
3. Type: `localStorage`
4. Check these keys:
   - `user`
   - `auth_token`
   - `demo_mode`
   - `location_id`
   - `ghl_connected`
   - `remember_me`

**Clear All Data:**
```javascript
localStorage.clear();
window.location.reload();
```

---

## Performance Testing

### Load Times
- [ ] Login page loads < 1s
- [ ] Registration page loads < 1s
- [ ] Dashboard loads < 2s after login
- [ ] No blocking during auth check

### Bundle Size
- Current: ~613 KB (gzipped)
- Target: < 700 KB
- Monitor with: `npm run build`

---

## Accessibility Testing

**Keyboard Navigation:**
1. Tab through all forms
2. Enter to submit
3. Esc to close dropdowns

**Expected Results:**
- ✅ All inputs focusable
- ✅ Focus indicators visible
- ✅ Tab order logical
- ✅ No keyboard traps

**Screen Reader:**
- [ ] Form labels announced
- [ ] Error messages announced
- [ ] Button purposes clear

---

## Security Checklist

- [ ] Passwords not visible by default
- [ ] Password show/hide toggle works
- [ ] No passwords in console logs
- [ ] No sensitive data in URLs
- [ ] HTTPS in production (future)
- [ ] Session timeout (future)

---

## Demo Accounts for Testing

```javascript
// Already registered (use for login tests)
Email: demo@example.com
Password: password123

// Use for new registration
Email: test@example.com
Password: testpass123
Name: Test User
Company: Test Company
```

---

## Automated Testing (Future)

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
# Install Cypress
npm install --save-dev cypress

# Run tests
npx cypress open
```

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Environment variables set
- [ ] API endpoints configured
- [ ] Email service integrated
- [ ] GHL OAuth configured
- [ ] Analytics added
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Security audit passed

---

**Happy Testing! 🎉**

For issues or questions, contact: support@ghlworkflowdebugger.com
