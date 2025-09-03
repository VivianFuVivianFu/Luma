// Advanced Intent Classification for Therapeutic AI
// Provides intelligent message categorization for optimal LLM routing

export enum IntentType {
  CRISIS = 'crisis',
  THERAPEUTIC_BREAKTHROUGH = 'therapeutic_breakthrough', 
  GOAL_SETTING = 'goal_setting',
  EMOTIONAL_VENTING = 'emotional_venting',
  PATTERN_ANALYSIS = 'pattern_analysis',
  RELATIONSHIP_ISSUE = 'relationship_issue',
  DAILY_CHECKIN = 'daily_checkin',
  CLARIFICATION_NEEDED = 'clarification_needed'
}

export interface IntentAnalysis {
  primaryIntent: IntentType;
  confidence: number;
  secondaryIntents: IntentType[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'immediate_response' | 'clarify_first' | 'gather_context' | 'escalate';
  contextWindowSize: number;
  requiresMemoryDepth: 'surface' | 'moderate' | 'deep' | 'comprehensive';
}

export interface ClarificationPrompt {
  question: string;
  purpose: string;
  followUpIntents: IntentType[];
}

export class AdvancedIntentClassifier {
  
  // Crisis detection patterns - highest priority
  private static readonly CRISIS_PATTERNS = [
    /\b(suicide|kill myself|end it all|want to die|harm myself|hurt myself)\b/i,
    /\b(crisis|emergency|desperate|can't take it|breaking point)\b/i,
    /\b(hopeless|worthless|nobody cares|better off dead)\b/i,
    /\b(overdose|pills|cutting|self harm|self-harm)\b/i
  ];

  // Therapeutic breakthrough patterns
  private static readonly BREAKTHROUGH_PATTERNS = [
    /\b(breakthrough|insight|realized|understand now|clarity|epiphany)\b/i,
    /\b(finally see|makes sense now|connected the dots|aha moment)\b/i,
    /\b(progress|improvement|getting better|feeling stronger)\b/i,
    /\b(learned about myself|discovered|found out why)\b/i
  ];

  // Goal setting patterns
  private static readonly GOAL_PATTERNS = [
    /\b(want to|need to|goal|plan|achieve|accomplish)\b/i,
    /\b(change|improve|start|stop|quit|begin)\b/i,
    /\b(future|tomorrow|next week|next month|by the end)\b/i,
    /\b(resolution|commitment|promise myself|decided to)\b/i
  ];

  // Emotional venting patterns
  private static readonly VENTING_PATTERNS = [
    /\b(frustrated|angry|upset|mad|furious|livid)\b/i,
    /\b(can't believe|so annoying|drives me crazy|fed up)\b/i,
    /\b(rant|vent|need to get this out|just had to)\b/i,
    /\b(why does this always|sick of|tired of|enough)\b/i
  ];

  // Pattern analysis request patterns
  private static readonly ANALYSIS_PATTERNS = [
    /\b(pattern|always|never|every time|tends to)\b/i,
    /\b(why do I|help me understand|figure out|make sense)\b/i,
    /\b(notice|observe|keep doing|habit|behavior)\b/i,
    /\b(analyze|examine|look at|think about)\b/i
  ];

  // Relationship issue patterns  
  private static readonly RELATIONSHIP_PATTERNS = [
    /\b(relationship|partner|spouse|boyfriend|girlfriend)\b/i,
    /\b(family|mother|father|sister|brother|parent)\b/i,
    /\b(friend|colleague|coworker|boss|conflict)\b/i,
    /\b(argument|fight|disagreement|tension|communication)\b/i
  ];

  // Daily check-in patterns
  private static readonly CHECKIN_PATTERNS = [
    /\b(how are you|checking in|touch base|quick update)\b/i,
    /\b(today|this morning|this week|lately|recently)\b/i,
    /\b(feeling|doing|going|been|mood)\b/i,
    /^(hi|hello|hey|good morning|good evening)(?:\s|$)/i
  ];

  // Ambiguous/unclear patterns requiring clarification
  private static readonly UNCLEAR_PATTERNS = [
    /^.{1,10}$/,  // Very short messages
    /\b(it|this|that|stuff|things|whatever)\b.*\b(it|this|that|stuff|things|whatever)\b/i,
    /\b(i don't know|not sure|maybe|i guess|kind of)\b/i,
    /\b(help|support|advice)\s*$/i  // Vague requests without context
  ];

  /**
   * Analyze message intent with confidence scoring and routing suggestions
   */
  async analyzeIntent(message: string, conversationHistory: any[] = []): Promise<IntentAnalysis> {
    const text = message.trim().toLowerCase();
    const messageLength = message.length;
    const historyLength = conversationHistory.length;

    console.log(`[IntentClassifier] Analyzing: "${message.substring(0, 60)}..."`);

    // Crisis detection - highest priority
    if (this.matchesPatterns(text, AdvancedIntentClassifier.CRISIS_PATTERNS)) {
      return {
        primaryIntent: IntentType.CRISIS,
        confidence: 0.95,
        secondaryIntents: [],
        urgencyLevel: 'critical',
        suggestedAction: 'immediate_response',
        contextWindowSize: 50, // Full session context for crisis
        requiresMemoryDepth: 'comprehensive'
      };
    }

    // Check for ambiguity/clarification needs early
    if (this.needsClarification(text, messageLength)) {
      // Generate clarification prompt (currently unused but available for future use)
      // const clarificationPrompt = this.generateClarificationPrompt(text, conversationHistory);
      return {
        primaryIntent: IntentType.CLARIFICATION_NEEDED,
        confidence: 0.85,
        secondaryIntents: this.getPotentialIntents(text),
        urgencyLevel: 'low',
        suggestedAction: 'clarify_first',
        contextWindowSize: 10,
        requiresMemoryDepth: 'surface'
      };
    }

    // Score all other intents
    const intentScores = this.scoreAllIntents(text, messageLength, historyLength);
    const topIntent = this.getTopIntent(intentScores);
    const confidence = intentScores[topIntent] || 0.5;

    // Determine secondary intents
    const secondaryIntents = Object.entries(intentScores)
      .filter(([intent, score]) => intent !== topIntent && score > 0.4)
      .map(([intent]) => intent as IntentType);

    // Map intent to configuration
    const config = this.getIntentConfiguration(topIntent, confidence, secondaryIntents);

    console.log(`[IntentClassifier] Result: ${topIntent} (${confidence.toFixed(2)}) - ${config.suggestedAction}`);

    return {
      primaryIntent: topIntent,
      confidence,
      secondaryIntents,
      urgencyLevel: config.urgencyLevel,
      suggestedAction: config.suggestedAction,
      contextWindowSize: config.contextWindowSize,
      requiresMemoryDepth: config.requiresMemoryDepth
    };
  }

  /**
   * Generate clarification prompts when user input is ambiguous
   */
  generateClarificationPrompt(message: string, history: any[]): ClarificationPrompt {
    const recentTopics = this.extractRecentTopics(history);
    
    if (message.length < 10) {
      return {
        question: "I'd love to help you with that. Could you share a bit more about what's on your mind right now?",
        purpose: "Gather context for very brief message",
        followUpIntents: [IntentType.EMOTIONAL_VENTING, IntentType.DAILY_CHECKIN, IntentType.GOAL_SETTING]
      };
    }

    if (this.containsVagueTerms(message)) {
      return {
        question: "I want to make sure I understand what you're referring to. Could you tell me more about the specific situation or feeling you'd like to explore?",
        purpose: "Clarify vague references (it, this, that, stuff)",
        followUpIntents: [IntentType.RELATIONSHIP_ISSUE, IntentType.EMOTIONAL_VENTING, IntentType.PATTERN_ANALYSIS]
      };
    }

    if (recentTopics.length > 0) {
      return {
        question: `Are you wanting to continue our conversation about ${recentTopics[0]}, or is there something new you'd like to discuss?`,
        purpose: "Determine if continuing previous topic or starting new",
        followUpIntents: [IntentType.PATTERN_ANALYSIS, IntentType.THERAPEUTIC_BREAKTHROUGH]
      };
    }

    return {
      question: "What would be most helpful for you to talk about right now?",
      purpose: "Open-ended context gathering",
      followUpIntents: [IntentType.EMOTIONAL_VENTING, IntentType.GOAL_SETTING, IntentType.RELATIONSHIP_ISSUE]
    };
  }

  /**
   * Score all possible intents for the message
   */
  private scoreAllIntents(text: string, messageLength: number, historyLength: number): Record<string, number> {
    const scores: Record<string, number> = {};

    // Therapeutic breakthrough scoring
    scores[IntentType.THERAPEUTIC_BREAKTHROUGH] = this.scoreBreakthrough(text, historyLength);
    
    // Goal setting scoring
    scores[IntentType.GOAL_SETTING] = this.scoreGoalSetting(text, messageLength);
    
    // Emotional venting scoring
    scores[IntentType.EMOTIONAL_VENTING] = this.scoreEmotionalVenting(text, messageLength);
    
    // Pattern analysis scoring
    scores[IntentType.PATTERN_ANALYSIS] = this.scorePatternAnalysis(text, messageLength);
    
    // Relationship issue scoring
    scores[IntentType.RELATIONSHIP_ISSUE] = this.scoreRelationshipIssue(text);
    
    // Daily check-in scoring
    scores[IntentType.DAILY_CHECKIN] = this.scoreDailyCheckin(text, messageLength, historyLength);

    return scores;
  }

  private scoreBreakthrough(text: string, historyLength: number): number {
    let score = 0;
    
    // Pattern matching bonus
    if (this.matchesPatterns(text, AdvancedIntentClassifier.BREAKTHROUGH_PATTERNS)) {
      score += 0.7;
    }
    
    // Context indicators
    if (text.includes('understand') && text.includes('now')) score += 0.3;
    if (text.includes('realize') || text.includes('insight')) score += 0.4;
    if (historyLength > 10) score += 0.2; // More likely breakthrough in ongoing conversation
    
    return Math.min(score, 1.0);
  }

  private scoreGoalSetting(text: string, messageLength: number): number {
    let score = 0;
    
    if (this.matchesPatterns(text, AdvancedIntentClassifier.GOAL_PATTERNS)) {
      score += 0.6;
    }
    
    // Future-oriented language
    if (text.includes('want to') || text.includes('need to')) score += 0.3;
    if (text.includes('plan') || text.includes('goal')) score += 0.4;
    if (messageLength > 100) score += 0.2; // Detailed goals tend to be longer
    
    return Math.min(score, 1.0);
  }

  private scoreEmotionalVenting(text: string, messageLength: number): number {
    let score = 0;
    
    if (this.matchesPatterns(text, AdvancedIntentClassifier.VENTING_PATTERNS)) {
      score += 0.6;
    }
    
    // Emotional intensity indicators
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 1) score += 0.3;
    
    if (messageLength > 200) score += 0.3; // Venting tends to be longer
    if (text.includes('so ') || text.includes('really ')) score += 0.2; // Intensifiers
    
    return Math.min(score, 1.0);
  }

  private scorePatternAnalysis(text: string, messageLength: number): number {
    let score = 0;
    
    if (this.matchesPatterns(text, AdvancedIntentClassifier.ANALYSIS_PATTERNS)) {
      score += 0.7;
    }
    
    // Analytical language
    if (text.includes('why') && (text.includes('always') || text.includes('never'))) score += 0.4;
    if (text.includes('pattern') || text.includes('tend to')) score += 0.5;
    if (messageLength > 150) score += 0.2; // Analysis requests tend to be detailed
    
    return Math.min(score, 1.0);
  }

  private scoreRelationshipIssue(text: string): number {
    let score = 0;
    
    if (this.matchesPatterns(text, AdvancedIntentClassifier.RELATIONSHIP_PATTERNS)) {
      score += 0.7;
    }
    
    // Relationship conflict indicators
    if (text.includes('argument') || text.includes('fight')) score += 0.4;
    if (text.includes('communication') || text.includes('understand each other')) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  private scoreDailyCheckin(text: string, messageLength: number, historyLength: number): number {
    let score = 0;
    
    if (this.matchesPatterns(text, AdvancedIntentClassifier.CHECKIN_PATTERNS)) {
      score += 0.6;
    }
    
    // Check-in characteristics
    if (messageLength < 50) score += 0.3; // Check-ins are usually brief
    if (historyLength === 0) score += 0.4; // First message often check-in
    if (text.startsWith('hi ') || text.startsWith('hello ')) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * Helper methods
   */
  private matchesPatterns(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  private needsClarification(text: string, messageLength: number): boolean {
    if (messageLength < 10) return true;
    if (this.matchesPatterns(text, AdvancedIntentClassifier.UNCLEAR_PATTERNS)) return true;
    if (this.containsVagueTerms(text) && messageLength < 50) return true;
    return false;
  }

  private containsVagueTerms(text: string): boolean {
    const vagueTerms = ['it', 'this', 'that', 'stuff', 'things', 'whatever'];
    const vagueCount = vagueTerms.filter(term => text.includes(term)).length;
    return vagueCount >= 2;
  }

  private getTopIntent(scores: Record<string, number>): IntentType {
    let maxScore = 0;
    let topIntent = IntentType.DAILY_CHECKIN; // Default fallback
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        topIntent = intent as IntentType;
      }
    }
    
    return topIntent;
  }

  private getPotentialIntents(text: string): IntentType[] {
    const potentials: IntentType[] = [];
    
    // Quick heuristics for potential intents when clarification needed
    if (text.includes('feel') || text.includes('emotion')) {
      potentials.push(IntentType.EMOTIONAL_VENTING);
    }
    if (text.includes('relationship') || text.includes('family')) {
      potentials.push(IntentType.RELATIONSHIP_ISSUE);
    }
    if (text.includes('goal') || text.includes('want')) {
      potentials.push(IntentType.GOAL_SETTING);
    }
    
    return potentials;
  }

  private extractRecentTopics(history: any[]): string[] {
    // Extract key topics from recent conversation history
    const recentMessages = history.slice(-5);
    const topics: string[] = [];
    
    for (const msg of recentMessages) {
      if (msg.role === 'assistant' && msg.content.includes('about')) {
        // Extract topic mentions from assistant responses
        const topicMatch = msg.content.match(/about ([^,.!?]+)/i);
        if (topicMatch) {
          topics.push(topicMatch[1].trim());
        }
      }
    }
    
    return topics.slice(0, 2); // Return top 2 recent topics
  }

  private getIntentConfiguration(intent: IntentType, _confidence: number, _secondaryIntents: IntentType[]) {
    const configs = {
      [IntentType.CRISIS]: {
        urgencyLevel: 'critical' as const,
        suggestedAction: 'immediate_response' as const,
        contextWindowSize: 50,
        requiresMemoryDepth: 'comprehensive' as const
      },
      [IntentType.THERAPEUTIC_BREAKTHROUGH]: {
        urgencyLevel: 'high' as const,
        suggestedAction: 'gather_context' as const,
        contextWindowSize: 30,
        requiresMemoryDepth: 'deep' as const
      },
      [IntentType.GOAL_SETTING]: {
        urgencyLevel: 'medium' as const,
        suggestedAction: 'immediate_response' as const,
        contextWindowSize: 20,
        requiresMemoryDepth: 'moderate' as const
      },
      [IntentType.EMOTIONAL_VENTING]: {
        urgencyLevel: 'medium' as const,
        suggestedAction: 'immediate_response' as const,
        contextWindowSize: 15,
        requiresMemoryDepth: 'moderate' as const
      },
      [IntentType.PATTERN_ANALYSIS]: {
        urgencyLevel: 'medium' as const,
        suggestedAction: 'gather_context' as const,
        contextWindowSize: 25,
        requiresMemoryDepth: 'deep' as const
      },
      [IntentType.RELATIONSHIP_ISSUE]: {
        urgencyLevel: 'medium' as const,
        suggestedAction: 'immediate_response' as const,
        contextWindowSize: 20,
        requiresMemoryDepth: 'moderate' as const
      },
      [IntentType.DAILY_CHECKIN]: {
        urgencyLevel: 'low' as const,
        suggestedAction: 'immediate_response' as const,
        contextWindowSize: 10,
        requiresMemoryDepth: 'surface' as const
      },
      [IntentType.CLARIFICATION_NEEDED]: {
        urgencyLevel: 'low' as const,
        suggestedAction: 'clarify_first' as const,
        contextWindowSize: 10,
        requiresMemoryDepth: 'surface' as const
      }
    };

    return configs[intent];
  }
}

// Export singleton instance for easy usage
export const intentClassifier = new AdvancedIntentClassifier();