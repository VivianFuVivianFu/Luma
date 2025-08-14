// Memory System Live Demo Script
// This script demonstrates all memory features in action

console.log('🎭 Memory System Live Demo');
console.log('==========================\n');

class MemorySystemDemo {
  constructor() {
    this.demoUserId = `demo-user-${Date.now()}`;
    this.currentSessionId = null;
    this.conversationHistory = [];
    this.demoResults = {
      timestamp: new Date().toISOString(),
      demoSteps: [],
      memoryEvents: [],
      finalAssessment: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    this.demoResults.demoSteps.push({
      timestamp,
      type,
      message
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runDemo() {
    try {
      this.log('Starting comprehensive memory system demonstration...', 'info');
      
      await this.step1_InitializeDemo();
      await this.step2_CreateSession();
      await this.step3_SimulateConversation();
      await this.step4_TestShortTermMemory();
      await this.step5_TestLongTermMemory();
      await this.step6_TestMemoryIntegration();
      await this.step7_TestSessionPersistence();
      await this.step8_FinalAssessment();
      await this.step9_CleanupDemo();
      
      this.log('Demo completed successfully!', 'success');
      return this.demoResults;
      
    } catch (error) {
      this.log(`Demo failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async step1_InitializeDemo() {
    this.log('Step 1: Initializing demo environment...', 'info');
    
    // Check if required services are available
    if (typeof window.memoryService !== 'object') {
      throw new Error('Memory service not available');
    }
    
    if (typeof window.sbAdmin !== 'object') {
      throw new Error('Database admin client not available');
    }
    
    this.log('All required services are available', 'success');
    await this.delay(1000);
  }

  async step2_CreateSession() {
    this.log('Step 2: Creating new conversation session...', 'info');
    
    try {
      // Create a new session for our demo user
      this.currentSessionId = await window.memoryService.startSession(this.demoUserId);
      
      if (this.currentSessionId) {
        this.log(`Created session: ${this.currentSessionId.substring(0, 16)}...`, 'success');
        this.demoResults.memoryEvents.push({
          event: 'session_created',
          sessionId: this.currentSessionId,
          userId: this.demoUserId
        });
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      this.log(`Session creation failed: ${error.message}`, 'error');
      throw error;
    }
    
    await this.delay(1000);
  }

  async step3_SimulateConversation() {
    this.log('Step 3: Simulating realistic conversation...', 'info');
    
    const conversation = [
      "Hi, I'm feeling really stressed about my job as a marketing manager. My boss is very demanding.",
      "I've been having trouble sleeping for the past 3 weeks because I keep worrying about deadlines.",
      "I usually cope with stress by going for runs, but I haven't had time lately due to extra work.",
      "My partner has noticed I'm more irritable. We've been together for 2 years and this is affecting us.",
      "I grew up in a family where hard work was valued. Maybe I'm pushing myself too hard.",
      "I've been thinking about seeing a therapist. Do you think that would help with work stress?",
      "I started meditation last week - doing 10 minutes every morning before work.",
      "The meditation helps a little, but I still feel overwhelmed during busy office days.",
      "I'm worried about job security. The company has been doing layoffs recently.",
      "Maybe I need better work-life boundaries. I check emails until late at night."
    ];

    for (let i = 0; i < conversation.length; i++) {
      const userMessage = conversation[i];
      const assistantResponse = `Thank you for sharing that. I understand this is a challenging time for you. Let me help you process these feelings about ${i % 2 === 0 ? 'work stress' : 'your wellbeing'}.`;
      
      // Store messages in database
      await this.storeMessage('user', userMessage);
      await this.storeMessage('assistant', assistantResponse);
      
      this.log(`Message ${i + 1}/10: Stored conversation exchange`, 'info');
      
      // Update session summary every 2 messages (for demo purposes)
      if (i % 2 === 1) {
        await window.memoryService.updateSummary(this.currentSessionId);
        this.log(`Updated session summary after message ${i + 1}`, 'success');
        this.demoResults.memoryEvents.push({
          event: 'summary_updated',
          messageCount: i + 1
        });
      }
      
      await this.delay(500); // Small delay for demo effect
    }
    
    this.log('Conversation simulation completed', 'success');
  }

  async step4_TestShortTermMemory() {
    this.log('Step 4: Testing short-term memory (session summaries)...', 'info');
    
    try {
      // Retrieve the session summary
      const { data: summaryData, error } = await window.sbAdmin
        .from('session_summaries')
        .select('summary, updated_at')
        .eq('session_id', this.currentSessionId)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Summary retrieval failed: ${error.message}`);
      }
      
      if (summaryData?.summary) {
        const summary = summaryData.summary;
        this.log(`Session summary generated (${summary.length} characters)`, 'success');
        this.log(`Summary preview: "${summary.substring(0, 100)}..."`, 'info');
        
        // Analyze summary content
        const lowerSummary = summary.toLowerCase();
        const capturedElements = {
          workStress: lowerSummary.includes('work') || lowerSummary.includes('job') || lowerSummary.includes('stress'),
          sleepIssues: lowerSummary.includes('sleep') || lowerSummary.includes('worry'),
          relationship: lowerSummary.includes('partner') || lowerSummary.includes('relationship'),
          coping: lowerSummary.includes('meditation') || lowerSummary.includes('run')
        };
        
        const captureScore = Object.values(capturedElements).filter(Boolean).length;
        this.log(`Content analysis: ${captureScore}/4 key elements captured`, captureScore >= 3 ? 'success' : 'warning');
        
        this.demoResults.memoryEvents.push({
          event: 'short_term_memory_tested',
          summaryLength: summary.length,
          elementsCaptyred: capturedElements,
          score: captureScore
        });
        
      } else {
        throw new Error('No session summary found');
      }
    } catch (error) {
      this.log(`Short-term memory test failed: ${error.message}`, 'error');
      throw error;
    }
    
    await this.delay(1000);
  }

  async step5_TestLongTermMemory() {
    this.log('Step 5: Testing long-term memory (user insights)...', 'info');
    
    try {
      // Force extraction of long-term memories
      await window.memoryService.extractLongMemories(this.demoUserId, this.currentSessionId);
      this.log('Long-term memory extraction initiated', 'info');
      
      // Wait for processing
      await this.delay(3000);
      
      // Retrieve extracted memories
      const { data: memories, error } = await window.sbAdmin
        .from('user_memories')
        .select('content, importance, created_at')
        .eq('user_id', this.demoUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Memory retrieval failed: ${error.message}`);
      }
      
      if (memories && memories.length > 0) {
        this.log(`Extracted ${memories.length} long-term memories`, 'success');
        
        memories.forEach((memory, index) => {
          this.log(`Memory ${index + 1}: "${memory.content}" (importance: ${memory.importance})`, 'info');
        });
        
        // Analyze memory quality
        const memoryContent = memories.map(m => m.content.toLowerCase()).join(' ');
        const qualityFactors = {
          jobRole: memoryContent.includes('marketing') || memoryContent.includes('manager'),
          mentalHealth: memoryContent.includes('stress') || memoryContent.includes('anxiety'),
          relationships: memoryContent.includes('partner') || memoryContent.includes('relationship'),
          copingStrategies: memoryContent.includes('meditation') || memoryContent.includes('run')
        };
        
        const qualityScore = Object.values(qualityFactors).filter(Boolean).length;
        this.log(`Memory quality: ${qualityScore}/4 important aspects captured`, qualityScore >= 3 ? 'success' : 'warning');
        
        this.demoResults.memoryEvents.push({
          event: 'long_term_memory_tested',
          memoriesCount: memories.length,
          qualityFactors,
          score: qualityScore
        });
        
      } else {
        throw new Error('No long-term memories extracted');
      }
    } catch (error) {
      this.log(`Long-term memory test failed: ${error.message}`, 'error');
      throw error;
    }
    
    await this.delay(1000);
  }

  async step6_TestMemoryIntegration() {
    this.log('Step 6: Testing memory integration (context loading)...', 'info');
    
    try {
      // Test context loading
      const context = await window.memoryService.getConversationContext(this.demoUserId, this.currentSessionId);
      
      if (context && context.trim()) {
        this.log(`Context loaded successfully (${context.length} characters)`, 'success');
        this.log(`Context preview: "${context.substring(0, 150)}..."`, 'info');
        
        // Analyze context structure
        const hasLongTermSection = context.includes('LONG-TERM USER CONTEXT');
        const hasSessionSection = context.includes('RECENT SESSION SUMMARY');
        
        this.log(`Long-term context section: ${hasLongTermSection ? '✅' : '❌'}`, hasLongTermSection ? 'success' : 'warning');
        this.log(`Session context section: ${hasSessionSection ? '✅' : '❌'}`, hasSessionSection ? 'success' : 'warning');
        
        const integrationScore = (hasLongTermSection ? 50 : 0) + (hasSessionSection ? 50 : 0);
        
        this.demoResults.memoryEvents.push({
          event: 'memory_integration_tested',
          contextLength: context.length,
          hasLongTermSection,
          hasSessionSection,
          score: integrationScore
        });
        
        if (integrationScore >= 80) {
          this.log('Memory integration is working correctly', 'success');
        } else {
          this.log('Memory integration needs improvement', 'warning');
        }
        
      } else {
        throw new Error('No context loaded');
      }
    } catch (error) {
      this.log(`Memory integration test failed: ${error.message}`, 'error');
      throw error;
    }
    
    await this.delay(1000);
  }

  async step7_TestSessionPersistence() {
    this.log('Step 7: Testing session persistence (cross-session continuity)...', 'info');
    
    try {
      // Create a second session for the same user
      const secondSessionId = await window.memoryService.getActiveSession(this.demoUserId);
      
      if (secondSessionId) {
        this.log(`Created second session: ${secondSessionId.substring(0, 16)}...`, 'success');
        
        // Test if previous memories are available in new session
        const newSessionContext = await window.memoryService.getConversationContext(this.demoUserId, secondSessionId);
        
        if (newSessionContext && newSessionContext.trim()) {
          this.log('Previous memories available in new session', 'success');
          
          // Check if key information persists
          const contextLower = newSessionContext.toLowerCase();
          const persistenceFactors = {
            workContext: contextLower.includes('marketing') || contextLower.includes('work') || contextLower.includes('job'),
            stressContext: contextLower.includes('stress') || contextLower.includes('anxiety'),
            personalContext: contextLower.includes('partner') || contextLower.includes('relationship'),
            copingContext: contextLower.includes('meditation') || contextLower.includes('run')
          };
          
          const persistenceScore = Object.values(persistenceFactors).filter(Boolean).length * 25;
          this.log(`Cross-session persistence: ${persistenceScore}% of key information retained`, persistenceScore >= 75 ? 'success' : 'warning');
          
          this.demoResults.memoryEvents.push({
            event: 'session_persistence_tested',
            secondSessionId,
            persistenceFactors,
            score: persistenceScore
          });
          
        } else {
          throw new Error('No context available in new session');
        }
      } else {
        throw new Error('Could not create second session');
      }
    } catch (error) {
      this.log(`Session persistence test failed: ${error.message}`, 'error');
      throw error;
    }
    
    await this.delay(1000);
  }

  async step8_FinalAssessment() {
    this.log('Step 8: Generating final assessment...', 'info');
    
    // Calculate overall scores
    const memoryEvents = this.demoResults.memoryEvents;
    const scores = {
      shortTermMemory: memoryEvents.find(e => e.event === 'short_term_memory_tested')?.score * 25 || 0,
      longTermMemory: memoryEvents.find(e => e.event === 'long_term_memory_tested')?.score * 25 || 0,
      memoryIntegration: memoryEvents.find(e => e.event === 'memory_integration_tested')?.score || 0,
      sessionPersistence: memoryEvents.find(e => e.event === 'session_persistence_tested')?.score || 0
    };
    
    const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4);
    
    this.demoResults.finalAssessment = {
      scores,
      overallScore,
      status: overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'poor'
    };
    
    this.log('📊 FINAL ASSESSMENT', 'info');
    this.log(`Short-term Memory: ${scores.shortTermMemory}%`, scores.shortTermMemory >= 75 ? 'success' : 'warning');
    this.log(`Long-term Memory: ${scores.longTermMemory}%`, scores.longTermMemory >= 75 ? 'success' : 'warning');
    this.log(`Memory Integration: ${scores.memoryIntegration}%`, scores.memoryIntegration >= 75 ? 'success' : 'warning');
    this.log(`Session Persistence: ${scores.sessionPersistence}%`, scores.sessionPersistence >= 75 ? 'success' : 'warning');
    this.log(`Overall Score: ${overallScore}%`, overallScore >= 80 ? 'success' : 'warning');
    this.log(`System Status: ${this.demoResults.finalAssessment.status.toUpperCase()}`, overallScore >= 80 ? 'success' : 'warning');
    
    await this.delay(1000);
  }

  async step9_CleanupDemo() {
    this.log('Step 9: Cleaning up demo data...', 'info');
    
    try {
      // Clean up demo data
      await window.sbAdmin.from('messages').delete().eq('user_id', this.demoUserId);
      await window.sbAdmin.from('session_summaries').delete().eq('session_id', this.currentSessionId);
      await window.sbAdmin.from('user_memories').delete().eq('user_id', this.demoUserId);
      await window.sbAdmin.from('sessions').delete().eq('user_id', this.demoUserId);
      
      this.log('Demo data cleaned up successfully', 'success');
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'warning');
    }
    
    await this.delay(500);
  }

  async storeMessage(role, content) {
    try {
      await window.sbAdmin.from('messages').insert({
        session_id: this.currentSessionId,
        user_id: this.demoUserId,
        role,
        content,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to store message: ${error.message}`);
    }
  }
}

// Make demo available globally
if (typeof window !== 'undefined') {
  window.runMemoryDemo = async () => {
    const demo = new MemorySystemDemo();
    return await demo.runDemo();
  };
  
  console.log('🎭 Memory demo available: window.runMemoryDemo()');
  console.log('🚀 Run the demo with: await window.runMemoryDemo()');
}