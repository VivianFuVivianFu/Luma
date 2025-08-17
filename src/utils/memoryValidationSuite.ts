// Memory Validation Suite - Comprehensive testing of all memory features
import { memoryService } from '../lib/memoryService';
import { sbAdmin } from '../lib/supabase';

interface ValidationResult {
  feature: string;
  status: 'pass' | 'fail' | 'partial';
  score: number;
  details: string[];
  errors: string[];
  data?: any;
}

export interface MemoryValidationReport {
  shortTermMemory: ValidationResult;
  longTermMemory: ValidationResult;
  memoryIntegration: ValidationResult;
  sessionPersistence: ValidationResult;
  overallScore: number;
  summary: string;
  recommendations: string[];
}

export class MemoryValidationSuite {
  private testUserId: string;
  private testSessionId: string;

  constructor() {
    this.testUserId = `test-user-${Date.now()}`;
    this.testSessionId = `test-session-${Date.now()}`;
  }

  // Test conversation for memory validation
  private getTestConversation(): string[] {
    return [
      "Hi, I'm feeling really anxious about my job. I work as a marketing manager and my boss is very demanding.",
      "Yes, I've been having trouble sleeping because I keep worrying about deadlines. This has been going on for about 3 weeks now.",
      "I usually go for runs to cope with stress, but I haven't had time lately because of the extra work.",
      "My partner has noticed I'm more irritable than usual. We've been together for 2 years and this is putting strain on our relationship.",
      "I grew up in a family where my parents worked a lot, so I learned that hard work is important. Maybe I'm pushing myself too hard.",
      "I've been thinking about talking to a therapist. Do you think that would help with managing work stress?",
      "Actually, I did start meditation last week. I've been doing 10 minutes every morning before work.",
      "The meditation seems to help a little, but I still feel overwhelmed during busy days at the office.",
      "I'm worried that if I don't perform well, I might lose my job. The company has been doing layoffs recently.",
      "Maybe I need to set better boundaries with my work hours. I've been checking emails until late at night."
    ];
  }

  // 1. Validate Short-term Memory (Session Summaries)
  async validateShortTermMemory(): Promise<ValidationResult> {
    const details: string[] = [];
    const errors: string[] = [];
    let score = 0;

    try {
      details.push("🔍 Testing short-term memory (session summaries)...");

      // Send test messages to generate summaries
      const conversation = this.getTestConversation().slice(0, 6); // First 6 messages
      
      details.push(`📝 Sending ${conversation.length} messages to generate session summary...`);
      
      // Simulate conversation
      for (let i = 0; i < conversation.length; i++) {
        const message = conversation[i];
        await this.simulateMessage(this.testSessionId, this.testUserId, 'user', message);
        await this.simulateMessage(this.testSessionId, this.testUserId, 'assistant', `Response to message ${i + 1}`);
        
        // Force summary update after every 2 messages (more frequent for testing)
        if (i % 2 === 1) {
          await memoryService.updateSummary(this.testSessionId);
          details.push(`   ✅ Summary updated after message ${i + 1}`);
        }
      }

      // Check if session summary was created
      const { data: summaryData, error: summaryError } = await sbAdmin
        .from('session_summaries')
        .select('summary')
        .eq('session_id', this.testSessionId)
        .maybeSingle();

      if (summaryError) {
        errors.push(`Summary retrieval error: ${summaryError.message}`);
        score = 0;
      } else if (summaryData?.summary) {
        const summary = summaryData.summary;
        details.push(`📋 Generated summary: ${summary.substring(0, 200)}...`);
        
        // Validate summary content
        const hasWorkMention = summary.toLowerCase().includes('work') || summary.toLowerCase().includes('job') || summary.toLowerCase().includes('marketing');
        const hasAnxietyMention = summary.toLowerCase().includes('anxious') || summary.toLowerCase().includes('stress') || summary.toLowerCase().includes('worry');
        const hasSleepMention = summary.toLowerCase().includes('sleep');
        
        score = (hasWorkMention ? 30 : 0) + (hasAnxietyMention ? 40 : 0) + (hasSleepMention ? 30 : 0);
        
        details.push(`   ✅ Work context captured: ${hasWorkMention ? 'Yes' : 'No'}`);
        details.push(`   ✅ Anxiety context captured: ${hasAnxietyMention ? 'Yes' : 'No'}`);
        details.push(`   ✅ Sleep issues captured: ${hasSleepMention ? 'Yes' : 'No'}`);
      } else {
        errors.push("No session summary found");
        score = 0;
      }

      // Test summary frequency
      const { data: messages, error: msgError } = await sbAdmin
        .from('messages')
        .select('id')
        .eq('session_id', this.testSessionId);

      if (msgError) {
        errors.push(`Message count error: ${msgError.message}`);
      } else {
        const messageCount = messages?.length || 0;
        details.push(`📊 Total messages stored: ${messageCount}`);
        if (messageCount >= conversation.length * 2) {
          score += 20; // Bonus for proper message storage
        }
      }

    } catch (error) {
      errors.push(`Short-term memory validation failed: ${error}`);
      score = 0;
    }

    const status: 'pass' | 'fail' | 'partial' = score >= 80 ? 'pass' : score >= 40 ? 'partial' : 'fail';
    
    return {
      feature: 'Short-term Memory',
      status,
      score,
      details,
      errors,
      data: { testSessionId: this.testSessionId }
    };
  }

