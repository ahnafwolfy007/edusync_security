const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testForgotPasswordFlow() {
  console.log('🚀 Testing Forgot Password Flow\n');

  try {
    // Step 1: Request password reset
    console.log('1. Requesting password reset...');
    const resetResponse = await axios.post(`${BASE_URL}/forgot-password/request`, {
      email: 'user@bscse.uiu.ac.bd'
    });
    
    console.log('✅ Reset request successful');
    console.log('Response:', resetResponse.data);
    
    const resetToken = resetResponse.data.resetToken;
    if (!resetToken) {
      console.log('❌ No reset token provided (check if in development mode)');
      return;
    }
    
    console.log('🔑 Reset token:', resetToken);

    // Step 2: Verify token
    console.log('\n2. Verifying reset token...');
    const verifyResponse = await axios.post(`${BASE_URL}/forgot-password/verify-token`, {
      token: resetToken
    });
    
    console.log('✅ Token verification successful');
    console.log('Response:', verifyResponse.data);

    // Step 3: Reset password
    console.log('\n3. Resetting password...');
    const newPassword = 'newpassword123';
    const resetPasswordResponse = await axios.post(`${BASE_URL}/forgot-password/reset`, {
      token: resetToken,
      newPassword: newPassword,
      confirmPassword: newPassword
    });
    
    console.log('✅ Password reset successful');
    console.log('Response:', resetPasswordResponse.data);

    // Step 4: Test login with new password
    console.log('\n4. Testing login with new password...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@bscse.uiu.ac.bd',
      password: newPassword
    });
    
    console.log('✅ Login with new password successful');
    console.log('Login response:', {
      success: loginResponse.data.success,
      message: loginResponse.data.message,
      user: loginResponse.data.data?.user?.email
    });

    console.log('\n🎉 All tests passed! Forgot password flow is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases\n');

  try {
    // Test invalid email
    console.log('1. Testing invalid email...');
    try {
      await axios.post(`${BASE_URL}/forgot-password/request`, {
        email: 'nonexistent@email.com'
      });
      console.log('✅ Invalid email handled gracefully');
    } catch (error) {
      console.log('ℹ️ Error response for invalid email:', error.response?.data);
    }

    // Test invalid token
    console.log('\n2. Testing invalid token...');
    try {
      await axios.post(`${BASE_URL}/forgot-password/verify-token`, {
        token: 'invalid-token'
      });
    } catch (error) {
      console.log('✅ Invalid token properly rejected:', error.response?.data?.message);
    }

    // Test password mismatch
    console.log('\n3. Testing password mismatch...');
    try {
      await axios.post(`${BASE_URL}/forgot-password/reset`, {
        token: 'some-token',
        newPassword: 'password1',
        confirmPassword: 'password2'
      });
    } catch (error) {
      console.log('✅ Password mismatch properly rejected:', error.response?.data?.message);
    }

  } catch (error) {
    console.error('Error in error case testing:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🔧 Make sure the backend server is running on port 5000\n');
  
  // Wait a moment for user to start server
  console.log('Starting tests in 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await testForgotPasswordFlow();
  await testErrorCases();
}

if (require.main === module) {
  runTests();
}

module.exports = { testForgotPasswordFlow, testErrorCases };
