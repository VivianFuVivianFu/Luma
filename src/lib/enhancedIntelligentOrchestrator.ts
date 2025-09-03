// Enhanced Intelligent Orchestrator - Next-Generation Therapeutic AI
// Integrates all advanced systems for optimal personalized responses

import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// Import all enhanced systems
import { intentClassifier, IntentType, IntentAnalysis } from './intentClassifier';
import { enhancedMemoryRetrieval, SemanticMemoryResult } from './enhancedMemoryRetrieval';
import { responseTemplateEngine, StructuredResponse, TemplateContext } from './responseTemplateEngine';
import { memoryExtractionQueue } from './memoryExtractionQueue';
import { engagementTracker } from './engagementTracker';
import { memoryCacheService } from './memoryCacheService';

// Legacy imports for compatibility
import { ConversationMessage } from './memoryFirstService';

export interface EnhancedResponseMetrics {
  // Performance metrics
  totalResponseTime: number;
  memoryRetrievalTime: number;
  cacheHitRate: number;
  intentAnalysisTime: number;
  llmProcessingTime: number;
  responseValidationTime: number;
  
  // Content metrics
  memoriesUsed: number;
  messagesInContext: number;
  complexityScore: number;
  qualityScore: number;
  
  // System metrics
  modelUsed: string;
  cacheUsed: boolean;
  fallbackUsed: boolean;
  engagementLevel: string;
  intentDetected: IntentType;
  structureCompliance: boolean;
}

export interface ProcessingPipeline {
  stage: 'intent_analysis' | 'memory_retrieval' | 'context_assembly' | 
         'llm_processing' | 'response_validation' | 'engagement_tracking' | 'completed';
  startTime: number;
  duration?: number;
  success: boolean;
  data?: any;
  error?: string;
}

export class EnhancedIntelligentOrchestrator {
  private conversationHistory: ConversationMessage[] = [];
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  private processingPipeline: ProcessingPipeline[] = [];
  
  // API configurations
  private static readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private static readonly LLAMA_API_URL = 'https://api.together.xyz/v1/chat/completions';
  private static readonly CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
  private static readonly LLAMA_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  // Performance targets
  private static readonly TARGET_RESPONSE_TIME = 1500; // 1.5 seconds
  // private static readonly TARGET_MEMORY_TIME = 300; // 300ms
  private static readonly MIN_QUALITY_SCORE = 0.75;

  constructor() {
    console.log('[EnhancedOrchestrator] Initialized next-generation therapeutic AI system');
  }