  // 2. Validate Long-term Memory (User Memories)
  async validateLongTermMemory(): Promise<ValidationResult> {
    const details: string[] = [];
    const errors: string[] = [];
    let score = 0;

    try {
      details.push("🧠 Testing long-term memory (user memories extraction)...");

      // Use full conversation to extract long-term memories
      const conversation = this.getTestConversation();
      
      details.push(`📝 Processing ${conversation.length} messages for long-term memory extraction...`);

      // Simulate extended conversation
      for (let i = 0; i < conversation.length; i++) {
        const message = conversation[i];
        await this.simulateMessage(this.testSessionId, this.testUserId, 'user', message);
        await this.simulateMessage(this.testSessionId, this.testUserId, 'assistant', `Thoughtful response to: ${message.substring(0, 50)}...`);
      }

      // Force long-term memory extraction
      await memoryService.extractLongMemories(this.testUserId, this.testSessionId);
      details.push("   🔄 Long-term memory extraction completed");

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if long-term memories were created
      const { data: memories, error: memoriesError } = await sbAdmin
        .from('user_memories')
        .select('content, importance')
        .eq('user_id', this.testUserId)
        .order('created_at', { ascending: false });

      if (memoriesError) {
        errors.push(`Memory retrieval error: ${memoriesError.message}`);
        score = 0;
      } else if (memories && memories.length > 0) {
        details.push(`📋 Extracted ${memories.length} long-term memories:`);
        
        let contentScore = 0;
        const expectedPatterns = [
          { pattern: /marketing|work|job|manager/, name: 'Job Role', points: 25 },
          { pattern: /stress|anxiety|anxious|worry/, name: 'Mental State', points: 25 },
          { pattern: /relationship|partner/, name: 'Relationship', points: 20 },
          { pattern: /meditation|coping|boundaries/, name: 'Coping Strategies', points: 30 }
        ];

        memories.forEach((memory: any, index: number) => {
          details.push(`   📝 Memory ${index + 1}: ${memory.content}`);
          
          // Check content quality
          expectedPatterns.forEach(pattern => {
            if (pattern.pattern.test(memory.content.toLowerCase())) {
              contentScore += pattern.points;
              details.push(`     ✅ Captured ${pattern.name}`);
            }
          });
        });

        score = Math.min(contentScore, 100);
        
        // Bonus for multiple memories
        if (memories.length >= 3) {
          score += 10;
          details.push(`   🎯 Bonus: Multiple memories extracted (${memories.length})`);
        }

      } else {
        errors.push("No long-term memories extracted");
        score = 0;
      }

    } catch (error) {
      errors.push(`Long-term memory validation failed: ${error}`);
      score = 0;
    }

    const status: 'pass' | 'fail' | 'partial' = score >= 80 ? 'pass' : score >= 40 ? 'partial' : 'fail';
    
    return {
      feature: 'Long-term Memory',
      status,
      score,
      details,
      errors,
      data: { testUserId: this.testUserId }
    };
  }

