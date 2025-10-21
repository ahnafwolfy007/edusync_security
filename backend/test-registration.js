const https = require('https');
const http = require('http');

async function testRegistration() {
  try {
    console.log('🧪 Testing registration endpoint...');
    
    const testData = {
      fullName: "Test User",
      email: "test@example.com",
      password: "123456",
      phone: "01234567890",
      institution: "Test University",
      location: "Dhaka",
      role: "student"
    };
    
    console.log('📤 Sending data:', testData);
    
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('� Status:', res.statusCode);
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode === 201) {
            console.log('✅ Registration successful!');
            console.log('📦 Response:', responseData);
          } else {
            console.log('❌ Registration failed!');
            console.log('� Response:', responseData);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:');
          console.log('📦 Raw response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRegistration();
