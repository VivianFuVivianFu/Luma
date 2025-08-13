// Quick Memory System Test - Run in browser console
console.log('🧠 Quick Memory System Test Starting...\n');

async function quickMemoryTest() {
  const results = [];
  
  // Test 1: Check environment variables
  console.log('1️⃣ Testing environment variables...');
  try {
    const hasSupabaseUrl = !!(import.meta?.env?.VITE_SUPABASE_URL);
    const hasSupabaseKey = !!(import.meta?.env?.VITE_SUPABASE_ANON_KEY);
    const hasServiceKey = !!(import.meta?.env?.VITE_SUPABASE_SERVICE_ROLE_KEY);
    const hasTogetherKey = !!(import.meta?.env?.VITE_TOGETHER_API_KEY);
    
    const envCheck = hasSupabaseUrl && hasSupabaseKey && hasServiceKey && hasTogetherKey;
    console.log(`   ${envCheck ? '✅' : '❌'} Environment variables: ${envCheck ? 'All present' : 'Missing some keys'}`);
    results.push({ test: 'Environment', passed: envCheck });
  } catch (error) {
    console.log('   ❌ Environment variables: Error checking');
    results.push({ test: 'Environment', passed: false, error });
  }

  // Test 2: Check if modules are loaded
  console.log('2️⃣ Testing module availability...');
  try {
    const hasLumaAI = typeof window !== 'undefined' && window.lumaAI;
    const hasMemoryService = typeof window !== 'undefined' && window.memoryService;
    
    console.log(`   ${hasLumaAI ? '✅' : '❌'} LumaAI instance: ${hasLumaAI ? 'Available' : 'Not found'}`);
    console.log(`   ${hasMemoryService ? '✅' : '❌'} Memory service: ${hasMemoryService ? 'Available' : 'Not found'}`);
    
    results.push({ test: 'Modules', passed: hasLumaAI });
  } catch (error) {
    console.log('   ❌ Module check failed');
    results.push({ test: 'Modules', passed: false, error });
  }

  // Test 3: Test basic memory functions
  console.log('3️⃣ Testing basic memory functions...');
  try {
    if (window.lumaAI) {
      const sessionInfo = window.lumaAI.getSessionInfo();
      const memoryEnabled = window.lumaAI.isMemoryEnabled();
      
      console.log(`   📊 Session info:`, sessionInfo);
      console.log(`   🧠 Memory enabled: ${memoryEnabled}`);
      
      results.push({ test: 'Basic Functions', passed: true, data: { sessionInfo, memoryEnabled } });
    } else {
      console.log('   ❌ LumaAI not available for function testing');
      results.push({ test: 'Basic Functions', passed: false });
    }
  } catch (error) {
    console.log('   ❌ Function testing failed:', error);
    results.push({ test: 'Basic Functions', passed: false, error });
  }

  // Test 4: Test authentication
  console.log('4️⃣ Testing authentication...');
  try {
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      const authenticated = !!session?.user;
      
      console.log(`   ${authenticated ? '✅' : '⚠️'} Authentication: ${authenticated ? `Logged in as ${session.user.email}` : 'Not authenticated'}`);
      results.push({ test: 'Authentication', passed: true, data: { authenticated, email: session?.user?.email } });
    } else {
      console.log('   ❌ Supabase client not available');
      results.push({ test: 'Authentication', passed: false });
    }
  } catch (error) {
    console.log('   ❌ Authentication test failed:', error);
    results.push({ test: 'Authentication', passed: false, error });
  }

  // Summary
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('\n📋 Test Summary:');
  console.log('================');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.test}`);
  });
  
  console.log(`\n🏆 Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Memory system appears to be working correctly!');
    console.log('💡 To test full functionality, please log in and use the chat feature');
  } else {
    console.log('⚠️ Some issues detected. Check individual test results above.');
  }
  
  return results;
}

// Export for manual use
if (typeof window !== 'undefined') {
  window.quickMemoryTest = quickMemoryTest;
  console.log('💡 Test function available as: window.quickMemoryTest()');
}

// Auto-run if in browser
if (typeof window !== 'undefined' && window.location) {
  quickMemoryTest();
}

export { quickMemoryTest };