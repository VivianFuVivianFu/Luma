// Memory-First Service - Real-time retrieval with cross-session continuity
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface Memory {
  id: string;
  user_id: string;
  session_id: string;
  content: string;
  type: 'insight' | 'preference' | 'trigger' | 'progress' | 'relationship' | 'goal' | 'crisis';
  theme: string;
  relevance_score?: number;
  created_at: string;
  session_context?: string;
}

export interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  session_id?: string;
  user_id?: string;
}

export interface MemoryRetrievalResult {
  currentSessionMemories: Memory[];
  crossSessionMemories: Memory[];
  criticalInsights: Memory[];
  totalRetrievalTime: number;
}

export class MemoryFirstService {
  private static readonly MEMORY_CACHE = new Map<string, Memory[]>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Core memory retrieval with cross-session continuity
   */
  async getRelevantMemories(
    userId: string, 
    currentMessage: string, 
    sessionId?: string,
    limit: number = 8
  ): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[MemoryFirst] Retrieving memories for: "${currentMessage.substring(0, 60)}..."`);

      // Extract semantic markers for memory matching
      const semanticMarkers = this.extractSemanticMarkers(currentMessage);
      const emotionalContext = this.analyzeEmotionalContext(currentMessage);
      const priorityLevel = this.assessPriorityLevel(currentMessage);

      console.log(`[MemoryFirst] Semantic markers: ${semanticMarkers.keywords.join(', ')}`);
      console.log(`[MemoryFirst] Emotional context: ${emotionalContext}, Priority: ${priorityLevel}`);

      // Parallel memory retrieval for performance
      const [currentSessionMemories, crossSessionMemories, criticalInsights] = await Promise.all([
        this.getCurrentSessionMemories(userId, sessionId, semanticMarkers, limit / 3),
        this.getCrossSessionMemories(userId, semanticMarkers, emotionalContext, limit / 2),
        this.getCriticalInsights(userId, priorityLevel, Math.ceil(limit / 4))
      ]);

      // Score and rank all memories by relevance
      const scoredMemories = [
        ...this.scoreMemories(currentSessionMemories, currentMessage, 1.2), // Boost current session
        ...this.scoreMemories(crossSessionMemories, currentMessage, 1.0),
        ...this.scoreMemories(criticalInsights, currentMessage, 1.5) // Boost critical insights
      ];

      // Select top memories avoiding duplicates
      const selectedMemories = this.deduplicateMemories(scoredMemories)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, limit);

      const retrievalTime = Date.now() - startTime;
      console.log(`[MemoryFirst] Retrieved ${selectedMemories.length} memories in ${retrievalTime}ms`);

      return {
        currentSessionMemories: selectedMemories.filter(m => m.session_id === sessionId),
        crossSessionMemories: selectedMemories.filter(m => m.session_id !== sessionId),
        criticalInsights: selectedMemories.filter(m => m.type === 'crisis' || (m.relevance_score || 0) > 0.8),
        totalRetrievalTime: retrievalTime
      };

    } catch (error) {
      console.error('[MemoryFirst] Error in memory retrieval:', error);
      return {
        currentSessionMemories: [],
        crossSessionMemories: [],
        criticalInsights: [],
        totalRetrievalTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract semantic markers for intelligent memory matching
   */
  private extractSemanticMarkers(message: string): {
    keywords: string[];
    emotions: string[];
    relationships: string[];
    lifeDomains: string[];
    actionWords: string[];
  } {
    const text = message.toLowerCase();
    
    const emotionWords = ['sad', 'happy', 'angry', 'anxious', 'worried', 'excited', 'frustrated', 'lonely', 'hopeful', 'overwhelmed', 'conflicted', 'peaceful'];
    const relationshipWords = ['family', 'friend', 'partner', 'spouse', 'work', 'boss', 'colleague', 'parent', 'child', 'sibling', 'mother', 'father'];
    const lifeDomainWords = ['job', 'career', 'health', 'money', 'finance', 'relationship', 'stress', 'goal', 'dream', 'home', 'school', 'therapy'];
    const actionWords = ['change', 'improve', 'stop', 'start', 'learn', 'understand', 'decide', 'choose', 'help', 'support', 'cope'];

    const extractMatches = (words: string[], text: string) => 
      words.filter(word => text.includes(word));

    return {
      keywords: text.split(' ').filter(word => word.length > 3),
      emotions: extractMatches(emotionWords, text),
      relationships: extractMatches(relationshipWords, text),
      lifeDomains: extractMatches(lifeDomainWords, text),
      actionWords: extractMatches(actionWords, text)
    };
  }

  /**
   * Analyze emotional context for memory filtering
   */
  private analyzeEmotionalContext(message: string): string {
    const text = message.toLowerCase();
    
    // Crisis indicators
    if (text.includes('harm') || text.includes('hurt') || text.includes('suicide') || text.includes('crisis')) {
      return 'crisis';
    }
    
    // Therapeutic progress indicators
    if (text.includes('better') || text.includes('progress') || text.includes('improvement') || text.includes('breakthrough')) {
      return 'progress';
    }
    
    // Relationship focus
    if (text.includes('relationship') || text.includes('family') || text.includes('partner') || text.includes('friend')) {
      return 'relationship';
    }
    
    // Goal setting/achievement
    if (text.includes('goal') || text.includes('want to') || text.includes('planning') || text.includes('future')) {
      return 'goal';
    }
    
    // Emotional triggers
    if (text.includes('trigger') || text.includes('upset') || text.includes('angry') || text.includes('anxious')) {
      return 'trigger';
    }
    
    return 'insight';
  }

  /**
   * Assess priority level for memory retrieval
   */
  private assessPriorityLevel(message: string): 'low' | 'medium' | 'high' | 'critical' {
    const text = message.toLowerCase();
    
    // Critical priority indicators
    const criticalIndicators = ['crisis', 'emergency', 'harm', 'suicide', 'can\'t cope'];
    if (criticalIndicators.some(indicator => text.includes(indicator))) {
      return 'critical';
    }
    
    // High priority indicators
    const highIndicators = ['overwhelmed', 'breaking point', 'desperate', 'lost', 'hopeless'];
    if (highIndicators.some(indicator => text.includes(indicator))) {
      return 'high';
    }
    
    // Medium priority indicators
    const mediumIndicators = ['struggle', 'difficult', 'challenging', 'confused', 'stuck'];
    if (mediumIndicators.some(indicator => text.includes(indicator))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get memories from current session
   */
  private async getCurrentSessionMemories(
    userId: string, 
    sessionId: string | undefined, 
    markers: any, 
    limit: number
  ): Promise<Memory[]> {
    if (!sessionId) return [];

    try {
      let query = supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;
      
      if (error) {
        console.error('[MemoryFirst] Error fetching current session memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[MemoryFirst] Error in getCurrentSessionMemories:', error);
      return [];
    }
  }

  /**
   * Get cross-session memories with theme linking
   */
  private async getCrossSessionMemories(
    userId: string, 
    markers: any, 
    emotionalContext: string, 
    limit: number
  ): Promise<Memory[]> {
    try {
      // Build dynamic filter based on semantic markers
      const themeFilters = [
        ...markers.emotions,
        ...markers.relationships,
        ...markers.lifeDomains,
        emotionalContext
      ].filter(Boolean);

      if (themeFilters.length === 0) return [];

      // Query with OR conditions for themes and content matching
      const orConditions = [
        ...themeFilters.map((theme: string) => `theme.ilike.%${theme}%`),
        ...themeFilters.map((theme: string) => `content.ilike.%${theme}%`),
        `type.eq.${emotionalContext}`
      ];

      const { data, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .or(orConditions.join(','))
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter by relevance

      if (error) {
        console.error('[MemoryFirst] Error fetching cross-session memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[MemoryFirst] Error in getCrossSessionMemories:', error);
      return [];
    }
  }

  /**
   * Get critical insights for high-priority situations
   */
  private async getCriticalInsights(userId: string, priorityLevel: string, limit: number): Promise<Memory[]> {
    if (priorityLevel === 'low') return [];

    try {
      const criticalTypes = priorityLevel === 'critical' 
        ? ['crisis', 'trigger', 'progress'] 
        : ['trigger', 'preference', 'progress'];

      const { data, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .in('type', criticalTypes)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[MemoryFirst] Error fetching critical insights:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[MemoryFirst] Error in getCriticalInsights:', error);
      return [];
    }
  }

  /**
   * Score memories by relevance to current message
   */
  private scoreMemories(memories: Memory[], currentMessage: string, boostFactor: number = 1.0): Memory[] {
    return memories.map(memory => ({
      ...memory,
      relevance_score: this.calculateRelevanceScore(currentMessage, memory) * boostFactor
    }));
  }

  /**
   * Advanced relevance scoring algorithm
   */
  private calculateRelevanceScore(currentMessage: string, memory: Memory): number {
    const current = currentMessage.toLowerCase();
    const memoryContent = memory.content.toLowerCase();
    
    let score = 0;

    // Direct keyword matching (highest weight)
    const currentWords = current.split(' ').filter(word => word.length > 3);
    const memoryWords = memoryContent.split(' ').filter(word => word.length > 3);
    const commonWords = currentWords.filter(word => memoryWords.includes(word));
    score += commonWords.length * 0.4;

    // Semantic theme matching
    const currentMarkers = this.extractSemanticMarkers(current);
    const memoryMarkers = this.extractSemanticMarkers(memoryContent);
    
    // Emotion overlap
    const emotionOverlap = currentMarkers.emotions.filter(e => memoryMarkers.emotions.includes(e));
    score += emotionOverlap.length * 0.3;

    // Life domain overlap
    const domainOverlap = currentMarkers.lifeDomains.filter(d => memoryMarkers.lifeDomains.includes(d));
    score += domainOverlap.length * 0.2;

    // Memory type relevance
    const currentContext = this.analyzeEmotionalContext(current);
    if (memory.type === currentContext) score += 0.3;

    // Recency boost (newer memories slightly preferred)
    const daysSinceCreated = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) score += 0.1;

    // Critical insight boost
    if (memory.type === 'crisis' || memory.type === 'trigger') score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Remove duplicate memories while preserving highest scores
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const seen = new Map<string, Memory>();
    
    memories.forEach(memory => {
      const key = `${memory.content.substring(0, 50)}_${memory.type}`;
      const existing = seen.get(key);
      
      if (!existing || (memory.relevance_score || 0) > (existing.relevance_score || 0)) {
        seen.set(key, memory);
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Asynchronous memory extraction and storage
   */
  async updateLongTermMemoryAsync(
    userId: string, 
    sessionId: string, 
    conversation: ConversationMessage[]
  ): Promise<void> {
    try {
      console.log(`[MemoryFirst] Starting async memory extraction for user ${userId}`);
      
      // Process in background without blocking
      this.processMemoryExtraction(userId, sessionId, conversation).catch(error => {
        console.error('[MemoryFirst] Background memory processing failed:', error);
      });
      
    } catch (error) {
      console.error('[MemoryFirst] Error initiating memory extraction:', error);
    }
  }

  /**
   * LLaMA-powered memory extraction with structured output
   */
  private async processMemoryExtraction(
    userId: string, 
    sessionId: string, 
    conversation: ConversationMessage[]
  ): Promise<void> {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('[MemoryFirst] Together API key not configured');
      return;
    }

    try {
      // Format conversation for analysis
      const conversationText = conversation
        .slice(-15) // Use last 15 messages for rich context
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const extractionPrompt = `Analyze this therapeutic conversation and extract key insights about the user. Focus on patterns, preferences, triggers, and growth indicators.

CONVERSATION:
${conversationText}

Extract structured insights in these categories:
1. INSIGHTS: New realizations or patterns about the user's personality, values, or behavior
2. PREFERENCES: How they prefer to communicate, cope, or be supported
3. TRIGGERS: What upsets them, causes stress, or creates emotional reactions
4. PROGRESS: Signs of growth, improvement, or therapeutic breakthroughs
5. RELATIONSHIPS: Patterns in their family, work, or social dynamics
6. GOALS: Things they want to achieve, change, or work toward

For each insight, provide:
- Type: one of [insight, preference, trigger, progress, relationship, goal]
- Content: Clear, specific insight (2-3 sentences max)
- Theme: Single keyword representing the main theme

Return ONLY a JSON array with no additional text:
[{"type": "insight", "content": "User processes emotions better when given specific frameworks rather than open-ended questions", "theme": "communication"}]

Extract only NEW insights not previously captured. Be specific and actionable.`;

      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            { role: 'system', content: 'You are an expert therapeutic AI that extracts precise insights from conversations. Return only valid JSON.' },
            { role: 'user', content: extractionPrompt }
          ],
          max_tokens: 400,
          temperature: 0.2,
          top_p: 0.9,
        })
      });

      if (!response.ok) {
        throw new Error(`LLaMA API error: ${response.status}`);
      }

      const data = await response.json();
      const extractedContent = data.choices[0]?.message?.content || '';

      // Parse and store extracted memories
      const memories = this.parseExtractedMemories(extractedContent);
      
      if (memories.length > 0) {
        await this.storeExtractedMemories(userId, sessionId, memories);
        console.log(`[MemoryFirst] Extracted and stored ${memories.length} new memories`);
      }

    } catch (error) {
      console.error('[MemoryFirst] Error in memory extraction:', error);
    }
  }

  /**
   * Parse LLaMA output into structured memories
   */
  private parseExtractedMemories(content: string): Array<{type: string, content: string, theme: string}> {
    try {
      // Clean the response and find JSON
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonStart = cleanContent.indexOf('[');
      const jsonEnd = cleanContent.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.warn('[MemoryFirst] No JSON array found in LLaMA response');
        return [];
      }

      const jsonString = cleanContent.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonString);
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[MemoryFirst] Error parsing extracted memories:', error);
      // Try to extract insights from text format as fallback
      return this.fallbackParseMemories(content);
    }
  }

  /**
   * Fallback memory parsing for non-JSON responses
   */
  private fallbackParseMemories(content: string): Array<{type: string, content: string, theme: string}> {
    const memories: Array<{type: string, content: string, theme: string}> = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    let currentType = 'insight';
    for (const line of lines) {
      if (line.toLowerCase().includes('insight')) currentType = 'insight';
      else if (line.toLowerCase().includes('preference')) currentType = 'preference';
      else if (line.toLowerCase().includes('trigger')) currentType = 'trigger';
      else if (line.toLowerCase().includes('progress')) currentType = 'progress';
      else if (line.toLowerCase().includes('relationship')) currentType = 'relationship';
      else if (line.toLowerCase().includes('goal')) currentType = 'goal';
      
      if (line.includes(':') && line.length > 20) {
        const content = line.split(':').slice(1).join(':').trim();
        if (content.length > 10) {
          memories.push({
            type: currentType,
            content: content,
            theme: currentType
          });
        }
      }
    }
    
    return memories;
  }

  /**
   * Store extracted memories in database
   */
  private async storeExtractedMemories(
    userId: string, 
    sessionId: string, 
    memories: Array<{type: string, content: string, theme: string}>
  ): Promise<void> {
    try {
      const memoriesToInsert = memories.map(memory => ({
        user_id: userId,
        session_id: sessionId,
        type: memory.type,
        content: memory.content,
        theme: memory.theme,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_memories')
        .insert(memoriesToInsert);

      if (error) {
        console.error('[MemoryFirst] Error storing memories:', error);
      }
    } catch (error) {
      console.error('[MemoryFirst] Error in storeExtractedMemories:', error);
    }
  }

  /**
   * Link cross-session memories for continuity
   */
  async linkCrossSessionMemories(userId: string, currentSessionId: string): Promise<string[]> {
    try {
      // Get recent session themes to link
      const { data: recentSessions, error } = await supabase
        .from('user_memories')
        .select('theme, type')
        .eq('user_id', userId)
        .neq('session_id', currentSessionId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !recentSessions) return [];

      // Extract common themes
      const themeCount: {[key: string]: number} = {};
      recentSessions.forEach(session => {
        themeCount[session.theme] = (themeCount[session.theme] || 0) + 1;
      });

      // Return most common themes as links
      return Object.entries(themeCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([theme]) => theme);

    } catch (error) {
      console.error('[MemoryFirst] Error linking cross-session memories:', error);
      return [];
    }
  }

  /**
   * Legacy compatibility methods
   */
  async startSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({ 
          user_id: userId, 
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      return error ? null : data.id;
    } catch (error) {
      console.error('[MemoryFirst] Error starting session:', error);
      return null;
    }
  }
}

// Export singleton
export const memoryFirstService = new MemoryFirstService();