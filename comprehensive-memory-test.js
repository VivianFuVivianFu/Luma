// Comprehensive Memory System Test Runner
// This script runs a complete suite of tests to validate all memory functionality

console.log('🧠 Comprehensive Memory System Test Suite');
console.log('==========================================\n');

class ComprehensiveMemoryTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {},
      testSuites: {},
      overall: {
        score: 0,
        status: 'unknown',
        recommendations: []
      }
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Memory System Testing...\n');
    
    try {
      // Environment Check
      await this.testEnvironment();
      
      // Core Function Tests
      await this.testCoreFunctions();
      
      // Database Tests
      await this.testDatabase();
      
      // Authentication Tests
      await this.testAuthentication();
      
      // Memory Feature Tests
      await this.testMemoryFeatures();
      
      // Integration Tests
      await this.testIntegration();
      
      // Performance Tests
      await this.testPerformance();
      
      // Generate final results
      this.generateFinalResults();
      
      console.log('\n🎉 Comprehensive testing completed!');
      return this.results;
      
    } catch (error) {
      console.error('❌ Testing suite failed:', error);
      this.results.overall.status = 'failed';
      this.results.overall.score = 0;
      return this.results;
    }
  }

  async testEnvironment() {
    console.log('1️⃣ Environment Testing...');
    const env = {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      url: window.location.href,
      functions: {},
      services: {},
      score: 0
    };

    // Check function availability
    const requiredFunctions = [
      'quickMemoryValidation',
      'validateMemoryFeatures', 
      'testMemorySystem',
      'runMemoryDemo'
    ];

    requiredFunctions.forEach(fn => {
      env.functions[fn] = typeof window[fn] === 'function';
      if (env.functions[fn]) env.score += 10;
    });

    // Check service availability
    const requiredServices = [
      'lumaAI',
      'memoryService', 
      'supabase',
      'sbAdmin'
    ];

    requiredServices.forEach(service => {
      env.services[service] = typeof window[service] === 'object' && window[service] !== null;
      if (env.services[service]) env.score += 15;
    });

    console.log(`   Functions: ${Object.values(env.functions).filter(Boolean).length}/${requiredFunctions.length}`);
    console.log(`   Services: ${Object.values(env.services).filter(Boolean).length}/${requiredServices.length}`);
    console.log(`   Environment Score: ${env.score}%\n`);

    this.results.environment = env;
    this.results.testSuites.environment = { 
      score: env.score, 
      status: env.score >= 80 ? 'pass' : env.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testCoreFunctions() {
    console.log('2️⃣ Core Function Testing...');
    const core = { tests: {}, score: 0 };

    try {
      // Test LumaAI session info
      if (window.lumaAI && typeof window.lumaAI.getSessionInfo === 'function') {
        const sessionInfo = window.lumaAI.getSessionInfo();
        core.tests.sessionInfo = {
          available: true,
          hasUserId: !!sessionInfo.userId,
          memoryEnabled: sessionInfo.memoryEnabled
        };
        core.score += sessionInfo.userId ? 30 : 10;
      } else {
        core.tests.sessionInfo = { available: false };
      }

      // Test Memory Service functions
      if (window.memoryService) {
        const testUserId = 'test-' + Date.now();
        
        try {
          const sessionId = window.memoryService.generateSessionId(testUserId);
          core.tests.sessionGeneration = { success: !!sessionId };
          core.score += sessionId ? 25 : 0;
        } catch (error) {
          core.tests.sessionGeneration = { success: false, error: error.message };
        }

        try {
          const context = await window.memoryService.getConversationContext(testUserId, 'test-session');
          core.tests.contextLoading = { success: context !== undefined };
          core.score += context !== undefined ? 25 : 0;
        } catch (error) {
          core.tests.contextLoading = { success: false, error: error.message };
        }
      }

      // Test Quick Validation
      if (typeof window.quickMemoryValidation === 'function') {
        try {
          const quickResult = await window.quickMemoryValidation();
          core.tests.quickValidation = { 
            success: !!quickResult,
            score: quickResult?.results?.functionsAvailable?.score || 0
          };
          core.score += quickResult ? 20 : 0;
        } catch (error) {
          core.tests.quickValidation = { success: false, error: error.message };
        }
      }

    } catch (error) {
      console.log(`   ❌ Core function testing failed: ${error.message}`);
    }

    console.log(`   Core Functions Score: ${core.score}%\n`);
    this.results.testSuites.coreFunctions = { 
      ...core, 
      status: core.score >= 80 ? 'pass' : core.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testDatabase() {
    console.log('3️⃣ Database Testing...');
    const db = { tests: {}, score: 0 };

    try {
      if (window.sbAdmin) {
        // Test basic connectivity
        try {
          const { data, error } = await window.sbAdmin
            .from('information_schema.tables')
            .select('table_name')
            .limit(1);
          
          db.tests.connectivity = { success: !error, error: error?.message };
          db.score += !error ? 30 : 0;
        } catch (error) {
          db.tests.connectivity = { success: false, error: error.message };
        }

        // Test required tables
        const requiredTables = ['sessions', 'messages', 'session_summaries', 'user_memories'];
        let tablesFound = 0;
        
        for (const table of requiredTables) {
          try {
            const { error } = await window.sbAdmin.from(table).select('*').limit(1);
            if (!error) tablesFound++;
          } catch (error) {
            // Table might not exist
          }
        }
        
        db.tests.tables = { 
          required: requiredTables.length, 
          found: tablesFound,
          percentage: Math.round((tablesFound / requiredTables.length) * 100)
        };
        db.score += (tablesFound / requiredTables.length) * 50;

        // Test write permissions
        try {
          const testId = 'test-' + Date.now();
          const { error } = await window.sbAdmin
            .from('messages')
            .insert({ 
              session_id: testId, 
              user_id: testId, 
              role: 'user', 
              content: 'test message' 
            });
          
          if (!error) {
            // Clean up
            await window.sbAdmin.from('messages').delete().eq('session_id', testId);
            db.tests.writePermissions = { success: true };
            db.score += 20;
          } else {
            db.tests.writePermissions = { success: false, error: error.message };
          }
        } catch (error) {
          db.tests.writePermissions = { success: false, error: error.message };
        }
      } else {
        db.tests.adminClient = { available: false };
      }

    } catch (error) {
      console.log(`   ❌ Database testing failed: ${error.message}`);
    }

    console.log(`   Database Score: ${db.score}%\n`);
    this.results.testSuites.database = { 
      ...db, 
      status: db.score >= 80 ? 'pass' : db.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testAuthentication() {
    console.log('4️⃣ Authentication Testing...');
    const auth = { tests: {}, score: 0 };

    try {
      if (window.supabase) {
        // Test auth session
        try {
          const { data: { session }, error } = await window.supabase.auth.getSession();
          auth.tests.session = { 
            hasSession: !!session,
            hasUser: !!session?.user,
            error: error?.message
          };
          auth.score += session?.user ? 50 : 20;
        } catch (error) {
          auth.tests.session = { hasSession: false, error: error.message };
        }

        // Test auth listener
        try {
          const { data: { subscription } } = window.supabase.auth.onAuthStateChange(() => {});
          auth.tests.authListener = { available: !!subscription };
          subscription?.unsubscribe();
          auth.score += subscription ? 25 : 0;
        } catch (error) {
          auth.tests.authListener = { available: false, error: error.message };
        }

        // Test memory enablement
        if (window.lumaAI) {
          const sessionInfo = window.lumaAI.getSessionInfo();
          auth.tests.memoryEnabled = { 
            enabled: sessionInfo.memoryEnabled,
            hasUserId: !!sessionInfo.userId
          };
          auth.score += sessionInfo.memoryEnabled ? 25 : 0;
        }
      }

    } catch (error) {
      console.log(`   ❌ Authentication testing failed: ${error.message}`);
    }

    console.log(`   Authentication Score: ${auth.score}%\n`);
    this.results.testSuites.authentication = { 
      ...auth, 
      status: auth.score >= 80 ? 'pass' : auth.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testMemoryFeatures() {
    console.log('5️⃣ Memory Features Testing...');
    const memory = { tests: {}, score: 0 };

    try {
      // Run validation suite if available
      if (typeof window.validateMemoryFeatures === 'function') {
        try {
          console.log('   Running memory validation suite...');
          const validationResult = await window.validateMemoryFeatures();
          
          if (validationResult) {
            memory.tests.validation = {
              overallScore: validationResult.overallScore,
              shortTerm: validationResult.shortTermMemory?.score,
              longTerm: validationResult.longTermMemory?.score,
              integration: validationResult.memoryIntegration?.score,
              persistence: validationResult.sessionPersistence?.score,
              summary: validationResult.summary
            };
            memory.score = validationResult.overallScore || 0;
          } else {
            memory.tests.validation = { success: false, error: 'No results returned' };
          }
        } catch (error) {
          memory.tests.validation = { success: false, error: error.message };
        }
      }

      // Run demo if validation not available
      if (memory.score === 0 && typeof window.runMemoryDemo === 'function') {
        try {
          console.log('   Running memory demo...');
          const demoResult = await window.runMemoryDemo();
          
          if (demoResult?.finalAssessment) {
            memory.tests.demo = {
              score: demoResult.finalAssessment.overallScore,
              status: demoResult.finalAssessment.status,
              events: demoResult.memoryEvents?.length || 0
            };
            memory.score = demoResult.finalAssessment.overallScore || 0;
          }
        } catch (error) {
          memory.tests.demo = { success: false, error: error.message };
        }
      }

    } catch (error) {
      console.log(`   ❌ Memory features testing failed: ${error.message}`);
    }

    console.log(`   Memory Features Score: ${memory.score}%\n`);
    this.results.testSuites.memoryFeatures = { 
      ...memory, 
      status: memory.score >= 80 ? 'pass' : memory.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testIntegration() {
    console.log('6️⃣ Integration Testing...');
    const integration = { tests: {}, score: 0 };

    try {
      // Test ChatSection integration
      const chatElements = document.querySelectorAll('[class*="ChatSection"], [class*="chat"]');
      integration.tests.chatUI = { 
        elementsFound: chatElements.length,
        hasMemoryIndicator: !!document.querySelector('[class*="MemoryStatus"]')
      };
      integration.score += chatElements.length > 0 ? 20 : 0;
      integration.score += integration.tests.chatUI.hasMemoryIndicator ? 20 : 0;

      // Test memory status indicator
      if (window.lumaAI) {
        const sessionInfo = window.lumaAI.getSessionInfo();
        integration.tests.memoryIntegration = {
          lumaAIAvailable: true,
          memoryEnabled: sessionInfo.memoryEnabled,
          hasSessionId: !!sessionInfo.sessionId
        };
        integration.score += sessionInfo.memoryEnabled ? 30 : 10;
      }

      // Test browser testing setup
      const testFunctions = ['checkMemoryStatus', 'testMemorySystem', 'runMemoryTests'];
      const availableFunctions = testFunctions.filter(fn => typeof window[fn] === 'function');
      integration.tests.browserTesting = {
        available: availableFunctions.length,
        total: testFunctions.length
      };
      integration.score += (availableFunctions.length / testFunctions.length) * 30;

    } catch (error) {
      console.log(`   ❌ Integration testing failed: ${error.message}`);
    }

    console.log(`   Integration Score: ${integration.score}%\n`);
    this.results.testSuites.integration = { 
      ...integration, 
      status: integration.score >= 80 ? 'pass' : integration.score >= 60 ? 'partial' : 'fail' 
    };
  }

  async testPerformance() {
    console.log('7️⃣ Performance Testing...');
    const performance = { tests: {}, score: 0 };

    try {
      // Test response times
      const startTime = Date.now();
      
      if (window.memoryService && typeof window.memoryService.getConversationContext === 'function') {
        const testUserId = 'perf-test-' + Date.now();
        const testSessionId = 'perf-session-' + Date.now();
        
        try {
          const contextStart = Date.now();
          await window.memoryService.getConversationContext(testUserId, testSessionId);
          const contextTime = Date.now() - contextStart;
          
          performance.tests.contextLoading = {
            time: contextTime,
            acceptable: contextTime < 2000
          };
          performance.score += contextTime < 2000 ? 30 : contextTime < 5000 ? 15 : 0;
        } catch (error) {
          performance.tests.contextLoading = { error: error.message };
        }
      }

      // Test quick validation speed
      if (typeof window.quickMemoryValidation === 'function') {
        try {
          const quickStart = Date.now();
          await window.quickMemoryValidation();
          const quickTime = Date.now() - quickStart;
          
          performance.tests.quickValidation = {
            time: quickTime,
            acceptable: quickTime < 5000
          };
          performance.score += quickTime < 5000 ? 35 : quickTime < 10000 ? 20 : 0;
        } catch (error) {
          performance.tests.quickValidation = { error: error.message };
        }
      }

      // Test memory usage (basic check)
      if (window.performance && window.performance.memory) {
        const memInfo = window.performance.memory;
        performance.tests.memoryUsage = {
          used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024)
        };
        const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        performance.score += usageRatio < 0.8 ? 35 : usageRatio < 0.9 ? 20 : 0;
      }

    } catch (error) {
      console.log(`   ❌ Performance testing failed: ${error.message}`);
    }

    console.log(`   Performance Score: ${performance.score}%\n`);
    this.results.testSuites.performance = { 
      ...performance, 
      status: performance.score >= 80 ? 'pass' : performance.score >= 60 ? 'partial' : 'fail' 
    };
  }

  generateFinalResults() {
    console.log('📊 Generating Final Results...');
    
    const suites = this.results.testSuites;
    const scores = Object.values(suites).map(suite => suite.score || 0);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    let status = 'unknown';
    if (overallScore >= 90) status = 'excellent';
    else if (overallScore >= 80) status = 'good';
    else if (overallScore >= 60) status = 'fair';
    else if (overallScore >= 40) status = 'poor';
    else status = 'critical';

    const recommendations = [];
    
    if (suites.environment?.score < 80) {
      recommendations.push('Ensure all memory system components are properly loaded');
    }
    if (suites.database?.score < 80) {
      recommendations.push('Check database setup and run supabase_schema.sql');
    }
    if (suites.authentication?.score < 80) {
      recommendations.push('Complete user authentication to enable full memory features');
    }
    if (suites.memoryFeatures?.score < 80) {
      recommendations.push('Verify memory service configuration and API keys');
    }
    if (suites.integration?.score < 80) {
      recommendations.push('Check UI integration and memory status indicators');
    }
    if (suites.performance?.score < 80) {
      recommendations.push('Optimize system performance and response times');
    }

    this.results.overall = {
      score: overallScore,
      status,
      recommendations: recommendations.length > 0 ? recommendations : ['Memory system is working well!'],
      summary: `Overall system status: ${status.toUpperCase()} (${overallScore}%)`
    };

    console.log('\n🎯 FINAL RESULTS');
    console.log('================');
    console.log(`Overall Score: ${overallScore}%`);
    console.log(`Status: ${status.toUpperCase()}`);
    console.log('\nTest Suite Scores:');
    Object.entries(suites).forEach(([name, suite]) => {
      console.log(`  ${name}: ${suite.score}% (${suite.status})`);
    });
    
    if (recommendations.length > 0) {
      console.log('\nRecommendations:');
      recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
    }
  }
}

// Make test available globally
if (typeof window !== 'undefined') {
  window.runComprehensiveMemoryTest = async () => {
    const test = new ComprehensiveMemoryTest();
    return await test.runAllTests();
  };
  
  console.log('🧪 Comprehensive test available: window.runComprehensiveMemoryTest()');
  console.log('🚀 Run with: await window.runComprehensiveMemoryTest()');
}

// Auto-run if URL parameter is present
if (typeof window !== 'undefined' && window.location?.search?.includes('comprehensive-test')) {
  setTimeout(async () => {
    const test = new ComprehensiveMemoryTest();
    await test.runAllTests();
  }, 2000);
}