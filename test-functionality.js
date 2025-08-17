// Test script to verify memory and multi-model functionality
// Run this after deployment to ensure everything works

console.log('🧪 Testing Luma Functionality...');

// Test 1: Memory Service Import
try {
  const memoryModule = require('./src/lib/memoryService.ts');
  console.log('✅ Memory service can be imported');
} catch (error) {
  console.log('❌ Memory service import failed:', error.message);
}

// Test 2: Multi-Model Wrapper Import
try {
  const multiModelModule = require('./src/lib/multiModelWrapper.ts');
  console.log('✅ Multi-model wrapper can be imported');
} catch (error) {
  console.log('❌ Multi-model wrapper import failed:', error.message);
}

// Test 3: RAG Service Import
try {
  const ragModule = require('./src/lib/ragService.ts');
  console.log('✅ RAG service can be imported');
} catch (error) {
  console.log('❌ RAG service import failed:', error.message);
}

// Test 4: Check Environment Variables
console.log('🔍 Environment Variables Check:');
console.log('- VITE_TOGETHER_API_KEY:', process.env.VITE_TOGETHER_API_KEY ? 'Set' : 'Not set');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('- VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('- VITE_RAG_SERVER_URL:', process.env.VITE_RAG_SERVER_URL ? 'Set' : 'Not set');

console.log('🏁 Test completed!');