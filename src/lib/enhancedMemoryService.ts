// Enhanced Memory Service with Real-time Retrieval and Intelligent Processing
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface Memory {
  id: string;
  content: string;
  type: 'insight' | 'preference' | 'trigger' | 'progress' | 'relationship' | 'goal';
  relevance_score: number;
  created_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class EnhancedMemoryService {
  private static readonly LLAMA_API_URL = 'https://api.together.xyz/v1/chat/completions';
  private static readonly LLAMA_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  /**
   * Fast retrieval of relevant memories for real-time response enhancement
   */
  async getRelevantMemories(userId: string, currentMessage: string, limit: number = 5): Promise<Memory[]> {
    const startTime = Date.now();
    
    try {
      // Extract key topics and emotional context from current message
      const messageKeywords = this.extractKeywords(currentMessage);
      const emotionalContext = this.detectEmotionalContext(currentMessage);

      console.log(`[EnhancedMemory] Retrieving memories for: "${currentMessage.substring(0, 50)}..."`);
      console.log(`[EnhancedMemory] Keywords: ${messageKeywords.join(', ')}`);

      // Query memories with relevance scoring
      const { data: memories, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .or(
          messageKeywords.map(keyword => `content.ilike.%${keyword}%`).join(',') + 
          `,type.eq.${emotionalContext}`
        )
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter by relevance

      if (error) {
        console.error('[EnhancedMemory] Error retrieving memories:', error);
        return [];
      }

      // Score and filter memories by relevance
      const scoredMemories = (memories || [])
        .map(memory => ({
          ...memory,
          relevance_score: this.calculateRelevanceScore(currentMessage, memory.content, memory.type)
        }))
        .filter(memory => memory.relevance_score > 0.3)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, limit);

      const retrievalTime = Date.now() - startTime;
      console.log(`[EnhancedMemory] Retrieved ${scoredMemories.length} memories in ${retrievalTime}ms`);

      return scoredMemories;
    } catch (error) {
      console.error('[EnhancedMemory] Error in getRelevantMemories:', error);
      return [];
    }
  }

  /**
   * Extract key topics and themes from user message
   */
  private extractKeywords(message: string): string[] {
    const text = message.toLowerCase();
    const keywords: string[] = [];

    // Emotional keywords
    const emotions = ['sad', 'happy', 'angry', 'anxious', 'worried', 'excited', 'frustrated', 'lonely', 'hopeful'];
    emotions.forEach(emotion => {
      if (text.includes(emotion)) keywords.push(emotion);
    });

    // Relationship keywords
    const relationships = ['family', 'friend', 'partner', 'work', 'boss', 'colleague', 'parent', 'child'];
    relationships.forEach(rel => {
      if (text.includes(rel)) keywords.push(rel);
    });

    // Life domains
    const domains = ['job', 'career', 'health', 'money', 'relationship', 'stress', 'goal', 'dream'];
    domains.forEach(domain => {
      if (text.includes(domain)) keywords.push(domain);
    });

    return keywords;
  }

  /**
   * Detect emotional context for memory filtering
   */
  private detectEmotionalContext(message: string): string {
    const text = message.toLowerCase();
    
    if (text.includes('goal') || text.includes('want to') || text.includes('planning')) return 'goal';
    if (text.includes('trigger') || text.includes('upset') || text.includes('angry')) return 'trigger';
    if (text.includes('progress') || text.includes('better') || text.includes('improve')) return 'progress';
    if (text.includes('family') || text.includes('friend') || text.includes('partner')) return 'relationship';
    
    return 'insight';
  }

  /**
   * Calculate relevance score between current message and stored memory
   */
  private calculateRelevanceScore(currentMessage: string, memoryContent: string, memoryType: string): number {
    const current = currentMessage.toLowerCase();
    const memory = memoryContent.toLowerCase();
    
    let score = 0;

    // Exact phrase matches
    const currentWords = current.split(' ');
    const memoryWords = memory.split(' ');
    const commonWords = currentWords.filter(word => memoryWords.includes(word) && word.length > 3);
    score += commonWords.length * 0.2;

    // Semantic similarity (simple implementation)
    const currentKeywords = this.extractKeywords(current);
    const memoryKeywords = this.extractKeywords(memory);
    const sharedKeywords = currentKeywords.filter(keyword => memoryKeywords.includes(keyword));
    score += sharedKeywords.length * 0.3;

    // Memory type relevance
    const contextType = this.detectEmotionalContext(current);
    if (memoryType === contextType) score += 0.4;

    // Recent memories get slight boost
    score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Asynchronous memory extraction and storage using LLaMA 3.1 70B
   */
  async updateLongTermMemoryAsync(userId: string, sessionId: string, conversation: ConversationMessage[]): Promise<void> {
    try {
      console.log(`[EnhancedMemory] Starting async memory extraction for user ${userId}`);
      
      // Don't wait for this - run in background
      this.processMemoryExtraction(userId, sessionId, conversation).catch(error => {
        console.error('[EnhancedMemory] Background memory processing failed:', error);
      });

      console.log('[EnhancedMemory] Async memory extraction initiated');
    } catch (error) {
      console.error('[EnhancedMemory] Error initiating memory extraction:', error);
    }
  }

  /**
   * Internal memory processing with LLaMA
   */
  private async processMemoryExtraction(userId: string, sessionId: string, conversation: ConversationMessage[]): Promise<void> {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('[EnhancedMemory] LLaMA API key not configured');
      return;
    }

    try {
      // Format conversation for LLaMA
      const conversationText = conversation
        .slice(-12) // Use last 12 messages for context
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Memory extraction prompt
      const extractionPrompt = `You are an expert therapeutic AI analyzing a conversation to extract key insights about the user. 

CONVERSATION:
${conversationText}

Extract and categorize important insights about this person. Focus on:
1. Personal values and coping preferences
2. Relationship patterns and family dynamics  
3. Work/life situation context
4. Emotional triggers or boundaries
5. Goals, aspirations, or areas for growth
6. Therapeutic progress or breakthroughs

For each insight, provide:
- Type: insight/preference/trigger/progress/relationship/goal
- Content: Clear, specific insight (2-3 sentences max)

Format as JSON array:
[{"type": "insight", "content": "User prefers direct communication and struggles with ambiguity in relationships"}]

Only extract NEW insights not previously captured. Be specific and actionable.`;

      const response = await fetch(EnhancedMemoryService.LLAMA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EnhancedMemoryService.LLAMA_MODEL,
          messages: [
            { role: 'system', content: 'You are an expert at extracting therapeutic insights from conversations. Return valid JSON only.' },
            { role: 'user', content: extractionPrompt }
          ],
          max_tokens: 300,
          temperature: 0.3,
          top_p: 0.9,
        })
      });

      if (!response.ok) {
        throw new Error(`LLaMA API error: ${response.status}`);
      }

      const data = await response.json();
      const extractedContent = data.choices[0]?.message?.content || '';

      // Parse extracted memories
      const memories = this.parseExtractedMemories(extractedContent);
      
      if (memories.length > 0) {
        await this.storeExtractedMemories(userId, sessionId, memories);
        console.log(`[EnhancedMemory] Extracted and stored ${memories.length} memories`);
      }

    } catch (error) {
      console.error('[EnhancedMemory] Error in memory extraction:', error);
    }
  }

  /**
   * Parse LLaMA output into structured memories
   */
  private parseExtractedMemories(content: string): Array<{type: string, content: string}> {
    try {
      // Try to find JSON in the response
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.warn('[EnhancedMemory] No JSON found in LLaMA response');
        return [];
      }

      const jsonString = content.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonString);
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[EnhancedMemory] Error parsing extracted memories:', error);
      return [];
    }
  }

  /**
   * Store extracted memories in database
   */
  private async storeExtractedMemories(userId: string, sessionId: string, memories: Array<{type: string, content: string}>): Promise<void> {
    try {
      const memoriesToInsert = memories.map(memory => ({
        user_id: userId,
        session_id: sessionId,
        type: memory.type,
        content: memory.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_memories')
        .insert(memoriesToInsert);

      if (error) {
        console.error('[EnhancedMemory] Error storing memories:', error);
      }
    } catch (error) {
      console.error('[EnhancedMemory] Error in storeExtractedMemories:', error);
    }
  }

  /**
   * Get cross-session memories for continuity
   */
  async getCrossSessionMemories(userId: string, limit: number = 10): Promise<Memory[]> {
    try {
      const { data: memories, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['progress', 'goal', 'preference', 'trigger'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[EnhancedMemory] Error retrieving cross-session memories:', error);
        return [];
      }

      return memories || [];
    } catch (error) {
      console.error('[EnhancedMemory] Error in getCrossSessionMemories:', error);
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
      console.error('[EnhancedMemory] Error starting session:', error);
      return null;
    }
  }

  async addMessage(sessionId: string, userId: string, role: string, content: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role,
          content,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('[EnhancedMemory] Error adding message:', error);
    }
  }

  async getRecentMessages(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return error ? [] : (data || []).reverse();
    } catch (error) {
      console.error('[EnhancedMemory] Error getting recent messages:', error);
      return [];
    }
  }
}

// Export singleton instance
export const enhancedMemoryService = new EnhancedMemoryService();