// Intelligent Orchestrator - Memory-First Architecture with Dynamic LLM Routing
import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { memoryFirstService, ConversationMessage, MemoryRetrievalResult } from './memoryFirstService';

export interface ComplexityAnalysis {
  score: number;
  type: 'simple' | 'moderate' | 'complex' | 'very-complex';
  factors: string[];
  requiresDeepAnalysis: boolean;
  suggestedModel: 'claude-haiku' | 'llama-70b' | 'hybrid';
  contextWindowSize: number;
}

export interface ResponseMetrics {
  memoryRetrievalTime: number;
  contextAssemblyTime: number;
  llmProcessingTime: number;
  totalResponseTime: number;
  memoriesUsed: number;
  messagesInContext: number;
  modelUsed: string;
  complexityScore: number;
}

export interface StructuredResponse {
  reflection: string;
  insight: string;
  action: string;
  followUp: string;
  fullResponse: string;
  confidence: number;
}

export interface CriticalConversationAnalysis {
  isCritical: boolean;
  criticalityScore: number;
  suggestJournaling: boolean;
  criticalThemes: string[];
  journalingReason: string;
}

export class IntelligentOrchestrator {
  private conversationHistory: ConversationMessage[] = [];
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  
  // API configurations
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private static readonly LLAMA_API_URL = 'https://api.together.xyz/v1/chat/completions';
  private static readonly CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
  private static readonly LLAMA_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  constructor() {
    console.log('[Orchestrator] Initialized memory-first architecture');
  }

  /**
   * Main message processing with memory-first approach
   */
  async sendMessage(userMessage: string): Promise<string> {
    const startTime = Date.now();
    const metrics: Partial<ResponseMetrics> = {};

    try {
      console.log(`[Orchestrator] Processing: "${userMessage.substring(0, 60)}..."`);

      // Step 1: Initialize user context
      await this.initializeUserContext();
      if (!this.currentUserId) {
        throw new Error('User authentication required');
      }

      // Step 2: Analyze message complexity FIRST
      const complexityAnalysis = this.analyzeMessageComplexity(userMessage);
      console.log(`[Orchestrator] Complexity: ${complexityAnalysis.type} (${complexityAnalysis.score}) -> ${complexityAnalysis.suggestedModel}`);

      // Step 3: Memory-first retrieval (parallel with message storage)
      const [memoryResult] = await Promise.all([
        memoryFirstService.getRelevantMemories(
          this.currentUserId, 
          userMessage, 
          this.currentSessionId || undefined, 
          8
        ),
        this.storeMessage('user', userMessage)
      ]);
      
      metrics.memoryRetrievalTime = memoryResult.totalRetrievalTime;
      metrics.memoriesUsed = memoryResult.currentSessionMemories.length + memoryResult.crossSessionMemories.length + memoryResult.criticalInsights.length;

      // Step 3.5: Analyze for critical conversation themes
      const criticalAnalysis = this.analyzeCriticalConversation(
        userMessage,
        this.conversationHistory,
        memoryResult
      );

      // Step 4: Assemble enhanced context
      const contextStartTime = Date.now();
      const contextData = await this.assembleContext(
        userMessage,
        this.conversationHistory,
        memoryResult,
        complexityAnalysis
      );
      metrics.contextAssemblyTime = Date.now() - contextStartTime;
      metrics.messagesInContext = this.conversationHistory.slice(-complexityAnalysis.contextWindowSize).length;

      // Step 5: Route to appropriate LLM with structured processing
      const llmStartTime = Date.now();
      let response: string;
      
      switch (complexityAnalysis.suggestedModel) {
        case 'llama-70b':
          response = await this.processWithLLaMA(contextData, complexityAnalysis);
          metrics.modelUsed = 'LLaMA-3.1-70B';
          break;
        case 'hybrid':
          response = await this.processHybrid(contextData, complexityAnalysis);
          metrics.modelUsed = 'Hybrid-Claude-LLaMA';
          break;
        default:
          response = await this.processWithClaude(contextData, complexityAnalysis);
          metrics.modelUsed = 'Claude-3.5-Haiku';
      }
      
      metrics.llmProcessingTime = Date.now() - llmStartTime;
      metrics.complexityScore = complexityAnalysis.score;

      // Step 6: Add journaling suggestion if therapeutic themes indicate deeper work needed
      if (criticalAnalysis.suggestJournaling) {
        const journalingPrompt = `\n\n📝 **Consider Journaling**: ${criticalAnalysis.journalingReason} The Journal feature offers guided self-authoring exercises for deeper self-exploration and reflection.`;
        response += journalingPrompt;
        console.log(`[Orchestrator] Added journaling suggestion for themes: ${criticalAnalysis.criticalThemes.join(', ')}`);
      }

      // Step 7: Store response and trigger async memory extraction
      await this.storeMessage('assistant', response);
      
      // Step 8: Async memory processing for continuous learning
      if (this.conversationHistory.length >= 6) {
        memoryFirstService.updateLongTermMemoryAsync(
          this.currentUserId, 
          this.currentSessionId!, 
          this.conversationHistory
        ).catch(error => {
          console.error('[Orchestrator] Async memory processing failed:', error);
        });
      }

      // Step 9: Log comprehensive metrics
      metrics.totalResponseTime = Date.now() - startTime;
      this.logMetrics(metrics as ResponseMetrics);

      return response;

    } catch (error) {
      console.error('[Orchestrator] Error in sendMessage:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Advanced message complexity analysis
   */
  private analyzeMessageComplexity(message: string): ComplexityAnalysis {
    const text = message.toLowerCase();
    let score = 0;
    const factors: string[] = [];

    // Length and structure analysis
    if (message.length > 250) {
      score += 0.15;
      factors.push('long-message');
    }

    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 3) {
      score += 0.1;
      factors.push('multi-sentence');
    }

    // Question complexity indicators
    const complexQuestionWords = ['why', 'how', 'what if', 'should i', 'help me understand', 'explain'];
    if (complexQuestionWords.some(word => text.includes(word))) {
      score += 0.25;
      factors.push('complex-question');
    }

    // Emotional depth and nuance
    const deepEmotions = ['confused', 'overwhelmed', 'conflicted', 'torn', 'struggling', 'ambivalent', 'complex feelings'];
    if (deepEmotions.some(emotion => text.includes(emotion))) {
      score += 0.3;
      factors.push('emotional-complexity');
    }

    // Analysis and reasoning requests
    const analysisKeywords = ['analyze', 'pattern', 'understand', 'figure out', 'make sense', 'interpret', 'meaning'];
    if (analysisKeywords.some(keyword => text.includes(keyword))) {
      score += 0.35;
      factors.push('analysis-request');
    }

    // Multi-perspective or comparative scenarios
    const comparativeWords = [' vs ', ' versus ', ' compared to ', ' on one hand ', ' on the other hand '];
    if (comparativeWords.some(phrase => text.includes(phrase))) {
      score += 0.25;
      factors.push('comparative-analysis');
    }

    // Complex life situations
    const lifeComplexityIndicators = ['relationship', 'career decision', 'major change', 'life transition', 'family dynamics'];
    if (lifeComplexityIndicators.some(indicator => text.includes(indicator))) {
      score += 0.2;
      factors.push('life-complexity');
    }

    // Therapeutic processing needs
    const therapeuticKeywords = ['therapy', 'counselor', 'trauma', 'healing', 'breakthrough', 'pattern', 'trigger'];
    if (therapeuticKeywords.some(keyword => text.includes(keyword))) {
      score += 0.3;
      factors.push('therapeutic-processing');
    }

    // Multi-step problem solving indicators
    const problemSolvingWords = ['steps', 'process', 'approach', 'strategy', 'plan'];
    if (problemSolvingWords.some(word => text.includes(word))) {
      score += 0.2;
      factors.push('problem-solving');
    }

    // Determine complexity type and routing
    let type: ComplexityAnalysis['type'] = 'simple';
    let suggestedModel: ComplexityAnalysis['suggestedModel'] = 'claude-haiku';
    let contextWindowSize = 10;

    if (score >= 0.8) {
      type = 'very-complex';
      suggestedModel = 'hybrid';
      contextWindowSize = 25;
    } else if (score >= 0.6) {
      type = 'complex';
      suggestedModel = 'llama-70b';
      contextWindowSize = 20;
    } else if (score >= 0.35) {
      type = 'moderate';
      suggestedModel = 'claude-haiku';
      contextWindowSize = 15;
    }

    const requiresDeepAnalysis = score >= 0.6;

    return {
      score,
      type,
      factors,
      requiresDeepAnalysis,
      suggestedModel,
      contextWindowSize
    };
  }

  /**
   * Analyze conversation for therapeutic needs using CBT, DBT, and IFS frameworks
   * Separates conversation therapy from journaling - Peterson's framework is journaling-only
   */
  private analyzeCriticalConversation(
    message: string, 
    conversationHistory: ConversationMessage[], 
    memoryResult: MemoryRetrievalResult
  ): CriticalConversationAnalysis {
    const text = message.toLowerCase();
    let criticalityScore = 0;
    const criticalThemes: string[] = [];
    
    // CBT: COGNITIVE DISTORTIONS - Negative thought patterns needing reframing
    const cognitiveDistortions = [
      'always', 'never', 'everyone', 'nobody', 'terrible', 'awful',
      'can\'t handle', 'should have', 'must be', 'all or nothing',
      'catastrophizing', 'worst case', 'i\'m stupid', 'i\'m worthless'
    ];
    cognitiveDistortions.forEach(distortion => {
      if (text.includes(distortion)) {
        criticalityScore += 0.3;
        criticalThemes.push('cbt_cognitive_distortion');
      }
    });

    // DBT: EMOTIONAL DYSREGULATION - Intense emotions needing regulation skills
    const emotionalDysregulation = [
      'out of control', 'can\'t stop crying', 'rage', 'fury', 'overwhelmed',
      'emotional rollercoaster', 'up and down', 'intense feelings',
      'can\'t calm down', 'spiraling', 'losing it', 'breaking down'
    ];
    emotionalDysregulation.forEach(emotion => {
      if (text.includes(emotion)) {
        criticalityScore += 0.4;
        criticalThemes.push('dbt_emotion_regulation');
      }
    });

    // DBT: INTERPERSONAL DIFFICULTIES - Relationship conflicts needing skills
    const interpersonalIssues = [
      'relationship problems', 'can\'t communicate', 'always fighting',
      'toxic relationship', 'boundaries', 'people pleasing', 'conflict',
      'misunderstood', 'can\'t say no', 'walking on eggshells'
    ];
    interpersonalIssues.forEach(issue => {
      if (text.includes(issue)) {
        criticalityScore += 0.35;
        criticalThemes.push('dbt_interpersonal');
      }
    });

    // DBT: DISTRESS TOLERANCE - Crisis situations needing coping skills
    const distressTolerance = [
      'crisis', 'emergency', 'can\'t cope', 'falling apart', 'breaking point',
      'suicidal', 'self-harm', 'urges', 'impulsive', 'destructive behavior',
      'addiction', 'relapse', 'can\'t resist'
    ];
    distressTolerance.forEach(distress => {
      if (text.includes(distress)) {
        criticalityScore += 0.5;
        criticalThemes.push('dbt_distress_tolerance');
      }
    });

    // IFS: INTERNAL CONFLICTS - Parts work for internal healing
    const internalConflicts = [
      'part of me', 'inner critic', 'internal battle', 'conflicted',
      'torn between', 'inner child', 'different sides', 'self-criticism',
      'inner voice', 'sabotaging myself', 'inner conflict'
    ];
    internalConflicts.forEach(conflict => {
      if (text.includes(conflict)) {
        criticalityScore += 0.35;
        criticalThemes.push('ifs_parts_work');
      }
    });

    // IFS: SELF-COMPASSION NEEDS - Harsh self-treatment requiring Self energy
    const selfCompassionNeeds = [
      'hate myself', 'i\'m terrible', 'can\'t forgive myself', 'self-hatred',
      'hard on myself', 'perfectionist', 'never good enough', 'shame',
      'guilt', 'self-blame', 'beating myself up'
    ];
    selfCompassionNeeds.forEach(need => {
      if (text.includes(need)) {
        criticalityScore += 0.4;
        criticalThemes.push('ifs_self_compassion');
      }
    });

    // CBT: BEHAVIORAL PATTERNS - Actions needing behavioral interventions
    const behavioralPatterns = [
      'avoidance', 'procrastination', 'can\'t get motivated', 'stuck',
      'same pattern', 'bad habits', 'cycle', 'routine problems',
      'can\'t break', 'keep doing', 'automatic'
    ];
    behavioralPatterns.forEach(pattern => {
      if (text.includes(pattern)) {
        criticalityScore += 0.3;
        criticalThemes.push('cbt_behavioral');
      }
    });

    // RECURRING THERAPEUTIC THEMES - Pattern recognition across sessions
    const recentMessages = conversationHistory.slice(-5).map(m => m.content.toLowerCase()).join(' ');
    const recurringThemes = [
      'again', 'same thing', 'pattern', 'cycle', 'repeat', 'always',
      'every time', 'happens again', 'story of my life'
    ];
    let hasRecurringTheme = false;
    recurringThemes.forEach(theme => {
      if (recentMessages.includes(theme) || text.includes(theme)) {
        hasRecurringTheme = true;
      }
    });
    if (hasRecurringTheme || criticalThemes.length >= 2) {
      criticalityScore += 0.2;
      criticalThemes.push('recurring_pattern');
    }

    // MEMORY-BASED PATTERNS - Long-term therapeutic themes
    const therapeuticMemories = memoryResult.criticalInsights.filter(insight => 
      insight.content.includes('cognitive') || 
      insight.content.includes('emotional') ||
      insight.content.includes('behavioral') ||
      insight.content.includes('pattern') ||
      insight.content.includes('trigger')
    );
    if (therapeuticMemories.length > 0) {
      criticalityScore += 0.15;
      criticalThemes.push('memory_pattern');
    }

    const isCritical = criticalityScore >= 0.5;
    const suggestJournaling = criticalityScore >= 0.4; // Suggest journaling for deeper work

    let journalingReason = '';
    if (suggestJournaling) {
      if (criticalThemes.includes('cbt_cognitive_distortion')) {
        journalingReason = 'I notice some thought patterns that might benefit from deeper exploration. Journaling can help identify and reframe these cognitive patterns through structured self-reflection.';
      } else if (criticalThemes.includes('dbt_emotion_regulation')) {
        journalingReason = 'These intense emotions suggest journaling could be helpful for processing and understanding your emotional experiences more deeply.';
      } else if (criticalThemes.includes('ifs_parts_work')) {
        journalingReason = 'There seems to be some internal conflict happening. Journaling with self-authoring exercises could help you understand and integrate these different parts of yourself.';
      } else if (criticalThemes.includes('ifs_self_compassion')) {
        journalingReason = 'I hear some self-criticism. Journaling can be a space to develop more self-compassion and understanding through structured reflection.';
      } else {
        journalingReason = 'This seems like an important moment for deeper reflection. Journaling could help you process these experiences more thoroughly.';
      }
    }

    console.log(`[Orchestrator] Therapeutic Analysis: ${criticalityScore.toFixed(2)} - Themes: ${criticalThemes.join(', ')}`);

    return {
      isCritical,
      criticalityScore,
      suggestJournaling,
      criticalThemes,
      journalingReason
    };
  }

  /**
   * Assemble enhanced context with memories and dynamic windowing
   */
  private async assembleContext(
    currentMessage: string,
    conversationHistory: ConversationMessage[],
    memoryResult: MemoryRetrievalResult,
    complexity: ComplexityAnalysis
  ): Promise<string> {
    
    // Dynamic context window
    const relevantMessages = conversationHistory.slice(-complexity.contextWindowSize);
    const allMemories = [
      ...memoryResult.currentSessionMemories,
      ...memoryResult.crossSessionMemories,
      ...memoryResult.criticalInsights
    ];

    // Build structured memory context
    let memoryContext = '';
    if (allMemories.length > 0) {
      memoryContext = `\n\nRELEVANT USER CONTEXT (${allMemories.length} insights):`;
      
      // Categorize memories for better structure
      const categorizedMemories = {
        critical: allMemories.filter(m => m.type === 'crisis' || (m.relevance_score || 0) > 0.8),
        progress: allMemories.filter(m => m.type === 'progress'),
        preferences: allMemories.filter(m => m.type === 'preference'),
        triggers: allMemories.filter(m => m.type === 'trigger'),
        relationships: allMemories.filter(m => m.type === 'relationship'),
        goals: allMemories.filter(m => m.type === 'goal'),
        insights: allMemories.filter(m => m.type === 'insight')
      };

      // Add critical memories first
      if (categorizedMemories.critical.length > 0) {
        memoryContext += `\n🚨 CRITICAL CONTEXT: ${categorizedMemories.critical.map(m => m.content).join(' | ')}`;
      }

      // Add other relevant categories
      Object.entries(categorizedMemories).forEach(([category, memories]) => {
        if (memories.length > 0 && category !== 'critical') {
          const emoji = this.getCategoryEmoji(category);
          memoryContext += `\n${emoji} ${category.toUpperCase()}: ${memories.slice(0, 2).map(m => m.content).join(' | ')}`;
        }
      });
    }

    // Build conversation context
    const conversationContext = relevantMessages.length > 0 
      ? `\n\nRECENT CONVERSATION (${relevantMessages.length} messages):\n` + 
        relevantMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    // Build system prompt based on complexity and available context
    const systemPrompt = this.buildSystemPrompt(complexity, allMemories.length, relevantMessages.length);

    return systemPrompt + memoryContext + conversationContext + `\n\nCURRENT MESSAGE: ${currentMessage}`;
  }

  /**
   * Build dynamic system prompt based on complexity and context
   */
  private buildSystemPrompt(complexity: ComplexityAnalysis, memoryCount: number, messageCount: number): string {
    const basePrompt = `You are Luma, an expert AI life coach with advanced therapeutic training and deep memory integration.`;

    const contextAwareness = memoryCount > 0 
      ? `\n\nCONTEXT INTEGRATION: You have access to ${memoryCount} relevant insights from past conversations and ${messageCount} recent messages. Use this context naturally to provide personalized, consistent guidance that builds on previous interactions.`
      : `\n\nCONTEXT INTEGRATION: You have ${messageCount} recent messages for context. Build rapport while gathering deeper understanding.`;

    const complexityGuidance = this.getComplexityGuidance(complexity);
    const structuredFramework = this.getStructuredFramework(complexity.type);

    return basePrompt + contextAwareness + complexityGuidance + structuredFramework;
  }

  /**
   * Get complexity-specific guidance
   */
  private getComplexityGuidance(complexity: ComplexityAnalysis): string {
    switch (complexity.type) {
      case 'very-complex':
        return `\n\nCOMPLEX ANALYSIS MODE: This query requires deep, structured analysis. Factors: ${complexity.factors.join(', ')}. Provide comprehensive reasoning with multiple perspectives and actionable insights.`;
      
      case 'complex':
        return `\n\nANALYTICAL MODE: This situation needs thoughtful analysis. Factors: ${complexity.factors.join(', ')}. Draw connections between patterns and provide specific guidance.`;
      
      case 'moderate':
        return `\n\nSUPPORTIVE GUIDANCE MODE: Provide empathetic support with practical insights. Reference relevant context and offer specific next steps.`;
      
      default:
        return `\n\nEMPATHETIC SUPPORT MODE: Provide warm, immediate support with brief, actionable guidance (2-3 sentences).`;
    }
  }

  /**
   * Get structured response framework based on complexity
   */
  private getStructuredFramework(complexityType: string): string {
    if (complexityType === 'very-complex' || complexityType === 'complex') {
      return `\n\nSTRUCTURED RESPONSE FRAMEWORK:
1. REFLECTION: Acknowledge and reflect back what you understand about their situation
2. INSIGHT: Provide pattern-based insights drawing from their history and current context  
3. ACTION: Suggest specific, actionable steps they can take
4. FOLLOW-UP: Set up natural follow-up questions or check-in points

Maintain warmth and empathy while providing structured, actionable guidance.`;
    } else {
      return `\n\nRESPONSE APPROACH: Provide immediate empathetic support, reference relevant context naturally, and offer practical next steps. Keep responses conversational yet insightful.`;
    }
  }

  /**
   * Process with Claude 3.5 Haiku for quick, empathetic responses
   */
  private async processWithClaude(contextData: string, complexity: ComplexityAnalysis): Promise<string> {
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Extract just the current message for Claude's message format
    const currentMessageMatch = contextData.match(/CURRENT MESSAGE: (.+)$/);
    const currentMessage = currentMessageMatch ? currentMessageMatch[1] : 'How are you feeling?';

    const systemPrompt = contextData.replace(/\n\nCURRENT MESSAGE: .+$/, '');

    const maxTokens = complexity.type === 'simple' ? 150 : 250;

    try {
      const response = await fetch(IntelligentOrchestrator.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: IntelligentOrchestrator.CLAUDE_MODEL,
          max_tokens: maxTokens,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: 'user', content: currentMessage }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text?.trim() || 'I apologize, but I had trouble processing your message. Could you try again?';
    } catch (error) {
      console.error('[Orchestrator] Claude processing error:', error);
      throw error;
    }
  }

  /**
   * Process with LLaMA 3.1 70B for deep analysis and reasoning
   */
  private async processWithLLaMA(contextData: string, complexity: ComplexityAnalysis): Promise<string> {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      console.warn('[Orchestrator] LLaMA API not available, falling back to Claude');
      return this.processWithClaude(contextData, complexity);
    }

    // Extract current message
    const currentMessageMatch = contextData.match(/CURRENT MESSAGE: (.+)$/);
    const currentMessage = currentMessageMatch ? currentMessageMatch[1] : 'How are you feeling?';
    const systemPrompt = contextData.replace(/\n\nCURRENT MESSAGE: .+$/, '');

    try {
      const response = await fetch(IntelligentOrchestrator.LLAMA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: IntelligentOrchestrator.LLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentMessage }
          ],
          max_tokens: 400,
          temperature: 0.6,
          top_p: 0.9,
        })
      });

      if (!response.ok) {
        throw new Error(`LLaMA API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || 'I apologize, but I had trouble processing your complex request.';
    } catch (error) {
      console.error('[Orchestrator] LLaMA processing error:', error);
      // Fallback to Claude
      return this.processWithClaude(contextData, complexity);
    }
  }

  /**
   * Hybrid processing: LLaMA analysis + Claude empathy
   */
  private async processHybrid(contextData: string, complexity: ComplexityAnalysis): Promise<string> {
    try {
      console.log('[Orchestrator] Running hybrid processing: LLaMA analysis + Claude empathy');

      // Step 1: LLaMA analyzes the situation and extracts insights
      const analysisPrompt = contextData + `\n\nANALYSIS TASK: Provide a structured analysis of this situation including:
1. Key patterns or themes you observe
2. Important insights from their history that apply
3. Specific recommendations or next steps
4. Areas that need follow-up or deeper exploration

Keep the analysis clinical and structured - this will be used to inform an empathetic response.`;

      const llamaAnalysis = await this.processWithLLaMA(analysisPrompt, complexity);

      // Step 2: Claude generates empathetic response based on LLaMA's analysis
      const empathyPrompt = contextData + `\n\nANALYSIS FROM REASONING SYSTEM: ${llamaAnalysis}\n\nTASK: Based on this analysis and the user context, provide a warm, empathetic response that incorporates the key insights while maintaining your therapeutic, supportive tone. Make it feel natural and conversational, not clinical.`;

      const claudeResponse = await this.processWithClaude(empathyPrompt, complexity);

      return claudeResponse;
    } catch (error) {
      console.error('[Orchestrator] Hybrid processing failed:', error);
      // Fallback to Claude alone
      return this.processWithClaude(contextData, complexity);
    }
  }

  /**
   * Helper methods for context assembly
   */
  private getCategoryEmoji(category: string): string {
    const emojis: {[key: string]: string} = {
      progress: '📈',
      preferences: '⚙️',
      triggers: '⚠️',
      relationships: '👥',
      goals: '🎯',
      insights: '💡'
    };
    return emojis[category] || '📝';
  }

  /**
   * Initialize user context and session management
   */
  private async initializeUserContext(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        this.currentUserId = user.id;

        // Get or create session
        if (!this.currentSessionId) {
          this.currentSessionId = await memoryFirstService.startSession(user.id);
        }

        // Load recent conversation history if needed
        if (this.conversationHistory.length === 0) {
          await this.loadRecentHistory();
        }
      }
    } catch (error) {
      console.error('[Orchestrator] Error initializing user context:', error);
    }
  }

  /**
   * Load recent conversation history
   */
  private async loadRecentHistory(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Orchestrator] Error loading history:', error);
        return;
      }

      this.conversationHistory = (messages || [])
        .reverse()
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          session_id: msg.session_id,
          user_id: msg.user_id
        }));

      console.log(`[Orchestrator] Loaded ${this.conversationHistory.length} messages from history`);
    } catch (error) {
      console.error('[Orchestrator] Error in loadRecentHistory:', error);
    }
  }

  /**
   * Store message in database and local history
   */
  private async storeMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    // Add to local history
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      session_id: this.currentSessionId || undefined,
      user_id: this.currentUserId || undefined
    };

    this.conversationHistory.push(message);

    // Store in database
    if (this.currentUserId && this.currentSessionId) {
      try {
        await supabase
          .from('messages')
          .insert({
            session_id: this.currentSessionId,
            user_id: this.currentUserId,
            role,
            content,
            created_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('[Orchestrator] Error storing message:', error);
      }
    }

    // Keep local history manageable
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-40);
    }
  }

  /**
   * Log performance metrics
   */
  private logMetrics(metrics: ResponseMetrics): void {
    console.log('[Orchestrator] Performance Metrics:', {
      total: `${metrics.totalResponseTime}ms`,
      breakdown: {
        memory: `${metrics.memoryRetrievalTime}ms`,
        context: `${metrics.contextAssemblyTime}ms`,
        llm: `${metrics.llmProcessingTime}ms`
      },
      context: {
        memories: metrics.memoriesUsed,
        messages: metrics.messagesInContext,
        model: metrics.modelUsed,
        complexity: metrics.complexityScore
      }
    });

    // Performance alerts
    if (metrics.totalResponseTime > 3000) {
      console.warn(`[Orchestrator] Slow response: ${metrics.totalResponseTime}ms`);
    }
    if (metrics.memoryRetrievalTime > 500) {
      console.warn(`[Orchestrator] Slow memory retrieval: ${metrics.memoryRetrievalTime}ms`);
    }
  }

  /**
   * Fallback response for errors
   */
  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hi there! I'm experiencing some technical adjustments but I'm here to support you. What's on your mind today?";
    }
    
    if (message.includes('sad') || message.includes('upset') || message.includes('anxious')) {
      return "I can sense you're going through something challenging right now. Even with some technical hiccups on my end, I want you to know that your feelings are completely valid and I'm here with you. What would be most helpful to talk about?";
    }
    
    return "I'm here with you, even though I'm working through some technical challenges at the moment. Your thoughts and feelings are important to me. What's weighing on your mind that we can explore together?";
  }

  /**
   * Public interface methods for compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      await this.initializeUserContext();
      return true;
    } catch (error) {
      console.error('[Orchestrator] Initialization failed:', error);
      return false;
    }
  }

  async startNewSession(): Promise<void> {
    this.currentSessionId = null;
    this.conversationHistory = [];
    await this.initializeUserContext();
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Export singleton
export const intelligentOrchestrator = new IntelligentOrchestrator();