  // 3. Validate Memory Integration (Context Loading)
  async validateMemoryIntegration(): Promise<ValidationResult> {
    const details: string[] = [];
    const errors: string[] = [];
    let score = 0;

    try {
      details.push("🔗 Testing memory integration (context loading)...");

      // Test context loading functionality
      const context = await memoryService.getConversationContext(this.testUserId, this.testSessionId);
      
      if (context && context.trim()) {
        details.push(`📋 Context loaded (${context.length} characters)`);
        details.push(`   📄 Context preview: ${context.substring(0, 150)}...`);
        
        // Validate context content
        const hasLongTermContext = context.includes('LONG-TERM USER CONTEXT');
        const hasSessionContext = context.includes('RECENT SESSION SUMMARY');
        
        score += hasLongTermContext ? 50 : 0;
        score += hasSessionContext ? 50 : 0;
        
        details.push(`   ✅ Long-term context: ${hasLongTermContext ? 'Included' : 'Missing'}`);
        details.push(`   ✅ Session context: ${hasSessionContext ? 'Included' : 'Missing'}`);
        
        // Test if context would be properly integrated in AI responses
        if (hasLongTermContext && hasSessionContext) {
          details.push("   🎯 Context integration ready for AI responses");
          score += 20; // Bonus for complete integration
        }
        
      } else {
        errors.push("No context loaded - memory integration may not be working");
        score = 0;
      }

      // Test context loading for different scenarios
      const { summary, longMem } = await memoryService.loadContext(this.testUserId, this.testSessionId);
      
      details.push(`📊 Context components:`);
      details.push(`   📝 Summary length: ${summary?.length || 0} characters`);
      details.push(`   🧠 Long-term memory length: ${longMem?.length || 0} characters`);
      
      if (summary && longMem) {
        score += 10; // Bonus for both components working
      }

    } catch (error) {
      errors.push(`Memory integration validation failed: ${error}`);
      score = 0;
    }

    const status: 'pass' | 'fail' | 'partial' = score >= 80 ? 'pass' : score >= 40 ? 'partial' : 'fail';
    
    return {
      feature: 'Memory Integration',
      status,
      score,
      details,
      errors,
      data: { contextLength: 0 }
    };
  }

  // 4. Validate Session Persistence (Cross-session continuity)
  async validateSessionPersistence(): Promise<ValidationResult> {
    const details: string[] = [];
    const errors: string[] = [];
    let score = 0;

    try {
      details.push("🔄 Testing session persistence (cross-session continuity)...");

      // Create a second session for the same user
      const secondSessionId = await memoryService.getActiveSession(this.testUserId);
      
      if (secondSessionId) {
        details.push(`📝 Created second session: ${secondSessionId.substring(0, 20)}...`);
        
        // Test if previous memories are available in new session
        const newSessionContext = await memoryService.getConversationContext(this.testUserId, secondSessionId);
        
        if (newSessionContext && newSessionContext.trim()) {
          details.push("   ✅ Previous memories available in new session");
          score += 40;
          
          // Check if context contains information from previous session
          const contextLower = newSessionContext.toLowerCase();
          const hasWorkInfo = contextLower.includes('marketing') || contextLower.includes('work') || contextLower.includes('job');
          const hasAnxietyInfo = contextLower.includes('anxiety') || contextLower.includes('stress');
          const hasPersonalInfo = contextLower.includes('partner') || contextLower.includes('relationship');
          
          score += hasWorkInfo ? 20 : 0;
          score += hasAnxietyInfo ? 20 : 0;
          score += hasPersonalInfo ? 20 : 0;
          
          details.push(`   ✅ Work context persisted: ${hasWorkInfo ? 'Yes' : 'No'}`);
          details.push(`   ✅ Anxiety context persisted: ${hasAnxietyInfo ? 'Yes' : 'No'}`);
          details.push(`   ✅ Personal context persisted: ${hasPersonalInfo ? 'Yes' : 'No'}`);
          
        } else {
          errors.push("No context available in new session");
          score = 0;
        }
        
        // Test session management
        const userSessions = await memoryService.getUserSessions(this.testUserId, 5);
        details.push(`📊 User sessions found: ${userSessions.length}`);
        
        if (userSessions.length > 0) {
          score += 10; // Bonus for session tracking
          details.push("   ✅ Session tracking working");
        }
        
      } else {
        errors.push("Could not create second session");
        score = 0;
      }

    } catch (error) {
      errors.push(`Session persistence validation failed: ${error}`);
      score = 0;
    }

    const status: 'pass' | 'fail' | 'partial' = score >= 80 ? 'pass' : score >= 40 ? 'partial' : 'fail';
    
    return {
      feature: 'Session Persistence',
      status,
      score,
      details,
      errors,
      data: { testUserId: this.testUserId }
    };
  }

