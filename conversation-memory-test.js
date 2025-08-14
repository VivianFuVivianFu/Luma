// Conversation Memory Test - Real-world scenario testing
// This simulates actual conversations to test memory retention and integration

console.log('💬 Conversation Memory Test');
console.log('===========================\n');

class ConversationMemoryTest {
  constructor() {
    this.testUserId = `conv-test-${Date.now()}`;
    this.currentSessionId = null;
    this.conversationLog = [];
    this.memoryEvents = [];
    this.results = {
      timestamp: new Date().toISOString(),
      testUserId: this.testUserId,
      conversations: [],
      memoryRetention: {},
      crossSessionContinuity: {},
      finalAssessment: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    this.conversationLog.push({
      timestamp,
      type,
      message
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runConversationTest() {
    try {
      this.log('Starting realistic conversation memory test...', 'info');
      
      // Phase 1: Initial conversation session
      await this.phase1_InitialConversation();
      
      // Phase 2: Memory processing and analysis
      await this.phase2_MemoryProcessing();
      
      // Phase 3: Second conversation session (continuity test)
      await this.phase3_SecondSession();
      
      // Phase 4: Cross-session memory analysis
      await this.phase4_CrossSessionAnalysis();
      
      // Phase 5: Final assessment
      await this.phase5_FinalAssessment();
      
      // Cleanup
      await this.cleanup();
      
      this.log('Conversation memory test completed successfully!', 'success');
      return this.results;
      
    } catch (error) {
      this.log(`Conversation test failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async phase1_InitialConversation() {
    this.log('Phase 1: Simulating realistic initial conversation...', 'info');
    
    // Create first session
    this.currentSessionId = await window.memoryService.startSession(this.testUserId);
    this.log(`Created session: ${this.currentSessionId.substring(0, 16)}...`, 'success');
    
    // Realistic conversation about work stress and anxiety
    const conversation1 = [
      {
        user: "Hi, I've been feeling really overwhelmed lately at work. I'm a marketing manager at a tech startup and the pressure is getting to me.",
        assistant: "I understand how challenging it can be to manage stress in a demanding role. Can you tell me more about what specifically is causing you to feel overwhelmed?"
      },
      {
        user: "It's mostly the long hours and my boss's expectations. We have a big product launch coming up in 3 weeks and I feel like I'm carrying the whole marketing campaign on my shoulders.",
        assistant: "That sounds like a significant amount of responsibility. Product launches can be particularly stressful. How are you currently managing this stress, and what support do you have?"
      },
      {
        user: "I've been working 12-hour days for the past month. I usually go for runs to clear my head, but I haven't had time. My partner Sarah has been understanding, but I can tell it's affecting our relationship too.",
        assistant: "It's concerning that your work stress is impacting both your self-care routines and your relationship. It's important to find ways to maintain balance even during demanding periods. Have you considered discussing workload management with your team?"
      },
      {
        user: "I've thought about it, but I don't want to seem incapable. This is my first management role and I want to prove myself. I actually got promoted just 6 months ago from being a regular marketing coordinator.",
        assistant: "Congratulations on your promotion - that's a significant achievement. It's natural to want to excel in a new role, but overworking can actually harm your performance. What strategies helped you succeed as a coordinator that you might adapt to your current role?"
      },
      {
        user: "As a coordinator, I was really good at organizing campaigns and working with data. I think my analytical skills and creativity are my strengths. But now I have to manage a team of 4 people and deal with executive pressure.",
        assistant: "Your analytical and creative strengths are valuable leadership assets. Managing people is a different skill set that takes time to develop. How comfortable do you feel with delegation and setting boundaries with your team?"
      }
    ];

    // Simulate the conversation
    for (let i = 0; i < conversation1.length; i++) {
      const exchange = conversation1[i];
      
      // Store user message
      await this.storeMessage('user', exchange.user);
      await this.delay(500);
      
      // Store assistant response
      await this.storeMessage('assistant', exchange.assistant);
      await this.delay(500);
      
      // Update summary every 2 exchanges
      if (i % 2 === 1) {
        await window.memoryService.updateSummary(this.currentSessionId);
        this.memoryEvents.push({
          type: 'summary_update',
          session: this.currentSessionId,
          exchange: i + 1
        });
        this.log(`Updated session summary after exchange ${i + 1}`, 'info');
      }
    }

    this.log(`Completed initial conversation with ${conversation1.length} exchanges`, 'success');
    this.results.conversations.push({
      sessionId: this.currentSessionId,
      exchanges: conversation1.length,
      topics: ['work stress', 'management role', 'product launch', 'relationship impact', 'career transition']
    });
  }

  async phase2_MemoryProcessing() {
    this.log('Phase 2: Processing and analyzing memory extraction...', 'info');
    
    // Extract long-term memories
    await window.memoryService.extractLongMemories(this.testUserId, this.currentSessionId);
    this.log('Initiated long-term memory extraction', 'info');
    
    // Wait for processing
    await this.delay(3000);
    
    // Analyze session summary
    const { data: summaryData } = await window.sbAdmin
      .from('session_summaries')
      .select('summary')
      .eq('session_id', this.currentSessionId)
      .maybeSingle();
    
    if (summaryData?.summary) {
      const summary = summaryData.summary;
      this.log(`Session summary generated (${summary.length} chars)`, 'success');
      
      // Analyze summary content
      const summaryLower = summary.toLowerCase();
      const keyElementsFound = {
        jobRole: summaryLower.includes('marketing') || summaryLower.includes('manager'),
        workStress: summaryLower.includes('stress') || summaryLower.includes('overwhelm'),
        productLaunch: summaryLower.includes('launch') || summaryLower.includes('campaign'),
        relationship: summaryLower.includes('sarah') || summaryLower.includes('partner'),
        promotion: summaryLower.includes('promotion') || summaryLower.includes('coordinator')
      };
      
      const summaryScore = Object.values(keyElementsFound).filter(Boolean).length;
      this.log(`Summary quality: ${summaryScore}/5 key elements captured`, summaryScore >= 4 ? 'success' : 'warning');
      
      this.results.memoryRetention.sessionSummary = {
        length: summary.length,
        keyElements: keyElementsFound,
        score: summaryScore,
        content: summary.substring(0, 200) + '...'
      };
    }
    
    // Analyze long-term memories
    const { data: memories } = await window.sbAdmin
      .from('user_memories')
      .select('content, importance')
      .eq('user_id', this.testUserId)
      .order('created_at', { ascending: false });
    
    if (memories && memories.length > 0) {
      this.log(`Extracted ${memories.length} long-term memories`, 'success');
      
      const memoryContent = memories.map(m => m.content.toLowerCase()).join(' ');
      const longTermElements = {
        careerInfo: memoryContent.includes('marketing') || memoryContent.includes('startup'),
        personalityTraits: memoryContent.includes('analytical') || memoryContent.includes('creative'),
        relationshipInfo: memoryContent.includes('sarah') || memoryContent.includes('partner'),
        stressPatterns: memoryContent.includes('stress') || memoryContent.includes('overwhelm'),
        copingMechanisms: memoryContent.includes('run') || memoryContent.includes('exercise')
      };
      
      const longTermScore = Object.values(longTermElements).filter(Boolean).length;
      this.log(`Long-term memory quality: ${longTermScore}/5 aspects captured`, longTermScore >= 3 ? 'success' : 'warning');
      
      this.results.memoryRetention.longTermMemories = {
        count: memories.length,
        elements: longTermElements,
        score: longTermScore,
        samples: memories.slice(0, 3).map(m => m.content)
      };
    }
  }

  async phase3_SecondSession() {
    this.log('Phase 3: Starting second conversation session...', 'info');
    
    // Create new session (simulating user returning later)
    const secondSessionId = await window.memoryService.getActiveSession(this.testUserId);
    this.log(`Created second session: ${secondSessionId.substring(0, 16)}...`, 'success');
    
    // Second conversation - should show memory continuity
    const conversation2 = [
      {
        user: "Hi again, I wanted to follow up on our conversation about work stress. The product launch I mentioned is happening next week.",
        assistant: "Hello! I remember our discussion about your role as a marketing manager and the upcoming product launch. How are you feeling about it being so close now?"
      },
      {
        user: "Actually, I took your advice about delegation. I assigned some campaign tasks to my team members and it's helped reduce my workload. Sarah and I also had a good talk about setting boundaries.",
        assistant: "That's wonderful progress! It sounds like you're applying your leadership skills effectively. How has this impacted your stress levels and your relationship with Sarah?"
      },
      {
        user: "Much better! I even managed to go for a run yesterday for the first time in weeks. I'm still nervous about the launch, but I feel more in control now.",
        assistant: "I'm so glad to hear you've been able to return to running - I know that was important for your stress management. It's normal to feel nervous about big launches, but it sounds like you're approaching it with better balance."
      }
    ];

    // Simulate second conversation with memory context
    for (let i = 0; i < conversation2.length; i++) {
      const exchange = conversation2[i];
      
      await this.storeMessage('user', exchange.user, secondSessionId);
      await this.delay(500);
      
      await this.storeMessage('assistant', exchange.assistant, secondSessionId);
      await this.delay(500);
    }

    this.log(`Completed second conversation with ${conversation2.length} exchanges`, 'success');
    this.results.conversations.push({
      sessionId: secondSessionId,
      exchanges: conversation2.length,
      topics: ['follow-up', 'delegation success', 'relationship improvement', 'stress management', 'launch preparation']
    });
  }

  async phase4_CrossSessionAnalysis() {
    this.log('Phase 4: Analyzing cross-session memory continuity...', 'info');
    
    // Test memory context loading
    const context = await window.memoryService.getConversationContext(this.testUserId, this.currentSessionId);
    
    if (context && context.trim()) {
      this.log(`Memory context loaded (${context.length} characters)`, 'success');
      
      // Analyze context continuity
      const contextLower = context.toLowerCase();
      const continuityElements = {
        workContext: contextLower.includes('marketing') && contextLower.includes('manager'),
        specificDetails: contextLower.includes('sarah') || contextLower.includes('launch'),
        personalHistory: contextLower.includes('promotion') || contextLower.includes('coordinator'),
        stressFactors: contextLower.includes('stress') || contextLower.includes('overwhelm'),
        copingStrategies: contextLower.includes('run') || contextLower.includes('delegation')
      };
      
      const continuityScore = Object.values(continuityElements).filter(Boolean).length;
      this.log(`Cross-session continuity: ${continuityScore}/5 elements maintained`, continuityScore >= 4 ? 'success' : 'warning');
      
      this.results.crossSessionContinuity = {
        contextLength: context.length,
        elements: continuityElements,
        score: continuityScore,
        hasLongTermSection: context.includes('LONG-TERM USER CONTEXT'),
        hasSessionSection: context.includes('RECENT SESSION SUMMARY')
      };
    } else {
      this.log('No memory context loaded - continuity test failed', 'error');
      this.results.crossSessionContinuity = { error: 'No context loaded' };
    }
  }

  async phase5_FinalAssessment() {
    this.log('Phase 5: Generating final conversation memory assessment...', 'info');
    
    const scores = {
      sessionSummary: (this.results.memoryRetention.sessionSummary?.score || 0) * 20,
      longTermMemory: (this.results.memoryRetention.longTermMemories?.score || 0) * 20,
      crossSessionContinuity: (this.results.crossSessionContinuity?.score || 0) * 20
    };
    
    const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 3);
    
    let status = 'unknown';
    if (overallScore >= 90) status = 'excellent';
    else if (overallScore >= 80) status = 'good';
    else if (overallScore >= 60) status = 'fair';
    else status = 'poor';

    this.results.finalAssessment = {
      scores,
      overallScore,
      status,
      conversationsProcessed: this.results.conversations.length,
      memoryEventsRecorded: this.memoryEvents.length
    };
    
    this.log('📊 CONVERSATION MEMORY ASSESSMENT', 'info');
    this.log(`Session Summary Quality: ${scores.sessionSummary}%`, scores.sessionSummary >= 80 ? 'success' : 'warning');
    this.log(`Long-term Memory Extraction: ${scores.longTermMemory}%`, scores.longTermMemory >= 80 ? 'success' : 'warning');
    this.log(`Cross-session Continuity: ${scores.crossSessionContinuity}%`, scores.crossSessionContinuity >= 80 ? 'success' : 'warning');
    this.log(`Overall Conversation Memory Score: ${overallScore}%`, overallScore >= 80 ? 'success' : 'warning');
    this.log(`Assessment: ${status.toUpperCase()}`, overallScore >= 80 ? 'success' : 'warning');
  }

  async storeMessage(role, content, sessionId = null) {
    try {
      await window.sbAdmin.from('messages').insert({
        session_id: sessionId || this.currentSessionId,
        user_id: this.testUserId,
        role,
        content,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to store message: ${error.message}`);
    }
  }

  async cleanup() {
    this.log('Cleaning up conversation test data...', 'info');
    
    try {
      await window.sbAdmin.from('messages').delete().eq('user_id', this.testUserId);
      await window.sbAdmin.from('session_summaries').delete().like('session_id', `%${this.testUserId.split('-')[2]}%`);
      await window.sbAdmin.from('user_memories').delete().eq('user_id', this.testUserId);
      await window.sbAdmin.from('sessions').delete().eq('user_id', this.testUserId);
      
      this.log('Test data cleaned up successfully', 'success');
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'warning');
    }
  }
}

// Make conversation test available globally
if (typeof window !== 'undefined') {
  window.runConversationMemoryTest = async () => {
    const test = new ConversationMemoryTest();
    return await test.runConversationTest();
  };
  
  console.log('💬 Conversation test available: window.runConversationMemoryTest()');
  console.log('🚀 Run with: await window.runConversationMemoryTest()');
}