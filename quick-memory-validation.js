// Quick Memory Validation - Run this in browser console for immediate testing
console.log('🚀 Quick Memory Feature Validation\n');

async function quickValidation() {
  const report = {
    timestamp: new Date().toISOString(),
    results: {},
    summary: '',
    recommendations: []
  };

  console.log('📋 Running Quick Memory Validation Tests...\n');

  // Test 1: Check if validation functions are available
  console.log('1️⃣ Testing function availability...');
  const hasValidator = typeof window.validateMemoryFeatures === 'function';
  const hasLumaAI = typeof window.lumaAI === 'object';
  const hasMemoryService = typeof window.memoryService === 'object';
  
  report.results.functionsAvailable = {
    validator: hasValidator,
    lumaAI: hasLumaAI,
    memoryService: hasMemoryService,
    score: (hasValidator ? 40 : 0) + (hasLumaAI ? 30 : 0) + (hasMemoryService ? 30 : 0)
  };

  console.log(`   Validator: ${hasValidator ? '✅' : '❌'}`);
  console.log(`   LumaAI: ${hasLumaAI ? '✅' : '❌'}`);
  console.log(`   Memory Service: ${hasMemoryService ? '✅' : '❌'}\n`);

  // Test 2: Check authentication and memory enablement
  console.log('2️⃣ Testing authentication and memory status...');
  let authStatus = 'unknown';
  let memoryEnabled = false;
  
  if (hasLumaAI) {
    try {
      const sessionInfo = window.lumaAI.getSessionInfo();
      memoryEnabled = sessionInfo.memoryEnabled;
      authStatus = sessionInfo.userId ? 'authenticated' : 'not authenticated';
      
      console.log(`   Authentication: ${authStatus}`);
      console.log(`   Memory Enabled: ${memoryEnabled ? '✅' : '❌'}`);
      
      if (sessionInfo.userId) {
        console.log(`   User ID: ${sessionInfo.userId.substring(0, 8)}...`);
      }
      if (sessionInfo.sessionId) {
        console.log(`   Session ID: ${sessionInfo.sessionId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking status: ${error.message}`);
    }
  }

  report.results.authAndMemory = {
    authStatus,
    memoryEnabled,
    score: authStatus === 'authenticated' ? (memoryEnabled ? 100 : 50) : 20
  };

  console.log('');

  // Test 3: Test basic memory service functions
  console.log('3️⃣ Testing memory service functions...');
  let serviceFunctions = 0;
  
  if (hasMemoryService) {
    try {
      const testUserId = 'test-' + Date.now();
      const sessionId = window.memoryService.generateSessionId(testUserId);
      
      if (sessionId && sessionId.includes(testUserId)) {
        serviceFunctions += 50;
        console.log(`   ✅ Session ID generation working`);
      } else {
        console.log(`   ❌ Session ID generation failed`);
      }
      
      // Test context retrieval
      if (authStatus === 'authenticated') {
        const context = await window.memoryService.getConversationContext(testUserId, sessionId);
        if (context !== undefined) {
          serviceFunctions += 50;
          console.log(`   ✅ Context retrieval working`);
        } else {
          console.log(`   ❌ Context retrieval failed`);
        }
      } else {
        console.log(`   ⚠️ Context retrieval skipped (not authenticated)`);
        serviceFunctions += 25; // Partial credit
      }
      
    } catch (error) {
      console.log(`   ❌ Memory service error: ${error.message}`);
    }
  }

  report.results.serviceFunctions = {
    score: serviceFunctions
  };

  console.log('');

  // Test 4: Check database connectivity
  console.log('4️⃣ Testing database connectivity...');
  let dbConnectivity = 0;
  
  if (typeof window.sbAdmin === 'object') {
    try {
      // Try a simple query to test connectivity
      const { data, error } = await window.sbAdmin
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Database query failed: ${error.message}`);
      } else {
        dbConnectivity = 100;
        console.log(`   ✅ Database connectivity working`);
      }
    } catch (error) {
      console.log(`   ❌ Database test error: ${error.message}`);
    }
  } else {
    console.log(`   ❌ Database client not available`);
  }

  report.results.databaseConnectivity = {
    score: dbConnectivity
  };

  console.log('');

  // Calculate overall score
  const totalScore = Math.round(
    (report.results.functionsAvailable.score +
     report.results.authAndMemory.score +
     report.results.serviceFunctions.score +
     report.results.databaseConnectivity.score) / 4
  );

  // Generate summary and recommendations
  if (totalScore >= 80) {
    report.summary = '🎉 Memory system is ready for comprehensive validation!';
    report.recommendations = [
      'Run window.validateMemoryFeatures() for full validation',
      'Test actual conversations to verify memory retention'
    ];
  } else if (totalScore >= 60) {
    report.summary = '⚠️ Memory system is partially ready with some limitations.';
    report.recommendations = [];
    
    if (authStatus !== 'authenticated') {
      report.recommendations.push('Log in to enable full memory functionality');
    }
    if (report.results.databaseConnectivity.score < 100) {
      report.recommendations.push('Check database connectivity and permissions');
    }
    if (!hasValidator) {
      report.recommendations.push('Ensure validation functions are properly loaded');
    }
  } else {
    report.summary = '❌ Memory system needs setup before validation.';
    report.recommendations = [
      'Ensure database tables are created (run supabase_schema.sql)',
      'Check environment variables and API keys',
      'Verify Supabase configuration and permissions'
    ];
  }

  // Display final results
  console.log('📊 QUICK VALIDATION RESULTS');
  console.log('===========================');
  console.log(`Overall Score: ${totalScore}%`);
  console.log(`Status: ${report.summary}\n`);

  if (report.recommendations.length > 0) {
    console.log('📋 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }

  if (totalScore >= 80) {
    console.log('🚀 Ready for full validation!');
    console.log('   • Run window.validateMemoryFeatures() for comprehensive testing');
    console.log('   • Visit ?validate-memory for UI-based validation');
  } else if (totalScore >= 60) {
    console.log('💡 Partial functionality detected.');
    console.log('   • Address recommendations above');
    console.log('   • Try basic tests with window.checkMemoryStatus()');
  } else {
    console.log('⚠️ Setup required before validation.');
    console.log('   • Follow MEMORY_TESTING_GUIDE.md');
    console.log('   • Run window.testMemorySystem() for database checks');
  }

  return report;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.quickMemoryValidation = quickValidation;
  
  console.log('💡 Quick validation function available:');
  console.log('   • window.quickMemoryValidation() - Run quick validation');
  console.log('');
}

// Auto-run if requested
if (typeof window !== 'undefined' && window.location?.search?.includes('quick-validate')) {
  setTimeout(() => quickValidation(), 1000);
}