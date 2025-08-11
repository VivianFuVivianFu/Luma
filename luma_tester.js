// Automated Luma AI Testing System
// Tests conversation quality across different personas and scenarios

import { testPersonas, conversationFlows, qualityMetrics } from './test_personas.js';

class LumaTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.lumaInstance = null; // Will be initialized when needed
  }

  // Initialize test environment
  async initialize() {
    try {
      // Import the LumaAI class (adjust path as needed)
      const { LumaAI } = await import('./src/lib/lumaAI.ts');
      this.lumaInstance = new LumaAI();
      console.log('✅ Luma AI instance initialized for testing');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Luma AI:', error);
      return false;
    }
  }

  // Run comprehensive test suite
  async runFullTestSuite() {
    console.log('🚀 Starting Luma AI Comprehensive Test Suite');
    console.log('================================================');

    if (!await this.initialize()) {
      console.error('❌ Cannot proceed without Luma AI initialization');
      return;
    }

    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      personaResults: {},
      overallMetrics: { ...qualityMetrics }
    };

    // Test each persona with 100 rounds
    for (const persona of testPersonas) {
      console.log(`\n🧪 Testing Persona: ${persona.name}`);
      console.log(`📝 Description: ${persona.description}`);
      
      const personaResult = await this.testPersona(persona, 100);
      results.personaResults[persona.id] = personaResult;
      results.totalTests++;
      
      if (personaResult.overallScore >= 70) {
        results.passedTests++;
        console.log(`✅ ${persona.name} - PASSED (Score: ${personaResult.overallScore}%)`);
      } else {
        results.failedTests++;
        console.log(`❌ ${persona.name} - FAILED (Score: ${personaResult.overallScore}%)`);
      }

      // Update overall metrics
      Object.keys(qualityMetrics).forEach(metric => {
        results.overallMetrics[metric] += personaResult.metrics[metric];
      });

      // Reset Luma for next persona
      this.lumaInstance.resetConversation();
      
      // Brief pause between personas
      await this.sleep(1000);
    }

    // Calculate average metrics
    Object.keys(results.overallMetrics).forEach(metric => {
      results.overallMetrics[metric] /= testPersonas.length;
    });

    // Generate comprehensive report
    this.generateTestReport(results);
    
    return results;
  }

  // Test a specific persona for N rounds
  async testPersona(persona, rounds) {
    const testResult = {
      personaId: persona.id,
      personaName: persona.name,
      totalRounds: rounds,
      completedRounds: 0,
      conversations: [],
      metrics: { ...qualityMetrics },
      issues: [],
      overallScore: 0
    };

    console.log(`   🎯 Starting ${rounds} rounds with ${persona.name}...`);

    let currentConversation = this.startNewConversation(persona);
    
    for (let round = 1; round <= rounds; round++) {
      try {
        // Generate user message based on persona and conversation state
        const userMessage = this.generatePersonaMessage(persona, currentConversation, round);
        
        // Get Luma's response
        const lumaResponse = await this.lumaInstance.sendMessage(userMessage);
        
        // Record the exchange
        const exchange = {
          round,
          userMessage,
          lumaResponse,
          timestamp: new Date().toISOString()
        };
        
        currentConversation.exchanges.push(exchange);
        
        // Analyze the exchange
        const exchangeMetrics = this.analyzeExchange(exchange, currentConversation, persona);
        
        // Update metrics
        Object.keys(exchangeMetrics).forEach(metric => {
          testResult.metrics[metric] = 
            (testResult.metrics[metric] * (round - 1) + exchangeMetrics[metric]) / round;
        });

        // Check for conversation issues
        const issues = this.detectIssues(exchange, currentConversation);
        if (issues.length > 0) {
          testResult.issues.push(...issues.map(issue => ({ round, issue })));
        }

        testResult.completedRounds++;

        // Progress indicator
        if (round % 10 === 0) {
          console.log(`   📊 Round ${round}/${rounds} - Current avg score: ${Math.round(this.calculateAverageScore(testResult.metrics))}%`);
        }

        // Brief pause to avoid overwhelming the system
        await this.sleep(100);
        
      } catch (error) {
        console.error(`❌ Error in round ${round}:`, error);
        testResult.issues.push({ round, issue: `API Error: ${error.message}` });
      }
    }

    currentConversation.endTime = new Date();
    testResult.conversations.push(currentConversation);
    testResult.overallScore = this.calculateAverageScore(testResult.metrics);

    return testResult;
  }

  // Start a new conversation session
  startNewConversation(persona) {
    return {
      persona: persona.id,
      startTime: new Date(),
      exchanges: [],
      context: {
        emotionalState: 'initial',
        topicsDiscussed: [],
        goalsAchieved: []
      }
    };
  }

  // Generate persona-appropriate message
  generatePersonaMessage(persona, conversation, round) {
    const exchanges = conversation.exchanges;
    
    // First message
    if (round === 1) {
      return this.selectRandom(persona.patterns.openingMessages);
    }

    // Get last Luma response
    const lastLumaResponse = exchanges[exchanges.length - 1]?.lumaResponse || '';
    const responseLower = lastLumaResponse.toLowerCase();

    // Determine response type based on Luma's message
    let responseType = 'questions'; // default
    
    if (responseLower.includes('what') || responseLower.includes('how') || responseLower.includes('?')) {
      responseType = 'questions';
    } else if (responseLower.includes('understand') || responseLower.includes('makes sense') || 
               responseLower.includes('insight') || responseLower.includes('pattern')) {
      responseType = 'insights';
    } else {
      responseType = 'support';
    }

    // Generate appropriate response
    let message = this.selectRandom(persona.patterns.responseTypes[responseType]);

    // Add some variability based on round number
    if (round > 50 && Math.random() < 0.3) {
      // Introduce topic shifts in longer conversations
      message = this.generateTopicShift(persona, conversation);
    } else if (round > 20 && Math.random() < 0.2) {
      // Add meta-conversation comments
      message = this.generateMetaComment(persona, conversation);
    }

    return message;
  }

  // Generate topic shift for longer conversations
  generateTopicShift(persona, conversation) {
    const shifts = {
      anxious_sarah: [
        "Actually, I've been thinking about work too",
        "There's something else that's been bothering me",
        "Can we talk about my family situation?"
      ],
      depressed_mike: [
        "I've been having weird dreams lately",
        "My sleep is all messed up",
        "I can't focus on anything"
      ],
      trauma_survivor_alex: [
        "I had a trigger today",
        "My therapist suggested something new",
        "I'm having trust issues again"
      ],
      relationship_seeker_emma: [
        "I met someone new",
        "My ex contacted me",
        "I'm wondering about my attachment style"
      ],
      curious_learner_david: [
        "I read something interesting about neuroscience",
        "Can you explain how emotions work?",
        "I want to understand trauma responses better"
      ],
      overwhelmed_parent_lisa: [
        "My kid is acting out",
        "I'm struggling with work-life balance",
        "I feel guilty all the time"
      ]
    };

    return this.selectRandom(shifts[persona.id] || ["Something else came up"]);
  }

  // Generate meta-conversation comments
  generateMetaComment(persona, conversation) {
    const metaComments = [
      "This conversation is helping",
      "I feel like we're making progress",
      "I'm not sure if this is working",
      "Can we try a different approach?",
      "I appreciate you listening",
      "This is hard to talk about"
    ];

    return this.selectRandom(metaComments);
  }

  // Analyze individual exchange for quality metrics
  analyzeExchange(exchange, conversation, persona) {
    const metrics = { ...qualityMetrics };
    const { userMessage, lumaResponse } = exchange;

    // Repetition analysis
    metrics.repetition_score = this.calculateRepetitionScore(lumaResponse, conversation);

    // Context maintenance
    metrics.context_maintenance = this.analyzeContextMaintenance(lumaResponse, conversation, persona);

    // Response relevance
    metrics.response_relevance = this.analyzeResponseRelevance(userMessage, lumaResponse, persona);

    // Emotional attunement
    metrics.emotional_attunement = this.analyzeEmotionalAttunement(lumaResponse, persona);

    // Conversation flow
    metrics.conversation_flow = this.analyzeConversationFlow(exchange, conversation);

    // Goal achievement
    metrics.goal_achievement = this.analyzeGoalAchievement(conversation, persona);

    return metrics;
  }

  // Calculate repetition score (lower is better)
  calculateRepetitionScore(response, conversation) {
    const previousResponses = conversation.exchanges
      .slice(-5) // Check last 5 responses
      .map(ex => ex.lumaResponse.toLowerCase());
    
    const currentResponse = response.toLowerCase();
    let repetitionScore = 0;

    previousResponses.forEach(prevResponse => {
      const similarity = this.calculateSimilarity(currentResponse, prevResponse);
      if (similarity > 0.7) {
        repetitionScore += 40; // High penalty for very similar responses
      } else if (similarity > 0.5) {
        repetitionScore += 20; // Medium penalty for somewhat similar
      }
    });

    return Math.min(repetitionScore, 100);
  }

  // Analyze context maintenance
  analyzeContextMaintenance(response, conversation, persona) {
    const responseLower = response.toLowerCase();
    let score = 50; // Base score

    // Check if response references previous conversation
    const contextKeywords = [
      'you mentioned', 'earlier', 'before', 'previously', 'remember',
      'we talked about', 'you said', 'from what you shared'
    ];

    if (contextKeywords.some(keyword => responseLower.includes(keyword))) {
      score += 30;
    }

    // Check if response builds on persona's specific needs
    if (persona.emotionalNeeds.some(need => {
      const needKeywords = this.getNeedKeywords(need);
      return needKeywords.some(keyword => responseLower.includes(keyword));
    })) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  // Analyze response relevance to user message
  analyzeResponseRelevance(userMessage, lumaResponse, persona) {
    const userLower = userMessage.toLowerCase();
    const responseLower = lumaResponse.toLowerCase();
    let score = 30; // Base score

    // Check for direct relevance
    const userWords = userLower.split(/\s+/).filter(word => word.length > 3);
    const responseWords = responseLower.split(/\s+/);
    
    const overlap = userWords.filter(word => responseWords.includes(word)).length;
    score += Math.min(overlap * 10, 40);

    // Check for emotional relevance
    const emotions = ['anxious', 'sad', 'worried', 'scared', 'lonely', 'angry', 'confused'];
    const userEmotions = emotions.filter(emotion => userLower.includes(emotion));
    const responseAddressesEmotion = userEmotions.some(emotion => 
      responseLower.includes(emotion) || responseLower.includes('feel'));
    
    if (responseAddressesEmotion) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  // Analyze emotional attunement
  analyzeEmotionalAttunement(response, persona) {
    const responseLower = response.toLowerCase();
    let score = 40; // Base score

    // Check for empathic language
    const empathicPhrases = [
      'that sounds', 'i hear', 'i understand', 'that must be',
      'i can sense', 'that feels', 'i imagine', 'i see'
    ];

    if (empathicPhrases.some(phrase => responseLower.includes(phrase))) {
      score += 25;
    }

    // Check for validation
    const validationPhrases = [
      'makes sense', 'understandable', 'valid', 'normal',
      'okay to feel', 'completely natural'
    ];

    if (validationPhrases.some(phrase => responseLower.includes(phrase))) {
      score += 25;
    }

    // Check for persona-specific attunement
    if (this.isAttuned(responseLower, persona)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // Helper function to check persona-specific attunement
  isAttuned(response, persona) {
    const attunementMap = {
      anxious_sarah: ['anxiety', 'worry', 'calm', 'breathe', 'ground'],
      depressed_mike: ['hope', 'small step', 'gentle', 'tired', 'energy'],
      trauma_survivor_alex: ['safe', 'control', 'pace', 'trust', 'trauma'],
      relationship_seeker_emma: ['connection', 'relationship', 'attach', 'love', 'worth'],
      curious_learner_david: ['understand', 'learn', 'insight', 'psychology', 'brain'],
      overwhelmed_parent_lisa: ['time', 'balance', 'parent', 'manage', 'overwhelm']
    };

    const keywords = attunementMap[persona.id] || [];
    return keywords.some(keyword => response.includes(keyword));
  }

  // Analyze conversation flow
  analyzeConversationFlow(exchange, conversation) {
    let score = 50; // Base score

    const response = exchange.lumaResponse.toLowerCase();

    // Check if response moves conversation forward
    if (response.includes('?') || response.includes('what') || response.includes('how')) {
      score += 20; // Good engagement
    }

    // Check if response provides insight or support
    if (response.includes('insight') || response.includes('understand') || 
        response.includes('pattern') || response.includes('sense')) {
      score += 20; // Good therapeutic progress
    }

    // Penalize if response is too generic
    const genericPhrases = [
      "i'm here to listen", "what's been on your mind",
      "how are you feeling", "tell me more"
    ];

    if (genericPhrases.some(phrase => response.includes(phrase))) {
      score -= 15; // Generic responses hurt flow
    }

    return Math.min(Math.max(score, 0), 100);
  }

  // Analyze goal achievement for persona
  analyzeGoalAchievement(conversation, persona) {
    const responses = conversation.exchanges.map(ex => ex.lumaResponse.toLowerCase());
    let score = 0;

    // Check achievement of persona's conversation goals
    persona.conversationGoals.forEach(goal => {
      if (this.isGoalAddressed(goal, responses)) {
        score += 100 / persona.conversationGoals.length;
      }
    });

    return Math.round(score);
  }

  // Check if specific goal is addressed in conversation
  isGoalAddressed(goal, responses) {
    const goalKeywords = {
      reduce_anxiety: ['calm', 'breathe', 'ground', 'relax', 'anxiety'],
      learn_coping_strategies: ['strategy', 'technique', 'cope', 'manage', 'tool'],
      feel_understood: ['understand', 'hear', 'see', 'sense', 'feel'],
      find_hope: ['hope', 'possibility', 'future', 'better', 'change'],
      feel_less_alone: ['here', 'with you', 'together', 'support', 'alone'],
      take_small_actions: ['step', 'try', 'action', 'small', 'start'],
      feel_safe: ['safe', 'secure', 'protect', 'control', 'trust'],
      process_trauma: ['trauma', 'memory', 'process', 'heal', 'integrate'],
      build_trust: ['trust', 'safe', 'relationship', 'connection', 'believe'],
      understand_patterns: ['pattern', 'notice', 'cycle', 'repeat', 'habit'],
      build_healthy_relationships: ['healthy', 'relationship', 'connection', 'boundary', 'communicate'],
      feel_worthy: ['worth', 'deserve', 'value', 'enough', 'special'],
      learn_psychology: ['psychology', 'brain', 'neuroscience', 'research', 'study'],
      understand_self: ['self', 'identity', 'personality', 'who you are', 'inner'],
      apply_knowledge: ['apply', 'practice', 'use', 'implement', 'try'],
      manage_overwhelm: ['overwhelm', 'manage', 'organize', 'priority', 'balance'],
      find_balance: ['balance', 'time', 'manage', 'priority', 'schedule'],
      feel_supported: ['support', 'help', 'here', 'care', 'understand']
    };

    const keywords = goalKeywords[goal] || [];
    return responses.some(response => 
      keywords.some(keyword => response.includes(keyword))
    );
  }

  // Detect specific conversation issues
  detectIssues(exchange, conversation) {
    const issues = [];
    const response = exchange.lumaResponse;

    // Check for exact repetition
    const lastResponses = conversation.exchanges
      .slice(-3)
      .map(ex => ex.lumaResponse);

    if (lastResponses.includes(response)) {
      issues.push('Exact repetition detected');
    }

    // Check for generic fallback responses
    const genericResponses = [
      "I'm here to listen and support you. What's been on your mind lately?",
      "What feels most important for you to explore about this right now?"
    ];

    if (genericResponses.some(generic => response.includes(generic))) {
      issues.push('Generic fallback response used');
    }

    // Check for very short responses
    if (response.length < 20) {
      issues.push('Response too short');
    }

    // Check for extremely long responses
    if (response.length > 800) {
      issues.push('Response too long');
    }

    return issues;
  }

  // Calculate overall average score
  calculateAverageScore(metrics) {
    const scores = Object.values(metrics);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  // Calculate text similarity
  calculateSimilarity(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const allWords = new Set([...words1, ...words2]);
    
    let commonWords = 0;
    for (const word of allWords) {
      if (words1.includes(word) && words2.includes(word)) {
        commonWords++;
      }
    }
    
    return commonWords / allWords.size;
  }

  // Get keywords for emotional needs
  getNeedKeywords(need) {
    const keywordMap = {
      reassurance: ['okay', 'normal', 'understand', 'safe'],
      grounding: ['breathe', 'present', 'ground', 'here'],
      validation: ['valid', 'understand', 'makes sense', 'hear'],
      practical_steps: ['step', 'try', 'action', 'technique'],
      hope: ['hope', 'better', 'change', 'possible'],
      gentle_encouragement: ['gentle', 'small', 'try', 'can'],
      non_judgment: ['judgment', 'okay', 'accept', 'normal'],
      safety: ['safe', 'secure', 'control', 'protect'],
      connection: ['together', 'here', 'support', 'understand'],
      self_compassion: ['kind', 'gentle', 'forgive', 'compassion']
    };

    return keywordMap[need] || [];
  }

  // Select random item from array
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate comprehensive test report
  generateTestReport(results) {
    console.log('\n📊 LUMA AI TEST RESULTS REPORT');
    console.log('=====================================\n');

    // Overall Summary
    console.log('🎯 OVERALL SUMMARY');
    console.log('------------------');
    console.log(`Total Personas Tested: ${results.totalTests}`);
    console.log(`Passed Tests: ${results.passedTests}`);
    console.log(`Failed Tests: ${results.failedTests}`);
    console.log(`Success Rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%\n`);

    // Overall Metrics
    console.log('📈 OVERALL METRICS (Average Across All Personas)');
    console.log('------------------------------------------------');
    Object.entries(results.overallMetrics).forEach(([metric, score]) => {
      const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
      console.log(`${emoji} ${metric.replace(/_/g, ' ').toUpperCase()}: ${Math.round(score)}%`);
    });

    // Individual Persona Results
    console.log('\n🧪 INDIVIDUAL PERSONA RESULTS');
    console.log('------------------------------');
    Object.entries(results.personaResults).forEach(([personaId, result]) => {
      const status = result.overallScore >= 70 ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} ${result.personaName} (${result.overallScore}%)`);
      console.log(`   Rounds Completed: ${result.completedRounds}/${result.totalRounds}`);
      
      // Top issues
      if (result.issues.length > 0) {
        const issueTypes = {};
        result.issues.forEach(issue => {
          issueTypes[issue.issue] = (issueTypes[issue.issue] || 0) + 1;
        });
        
        console.log('   Top Issues:');
        Object.entries(issueTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([issue, count]) => {
            console.log(`     - ${issue}: ${count} times`);
          });
      }
    });

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('------------------');
    this.generateRecommendations(results);

    console.log('\n✅ Test report complete!\n');
  }

  // Generate improvement recommendations
  generateRecommendations(results) {
    const metrics = results.overallMetrics;
    
    if (metrics.repetition_score > 30) {
      console.log('🔄 HIGH REPETITION: Improve response variation and context awareness');
    }
    
    if (metrics.context_maintenance < 70) {
      console.log('🧠 CONTEXT ISSUES: Better memory of previous conversation points');
    }
    
    if (metrics.response_relevance < 70) {
      console.log('🎯 RELEVANCE ISSUES: Improve matching responses to user input');
    }
    
    if (metrics.emotional_attunement < 70) {
      console.log('❤️ EMOTIONAL ATTUNEMENT: Enhance empathy and emotional recognition');
    }
    
    if (metrics.conversation_flow < 70) {
      console.log('🌊 FLOW ISSUES: Better conversation progression and engagement');
    }
    
    if (metrics.goal_achievement < 70) {
      console.log('🎯 GOAL ACHIEVEMENT: Better alignment with user therapeutic goals');
    }

    // Persona-specific recommendations
    Object.entries(results.personaResults).forEach(([personaId, result]) => {
      if (result.overallScore < 70) {
        console.log(`👤 ${result.personaName}: Needs specialized attention for ${personaId} type interactions`);
      }
    });
  }
}

// Export for use
export { LumaTester };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new LumaTester();
  tester.runFullTestSuite().catch(console.error);
}