// Browser Test Setup - Makes testing functions available globally
import { lumaAI } from '../lib/lumaAI';
import { memoryService } from '../lib/memoryService';
import { supabase, sbAdmin } from '../lib/supabase';
import { logMemorySystemStatus } from './testDbTables';
import { MemoryTestRunner, memoryTestConversations } from './memoryTestConversations';
import { MemoryValidationSuite } from './memoryValidationSuite';

// Extend window interface for TypeScript
declare global {
  interface Window {
    // Core instances
    lumaAI: typeof lumaAI;
    memoryService: typeof memoryService;
    supabase: typeof supabase;
    sbAdmin: typeof sbAdmin;
    
    // Test functions
    testMemorySystem: () => void;
    runMemoryTests: () => Promise<any>;
    checkMemoryStatus: () => void;
    validateMemoryFeatures: () => Promise<any>;
    
    // Test data
    memoryTestConversations: typeof memoryTestConversations;
    memoryTestRunner: MemoryTestRunner;
  }
}

// Initialize browser testing environment
export function setupBrowserTests() {
  // Core instances
  window.lumaAI = lumaAI;
  window.memoryService = memoryService;
  window.supabase = supabase;
  window.sbAdmin = sbAdmin;
  
  // Test runners
  const memoryTestRunner = new MemoryTestRunner();
  const memoryValidator = new MemoryValidationSuite();
  
  window.memoryTestRunner = memoryTestRunner;
  window.memoryTestConversations = memoryTestConversations;
  
  // Quick memory status check
  window.checkMemoryStatus = () => {
    console.log('🔍 Quick Memory System Status Check\n');
    
    const sessionInfo = lumaAI.getSessionInfo();
    console.log('📊 Current Status:');
    console.log(`   Memory Enabled: ${sessionInfo.memoryEnabled ? '✅ Yes' : '❌ No'}`);
    console.log(`   User ID: ${sessionInfo.userId || 'None'}`);
    console.log(`   Session ID: ${sessionInfo.sessionId || 'None'}`);
    
    console.log('\n💡 Available test functions:');
    console.log('   • window.checkMemoryStatus() - This function');
    console.log('   • window.testMemorySystem() - Full database check');
    console.log('   • window.runMemoryTests() - Run conversation tests');
    console.log('   • window.validateMemoryFeatures() - Comprehensive validation suite');
    console.log('\n📋 Test data available:');
    console.log('   • window.memoryTestConversations - Predefined test conversations');
    console.log('   • window.lumaAI - Direct access to AI instance');
    console.log('   • window.memoryService - Direct access to memory service');
  };
  
  // Full memory system test
  window.testMemorySystem = () => {
    logMemorySystemStatus();
  };
  
  // Conversation-based memory tests
  window.runMemoryTests = async () => {
    if (!lumaAI) {
      console.error('❌ LumaAI not available');
      return null;
    }
    
    const sessionInfo = lumaAI.getSessionInfo();
    if (!sessionInfo.memoryEnabled) {
      console.log('⚠️ Memory system not enabled. Please log in first.');
      console.log('💡 You can still run database tests with window.testMemorySystem()');
      return null;
    }
    
    return await memoryTestRunner.runAllMemoryTests(lumaAI);
  };
  
  // Memory feature validation
  window.validateMemoryFeatures = async () => {
    console.log('🔍 Starting comprehensive memory feature validation...');
    return await memoryValidator.runCompleteValidation();
  };
  
  // Log setup completion
  console.log('🧪 Browser testing environment ready!');
  console.log('💡 Run window.checkMemoryStatus() to get started');
}

// Auto-setup when module loads
if (typeof window !== 'undefined') {
  setupBrowserTests();
}