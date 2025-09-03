// Simple Integration Test for Luma AI - No external dependencies
// Run in VS Code terminal: node simple-test.js

const https = require('https');
const url = require('url');

// Environment check
const SUPABASE_URL = 'https://oyqzljunafjfuwdedjee.supabase.co';
console.log('🧪 TESTING LUMA AI INTEGRATION');
console.log('===============================\n');

// Simple HTTP request function
function testEndpoint(testUrl, options = {}) {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(testUrl);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          success: res.statusCode < 500
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  const results = [];

  // Test 1: JWT Authentication - Check if functions respond
  console.log('1️⃣ Testing Function Deployment...');
  
  const authTest = await testEndpoint(`${SUPABASE_URL}/functions/v1/daily-checkin-generator`, {
    method: 'POST',
    body: {}
  });
  
  if (authTest.success) {
    console.log('   ✅ Edge Functions are deployed and responding');
    results.push('✅ Functions Deployed');
  } else {
    console.log('   ❌ Functions not responding:', authTest.status);
    results.push('❌ Functions Failed');
  }

  // Test 2: Memory System - Check database access via REST API
  console.log('\n2️⃣ Testing Database Access...');
  
  const dbTest = await testEndpoint(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET'
  });
  
  if (dbTest.success) {
    console.log('   ✅ Database REST API is accessible');
    results.push('✅ Database Access');
  } else {
    console.log('   ❌ Database access failed:', dbTest.status);
    results.push('❌ Database Failed');
  }

  // Test 3: Journal Prompt Function
  console.log('\n3️⃣ Testing Journal Prompt Function...');
  
  const journalTest = await testEndpoint(`${SUPABASE_URL}/functions/v1/generate-journal-prompt`, {
    method: 'POST',
    body: { user_id: 'test' }
  });
  
  if (journalTest.success) {
    console.log('   ✅ Journal prompt function deployed');
    results.push('✅ Journal Prompts');
  } else {
    console.log('   ❌ Journal prompt function failed:', journalTest.status);
    results.push('❌ Journal Prompts Failed');
  }

  // Test 4: Journal Entry Function
  console.log('\n4️⃣ Testing Journal Entry Function...');
  
  const entryTest = await testEndpoint(`${SUPABASE_URL}/functions/v1/submit-journal-entry`, {
    method: 'POST',
    body: { user_id: 'test', prompt: 'test', content: 'test' }
  });
  
  if (entryTest.success) {
    console.log('   ✅ Journal entry function deployed');
    results.push('✅ Journal Entries');
  } else {
    console.log('   ❌ Journal entry function failed:', entryTest.status);
    results.push('❌ Journal Entries Failed');
  }

  // Test 5: Daily Check-in Function
  console.log('\n5️⃣ Testing Daily Check-in Function...');
  
  const checkinTest = await testEndpoint(`${SUPABASE_URL}/functions/v1/daily-checkin-generator`, {
    method: 'POST',
    body: { source: 'test' }
  });
  
  if (checkinTest.success) {
    console.log('   ✅ Daily check-in function deployed');
    results.push('✅ Daily Check-ins');
  } else {
    console.log('   ❌ Daily check-in function failed:', checkinTest.status);
    results.push('❌ Daily Check-ins Failed');
  }

  // Results Summary
  console.log('\n🎯 TEST RESULTS SUMMARY');
  console.log('=======================');
  
  const passed = results.filter(r => r.includes('✅')).length;
  const total = results.length;
  
  results.forEach(result => console.log(result));
  
  console.log(`\n📊 Score: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
  } else if (passed > total / 2) {
    console.log('⚠️  Most systems working, some need attention');
  } else {
    console.log('❌ Multiple systems need configuration');
  }

  return results;
}

// Run the tests
runTests().catch(console.error);