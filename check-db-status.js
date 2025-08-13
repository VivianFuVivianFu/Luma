// Database Status Checker - Run this in browser console to check database readiness
console.log('🔍 Checking Luma Memory System Database Status...\n');

async function checkDatabaseStatus() {
  // Check if we can access the environment variables
  try {
    const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || 'Not found';
    const hasServiceKey = !!import.meta?.env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('📋 Environment Check:');
    console.log(`   Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   Service Key: ${hasServiceKey ? '✅ Present' : '❌ Missing'}`);
    
    if (!hasServiceKey) {
      console.log('⚠️ Service role key missing - some tests may fail');
    }
  } catch (error) {
    console.log('❌ Environment check failed:', error);
  }

  // Check database tables
  console.log('\n🗃️ Database Tables Check:');
  const requiredTables = ['sessions', 'messages', 'session_summaries', 'user_memories'];
  const results = { ready: 0, missing: 0, errors: [] };
  
  for (const tableName of requiredTables) {
    try {
      // This will work if the modules are loaded
      if (window.sbAdmin) {
        const { data, error } = await window.sbAdmin
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`);
          results.missing++;
          results.errors.push(`${tableName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${tableName}: Ready (${data ? data.length : 0} rows found)`);
          results.ready++;
        }
      } else {
        console.log(`   ⚠️ ${tableName}: Cannot test (sbAdmin not available)`);
      }
    } catch (error) {
      console.log(`   ❌ ${tableName}: ${error.message}`);
      results.missing++;
      results.errors.push(`${tableName}: ${error}`);
    }
  }
  
  console.log(`\n📊 Summary: ${results.ready}/${requiredTables.length} tables ready`);
  
  if (results.missing > 0) {
    console.log('\n🚨 Action Required:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL script from supabase_schema.sql file');
    console.log('4. Come back and run this check again');
    
    console.log('\n📋 Missing/Error Details:');
    results.errors.forEach(err => console.log(`   • ${err}`));
  } else {
    console.log('\n🎉 All database tables are ready!');
    console.log('💡 You can now test the memory system functionality');
  }
  
  // Test authentication
  console.log('\n👤 Authentication Status:');
  try {
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session?.user) {
        console.log(`   ✅ Logged in as: ${session.user.email}`);
        console.log('   🧠 Memory system will be fully active');
      } else {
        console.log('   ⚠️ Not authenticated');
        console.log('   💡 Log in to enable full memory functionality');
      }
    } else {
      console.log('   ❌ Supabase client not available');
    }
  } catch (authError) {
    console.log(`   ❌ Auth check failed: ${authError.message}`);
  }
  
  return results;
}

// Memory system functionality test
async function testMemoryFunctionality() {
  console.log('\n🧠 Testing Memory System Functionality...');
  
  try {
    if (window.lumaAI) {
      const sessionInfo = window.lumaAI.getSessionInfo();
      const memoryEnabled = window.lumaAI.isMemoryEnabled();
      
      console.log('📊 LumaAI Status:');
      console.log(`   Memory Enabled: ${memoryEnabled ? '✅ Yes' : '❌ No'}`);
      console.log(`   User ID: ${sessionInfo.userId || 'None'}`);
      console.log(`   Session ID: ${sessionInfo.sessionId || 'None'}`);
      
      if (!memoryEnabled && !sessionInfo.userId) {
        console.log('\n💡 To enable memory:');
        console.log('1. Log in to your account');
        console.log('2. Memory will automatically initialize');
        console.log('3. Start chatting to see memory in action');
      }
      
      // Test basic memory service functions
      if (window.memoryService) {
        const testUserId = 'test-' + Date.now();
        const testSessionId = window.memoryService.generateSessionId(testUserId);
        
        console.log('\n🔧 Memory Service Test:');
        console.log(`   Session ID Generation: ${testSessionId ? '✅ Working' : '❌ Failed'}`);
        console.log(`   Generated: ${testSessionId}`);
      }
      
    } else {
      console.log('❌ LumaAI instance not found');
    }
  } catch (error) {
    console.log(`❌ Memory functionality test failed: ${error.message}`);
  }
}

// Comprehensive test runner
async function runComprehensiveCheck() {
  console.log('🚀 Running Comprehensive Memory System Check...\n');
  
  const dbResults = await checkDatabaseStatus();
  await testMemoryFunctionality();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏆 FINAL ASSESSMENT');
  console.log('='.repeat(50));
  
  if (dbResults.ready === 4) {
    console.log('✅ Database: Fully Ready');
  } else {
    console.log(`❌ Database: ${dbResults.missing} issues found`);
  }
  
  const memorySystemReady = dbResults.ready === 4 && window.lumaAI;
  
  if (memorySystemReady) {
    console.log('🎉 Memory System: READY TO USE!');
    console.log('\n📋 Next Steps:');
    console.log('1. Log in to enable personalized memory');
    console.log('2. Start a conversation');
    console.log('3. After 5+ messages, check for memory processing');
    console.log('4. Return later to test memory persistence');
  } else {
    console.log('⚠️ Memory System: Setup Required');
    console.log('\n📋 Required Actions:');
    if (dbResults.missing > 0) {
      console.log('• Run SQL schema in Supabase dashboard');
    }
    if (!window.lumaAI) {
      console.log('• Ensure application is loaded properly');
    }
  }
  
  return { dbResults, memorySystemReady };
}

// Export functions for use
if (typeof window !== 'undefined') {
  window.checkDatabaseStatus = checkDatabaseStatus;
  window.testMemoryFunctionality = testMemoryFunctionality;
  window.runComprehensiveCheck = runComprehensiveCheck;
  
  console.log('💡 Available functions:');
  console.log('• window.checkDatabaseStatus() - Check database tables');
  console.log('• window.testMemoryFunctionality() - Test memory features');
  console.log('• window.runComprehensiveCheck() - Full system check');
}

// Auto-run if requested
if (typeof window !== 'undefined' && window.location?.search?.includes('auto-check')) {
  setTimeout(() => runComprehensiveCheck(), 1000);
}