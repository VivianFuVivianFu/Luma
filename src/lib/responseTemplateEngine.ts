// Structured Response Template Engine for Therapeutic AI
// Enforces consistent REFLECTION → INSIGHT → ACTION → FOLLOW-UP format

import { IntentType, IntentAnalysis } from './intentClassifier';
import { Memory } from './memoryFirstService';

export interface StructuredResponse {
  reflection: string;
  insight: string;
  action: string;
  followUp: string;
  fullResponse: string;
  confidence: number;
  templateCompliance: boolean;
  qualityScore: number;
}

export interface ResponseQuality {
  hasMemoryReference: boolean;
  isEmpathetic: boolean;
  isActionable: boolean;
  hasFollowUp: boolean;
  structureValid: boolean;
  overallScore: number;
  issues: string[];
}

export interface TemplateContext {
  userMessage: string;
  intent: IntentAnalysis;
  memories: Memory[];
  conversationHistory: any[];
  userPreferences?: {
    responseLength: 'brief' | 'detailed';
    style: 'direct' | 'gentle';
    focus: 'emotional' | 'practical';
  };
}

export class ResponseTemplateEngine {
  
  // Quality thresholds for response validation
  private static readonly MIN_QUALITY_SCORE = 0.75;
  private static readonly MIN_EMPATHY_SCORE = 0.8;
  private static readonly MAX_RETRY_ATTEMPTS = 2;

  // Template patterns for different intents
  private static readonly TEMPLATES = {
    [IntentType.CRISIS]: {
      reflection: "I hear that you're in a really difficult place right now, and I want you to know that reaching out shows incredible strength.",
      insightPrefix: "Based on what you've shared and what I know about your situation",
      actionPrefix: "Right now, the most important thing you can do is",
      followUpPrefix: "I'm here with you through this. Can you tell me"
    },
    [IntentType.THERAPEUTIC_BREAKTHROUGH]: {
      reflection: "This sounds like a significant realization for you",
      insightPrefix: "This insight connects to patterns I've noticed in our conversations",
      actionPrefix: "To build on this breakthrough, consider",
      followUpPrefix: "How does this new understanding change"
    },
    [IntentType.GOAL_SETTING]: {
      reflection: "I can hear your motivation to make positive changes",
      insightPrefix: "Looking at your past experiences and current situation",
      actionPrefix: "A good first step would be to",
      followUpPrefix: "What feels most achievable for you to start with"
    },
    [IntentType.EMOTIONAL_VENTING]: {
      reflection: "Those feelings are completely valid, and it sounds really challenging",
      insightPrefix: "From what you've shared before and what I'm hearing now",
      actionPrefix: "Something that might help in this moment is",
      followUpPrefix: "What would feel most supportive right now"
    },
    [IntentType.PATTERN_ANALYSIS]: {
      reflection: "You're asking a really thoughtful question about patterns in your life",
      insightPrefix: "I've noticed some connections in our conversations that might shed light on this",
      actionPrefix: "To explore this pattern further, you might try",
      followUpPrefix: "When you think about this pattern, what do you notice"
    },
    [IntentType.RELATIONSHIP_ISSUE]: {
      reflection: "Relationship challenges can be really emotionally taxing",
      insightPrefix: "Based on what you've shared about your relationships",
      actionPrefix: "One approach that might help is",
      followUpPrefix: "How do you think this person would respond if"
    },
    [IntentType.DAILY_CHECKIN]: {
      reflection: "Thanks for checking in - it's good to hear from you",
      insightPrefix: "Thinking about how you've been doing lately",
      actionPrefix: "Today, you might focus on",
      followUpPrefix: "What's one thing you're looking forward to"
    }
  };

  /**
   * Generate structured response with template enforcement
   */
  async generateStructuredResponse(
    llmResponse: string,
    context: TemplateContext
  ): Promise<StructuredResponse> {
    console.log(`[ResponseTemplate] Processing ${context.intent.primaryIntent} response`);

    // Step 1: Try to parse existing LLM response structure
    let parsedResponse = this.parseExistingStructure(llmResponse);
    
    // Step 2: If parsing fails, construct structured response
    if (!parsedResponse.templateCompliance) {
      parsedResponse = await this.constructStructuredResponse(llmResponse, context);
    }

    // Step 3: Validate response quality
    const quality = this.validateResponseQuality(parsedResponse, context);
    
    // Step 4: Improve response if quality is insufficient
    if (quality.overallScore < ResponseTemplateEngine.MIN_QUALITY_SCORE) {
      console.log(`[ResponseTemplate] Quality score ${quality.overallScore} below threshold, improving response`);
      parsedResponse = await this.improveResponse(parsedResponse, context, quality);
    }

    // Step 5: Build final response
    const finalResponse = this.buildFinalResponse(parsedResponse, context);
    
    console.log(`[ResponseTemplate] Generated structured response with quality score: ${quality.overallScore}`);

    return {
      ...parsedResponse,
      fullResponse: finalResponse,
      qualityScore: quality.overallScore
    };
  }

  /**
   * Parse existing LLM response to extract structure
   */
  private parseExistingStructure(response: string): StructuredResponse {
    let reflection = '';
    let insight = '';
    let action = '';
    let followUp = '';
    let templateCompliance = false;

    // Try to identify structured patterns
    const reflectionMatch = response.match(/(?:REFLECTION:|I (?:hear|understand|can see))[:\s]*(.*?)(?=(?:INSIGHT:|Looking at|Based on)|\n\n|$)/is);
    const insightMatch = response.match(/(?:INSIGHT:|Looking at|Based on)[:\s]*(.*?)(?=(?:ACTION:|Consider|Try|You might)|\n\n|$)/is);
    const actionMatch = response.match(/(?:ACTION:|Consider|Try|You might|I'd suggest)[:\s]*(.*?)(?=(?:FOLLOW-?UP:|What|How|Would you)|\n\n|$)/is);
    const followUpMatch = response.match(/(?:FOLLOW-?UP:|What|How|Would you|Can you)[:\s]*(.*?)$/is);

    if (reflectionMatch) {
      reflection = reflectionMatch[1].trim();
      templateCompliance = true;
    }
    
    if (insightMatch) {
      insight = insightMatch[1].trim();
      templateCompliance = true;
    }
    
    if (actionMatch) {
      action = actionMatch[1].trim();
      templateCompliance = true;
    }
    
    if (followUpMatch) {
      followUp = followUpMatch[1].trim();
      templateCompliance = true;
    }

    // If no explicit structure found, try to infer from content
    if (!templateCompliance) {
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length >= 3) {
        reflection = sentences[0].trim();
        insight = sentences[1].trim();
        action = sentences.slice(2, -1).join('. ').trim();
        followUp = sentences[sentences.length - 1].trim();
        
        // Check if last sentence is question-like
        if (followUp && !followUp.includes('?')) {
          action = action + '. ' + followUp;
          followUp = '';
        }
      }
    }

    return {
      reflection: reflection || response.substring(0, 100),
      insight: insight || '',
      action: action || '',
      followUp: followUp || '',
      fullResponse: response,
      confidence: templateCompliance ? 0.8 : 0.4,
      templateCompliance,
      qualityScore: 0.5 // Will be calculated later
    };
  }

  /**
   * Construct structured response using templates
   */
  private async constructStructuredResponse(
    llmResponse: string,
    context: TemplateContext
  ): Promise<StructuredResponse> {
    const template = ResponseTemplateEngine.TEMPLATES[context.intent.primaryIntent] || 
                    ResponseTemplateEngine.TEMPLATES[IntentType.DAILY_CHECKIN];

    // Build reflection
    const reflection = this.buildReflection(template, context);

    // Build insight with memory integration
    const insight = this.buildInsight(template, context);

    // Build actionable step
    const action = this.buildAction(template, context, llmResponse);

    // Build follow-up question
    const followUp = this.buildFollowUp(template, context);

    return {
      reflection,
      insight,
      action,
      followUp,
      fullResponse: `${reflection}\n\n${insight}\n\n${action}\n\n${followUp}`,
      confidence: 0.85,
      templateCompliance: true,
      qualityScore: 0.8 // Will be recalculated
    };
  }

  /**
   * Build reflection section with empathetic acknowledgment
   */
  private buildReflection(template: any, context: TemplateContext): string {
    const { userMessage, intent } = context;
    
    let reflection = template.reflection;
    
    // Customize based on emotional content
    if (intent.urgencyLevel === 'critical') {
      reflection = "I hear that you're in a really difficult place right now, and I want you to know that reaching out shows incredible strength.";
    } else if (userMessage.toLowerCase().includes('frustrated') || userMessage.toLowerCase().includes('angry')) {
      reflection = "I can hear the frustration in your message, and those feelings make complete sense.";
    } else if (userMessage.toLowerCase().includes('excited') || userMessage.toLowerCase().includes('happy')) {
      reflection = "I can feel your positive energy, and it's wonderful to hear you sound so enthusiastic.";
    } else if (userMessage.toLowerCase().includes('confused') || userMessage.toLowerCase().includes('unsure')) {
      reflection = "I can sense you're working through some uncertainty, which shows real self-awareness.";
    }

    return reflection;
  }

  /**
   * Build insight section with memory integration
   */
  private buildInsight(template: any, context: TemplateContext): string {
    const { memories, intent } = context;
    
    let insight = template.insightPrefix + ', ';
    
    if (memories.length > 0) {
      const relevantMemory = memories[0]; // Highest relevance memory
      
      if (relevantMemory.type === 'progress') {
        insight += `this builds on the progress you've been making with ${this.extractTheme(relevantMemory.content)}.`;
      } else if (relevantMemory.type === 'pattern') {
        insight += `this connects to a pattern we've discussed where ${this.extractPattern(relevantMemory.content)}.`;
      } else if (relevantMemory.type === 'trigger') {
        insight += `this seems related to what we've identified as a challenging area for you.`;
      } else {
        insight += `this reminds me of something you shared about ${this.extractTheme(relevantMemory.content)}.`;
      }
    } else {
      // No memories available
      if (intent.primaryIntent === IntentType.GOAL_SETTING) {
        insight += "setting clear, achievable goals is often the first step toward meaningful change.";
      } else if (intent.primaryIntent === IntentType.EMOTIONAL_VENTING) {
        insight += "sometimes we need to express these feelings before we can process them.";
      } else {
        insight += "every experience teaches us something about ourselves and what we need.";
      }
    }

    return insight;
  }

  /**
   * Build action section with specific, achievable steps
   */
  private buildAction(template: any, context: TemplateContext, originalResponse: string): string {
    const { intent } = context;
    
    let action = template.actionPrefix + ' ';
    
    // Extract actionable content from original response if available
    const actionPhrases = this.extractActionPhrases(originalResponse);
    
    if (actionPhrases.length > 0) {
      action += actionPhrases[0];
    } else {
      // Generate default action based on intent
      switch (intent.primaryIntent) {
        case IntentType.CRISIS:
          action += "reach out to a trusted person or crisis helpline. Your safety and wellbeing are the top priority.";
          break;
        case IntentType.GOAL_SETTING:
          action += "write down one specific, small step you can take this week toward your goal.";
          break;
        case IntentType.EMOTIONAL_VENTING:
          action += "take a few deep breaths and acknowledge that these feelings are temporary and valid.";
          break;
        case IntentType.RELATIONSHIP_ISSUE:
          action += "think about how you might communicate your feelings clearly and calmly.";
          break;
        case IntentType.PATTERN_ANALYSIS:
          action += "keep a brief daily note about when this pattern shows up and what triggers it.";
          break;
        default:
          action += "take a moment to check in with yourself about what you need most right now.";
      }
    }

    return action;
  }

  /**
   * Build follow-up question for conversation continuity
   */
  private buildFollowUp(template: any, context: TemplateContext): string {
    const { intent, userMessage } = context;
    
    let followUp = template.followUpPrefix;
    
    // Customize follow-up based on intent
    switch (intent.primaryIntent) {
      case IntentType.CRISIS:
        followUp += " if there's anyone in your support system you could reach out to today?";
        break;
      case IntentType.GOAL_SETTING:
        followUp += " about this goal feels most important to you?";
        break;
      case IntentType.EMOTIONAL_VENTING:
        followUp += " would help you feel more supported in this situation?";
        break;
      case IntentType.RELATIONSHIP_ISSUE:
        followUp += " you think would be the most helpful first step?";
        break;
      case IntentType.PATTERN_ANALYSIS:
        followUp += " about the times when this pattern is strongest?";
        break;
      case IntentType.THERAPEUTIC_BREAKTHROUGH:
        followUp += " about how you want to use this new insight?";
        break;
      default:
        followUp += " would be most helpful to explore together?";
    }

    return followUp;
  }

  /**
   * Validate response quality against therapeutic standards
   */
  private validateResponseQuality(response: StructuredResponse, context: TemplateContext): ResponseQuality {
    const issues: string[] = [];
    let score = 0;

    // Check for memory reference
    const hasMemoryReference = context.memories.length > 0 && 
      (response.insight.toLowerCase().includes('you') || response.insight.toLowerCase().includes('we'));
    
    if (hasMemoryReference) {
      score += 0.2;
    } else if (context.memories.length > 0) {
      issues.push('Missing memory integration despite available memories');
    }

    // Check empathy score
    const empathyScore = this.calculateEmpathyScore(response.reflection + ' ' + response.insight);
    const isEmpathetic = empathyScore >= ResponseTemplateEngine.MIN_EMPATHY_SCORE;
    
    if (isEmpathetic) {
      score += 0.25;
    } else {
      issues.push(`Empathy score ${empathyScore.toFixed(2)} below threshold ${ResponseTemplateEngine.MIN_EMPATHY_SCORE}`);
    }

    // Check if action is specific and achievable
    const isActionable = this.isActionable(response.action);
    if (isActionable) {
      score += 0.2;
    } else {
      issues.push('Action step is too vague or not achievable');
    }

    // Check for follow-up question
    const hasFollowUp = response.followUp.includes('?') && response.followUp.trim().length > 10;
    if (hasFollowUp) {
      score += 0.15;
    } else {
      issues.push('Missing meaningful follow-up question');
    }

    // Check template structure
    const structureValid = response.templateCompliance && 
      response.reflection.length > 10 &&
      response.insight.length > 10 &&
      response.action.length > 10;
    
    if (structureValid) {
      score += 0.2;
    } else {
      issues.push('Template structure incomplete or invalid');
    }

    return {
      hasMemoryReference,
      isEmpathetic,
      isActionable,
      hasFollowUp,
      structureValid,
      overallScore: score,
      issues
    };
  }

  /**
   * Calculate empathy score based on language patterns
   */
  private calculateEmpathyScore(text: string): number {
    const empathyWords = [
      'hear', 'understand', 'feel', 'sense', 'recognize', 'acknowledge',
      'valid', 'understandable', 'makes sense', 'completely normal',
      'with you', 'together', 'support', 'care', 'here for you'
    ];

    const text_lower = text.toLowerCase();
    const empathyCount = empathyWords.filter(word => text_lower.includes(word)).length;
    
    // Base score from empathy words
    let score = Math.min(empathyCount * 0.15, 0.7);
    
    // Bonus for personal pronouns indicating connection
    if (text_lower.includes('you') && text_lower.includes('i')) {
      score += 0.2;
    }
    
    // Bonus for supportive phrases
    if (text_lower.includes('strength') || text_lower.includes('brave') || text_lower.includes('courage')) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if action is specific and achievable
   */
  private isActionable(action: string): boolean {
    // Check for specific action words
    const actionWords = ['write', 'call', 'practice', 'try', 'start', 'stop', 'ask', 'tell', 'schedule'];
    const hasActionWord = actionWords.some(word => action.toLowerCase().includes(word));
    
    // Check for specificity
    const isSpecific = action.length > 20 && !action.includes('think about thinking') && 
      !action.toLowerCase().includes('just try to');
    
    return hasActionWord && isSpecific;
  }

  /**
   * Improve response based on quality issues
   */
  private async improveResponse(
    response: StructuredResponse,
    context: TemplateContext,
    quality: ResponseQuality
  ): Promise<StructuredResponse> {
    console.log(`[ResponseTemplate] Improving response. Issues: ${quality.issues.join(', ')}`);

    let improved = { ...response };

    // Fix memory integration
    if (!quality.hasMemoryReference && context.memories.length > 0) {
      improved.insight = this.addMemoryReference(improved.insight, context.memories[0]);
    }

    // Improve empathy
    if (!quality.isEmpathetic) {
      improved.reflection = this.addEmpathy(improved.reflection, context.intent.primaryIntent);
    }

    // Make action more specific
    if (!quality.isActionable) {
      improved.action = this.makeActionSpecific(improved.action, context.intent.primaryIntent);
    }

    // Add follow-up if missing
    if (!quality.hasFollowUp) {
      improved.followUp = this.generateFollowUpQuestion(context.intent.primaryIntent);
    }

    // Rebuild full response
    improved.fullResponse = `${improved.reflection}\n\n${improved.insight}\n\n${improved.action}\n\n${improved.followUp}`;
    improved.confidence = Math.min(improved.confidence + 0.2, 0.95);

    return improved;
  }

  /**
   * Helper methods for response improvement
   */
  private addMemoryReference(insight: string, memory: Memory): string {
    const theme = this.extractTheme(memory.content);
    return `${insight} This connects to what you shared about ${theme}.`;
  }

  private addEmpathy(reflection: string, intent: IntentType): string {
    const empathyPhrases = [
      "I can really hear how important this is to you.",
      "Your feelings about this make complete sense.",
      "I understand why this would be challenging."
    ];
    
    return empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)] + ' ' + reflection;
  }

  private makeActionSpecific(action: string, intent: IntentType): string {
    if (action.length < 20) {
      return `Try writing down ${intent === IntentType.GOAL_SETTING ? 'one specific step' : 'your thoughts about this'} and set aside 10 minutes today to focus on it.`;
    }
    return action.replace(/try to think about/gi, 'write down your thoughts about');
  }

  private generateFollowUpQuestion(intent: IntentType): string {
    const questions = {
      [IntentType.CRISIS]: "What feels like the most important support you need right now?",
      [IntentType.GOAL_SETTING]: "What would achieving this goal mean to you?",
      [IntentType.EMOTIONAL_VENTING]: "What would help you feel more supported today?",
      [IntentType.RELATIONSHIP_ISSUE]: "How do you think this conversation could go?",
      [IntentType.PATTERN_ANALYSIS]: "When do you notice this pattern most strongly?",
      [IntentType.THERAPEUTIC_BREAKTHROUGH]: "How do you want to build on this insight?",
      [IntentType.DAILY_CHECKIN]: "What's one thing you're grateful for today?"
    };
    
    return questions[intent] || "What would be most helpful to explore next?";
  }

  /**
   * Utility methods
   */
  private extractTheme(content: string): string {
    // Simple theme extraction - could be enhanced with NLP
    const themes = ['work', 'family', 'relationship', 'health', 'goals', 'anxiety', 'depression'];
    const lowerContent = content.toLowerCase();
    
    for (const theme of themes) {
      if (lowerContent.includes(theme)) {
        return theme;
      }
    }
    
    return 'personal growth';
  }

  private extractPattern(content: string): string {
    // Extract behavioral patterns from memory content
    if (content.toLowerCase().includes('always')) {
      const match = content.match(/always\s+([^.]+)/i);
      return match ? match[1] : 'similar situations';
    }
    
    return 'challenging situations';
  }

  private extractActionPhrases(text: string): string[] {
    const actionPatterns = [
      /(?:try|consider|you could|you might|i suggest)\s+([^.!?]+)/gi,
      /(?:start by|begin with|first step)\s+([^.!?]+)/gi
    ];
    
    const phrases: string[] = [];
    
    for (const pattern of actionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          phrases.push(match[1].trim());
        }
      }
    }
    
    return phrases;
  }

  private buildFinalResponse(response: StructuredResponse, context: TemplateContext): string {
    const { userPreferences } = context;
    
    if (userPreferences?.responseLength === 'brief') {
      // Condense response for users who prefer brevity
      return `${response.reflection} ${response.insight} ${response.action} ${response.followUp}`;
    }
    
    // Full structured response
    return `${response.reflection}\n\n${response.insight}\n\n${response.action}\n\n${response.followUp}`;
  }
}

// Export singleton instance
export const responseTemplateEngine = new ResponseTemplateEngine();