  /**
   * Main message processing with full system integration
   */
  async sendMessage(userMessage: string): Promise<string> {
    const startTime = Date.now();
    const metrics: Partial<EnhancedResponseMetrics> = {
      totalResponseTime: 0,
      cacheUsed: false,
      fallbackUsed: false
    };

    // Initialize processing pipeline
    this.processingPipeline = [];
    
    try {
      console.log(`[EnhancedOrchestrator] Processing: "${userMessage.substring(0, 50)}..."`);

      // Stage 1: Initialize user context
      await this.initializeUserContext();
      
      if (!this.currentUserId) {
        return this.getFallbackResponse(userMessage);
      }

      // Stage 2: Intent Analysis
      const intentResult = await this.executeStage('intent_analysis', async () => {
        return await intentClassifier.analyzeIntent(userMessage, this.conversationHistory);
      });

      const intent: IntentAnalysis = intentResult.data;
      metrics.intentDetected = intent.primaryIntent;
      metrics.complexityScore = intent.confidence;

      // Handle clarification requests immediately
      if (intent.primaryIntent === IntentType.CLARIFICATION_NEEDED) {
        const clarificationPrompt = intentClassifier.generateClarificationPrompt(
          userMessage, 
          this.conversationHistory
        );
        await this.trackEngagement(userMessage, 'assistant');
        return clarificationPrompt.question;
      }

      // Stage 3: High-Performance Memory Retrieval
      const memoryResult = await this.executeStage('memory_retrieval', async () => {
        // Try cache first for sub-300ms retrieval
        const cachedResult = await memoryCacheService.getMemoriesFromCache(
          this.currentUserId!,
          userMessage,
          this.currentSessionId || undefined
        );

        if (cachedResult) {
          metrics.cacheUsed = true;
          return cachedResult;
        }

        // Fallback to semantic retrieval
        const semanticResult = await enhancedMemoryRetrieval.getSemanticMemories(
          this.currentUserId!,
          userMessage,
          this.currentSessionId || undefined,
          intent.contextWindowSize || 8
        );

        // Cache the result for future use
        await memoryCacheService.storeMemoriesInCache(
          this.currentUserId!,
          userMessage,
          {
            currentSessionMemories: semanticResult.memories.filter(m => m.session_id === this.currentSessionId),
            crossSessionMemories: semanticResult.memories.filter(m => m.session_id !== this.currentSessionId),
            criticalInsights: semanticResult.memories.filter(m => m.type === 'crisis'),
            totalRetrievalTime: semanticResult.retrievalTime
          },
          this.currentSessionId || undefined,
          intent.urgencyLevel === 'critical' ? 'critical' : 'medium'
        );

        return semanticResult;
      });

      metrics.memoryRetrievalTime = this.processingPipeline[1]?.duration || 0;
      metrics.memoriesUsed = (memoryResult.data as SemanticMemoryResult).memories?.length || 0;
      metrics.cacheHitRate = metrics.cacheUsed ? 1.0 : 0.0;

      // Stage 4: Context Assembly with User Preferences
      const contextResult = await this.executeStage('context_assembly', async () => {
        const userPreferences = engagementTracker.getUserPreferences(this.currentUserId!);
        const memories = (memoryResult.data as SemanticMemoryResult).memories || [];

        const templateContext: TemplateContext = {
          userMessage,
          intent,
          memories,
          conversationHistory: this.conversationHistory.slice(-intent.contextWindowSize || 15),
          userPreferences: userPreferences ? {
            responseLength: 'detailed' as const,
            style: 'gentle' as const, 
            focus: 'emotional' as const
          } : undefined
        };

        return templateContext;
      });

      // Stage 5: LLM Processing with Intelligent Routing
      const llmResult = await this.executeStage('llm_processing', async () => {
        const context = contextResult.data as TemplateContext;
        return await this.processWithIntelligentRouting(context, intent);
      });

      metrics.llmProcessingTime = this.processingPipeline[3]?.duration || 0;
      metrics.modelUsed = llmResult.data.modelUsed || 'unknown';

      // Stage 6: Response Template Enforcement
      const structuredResult = await this.executeStage('response_validation', async () => {
        const context = contextResult.data as TemplateContext;
        const rawResponse = typeof llmResult.data === 'string' ? llmResult.data : llmResult.data.response;

        return await responseTemplateEngine.generateStructuredResponse(rawResponse, context);
      });

      const finalResponse: StructuredResponse = structuredResult.data;
      metrics.qualityScore = finalResponse.qualityScore;
      metrics.structureCompliance = finalResponse.templateCompliance;

      // Stage 7: Engagement Tracking & Adaptation
      await this.executeStage('engagement_tracking', async () => {
        // Track user message
        await engagementTracker.trackMessage(
          this.currentUserId!,
          this.currentSessionId || 'unknown',
          userMessage,
          'user',
          intent.primaryIntent
        );

        // Track assistant response
        await engagementTracker.trackMessage(
          this.currentUserId!,
          this.currentSessionId || 'unknown',
          finalResponse.fullResponse,
          'assistant'
        );

        const userMetrics = engagementTracker.getEngagementMetrics(this.currentUserId!);
        metrics.engagementLevel = userMetrics?.engagementLevel || 'medium';

        return userMetrics;
      });

      // Stage 8: Store conversation and trigger async processing
      await this.storeMessage('user', userMessage);
      await this.storeMessage('assistant', finalResponse.fullResponse);

      // Trigger background memory extraction for learning
      if (this.conversationHistory.length >= 6) {
        await memoryExtractionQueue.addExtractionJob(
          this.currentUserId,
          this.currentSessionId || 'unknown',
          [...this.conversationHistory, { role: 'user', content: userMessage, timestamp: new Date() }],
          intent.urgencyLevel === 'critical' ? 'critical' : 'medium'
        );
      }

      // Complete metrics and log performance
      metrics.totalResponseTime = Date.now() - startTime;
      this.logEnhancedMetrics(metrics as EnhancedResponseMetrics);

      // Check if we met performance targets
      if (metrics.totalResponseTime > EnhancedIntelligentOrchestrator.TARGET_RESPONSE_TIME) {
        console.warn(`[EnhancedOrchestrator] Response time ${metrics.totalResponseTime}ms exceeded target ${EnhancedIntelligentOrchestrator.TARGET_RESPONSE_TIME}ms`);
      }

      return finalResponse.fullResponse;

    } catch (error) {
      console.error('[EnhancedOrchestrator] Error in processing pipeline:', error);
      metrics.fallbackUsed = true;
      metrics.totalResponseTime = Date.now() - startTime;
      
      await this.trackEngagement(userMessage, 'assistant');
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Execute processing stage with timing and error handling
   */
  private async executeStage<T>(
    stage: ProcessingPipeline['stage'],
    stageFunction: () => Promise<T>
  ): Promise<{ data: T; duration: number }> {
    const stageStart = Date.now();
    
    try {
      const data = await stageFunction();
      const duration = Date.now() - stageStart;
      
      this.processingPipeline.push({
        stage,
        startTime: stageStart,
        duration,
        success: true,
        data
      });

      console.log(`[EnhancedOrchestrator] ${stage} completed in ${duration}ms`);
      
      return { data, duration };
      
    } catch (error) {
      const duration = Date.now() - stageStart;
      
      this.processingPipeline.push({
        stage,
        startTime: stageStart,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`[EnhancedOrchestrator] ${stage} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Intelligent LLM routing with enhanced decision making
   */
  private async processWithIntelligentRouting(
    context: TemplateContext,
    intent: IntentAnalysis
  ): Promise<{ response: string; modelUsed: string; confidence: number }> {
    
    // Build enhanced system prompt with all context
    const systemPrompt = this.buildEnhancedSystemPrompt(context, intent);
    
    try {
      // Route based on intent analysis and complexity
      if (intent.urgencyLevel === 'critical') {
        return await this.processWithClaude(systemPrompt, context.userMessage, 'claude-empathy');
      } else if (intent.requiresMemoryDepth === 'deep' || intent.requiresMemoryDepth === 'comprehensive') {
        return await this.processWithLLaMA(systemPrompt, context.userMessage, 'llama-analysis');
      } else {
        return await this.processWithClaude(systemPrompt, context.userMessage, 'claude-empathy');
      }
      
    } catch (error) {
      console.error('[EnhancedOrchestrator] LLM routing failed:', error);
      // Fallback to Claude for reliability
      return await this.processWithClaude(systemPrompt, context.userMessage, 'claude-fallback');
    }
  }

  /**
   * Build enhanced system prompt with full context integration
   */
  private buildEnhancedSystemPrompt(context: TemplateContext, intent: IntentAnalysis): string {
    const { memories, conversationHistory, userPreferences } = context;
    
    // Base therapeutic AI identity
    let prompt = `You are Luma, an expert AI emotional companion and therapeutic coach with advanced memory integration and personalized response capabilities.`;

    // Add memory context
    if (memories.length > 0) {
      prompt += `\n\nRELEVANT USER CONTEXT from past conversations:`;
      memories.slice(0, 5).forEach(memory => {
        prompt += `\n- ${memory.content} (${memory.type}, confidence: ${memory.relevance_score?.toFixed(2) || 'N/A'})`;
      });
    }

    // Add conversation context
    if (conversationHistory.length > 0) {
      prompt += `\n\nRECENT CONVERSATION CONTEXT:`;
      conversationHistory.slice(-5).forEach(msg => {
        prompt += `\n${msg.role.toUpperCase()}: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`;
      });
    }

    // Add user preferences
    if (userPreferences) {
      prompt += `\n\nUSER PREFERENCES:`;
      prompt += `\n- Response length: ${userPreferences.responseLength}`;
      prompt += `\n- Communication style: ${userPreferences.style}`;
      prompt += `\n- Focus area: ${userPreferences.focus}`;
    }

    // Add intent-specific guidance
    prompt += `\n\nCURRENT INTERACTION ANALYSIS:`;
    prompt += `\n- Intent: ${intent.primaryIntent} (confidence: ${intent.confidence.toFixed(2)})`;
    prompt += `\n- Urgency level: ${intent.urgencyLevel}`;
    prompt += `\n- Suggested approach: ${intent.suggestedAction}`;

    // Add response template requirements
    prompt += `\n\nRESPONSE REQUIREMENTS:`;
    
    if (intent.urgencyLevel === 'critical') {
      prompt += `\n- CRITICAL SITUATION: Prioritize safety and immediate support`;
      prompt += `\n- Provide crisis resources and encourage professional help`;
      prompt += `\n- Use calm, direct, supportive language`;
    } else if (intent.primaryIntent === IntentType.THERAPEUTIC_BREAKTHROUGH) {
      prompt += `\n- BREAKTHROUGH MOMENT: Acknowledge and build on user's insight`;
      prompt += `\n- Connect to relevant memories and patterns`;
      prompt += `\n- Provide structured analysis and next steps`;
    } else {
      prompt += `\n- Follow REFLECTION → INSIGHT → ACTION → FOLLOW-UP structure`;
      prompt += `\n- Reference specific memories when contextually relevant`;
      prompt += `\n- Provide empathetic, actionable guidance`;
    }

    // Add quality requirements
    prompt += `\n\nQUALITY STANDARDS:`;
    prompt += `\n- Be specific and personal, not generic`;
    prompt += `\n- Reference conversation history naturally`;
    prompt += `\n- Provide actionable, achievable suggestions`;
    prompt += `\n- End with a meaningful follow-up question`;

    return prompt;
  }

  /**
   * Process with Claude 3.5 Haiku for empathetic responses
   */
  private async processWithClaude(
    systemPrompt: string,
    userMessage: string,
    mode: string
  ): Promise<{ response: string; modelUsed: string; confidence: number }> {
    
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key not configured');
    }

    try {
      const response = await fetch(EnhancedIntelligentOrchestrator.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: EnhancedIntelligentOrchestrator.CLAUDE_MODEL,
          max_tokens: mode === 'claude-empathy' ? 250 : 200,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0]?.text?.trim() || 'I apologize, but I encountered an issue processing your message.';

      return {
        response: responseText,
        modelUsed: `Claude-3.5-Haiku-${mode}`,
        confidence: 0.85
      };

    } catch (error) {
      console.error('[EnhancedOrchestrator] Claude processing error:', error);
      throw error;
    }
  }

  /**
   * Process with LLaMA 3.1 70B for complex analysis
   */
  private async processWithLLaMA(
    systemPrompt: string,
    userMessage: string,
    mode: string
  ): Promise<{ response: string; modelUsed: string; confidence: number }> {
    
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      console.warn('[EnhancedOrchestrator] LLaMA API not available, falling back to Claude');
      return await this.processWithClaude(systemPrompt, userMessage, 'claude-fallback');
    }

    try {
      const response = await fetch(EnhancedIntelligentOrchestrator.LLAMA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EnhancedIntelligentOrchestrator.LLAMA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 350,
          temperature: 0.6,
          top_p: 0.9,
        })
      });

      if (!response.ok) {
        throw new Error(`LLaMA API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices[0]?.message?.content?.trim() || 'I apologize, but I had trouble processing your complex request.';

      return {
        response: responseText,
        modelUsed: `LLaMA-3.1-70B-${mode}`,
        confidence: 0.90
      };

    } catch (error) {
      console.error('[EnhancedOrchestrator] LLaMA processing error:', error);
      // Fallback to Claude
      return await this.processWithClaude(systemPrompt, userMessage, 'claude-fallback');
    }
  }

  /**
   * Hybrid processing: LLaMA analysis + Claude empathy
   */
  private async processWithHybridApproach(
    systemPrompt: string,
    context: TemplateContext
  ): Promise<{ response: string; modelUsed: string; confidence: number }> {
    
    try {
      // Step 1: LLaMA provides analytical insight
      const analysisPrompt = `${systemPrompt}\n\nTASK: Provide a structured therapeutic analysis of this situation. Focus on patterns, insights, and recommendations. Be clinical and thorough.`;
      
      const analysis = await this.processWithLLaMA(analysisPrompt, context.userMessage, 'hybrid-analysis');

      // Step 2: Claude generates empathetic response incorporating LLaMA's analysis
      const empathyPrompt = `${systemPrompt}\n\nANALYTICAL INSIGHTS: ${analysis.response}\n\nTASK: Create a warm, empathetic response that incorporates these insights while maintaining your supportive therapeutic tone. Make it conversational and caring.`;

      const empathicResponse = await this.processWithClaude(empathyPrompt, context.userMessage, 'hybrid-empathy');

      return {
        response: empathicResponse.response,
        modelUsed: 'Hybrid-LLaMA-Claude',
        confidence: 0.92
      };

    } catch (error) {
      console.error('[EnhancedOrchestrator] Hybrid processing failed:', error);
      // Fallback to Claude alone
      return await this.processWithClaude(systemPrompt, context.userMessage, 'claude-fallback');
    }
  }

  /**
   * Initialize user context with caching
   */
  private async initializeUserContext(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        this.currentUserId = user.id;

        // Check if we need to start a new session
        if (!this.currentSessionId) {
          this.currentSessionId = `session_${user.id}_${Date.now()}`;
          
          // Preload user memories for performance
          await memoryCacheService.preloadUserMemories(user.id, this.currentSessionId);
        }

        console.log(`[EnhancedOrchestrator] Initialized context for user ${user.email}`);
      }
    } catch (error) {
      console.error('[EnhancedOrchestrator] Error initializing user context:', error);
    }
  }

  /**
   * Store message with database persistence
   */
  private async storeMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    // Add to local history
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });

    // Store in database
    if (this.currentUserId && this.currentSessionId) {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            session_id: this.currentSessionId,
            user_id: this.currentUserId,
            role: role === 'assistant' ? 'luma' : role,
            content,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('[EnhancedOrchestrator] Error storing message:', error);
        }
      } catch (error) {
        console.error('[EnhancedOrchestrator] Database error:', error);
      }
    }

    // Keep local history manageable
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-40);
    }
  }

  /**
   * Track engagement for both messages
   */
  private async trackEngagement(content: string, type: 'user' | 'assistant'): Promise<void> {
    if (this.currentUserId) {
      await engagementTracker.trackMessage(
        this.currentUserId,
        this.currentSessionId || 'unknown',
        content,
        type
      );
    }
  }

  /**
   * Log enhanced performance metrics
   */
  private logEnhancedMetrics(metrics: EnhancedResponseMetrics): void {
    console.log('[EnhancedOrchestrator] Performance Metrics:', {
      totalTime: `${metrics.totalResponseTime}ms`,
      breakdown: {
        memoryRetrieval: `${metrics.memoryRetrievalTime}ms`,
        llmProcessing: `${metrics.llmProcessingTime}ms`,
        cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`
      },
      quality: {
        score: metrics.qualityScore.toFixed(2),
        structureCompliant: metrics.structureCompliance,
        engagementLevel: metrics.engagementLevel
      },
      context: {
        memoriesUsed: metrics.memoriesUsed,
        intent: metrics.intentDetected,
        modelUsed: metrics.modelUsed
      }
    });

