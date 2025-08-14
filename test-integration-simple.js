// Simple test to verify multi-model integration works
import MultiModelSystem from './src/multimodel/index.js';

async function testIntegration() {
  console.log('🧪 Testing Multi-Model Integration');
  console.log('==================================');
  
  try {
    // Initialize the system
    const multiModel = new MultiModelSystem();
    console.log('✅ Multi-model system initialized');
    
    // Test emotional message
    console.log('\n📱 Testing emotional message...');
    const emotionalResult = await multiModel.processMessage("I'm feeling really sad today");
    console.log(`Model used: ${emotionalResult.metadata.model}`);
    console.log(`Response: "${emotionalResult.response.substring(0, 100)}..."`);
    
    // Test reasoning message  
    console.log('\n🧠 Testing reasoning message...');
    const reasoningResult = await multiModel.processMessage("Can you help me analyze this problem step by step?");
    console.log(`Model used: ${reasoningResult.metadata.model}`);
    console.log(`Response: "${reasoningResult.response.substring(0, 100)}..."`);
    
    // Get system health
    console.log('\n📊 System Health:');
    const health = multiModel.getSystemHealth();
    console.log(`Status: ${health.status}`);
    console.log(`Success Rate: ${(health.successRate * 100).toFixed(1)}%`);
    
    console.log('\n🎉 Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testIntegration();