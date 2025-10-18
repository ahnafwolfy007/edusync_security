/**
 * Test file to verify input sanitization functions
 */

const InputSanitizer = require('./backend/utils/inputSanitization');

console.log('🧪 Testing Input Sanitization Functions\n');

// Test HTML sanitization
console.log('1. HTML Sanitization:');
const maliciousHTML = '<script>alert("XSS")</script><p>Normal text</p><img src="x" onerror="alert(1)">';
const sanitizedHTML = InputSanitizer.sanitizeHTML(maliciousHTML);
console.log(`Input: ${maliciousHTML}`);
console.log(`Output: ${sanitizedHTML}\n`);

// Test email validation
console.log('2. Email Validation:');
const testEmails = [
    'test@bscse.uiu.ac.bd',
    'invalid-email',
    'test+script@bscse.uiu.ac.bd',
    '<script>alert(1)</script>@test.com'
];

testEmails.forEach(email => {
    const result = InputSanitizer.validateEmail(email);
    console.log(`${email} -> ${result}`);
});
console.log();

// Test password validation
console.log('3. Password Validation:');
const testPasswords = [
    'weak',
    'StrongPass123!',
    'password',
    'NoNumbers!',
    'nonumbersorspecial'
];

testPasswords.forEach(password => {
    const result = InputSanitizer.validatePassword(password);
    console.log(`${password} -> Valid: ${result.valid}, Errors: ${result.errors.join(', ')}`);
});
console.log();

// Test SQL injection prevention
console.log('4. SQL Injection Prevention:');
const maliciousSQL = "'; DROP TABLE users; --";
const sanitizedSQL = InputSanitizer.sanitizeSQL(maliciousSQL);
console.log(`Input: ${maliciousSQL}`);
console.log(`Output: ${sanitizedSQL}\n`);

// Test filename sanitization
console.log('5. Filename Sanitization:');
const maliciousFilenames = [
    '../../../etc/passwd',
    'normal-file.jpg',
    'file with spaces.pdf',
    'script<script>.js',
    '../../Windows/System32/config'
];

maliciousFilenames.forEach(filename => {
    const sanitized = InputSanitizer.sanitizeFilename(filename);
    console.log(`${filename} -> ${sanitized}`);
});
console.log();

// Test URL sanitization
console.log('6. URL Sanitization:');
const testUrls = [
    'https://example.com',
    'javascript:alert(1)',
    'http://valid-site.com/path',
    'ftp://invalid-protocol.com',
    'data:text/html,<script>alert(1)</script>'
];

testUrls.forEach(url => {
    const sanitized = InputSanitizer.sanitizeURL(url);
    console.log(`${url} -> ${sanitized}`);
});
console.log();

// Test ObjectId validation
console.log('7. ObjectId Validation:');
const testIds = [
    '507f1f77bcf86cd799439011',
    'invalid-id',
    '507f1f77bcf86cd79943901g',
    '507f1f77bcf86cd799439011'
];

testIds.forEach(id => {
    const valid = InputSanitizer.validateObjectId(id);
    console.log(`${id} -> ${valid}`);
});
console.log();

// Test number validation
console.log('8. Number Validation:');
const testNumbers = [
    { value: '123', min: 0, max: 200 },
    { value: 'abc', min: 0, max: 100 },
    { value: '150', min: 0, max: 100 },
    { value: '50.5', min: 0, max: 100 }
];

testNumbers.forEach(test => {
    const result = InputSanitizer.validateNumber(test.value, test.min, test.max);
    console.log(`${test.value} (${test.min}-${test.max}) -> Valid: ${result.valid}, Value: ${result.value}, Error: ${result.error}`);
});
console.log();

console.log('✅ All sanitization tests completed!');
console.log('\n📋 Summary of implemented security features:');
console.log('- HTML/XSS sanitization');
console.log('- SQL injection prevention');
console.log('- Email validation');
console.log('- Password strength validation');
console.log('- Filename sanitization for uploads');
console.log('- URL validation and sanitization');
console.log('- MongoDB ObjectId validation');
console.log('- Number validation with range checking');
console.log('- Rate limiting functionality');
console.log('- Global request sanitization middleware');