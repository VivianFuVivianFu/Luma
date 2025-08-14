// Test script for the Multi-Model System
// Run this to verify all models are working correctly

import MultiModelSystem from './src/multimodel/index.js';

async function testMultiModelSystem() {
  console.log('🚀 Starting Multi-Model System Test');
  console.log('=====================================');
  
  try {
    // Initialize the system
    const multiModel = new MultiModelSystem();
    
    // Test messages covering different scenarios
    const testCases = [
      {
        message: "I'm feeling really sad and overwhelmed today",
        expectedModel: "empathy",
        description: "Emotional support request"
      },
      {
        message: "Can you help me analyze the pros and cons of changing jobs?",
        expectedModel: "reasoning", 
        description: "Logical analysis request"
      },
      {
        message: "I'm anxious about my relationship and don't know what to do",
        expectedModel: "empathy",
        description: "Emotional concern"
      },
      {
        message: "What's the best systematic approach to solving this problem?",
        expectedModel: "reasoning",
        description: "Explicit reasoning request"
      },
      {
        message: "I feel hopeless and can't see a way forward",
        expectedModel: "empathy",
        description: "Crisis-like emotional state"
      },
      {
        message: "Hello, how are you today?",
        expectedModel: "empathy",
        description: "Neutral greeting"
      }
    ];
    
    console.log(`\n📋 Running ${testCases.length} test cases...\n`);
    
    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Test ${i + 1}: ${testCase.description}`);
      console.log(`Input: "${testCase.message}"`);
      
      try {
        const startTime = Date.now();
        const result = await multiModel.processMessage(testCase.message);
        const endTime = Date.now();
        
        const success = result && result.response && result.metadata;
        const modelUsed = result.metadata?.model || 'unknown';
        const responseTime = endTime - startTime;
        
        console.log(`✅ Model: ${modelUsed} | Time: ${responseTime}ms | Expected: ${testCase.expectedModel}`);
        console.log(`📝 Response: "${result.response.substring(0, 100)}..."`);
        
        results.push({
          test: i + 1,
          description: testCase.description,
          input: testCase.message,
          expectedModel: testCase.expectedModel,
          actualModel: modelUsed,
          responseTime: responseTime,
          confidence: result.metadata.confidence,
          success: success,
          response: result.response
        });
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
          test: i + 1,
          description: testCase.description,
          input: testCase.message,
          expectedModel: testCase.expectedModel,
          error: error.message,
          success: false
        });
      }
      
      console.log('---');
    }
    
    // Display final results
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successfulTests.length}/${results.length}`);
    console.log(`❌ Failed: ${failedTests.length}/${results.length}`);
    
    if (successfulTests.length > 0) {
      const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
      console.log(`⏱️  Average Response Time: ${Math.round(avgResponseTime)}ms`);
      
      const modelUsage = {};
      successfulTests.forEach(r => {
        modelUsage[r.actualModel] = (modelUsage[r.actualModel] || 0) + 1;
      });
      
      console.log('\n🎯 Model Usage:');
      Object.entries(modelUsage).forEach(([model, count]) => {
        console.log(`   ${model}: ${count} times`);
      });
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   Test ${test.test}: ${test.error}`);
      });
    }
    
    // Get system metrics
    console.log('\n📈 System Metrics:');
    const metrics = multiModel.getSystemMetrics();
    console.log(`   Total Requests: ${metrics.system.totalRequests}`);
    console.log(`   Successful Responses: ${metrics.system.successfulResponses}`);
    console.log(`   Average Response Time: ${Math.round(metrics.system.averageResponseTime)}ms`);
    
    // Get system health
    const health = multiModel.getSystemHealth();
    console.log(`\n🏥 System Health: ${health.status.toUpperCase()}`);
    console.log(`   Success Rate: ${Math.round(health.successRate * 100)}%`);
    
    console.log('\n🎉 Multi-Model System test completed!');
    
    return {
      success: successfulTests.length === results.length,
      results: results,
      metrics: metrics,
      health: health
    };
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testMultiModelSystem()
  .then(result => {
    if (result.success) {
      console.log('\n✅ All tests passed! Multi-Model System is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Check the output above for details.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });