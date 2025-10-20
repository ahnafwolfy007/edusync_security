// Test sanitization and clean database
const dbConfig = require('./backend/config/db');
const InputSanitizer = require('./backend/utils/inputSanitization');

async function testSanitization() {
    console.log('🧪 Testing Input Sanitization...\n');
    
    // Test cases
    const tests = [
        {
            name: 'XSS Script Tag',
            input: '<script>alert("XSS")</script>Hello',
            method: 'sanitizeText',
            expected: 'Hello'
        },
        {
            name: 'XSS Image Tag',
            input: '<img src=x onerror=alert("XSS")>Test',
            method: 'sanitizeText',
            expected: 'Test'
        },
        {
            name: 'SQL Injection',
            input: "'; DROP TABLE users; --",
            method: 'sanitizeSQL',
            expected: 'DROP TABLE users'
        },
        {
            name: 'HTML with Script',
            input: '<div><script>alert(1)</script><p>Content</p></div>',
            method: 'sanitizeHTML',
            expected: 'Content'
        },
        {
            name: 'Multiple Script Tags',
            input: '<script>bad()</script>Text<script>worse()</script>',
            method: 'sanitizeText',
            expected: 'Text'
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        const result = InputSanitizer[test.method](test.input);
        const success = result === test.expected;
        
        console.log(`\n📝 ${test.name}`);
        console.log(`   Input:    "${test.input}"`);
        console.log(`   Output:   "${result}"`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Status:   ${success ? '✅ PASS' : '❌ FAIL'}`);
        
        if (success) passed++;
        else failed++;
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);
    
    // Clean existing database entries
    console.log('🧹 Cleaning database entries with HTML/script tags...\n');
    
    try {
        const db = dbConfig.db;
        
        // Clean marketplace items
        const marketplaceItems = await db.query(
            'SELECT id, title, description FROM marketplace_items'
        );
        
        let cleaned = 0;
        for (const item of marketplaceItems.rows) {
            const cleanTitle = InputSanitizer.sanitizeText(item.title, 200);
            const cleanDescription = InputSanitizer.sanitizeText(item.description, 2000);
            
            if (cleanTitle !== item.title || cleanDescription !== item.description) {
                await db.query(
                    'UPDATE marketplace_items SET title = $1, description = $2 WHERE id = $3',
                    [cleanTitle, cleanDescription, item.id]
                );
                console.log(`   ✅ Cleaned item ID ${item.id}`);
                console.log(`      Old title: "${item.title}"`);
                console.log(`      New title: "${cleanTitle}"`);
                cleaned++;
            }
        }
        
        // Clean users
        const users = await db.query(
            'SELECT user_id, full_name, location FROM users'
        );
        
        for (const user of users.rows) {
            const cleanName = InputSanitizer.sanitizeText(user.full_name, 100);
            const cleanLocation = user.location ? InputSanitizer.sanitizeText(user.location, 200) : null;
            
            if (cleanName !== user.full_name || (user.location && cleanLocation !== user.location)) {
                await db.query(
                    'UPDATE users SET full_name = $1, location = $2 WHERE user_id = $3',
                    [cleanName, cleanLocation, user.user_id]
                );
                console.log(`   ✅ Cleaned user ID ${user.user_id}`);
                cleaned++;
            }
        }
        
        // Clean business applications
        const businesses = await db.query(
            'SELECT application_id, business_name, business_type, license_info FROM business_applications'
        );
        
        for (const biz of businesses.rows) {
            const cleanName = InputSanitizer.sanitizeText(biz.business_name, 200);
            const cleanType = InputSanitizer.sanitizeText(biz.business_type, 100);
            const cleanLicense = biz.license_info ? InputSanitizer.sanitizeText(biz.license_info, 500) : null;
            
            if (cleanName !== biz.business_name || cleanType !== biz.business_type || 
                (biz.license_info && cleanLicense !== biz.license_info)) {
                await db.query(
                    'UPDATE business_applications SET business_name = $1, business_type = $2, license_info = $3 WHERE application_id = $4',
                    [cleanName, cleanType, cleanLicense, biz.application_id]
                );
                console.log(`   ✅ Cleaned business application ID ${biz.application_id}`);
                cleaned++;
            }
        }
        
        console.log(`\n✅ Database cleanup complete! Cleaned ${cleaned} entries.\n`);
        
    } catch (error) {
        console.error('❌ Database cleanup error:', error.message);
    }
    
    process.exit(0);
}

// Run tests
testSanitization();
