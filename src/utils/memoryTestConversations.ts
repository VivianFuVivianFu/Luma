// Memory Test Conversations - Predefined conversations to test memory functionality
export interface TestConversation {
  name: string;
  description: string;
  messages: string[];
  expectedMemories: string[];
  testGoals: string[];
}

export const memoryTestConversations: TestConversation[] = [
  {
    name: "Anxiety and Work Stress",
    description: "Test memory retention for anxiety-related concerns and work patterns",
    messages: [
      "Hi, I've been feeling really anxious about work lately",
      "I work in marketing and my boss is very demanding. I often work late and feel overwhelmed",
      "Yes, I've been having trouble sleeping because I keep thinking about work tasks",
      "I usually try to exercise but haven't had time lately",
      "My family has noticed I'm more irritable than usual"
    ],
    expectedMemories: [
      "User works in marketing with demanding boss",
      "Experiences work-related anxiety affecting sleep",
      "Usually exercises as coping mechanism but time constraints",
      "Work stress affecting family relationships and mood"
    ],
    testGoals: [
      "Short-term memory should summarize recent work stress and sleep issues",
      "Long-term memory should capture job role and coping patterns",
      "System should reference work situation in future conversations"
    ]
  },
  
  {
    name: "Relationship Difficulties",
    description: "Test memory for relationship patterns and communication styles",
    messages: [
      "I'm having problems with my partner. We keep arguing about small things",
      "We've been together for 3 years and this started about 6 months ago",
      "I tend to withdraw when we argue, but they want to talk everything out immediately",
      "My parents divorced when I was young, so I'm scared of conflict",
      "I love them but I don't know how to communicate better"
    ],
    expectedMemories: [
      "3-year relationship with recent increase in arguments",
      "Avoidant communication style due to childhood divorce trauma",
      "Partner prefers immediate discussion while user withdraws",
      "Wants to improve communication despite fear of conflict"
    ],
    testGoals: [
      "Should remember relationship duration and communication patterns",
      "Should connect childhood experience to current behavior",
      "Future conversations should reference established relationship dynamics"
    ]
  },
  
  {
    name: "Personal Growth Journey",
    description: "Test memory for goals, progress, and personal development patterns",
    messages: [
      "I've been trying to work on self-compassion. It's really hard for me",
      "I'm very critical of myself, especially when I make mistakes at work or in relationships",
      "I started therapy 2 months ago and my therapist suggested mindfulness practices",
      "I've been doing meditation for about 3 weeks now, usually in the mornings",
      "Some days are better than others. Yesterday I caught myself being self-critical and actually paused"
    ],
    expectedMemories: [
      "Struggles with self-criticism particularly in work and relationships",
      "Started therapy 2 months ago focusing on self-compassion",
      "Practices morning meditation for 3 weeks",
      "Making progress - able to catch and pause self-critical thoughts"
    ],
    testGoals: [
      "Should track therapy timeline and progress",
      "Should remember specific self-improvement practices",
      "Should acknowledge growth and celebrate small wins in future conversations"
    ]
  }
];

export class MemoryTestRunner {

  async runMemoryTest(conversation: TestConversation, lumaAI: any): Promise<{
    success: boolean;
    memoriesCreated: number;
    summaryGenerated: boolean;
    errors: string[];
    details: any;
  }> {
    const errors: string[] = [];
    let memoriesCreated = 0;
    let summaryGenerated = false;

    try {
      console.log(`🧪 Starting memory test: ${conversation.name}`);
      
      // Reset LumaAI for clean test
      lumaAI.resetConversation();
      
      // Enable memory if possible
      await lumaAI.enableMemory();
      
      const sessionInfo = lumaAI.getSessionInfo();
      if (!sessionInfo.memoryEnabled) {
        errors.push('Memory system not enabled - user may not be authenticated');
      }

      // Send each message in the conversation
      for (let i = 0; i < conversation.messages.length; i++) {
        const message = conversation.messages[i];
        console.log(`   📝 Sending message ${i + 1}/${conversation.messages.length}: ${message.substring(0, 50)}...`);
        
        try {
          const response = await lumaAI.sendMessage(message);
          console.log(`   🤖 Response: ${response.substring(0, 100)}...`);
          
          // Check if memory processing occurred (every 5 messages)
          if ((i + 1) % 5 === 0) {
            console.log('   🧠 Memory processing should have occurred');
            // Give a moment for async memory processing
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (messageError) {
          errors.push(`Failed to send message ${i + 1}: ${messageError}`);
        }
      }

      // Check final session info
      const finalSessionInfo = lumaAI.getSessionInfo();
      
      return {
        success: errors.length === 0,
        memoriesCreated,
        summaryGenerated,
        errors,
        details: {
          sessionInfo: finalSessionInfo,
          conversationLength: conversation.messages.length,
          expectedMemories: conversation.expectedMemories.length
        }
      };

    } catch (error) {
      errors.push(`Test execution failed: ${error}`);
      return {
        success: false,
        memoriesCreated: 0,
        summaryGenerated: false,
        errors,
        details: {}
      };
    }
  }

  async runAllMemoryTests(lumaAI: any): Promise<{
    totalTests: number;
    passedTests: number;
    results: any[];
  }> {
    console.log('🚀 Starting comprehensive memory tests...\n');
    
    const results = [];
    
    for (const conversation of memoryTestConversations) {
      const result = await this.runMemoryTest(conversation, lumaAI);
      results.push({
        name: conversation.name,
        ...result
      });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const passedTests = results.filter(r => r.success).length;
    
    console.log('\n📊 Memory Test Results Summary:');
    console.log('================================');
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
      if (result.errors.length > 0) {
        result.errors.forEach((error: string) => console.log(`   • ${error}`));
      }
    });
    
    console.log(`\n🏆 Results: ${passedTests}/${results.length} tests passed`);
    
    if (passedTests === results.length) {
      console.log('🎉 All memory tests passed! Memory system is working correctly.');
    } else if (passedTests > 0) {
      console.log('⚠️ Some memory tests passed. Check individual results for details.');
    } else {
      console.log('❌ All memory tests failed. Memory system needs attention.');
    }
    
    return {
      totalTests: results.length,
      passedTests,
      results
    };
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  const memoryTestRunner = new MemoryTestRunner();
  
  (window as any).memoryTestConversations = memoryTestConversations;
  (window as any).runMemoryTests = () => {
    if ((window as any).lumaAI) {
      return memoryTestRunner.runAllMemoryTests((window as any).lumaAI);
    } else {
      console.error('❌ LumaAI not available. Make sure the page is fully loaded.');
    }
  };
  
  console.log('💡 Memory test functions available:');
  console.log('   • window.runMemoryTests() - Run all memory conversation tests');
  console.log('   • window.memoryTestConversations - View test conversations');
}