    // Performance alerts
    if (metrics.totalResponseTime > EnhancedIntelligentOrchestrator.TARGET_RESPONSE_TIME * 1.5) {
      console.warn(`[EnhancedOrchestrator] SLOW RESPONSE: ${metrics.totalResponseTime}ms (target: ${EnhancedIntelligentOrchestrator.TARGET_RESPONSE_TIME}ms)`);
    }

    if (metrics.qualityScore < EnhancedIntelligentOrchestrator.MIN_QUALITY_SCORE) {
      console.warn(`[EnhancedOrchestrator] LOW QUALITY: ${metrics.qualityScore} (target: ${EnhancedIntelligentOrchestrator.MIN_QUALITY_SCORE})`);
    }
  }

  /**
   * Enhanced fallback response with context
   */
  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('crisis') || message.includes('emergency') || message.includes('hurt myself')) {
      return "I'm concerned about what you're sharing. Please reach out to a crisis helpline or trusted person immediately. In the US, you can call 988 for the Suicide & Crisis Lifeline. Your safety is the most important thing right now, and there are people who want to help.";
    }
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hi there! I'm experiencing some technical adjustments, but I'm still here to support you. What's on your mind today?";
    }
    
    if (message.includes('sad') || message.includes('upset')) {
      return "I can sense you're going through something difficult right now. Even though I'm having some connection challenges, I want you to know that your feelings are valid and I'm here with you. What would help most right now?";
    }
    
    return "I'm working through some technical updates, but I'm still here to listen and support you. Could you share what's most important to you right now?";
  }

  /**
   * Public interface methods for compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      await this.initializeUserContext();
      return true;
    } catch (error) {
      console.error('[EnhancedOrchestrator] Initialization failed:', error);
      return false;
    }
  }

  async startNewSession(): Promise<void> {
    this.currentSessionId = null;
    this.conversationHistory = [];
    this.processingPipeline = [];
    await this.initializeUserContext();
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.processingPipeline = [];
  }

  /**
   * Get processing pipeline for debugging
   */
  getProcessingPipeline(): ProcessingPipeline[] {
    return [...this.processingPipeline];
  }

  /**
   * Get performance metrics for system monitoring
   */
  getPerformanceMetrics(): {
    cacheHitRate: number;
    averageResponseTime: number;
    memorySystemActive: boolean;
    engagementLevel: string;
    lastProcessingPipeline?: ProcessingPipeline[];
  } {
    // Get cache stats
    const cacheStats = memoryCacheService.getCacheStats();
    
    // Calculate average response time from recent pipeline executions
    const recentPipelines = this.processingPipeline.slice(-10);
    const avgResponseTime = recentPipelines.length > 0
      ? recentPipelines.reduce((sum, stage) => sum + (stage.duration || 0), 0) / recentPipelines.length
      : 0;

    return {
      cacheHitRate: cacheStats.hitRate,
      averageResponseTime: avgResponseTime,
      memorySystemActive: true, // System is active if orchestrator is running
      engagementLevel: 'medium', // Default, could be enhanced with engagement tracker data
      lastProcessingPipeline: [...this.processingPipeline]
    };
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    return {
      cacheStats: memoryCacheService.getCacheStats(),
      queueStats: memoryExtractionQueue.getQueueStats(),
      conversationLength: this.conversationHistory.length,
      currentSession: this.currentSessionId,
      lastProcessingPipeline: this.processingPipeline
    };
  }
}

// Export singleton instance
export const enhancedIntelligentOrchestrator = new EnhancedIntelligentOrchestrator();