  // Helper method to simulate database message storage
  private async simulateMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string) {
    try {
      await sbAdmin.from('messages').insert({
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error simulating message:', error);
    }
  }

  // Run complete validation suite
  async runCompleteValidation(): Promise<MemoryValidationReport> {
    console.log('🚀 Starting Complete Memory Validation Suite...\n');

    // Initialize test session
    try {
      const sessionId = await memoryService.startSession(this.testUserId);
      if (sessionId) {
        this.testSessionId = sessionId;
      }
    } catch (error) {
      console.error('Error initializing test session:', error);
    }

    // Run all validations
    const shortTermResult = await this.validateShortTermMemory();
    const longTermResult = await this.validateLongTermMemory();
    const integrationResult = await this.validateMemoryIntegration();
    const persistenceResult = await this.validateSessionPersistence();

    // Calculate overall score
    const overallScore = Math.round(
      (shortTermResult.score + longTermResult.score + integrationResult.score + persistenceResult.score) / 4
    );

    // Generate summary
    let summary: string;
    const passCount = [shortTermResult, longTermResult, integrationResult, persistenceResult]
      .filter(r => r.status === 'pass').length;

    if (passCount === 4) {
      summary = '🎉 All memory features are working correctly!';
    } else if (passCount >= 3) {
      summary = '✅ Memory system is mostly functional with minor issues.';
    } else if (passCount >= 2) {
      summary = '⚠️ Memory system has some issues that need attention.';
    } else {
      summary = '❌ Memory system requires significant fixes.';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (shortTermResult.status !== 'pass') {
      recommendations.push('Fix short-term memory: Ensure session summaries are generated correctly');
    }
    if (longTermResult.status !== 'pass') {
      recommendations.push('Fix long-term memory: Verify user memory extraction is working');
    }
    if (integrationResult.status !== 'pass') {
      recommendations.push('Fix memory integration: Check context loading functionality');
    }
    if (persistenceResult.status !== 'pass') {
      recommendations.push('Fix session persistence: Verify cross-session memory continuity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory system is working well! Continue monitoring performance.');
    }

    // Cleanup test data
    await this.cleanup();

    return {
      shortTermMemory: shortTermResult,
      longTermMemory: longTermResult,
      memoryIntegration: integrationResult,
      sessionPersistence: persistenceResult,
      overallScore,
      summary,
      recommendations
    };
  }

  // Cleanup test data
  private async cleanup() {
    try {
      // Clean up test messages
      await sbAdmin.from('messages').delete().eq('user_id', this.testUserId);
      
      // Clean up test summaries
      await sbAdmin.from('session_summaries').delete().eq('session_id', this.testSessionId);
      
      // Clean up test memories
      await sbAdmin.from('user_memories').delete().eq('user_id', this.testUserId);
      
      // Clean up test sessions
      await sbAdmin.from('sessions').delete().eq('user_id', this.testUserId);
      
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  const validator = new MemoryValidationSuite();
  
  (window as any).validateMemoryFeatures = () => validator.runCompleteValidation();
  (window as any).memoryValidator = validator;
  
  console.log('🔍 Memory validation functions available:');
  console.log('   • window.validateMemoryFeatures() - Run complete validation suite');
}