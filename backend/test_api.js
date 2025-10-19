const axios = require('axios');

async function testUserAPI() {
  try {
    console.log('🔄 Testing /admin/users API endpoint...');
    
    // First, let's try to get an admin token (you might need to modify this based on your auth)
    const response = await axios.get('http://localhost:5001/api/admin/users', {
      headers: {
        'Authorization': 'Bearer test_token' // This will likely fail, but let's see the response
      }
    });
    
    console.log('✅ API Response:', response.data);
  } catch (error) {
    console.log('❌ API Error:', error.response?.status, error.response?.data || error.message);
    
    // Let's try without auth to see if server is running
    try {
      const healthCheck = await axios.get('http://localhost:5001/api/health');
      console.log('✅ Server is running:', healthCheck.data);
    } catch (healthError) {
      console.log('❌ Server not responding:', healthError.message);
    }
  }
}

testUserAPI();