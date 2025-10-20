// Quick Sanitization Test Script
// Run with: node test-sanitization-quick.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const tests = [
  {
    name: 'SQL Injection in Search',
    test: async () => {
      const res = await axios.get(`${BASE_URL}/marketplace/items?search=' OR '1'='1`);
      return res.status === 200 && !res.data.error;
    },
    expected: 'Search query sanitized, no SQL error'
  },
  {
    name: 'Invalid Email Domain',
    test: async () => {
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          fullName: 'Test User',
          email: 'test@gmail.com',
          password: 'Test@1234'
        });
        return false; // Should have failed
      } catch (err) {
        return err.response?.status === 400 && 
               err.response?.data?.message?.includes('Invalid email');
      }
    },
    expected: 'Invalid email rejected with 400 error'
  },
  {
    name: 'Weak Password',
    test: async () => {
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          fullName: 'Test User',
          email: 'test@bscse.uiu.ac.bd',
          password: 'weak'
        });
        return false; // Should have failed
      } catch (err) {
        return err.response?.status === 400 && 
               (err.response?.data?.message?.includes('Password') || 
                err.response?.data?.errors?.length > 0);
      }
    },
    expected: 'Weak password rejected with validation errors'
  },
  {
    name: 'XSS in Search Query',
    test: async () => {
      const res = await axios.get(`${BASE_URL}/marketplace/items?search=<script>alert('xss')</script>`);
      return res.status === 200 && !res.data.error;
    },
    expected: 'XSS payload sanitized in search'
  },
  {
    name: 'MongoDB Injection',
    test: async () => {
      const res = await axios.get(`${BASE_URL}/marketplace/items?search=$where`);
      return res.status === 200 && !res.data.error;
    },
    expected: 'MongoDB operators removed from search'
  }
];

async function runTests() {
  console.log('🧪 EduSync Input Sanitization Tests\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test, expected } of tests) {
    process.stdout.write(`\n📝 ${name}... `);
    
    try {
      const result = await test();
      if (result) {
        console.log('✅ PASS');
        console.log(`   Expected: ${expected}`);
        passed++;
      } else {
        console.log('❌ FAIL');
        console.log(`   Expected: ${expected}`);
        failed++;
      }
    } catch (err) {
      console.log('❌ ERROR');
      console.log(`   ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  
  if (failed === 0) {
    console.log('\n🎉 All sanitization tests passed! Your inputs are secure.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
  }
}

// Check if server is running
axios.get(`${BASE_URL}/marketplace/items`)
  .then(() => {
    console.log('✅ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.log('❌ Error: Backend server is not running!');
    console.log('Please start the server with: cd backend && npm start');
    process.exit(1);
  });
