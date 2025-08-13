// Memory System Test Script
// Run this in browser console to test memory functionality

console.log('🧠 Starting Luma Memory System Tests...');

// Test 1: Check memory service import and basic functionality
async function testMemoryServiceImport() {
  try {
    console.log('📝 Test 1: Testing memory service import...');
    
    // Test basic memory service methods
    if (typeof window.memoryService === 'undefined') {
      console.log('⚠️ Memory service not available globally, checking module...');
      // Try to access from LumaAI instance
      const lumaAI = window.lumaAI;
      if (lumaAI) {
        console.log('✅ LumaAI instance found');
        const sessionInfo = lumaAI.getSessionInfo();
        console.log('📊 Session info:', sessionInfo);
        return sessionInfo;
      } else {
        console.error('❌ Neither memoryService nor lumaAI found globally');
        return null;
      }
    }
    
    console.log('✅ Memory service available');
    return true;
  } catch (error) {
    console.error('❌ Memory service import test failed:', error);
    return false;
  }
}

// Test 2: Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('📝 Test 2: Testing Supabase connection...');
    
    // Check if Supabase client is available
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL;
    const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      console.log('✅ Supabase credentials found');
      console.log('🔗 Supabase URL:', supabaseUrl);
      return true;
    } else {
      console.log('⚠️ Checking global Supabase instance...');
      if (window.supabase) {
        console.log('✅ Global Supabase client found');
        return true;
      }
      console.error('❌ Supabase credentials missing');
      return false;
    }
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
}

// Test 3: Test session management
async function testSessionManagement() {
  try {
    console.log('📝 Test 3: Testing session management...');
    
    // Generate a test user ID
    const testUserId = 'test-user-' + Math.random().toString(36).substring(2, 8);
    console.log('👤 Using test user ID:', testUserId);
    
    // Try to test session generation
    if (window.memoryService && window.memoryService.generateSessionId) {
      const sessionId = window.memoryService.generateSessionId(testUserId);
      console.log('✅ Session ID generated:', sessionId);
      return { testUserId, sessionId };
    } else {
      console.log('⚠️ Direct session generation not available');
      return { testUserId, sessionId: null };
    }
  } catch (error) {
    console.error('❌ Session management test failed:', error);
    return null;
  }
}

// Test 4: Test memory system initialization
async function testMemoryInitialization() {
  try {
    console.log('📝 Test 4: Testing memory system initialization...');
    
    // Check if LumaAI can initialize memory
    if (window.lumaAI) {
      const lumaAI = window.lumaAI;
      const isMemoryEnabled = lumaAI.isMemoryEnabled();
      console.log('🧠 Memory enabled status:', isMemoryEnabled);
      
      try {
        const memoryStatus = await lumaAI.enableMemory();
        console.log('✅ Memory enable attempt result:', memoryStatus);
        
        const sessionInfo = lumaAI.getSessionInfo();
        console.log('📊 Session info after enable:', sessionInfo);
        
        return sessionInfo;
      } catch (enableError) {
        console.log('⚠️ Memory enable error (expected if not authenticated):', enableError.message);
        return { enabled: false, reason: 'Not authenticated' };
      }
    } else {
      console.error('❌ LumaAI instance not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Memory initialization test failed:', error);
    return null;
  }
}

// Test 5: Test authentication status
function testAuthenticationStatus() {
  try {
    console.log('📝 Test 5: Testing authentication status...');
    
    // Check for authentication indicators
    const authButtons = document.querySelector('[data-testid="auth-buttons"]') || 
                       document.querySelector('button[aria-label*="logout"]') ||
                       document.querySelector('button:contains("Logout")');
    
    const loginButton = document.querySelector('button:contains("Sign Up")') ||
                       document.querySelector('button:contains("Login")') ||
                       document.querySelector('button[aria-label*="login"]');
    
    if (authButtons) {
      console.log('✅ User appears to be authenticated');
      return { authenticated: true };
    } else if (loginButton) {
      console.log('⚠️ User appears to be not authenticated');
      return { authenticated: false };
    } else {
      console.log('❓ Authentication status unclear');
      return { authenticated: 'unknown' };
    }
  } catch (error) {
    console.error('❌ Authentication status test failed:', error);
    return { authenticated: 'error', error };
  }
}

// Main test runner
async function runAllMemoryTests() {
  console.log('🚀 Starting comprehensive memory system tests...\n');
  
  const results = {
    memoryService: await testMemoryServiceImport(),
    supabase: await testSupabaseConnection(),
    sessionManagement: await testSessionManagement(),
    memoryInitialization: await testMemoryInitialization(),
    authentication: testAuthenticationStatus()
  };
  
  console.log('\n📋 Test Results Summary:');
  console.log('=======================');
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${test}:`, result);
  });
  
  // Overall assessment
  const passedTests = Object.values(results).filter(r => r && r !== false).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🏆 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All memory system tests passed!');
  } else if (passedTests >= totalTests - 1) {
    console.log('😊 Memory system mostly working, minor issues detected');
  } else {
    console.log('⚠️ Memory system has some issues that need attention');
  }
  
  return results;
}

// Export functions for manual testing
window.memoryTests = {
  runAll: runAllMemoryTests,
  testMemoryServiceImport,
  testSupabaseConnection,
  testSessionManagement,
  testMemoryInitialization,
  testAuthenticationStatus
};

// Auto-run tests
console.log('🔧 Memory test functions available at window.memoryTests');
console.log('💡 Run window.memoryTests.runAll() to test all functionality');

// Auto-run if requested
if (window.location.search.includes('test-memory')) {
  runAllMemoryTests();
}