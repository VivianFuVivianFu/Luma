// Memory System Testing Script
// Run this in the browser console to test all memory features

console.log('🧠 Starting Comprehensive Memory System Test');
console.log('==========================================\n');

async function testMemorySystem() {
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      url: window.location.origin,
      userAgent: navigator.userAgent.substring(0, 100),
      memoryFeaturesAvailable: false
    },
    tests: {},
    summary: '',
    recommendations: []
  };

  try {
    // Test 1: Check if memory system is loaded
    console.log('1️⃣ Testing Memory System Availability...');
    
    const hasMemoryService = typeof window.memoryService === 'object';
    const hasLumaAI = typeof window.lumaAI === 'object';
    const hasSupabase = typeof window.supabase === 'object';
    const hasValidation = typeof window.validateMemoryFeatures === 'function';
    
    testResults.environment.memoryFeaturesAvailable = hasMemoryService && hasLumaAI && hasSupabase;
    
    console.log(`   Memory Service: ${hasMemoryService ? '✅' : '❌'}`);
    console.log(`   Luma AI: ${hasLumaAI ? '✅' : '❌'}`);
    console.log(`   Supabase: ${hasSupabase ? '✅' : '❌'}`);
    console.log(`   Validation: ${hasValidation ? '✅' : '❌'}\n`);

    // Test 2: Database Connectivity
    console.log('2️⃣ Testing Database Connectivity...');
    
    let dbConnected = false;
    try {
      if (typeof window.sbAdmin === 'object') {
        // Try to query database structure
        const { data, error } = await window.sbAdmin
          .from('information_schema.tables')
          .select('table_name')
          .in('table_name', ['sessions', 'messages', 'session_summaries', 'user_memories'])
          .limit(10);
        
        if (error) {
          console.log(`   ❌ Database query failed: ${error.message}`);
          testResults.tests.database = { status: 'fail', error: error.message };
        } else {
          const tableCount = data?.length || 0;
          dbConnected = tableCount >= 4;
          console.log(`   ✅ Database connected, found ${tableCount}/4 required tables`);
          testResults.tests.database = { status: 'pass', tables: tableCount };
        }
      } else {
        console.log('   ❌ Database admin client not available');
        testResults.tests.database = { status: 'fail', error: 'Admin client unavailable' };
      }
    } catch (error) {
      console.log(`   ❌ Database test error: ${error.message}`);
      testResults.tests.database = { status: 'fail', error: error.message };
    }

    console.log('');

    // Test 3: Authentication Status
    console.log('3️⃣ Testing Authentication...');
    
    let authStatus = 'unknown';
    let userId = null;
    let memoryEnabled = false;
    
    if (hasLumaAI) {
      try {
        const sessionInfo = window.lumaAI.getSessionInfo();
        authStatus = sessionInfo.userId ? 'authenticated' : 'not authenticated';
        userId = sessionInfo.userId;
        memoryEnabled = sessionInfo.memoryEnabled;
        
        console.log(`   Authentication: ${authStatus}`);
        console.log(`   Memory Enabled: ${memoryEnabled ? '✅' : '❌'}`);
        
        if (userId) {
          console.log(`   User ID: ${userId.substring(0, 8)}...`);
        }
        
        testResults.tests.authentication = {
          status: authStatus === 'authenticated' ? 'pass' : 'partial',
          userId: userId?.substring(0, 8),
          memoryEnabled
        };
      } catch (error) {
        console.log(`   ❌ Auth check failed: ${error.message}`);
        testResults.tests.authentication = { status: 'fail', error: error.message };
      }
    }

    console.log('');

    // Test 4: Memory Service Functions
    console.log('4️⃣ Testing Memory Service Functions...');
    
    if (hasMemoryService && authStatus === 'authenticated') {
      try {
        // Test session generation
        const testSessionId = window.memoryService.generateSessionId(userId);
        console.log(`   ✅ Session ID generation: ${testSessionId ? 'Working' : 'Failed'}`);
        
        // Test context loading
        const context = await window.memoryService.getConversationContext(userId, testSessionId);
        console.log(`   ✅ Context loading: ${context !== undefined ? 'Working' : 'Failed'}`);
        
        testResults.tests.memoryService = {
          status: 'pass',
          sessionGeneration: !!testSessionId,
          contextLoading: context !== undefined
        };
      } catch (error) {
        console.log(`   ❌ Memory service error: ${error.message}`);
        testResults.tests.memoryService = { status: 'fail', error: error.message };
      }
    } else {
      console.log(`   ⚠️ Skipped (requires authentication)`);
      testResults.tests.memoryService = { status: 'skipped', reason: 'authentication required' };
    }

    console.log('');

    // Test 5: Quick Memory Validation
    console.log('5️⃣ Running Quick Memory Validation...');
    
    if (typeof window.quickMemoryValidation === 'function') {
      try {
        const quickResult = await window.quickMemoryValidation();
        console.log(`   ✅ Quick validation completed`);
        console.log(`   Score: ${quickResult.overallScore || 'N/A'}`);
        
        testResults.tests.quickValidation = {
          status: 'pass',
          score: quickResult.overallScore,
          summary: quickResult.summary
        };
      } catch (error) {
        console.log(`   ❌ Quick validation failed: ${error.message}`);
        testResults.tests.quickValidation = { status: 'fail', error: error.message };
      }
    } else {
      console.log(`   ❌ Quick validation function not available`);
      testResults.tests.quickValidation = { status: 'fail', error: 'Function not available' };
    }

    console.log('');

    // Test 6: Full Memory Feature Validation (if authenticated)
    console.log('6️⃣ Full Memory Feature Validation...');
    
    if (hasValidation && authStatus === 'authenticated') {
      try {
        console.log('   🔄 Running comprehensive validation (this may take 30-60 seconds)...');
        const fullResult = await window.validateMemoryFeatures();
        
        console.log(`   ✅ Full validation completed`);
        console.log(`   Overall Score: ${fullResult.overallScore}%`);
        console.log(`   Summary: ${fullResult.summary}`);
        
        testResults.tests.fullValidation = {
          status: fullResult.overallScore >= 80 ? 'pass' : 'partial',
          overallScore: fullResult.overallScore,
          shortTerm: fullResult.shortTermMemory?.score || 0,
          longTerm: fullResult.longTermMemory?.score || 0,
          integration: fullResult.memoryIntegration?.score || 0,
          persistence: fullResult.sessionPersistence?.score || 0,
          summary: fullResult.summary,
          recommendations: fullResult.recommendations
        };
      } catch (error) {
        console.log(`   ❌ Full validation failed: ${error.message}`);
        testResults.tests.fullValidation = { status: 'fail', error: error.message };
      }
    } else {
      console.log(`   ⚠️ Skipped (requires authentication and validation functions)`);
      testResults.tests.fullValidation = { 
        status: 'skipped', 
        reason: authStatus !== 'authenticated' ? 'authentication required' : 'validation functions unavailable' 
      };
    }

    // Generate Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    
    const passCount = Object.values(testResults.tests).filter(t => t.status === 'pass').length;
    const totalTests = Object.keys(testResults.tests).length;
    const skipCount = Object.values(testResults.tests).filter(t => t.status === 'skipped').length;
    
    if (passCount === totalTests) {
      testResults.summary = '🎉 All memory system tests passed! System is fully functional.';
    } else if (passCount >= totalTests - skipCount) {
      testResults.summary = '✅ Memory system is working with some tests skipped due to requirements.';
    } else if (passCount >= totalTests / 2) {
      testResults.summary = '⚠️ Memory system is partially working but needs attention.';
    } else {
      testResults.summary = '❌ Memory system requires significant setup and fixes.';
    }
    
    console.log(`Tests Passed: ${passCount}/${totalTests}`);
    console.log(`Tests Skipped: ${skipCount}`);
    console.log(`Status: ${testResults.summary}\n`);

    // Recommendations
    if (testResults.tests.database?.status === 'fail') {
      testResults.recommendations.push('1. Run supabase_schema.sql in your Supabase SQL editor');
    }
    
    if (authStatus !== 'authenticated') {
      testResults.recommendations.push('2. Log in to enable full memory functionality');
    }
    
    if (testResults.tests.fullValidation?.status === 'partial') {
      testResults.recommendations.push('3. Check memory feature configuration and API keys');
    }
    
    if (testResults.recommendations.length === 0) {
      testResults.recommendations.push('✅ Memory system is working correctly!');
    }

    console.log('📋 RECOMMENDATIONS:');
    testResults.recommendations.forEach(rec => console.log(`   ${rec}`));

    console.log('\n🚀 NEXT STEPS:');
    if (authStatus === 'authenticated' && dbConnected) {
      console.log('   • Test actual conversations to verify memory retention');
      console.log('   • Use the chat interface to build conversation history');
      console.log('   • Check memory status indicator in the UI');
    } else {
      console.log('   • Complete database setup and user authentication');
      console.log('   • Visit ?validate-memory for UI-based testing');
      console.log('   • Run window.checkMemoryStatus() for quick checks');
    }

    return testResults;

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    testResults.tests.error = { status: 'fail', error: error.message };
    testResults.summary = '❌ Test suite encountered critical errors';
    return testResults;
  }
}

// Make test available globally
if (typeof window !== 'undefined') {
  window.testMemorySystem = testMemorySystem;
  console.log('💡 Test function available: window.testMemorySystem()');
  console.log('🔍 To run the test, execute: await window.testMemorySystem()');
}

// Auto-run if URL contains test parameter
if (typeof window !== 'undefined' && window.location?.search?.includes('test-memory-system')) {
  setTimeout(() => testMemorySystem(), 2000);
}