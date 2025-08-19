// Browser Test Setup - Makes testing functions available globally
import { claudeAI } from '../lib/claudeAI';
import { memoryService } from '../lib/memoryService';
import { supabase, sbAdmin } from '../lib/supabase';
// import { logMemorySystemStatus } from './testDbTables'; // File removed
// import { MemoryTestRunner, memoryTestConversations } from './memoryTestConversations'; // Files removed
// import { MemoryValidationSuite } from './memoryValidationSuite'; // File removed

// Extend window interface for TypeScript
declare global {
  interface Window {
    // Core instances
    claudeAI: typeof claudeAI;
    memoryService: typeof memoryService;
    supabase: typeof supabase;
    sbAdmin: typeof sbAdmin;
    
    // Test functions
    testMemorySystem: () => void;
    runMemoryTests: () => Promise<any>;
    checkMemoryStatus: () => void;
    validateMemoryFeatures: () => Promise<any>;
    
    // Test data (placeholder)
    memoryTestConversations: any;
    memoryTestRunner: any;
  }
}

// Initialize browser testing environment
export function setupBrowserTests() {
  // Core instances
  window.claudeAI = claudeAI;
  window.memoryService = memoryService;
  window.supabase = supabase;
  window.sbAdmin = sbAdmin;
  
  // Test runners (placeholder implementations)
  window.memoryTestRunner = {
    async runAllMemoryTests() {
      console.log('Memory test runner not available (files removed)');
      return null;
    }
  };
  window.memoryTestConversations = [];
  
  // Quick memory status check
  window.checkMemoryStatus = () => {
    console.log('🔍 Quick Memory System Status Check\n');
    
    const status = claudeAI.getStatus();
    console.log('📊 Current Status:');
    console.log(`   Connected: ${status.connected ? '✅ Yes' : '❌ No'}`);
    console.log(`   Model: ${status.model}`);
    console.log(`   History Length: ${status.historyLength}`);
    
    console.log('\n💡 Available test functions:');
    console.log('   • window.checkMemoryStatus() - This function');
    console.log('   • window.testMemorySystem() - Full database check');
    console.log('   • window.runMemoryTests() - Run conversation tests');
    console.log('   • window.validateMemoryFeatures() - Comprehensive validation suite');
    console.log('\n📋 Test data available:');
    console.log('   • window.memoryTestConversations - Predefined test conversations');
    console.log('   • window.claudeAI - Direct access to AI instance');
    console.log('   • window.memoryService - Direct access to memory service');
  };
  
  // Full memory system test (placeholder)
  window.testMemorySystem = () => {
    console.log('Memory system test not available (testDbTables file removed)');
  };
  
  // Conversation-based memory tests (placeholder)
  window.runMemoryTests = async () => {
    if (!claudeAI) {
      console.error('❌ Claude AI not available');
      return null;
    }
    
    const status = claudeAI.getStatus();
    if (!status.connected) {
      console.log('⚠️ Claude AI not connected. Please check proxy server.');
      return null;
    }
    
    console.log('Memory tests not available (test files removed)');
    return null;
  };
  
  // Memory feature validation (placeholder)
  window.validateMemoryFeatures = async () => {
    console.log('🔍 Memory feature validation not available (validation files removed)');
    return null;
  };
  
  // Log setup completion
  console.log('🧪 Browser testing environment ready!');
  console.log('💡 Run window.checkMemoryStatus() to get started');
}

// Auto-setup when module loads
if (typeof window !== 'undefined') {
  setupBrowserTests();
}