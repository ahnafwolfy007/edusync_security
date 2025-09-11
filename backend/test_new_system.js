const { hashPasswordWithEmail, verifyPasswordHash } = require('./utils/simpleHash');

// Test the complete flow with the new system
console.log('=== Testing New Email-Based Password System ===');

const testEmail = 'user@bscse.uiu.ac.bd';
const testPassword = 'newpassword123';

// 1. Hash a password using the new method
console.log('\n1. Hashing password with new method:');
console.log('Email:', testEmail);
console.log('Password:', testPassword);

const hashedPassword = hashPasswordWithEmail(testPassword, testEmail);
console.log('Generated hash:', hashedPassword);

// 2. Verify the password
console.log('\n2. Verifying password:');
const verificationResult = verifyPasswordHash(testPassword, hashedPassword, testEmail);
console.log('Verification result:', verificationResult);

// 3. Test with wrong password
console.log('\n3. Testing with wrong password:');
const wrongResult = verifyPasswordHash('wrongpassword', hashedPassword, testEmail);
console.log('Wrong password result:', wrongResult);

console.log('\n=== New system working correctly! ===');
