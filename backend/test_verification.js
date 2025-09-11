const { verifyPasswordHash } = require('./utils/simpleHash');

// Test with the actual stored hash
const testHash = 'aaa_7$1000$128$2c99ce4a$7c0239d2241a0677d0a62eccefab2f70';
const emails = ['test@example.com', 'user@bscse.uiu.ac.bd', 'admin@bscse.uiu.ac.bd'];

console.log('Testing with stored hash:', testHash);

// Test common passwords
const passwords = [
  'test', 'test123', 'password', 'admin', 'user', 
  '123456', '1234', 'qwerty', 'abc123', 'hello', 
  'world', 'student', 'edusync', 'demo', 'sample'
];

for (const email of emails) {
  console.log(`\n=== Testing with email: ${email} ===`);
  
  for (const pwd of passwords) {
    const result = verifyPasswordHash(pwd, testHash, email);
    if (result) {
      console.log(`*** MATCH FOUND ***`);
      console.log(`Password: "${pwd}"`);
      console.log(`Email: "${email}"`);
      console.log(`Result:`, result);
      break;
    }
  }
}
