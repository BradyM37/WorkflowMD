/**
 * User Authentication System Test Script
 * Tests all authentication endpoints and flows
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';
let refreshToken = '';
let userId = '';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPass123',
  name: 'Test User',
  companyName: 'Test Company'
};

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message, err) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (err) {
    console.log(`   ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

function info(message) {
  console.log(`${colors.blue}ℹ  ${message}${colors.reset}`);
}

function header(message) {
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}${message}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

// Test functions
async function testRegistration() {
  header('TEST 1: User Registration');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/register`, testUser);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      refreshToken = response.data.data.refreshToken;
      userId = response.data.data.user.id;
      
      success('User registration successful');
      info(`User ID: ${userId}`);
      info(`Email: ${testUser.email}`);
      info(`Token received: ${authToken.substring(0, 20)}...`);
      return true;
    }
  } catch (err) {
    error('User registration failed', err.response?.data || err);
    return false;
  }
}

async function testLogin() {
  header('TEST 2: User Login');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      success('User login successful');
      info(`New token received: ${authToken.substring(0, 20)}...`);
      return true;
    }
  } catch (err) {
    error('User login failed', err.response?.data || err);
    return false;
  }
}

async function testGetCurrentUser() {
  header('TEST 3: Get Current User');
  
  try {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const user = response.data.data.user;
      success('Get current user successful');
      info(`User: ${user.name} (${user.email})`);
      info(`GHL Connected: ${response.data.data.ghl.connected}`);
      return true;
    }
  } catch (err) {
    error('Get current user failed', err.response?.data || err);
    return false;
  }
}

async function testInvalidToken() {
  header('TEST 4: Invalid Token Protection');
  
  try {
    await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token-here' }
    });
    
    error('Invalid token was accepted (should have failed!)');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      success('Invalid token rejected correctly');
      return true;
    }
    error('Unexpected error', err);
    return false;
  }
}

async function testUpdateProfile() {
  header('TEST 5: Update Profile');
  
  try {
    const response = await axios.put(
      `${API_BASE}/auth/profile`,
      {
        name: 'Updated Test User',
        companyName: 'Updated Company'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      success('Profile update successful');
      info(`New name: ${response.data.data.user.name}`);
      info(`New company: ${response.data.data.user.companyName}`);
      return true;
    }
  } catch (err) {
    error('Profile update failed', err.response?.data || err);
    return false;
  }
}

async function testChangePassword() {
  header('TEST 6: Change Password');
  
  const newPassword = 'NewTestPass456';
  
  try {
    const response = await axios.put(
      `${API_BASE}/auth/password`,
      {
        currentPassword: testUser.password,
        newPassword: newPassword
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      success('Password changed successfully');
      testUser.password = newPassword; // Update for future tests
      return true;
    }
  } catch (err) {
    error('Password change failed', err.response?.data || err);
    return false;
  }
}

async function testLoginWithNewPassword() {
  header('TEST 7: Login with New Password');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      success('Login with new password successful');
      return true;
    }
  } catch (err) {
    error('Login with new password failed', err.response?.data || err);
    return false;
  }
}

async function testTokenRefresh() {
  header('TEST 8: Token Refresh');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      refreshToken = response.data.data.refreshToken;
      success('Token refresh successful');
      info(`New token: ${authToken.substring(0, 20)}...`);
      return true;
    }
  } catch (err) {
    error('Token refresh failed', err.response?.data || err);
    return false;
  }
}

async function testAuthStatus() {
  header('TEST 9: Authentication Status');
  
  try {
    const response = await axios.get(`${API_BASE}/auth/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.authenticated) {
      success('Auth status check successful');
      info(`User ID: ${response.data.data.userId}`);
      info(`GHL Connected: ${response.data.data.ghlConnected}`);
      return true;
    }
  } catch (err) {
    error('Auth status check failed', err.response?.data || err);
    return false;
  }
}

async function testLogout() {
  header('TEST 10: User Logout');
  
  try {
    const response = await axios.post(
      `${API_BASE}/auth/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      success('User logout successful');
      return true;
    }
  } catch (err) {
    error('User logout failed', err.response?.data || err);
    return false;
  }
}

async function testForgotPassword() {
  header('TEST 11: Forgot Password');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/forgot-password`, {
      email: testUser.email
    });
    
    if (response.data.success) {
      success('Forgot password request successful');
      info('Password reset email would be sent');
      return true;
    }
  } catch (err) {
    error('Forgot password failed', err.response?.data || err);
    return false;
  }
}

async function testPasswordStrengthValidation() {
  header('TEST 12: Password Strength Validation');
  
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      email: `weak-${Date.now()}@example.com`,
      password: 'weak',
      name: 'Weak Password Test'
    });
    
    error('Weak password was accepted (should have failed!)');
    return false;
  } catch (err) {
    if (err.response?.status === 400) {
      success('Weak password rejected correctly');
      info(`Validation message: ${err.response.data.message}`);
      return true;
    }
    error('Unexpected error', err);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log(`\n${colors.blue}╔${'═'.repeat(58)}╗${colors.reset}`);
  console.log(`${colors.blue}║   USER AUTHENTICATION SYSTEM TEST SUITE                 ║${colors.reset}`);
  console.log(`${colors.blue}╚${'═'.repeat(58)}╝${colors.reset}\n`);
  
  info('Starting authentication system tests...');
  info(`API Base: ${API_BASE}\n`);
  
  const tests = [
    testRegistration,
    testLogin,
    testGetCurrentUser,
    testInvalidToken,
    testUpdateProfile,
    testChangePassword,
    testLoginWithNewPassword,
    testTokenRefresh,
    testAuthStatus,
    testLogout,
    testForgotPassword,
    testPasswordStrengthValidation
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      console.error('Test error:', err.message);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final results
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}TEST RESULTS${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.green}Passed: ${passed}/${tests.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}/${tests.length}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 ALL TESTS PASSED!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 3000 });
    return true;
  } catch (err) {
    console.log(`${colors.red}❌ Server not running at ${API_BASE}${colors.reset}`);
    console.log(`${colors.yellow}Please start the server with: npm run dev${colors.reset}\n`);
    return false;
  }
}

// Main
(async () => {
  if (await checkServer()) {
    await runAllTests();
  } else {
    process.exit(1);
  }
})();
