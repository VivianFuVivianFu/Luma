// Enhanced Memory Retrieval with Semantic Similarity and Clustering
// Replaces basic keyword matching with embedding-based similarity search

import { supabase } from './supabase';
import { Memory } from './memoryFirstService';

export interface SemanticMemoryResult {
  memories: Memory[];
  clusters: MemoryCluster[];
  retrievalTime: number;
  similarityScores: Record<string, number>;
  fallbackUsed: boolean;
}

export interface MemoryCluster {
  id: string;
  theme: string;
  memories: Memory[];
  averageRelevance: number;
  sessionSpan: number; // Number of sessions this cluster spans
  lastAccessed: Date;
}

export interface EmbeddingCache {
  content: string;
  embedding: number[];
  timestamp: Date;
  usage_count: number;
}

export class EnhancedMemoryRetrieval {
  private static readonly SIMILARITY_THRESHOLD = 0.75;
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CLUSTERS = 5;
  private embeddingCache = new Map<string, EmbeddingCache>();
  
  /**
   * Main memory retrieval with semantic similarity and clustering
   */
  async getSemanticMemories(
    userId: string,
    currentMessage: string,
    sessionId?: string,
    limit: number = 8
  ): Promise<SemanticMemoryResult> {
    const startTime = Date.now();
    const fallbackUsed = false;
    
    try {
      console.log(`[SemanticMemory] Retrieving for: "${currentMessage.substring(0, 50)}..."`);

      // Step 1: Get or generate embedding for current message
      const messageEmbedding = await this.getMessageEmbedding(currentMessage);
      
      if (!messageEmbedding) {
        console.warn('[SemanticMemory] Embedding generation failed, falling back to keyword matching');
        return await this.fallbackToKeywordRetrieval(userId, currentMessage, sessionId, limit);
      }

      // Step 2: Retrieve memories with cached embeddings
      const memoriesWithEmbeddings = await this.getMemoriesWithEmbeddings(userId, sessionId);
      
      // Step 3: Calculate semantic similarity scores
      const scoredMemories = this.calculateSimilarityScores(memoriesWithEmbeddings, messageEmbedding);
      
      // Step 4: Filter by similarity threshold and select top memories
      const relevantMemories = scoredMemories
        .filter(memory => (memory.relevance_score || 0) >= EnhancedMemoryRetrieval.SIMILARITY_THRESHOLD)
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, limit);

      // Step 5: Group memories into thematic clusters
      const clusters = await this.clusterMemories(relevantMemories, userId);

      // Step 6: Build similarity scores map
      const similarityScores: Record<string, number> = {};
      relevantMemories.forEach(memory => {
        similarityScores[memory.id] = memory.relevance_score || 0;
      });

      const retrievalTime = Date.now() - startTime;
      
      console.log(`[SemanticMemory] Retrieved ${relevantMemories.length} memories in ${retrievalTime}ms using embeddings`);
      
      return {
        memories: relevantMemories,
        clusters,
        retrievalTime,
        similarityScores,
        fallbackUsed
      };

    } catch (error) {
      console.error('[SemanticMemory] Error in semantic retrieval:', error);
      return await this.fallbackToKeywordRetrieval(userId, currentMessage, sessionId, limit);
    }
  }

  /**
   * Generate embedding for message with caching
   */
  private async getMessageEmbedding(message: string): Promise<number[] | null> {
    const cacheKey = this.getCacheKey(message);
    
    // Check cache first
    if (this.embeddingCache.has(cacheKey)) {
      const cached = this.embeddingCache.get(cacheKey)!;
      
      // Check if cache is still valid
      if (Date.now() - cached.timestamp.getTime() < EnhancedMemoryRetrieval.CACHE_TTL) {
        cached.usage_count++;
        console.log('[SemanticMemory] Using cached embedding');
        return cached.embedding;
      } else {
        this.embeddingCache.delete(cacheKey);
      }
    }

    try {
      // For now, we'll use a simple approach with OpenAI-compatible API
      // In production, you'd use OpenAI's text-embedding-3-small or similar
      const embedding = await this.generateEmbedding(message);
      
      if (embedding) {
        // Cache the embedding
        this.embeddingCache.set(cacheKey, {
          content: message,
          embedding,
          timestamp: new Date(),
          usage_count: 1
        });
      }
      
      return embedding;
      
    } catch (error) {
      console.error('[SemanticMemory] Embedding generation failed:', error);
      return null;
    }
  }

  /**
   * Generate embedding using OpenAI-compatible service
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    // For demo purposes, we'll create a mock embedding based on text features
    // In production, replace with actual OpenAI API call or similar service
    
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[SemanticMemory] No OpenAI API key, using mock embeddings');
      return this.generateMockEmbedding(text);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Truncate to model limits
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0]?.embedding || null;
      
    } catch (error) {
      console.error('[SemanticMemory] OpenAI embedding error:', error);
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generate mock embedding for development/fallback
   */
  private generateMockEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // Use 384 dimensions like sentence-transformers
    
    // Create simple feature-based embedding
    const emotionWords = ['sad', 'happy', 'angry', 'anxious', 'excited', 'frustrated', 'hopeful'];
    const relationshipWords = ['family', 'friend', 'partner', 'work', 'relationship'];
    const progressWords = ['better', 'progress', 'improve', 'goal', 'change'];
    
    // Set embedding dimensions based on content
    emotionWords.forEach((word, idx) => {
      if (words.includes(word)) {
        embedding[idx] = 1.0;
        embedding[idx + 50] = 0.8; // Add secondary signals
      }
    });
    
    relationshipWords.forEach((word, idx) => {
      if (words.includes(word)) {
        embedding[idx + 100] = 1.0;
        embedding[idx + 150] = 0.7;
      }
    });
    
    progressWords.forEach((word, idx) => {
      if (words.includes(word)) {
        embedding[idx + 200] = 1.0;
        embedding[idx + 250] = 0.9;
      }
    });
    
    // Add text length and structure features
    embedding[300] = Math.min(text.length / 1000, 1.0); // Length feature
    embedding[301] = (text.match(/\?/g) || []).length / 10; // Question feature
    embedding[302] = (text.match(/!/g) || []).length / 10; // Emotion feature
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  /**
   * Retrieve memories with their stored embeddings
   */
  private async getMemoriesWithEmbeddings(userId: string, _sessionId?: string) {
    const query = supabase
      .from('user_memories')
      .select('id, user_id, session_id, content, type, theme, created_at, embedding')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // Get more memories for better semantic matching

    const { data: memories } = await query;
    
    return memories || [];
  }

  /**
   * Calculate cosine similarity between message and memory embeddings
   */
  private calculateSimilarityScores(memories: any[], messageEmbedding: number[]): Memory[] {
    return memories.map(memory => {
      let similarity = 0;
      
      if (memory.embedding && Array.isArray(memory.embedding)) {
        similarity = this.cosineSimilarity(messageEmbedding, memory.embedding);
      } else {
        // Fallback to keyword-based similarity if no embedding
        similarity = this.keywordSimilarity(memory.content, messageEmbedding);
      }
      
      return {
        ...memory,
        relevance_score: similarity
      };
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Fallback keyword similarity when embedding unavailable
   */
  private keywordSimilarity(content: string, messageEmbedding: number[]): number {
    // Extract semantic meaning from mock embedding features
    const hasEmotionalContent = messageEmbedding.slice(0, 50).some(val => val > 0.5);
    const hasRelationshipContent = messageEmbedding.slice(100, 150).some(val => val > 0.5);
    const hasProgressContent = messageEmbedding.slice(200, 250).some(val => val > 0.5);
    
    const contentLower = content.toLowerCase();
    let similarity = 0;
    
    if (hasEmotionalContent && /\b(sad|happy|angry|anxious|excited|frustrated|hopeful)\b/.test(contentLower)) {
      similarity += 0.3;
    }
    
    if (hasRelationshipContent && /\b(family|friend|partner|work|relationship)\b/.test(contentLower)) {
      similarity += 0.3;
    }
    
    if (hasProgressContent && /\b(better|progress|improve|goal|change)\b/.test(contentLower)) {
      similarity += 0.4;
    }
    
    return Math.min(similarity, 1.0);
  }

  /**
   * Group related memories into thematic clusters
   */
  private async clusterMemories(memories: Memory[], _userId: string): Promise<MemoryCluster[]> {
    const clusters: MemoryCluster[] = [];
    const usedMemories = new Set<string>();
    
    // Group by theme first
    const themeGroups: Record<string, Memory[]> = {};
    
    memories.forEach(memory => {
      const theme = memory.theme || 'general';
      if (!themeGroups[theme]) {
        themeGroups[theme] = [];
      }
      themeGroups[theme].push(memory);
    });
    
    // Create clusters from theme groups
    for (const [theme, themeMemories] of Object.entries(themeGroups)) {
      if (themeMemories.length === 0) continue;
      
      const sessionIds = new Set(themeMemories.map(m => m.session_id));
      const averageRelevance = themeMemories.reduce((sum, m) => sum + (m.relevance_score || 0), 0) / themeMemories.length;
      
      clusters.push({
        id: `cluster_${theme}_${Date.now()}`,
        theme,
        memories: themeMemories,
        averageRelevance,
        sessionSpan: sessionIds.size,
        lastAccessed: new Date()
      });
      
      themeMemories.forEach(m => usedMemories.add(m.id));
    }
    
    // Sort clusters by relevance and session span
    clusters.sort((a, b) => {
      const scoreA = a.averageRelevance * (1 + a.sessionSpan * 0.1);
      const scoreB = b.averageRelevance * (1 + b.sessionSpan * 0.1);
      return scoreB - scoreA;
    });
    
    return clusters.slice(0, EnhancedMemoryRetrieval.MAX_CLUSTERS);
  }

  /**
   * Fallback to keyword-based retrieval when semantic search fails
   */
  private async fallbackToKeywordRetrieval(
    userId: string,
    message: string,
    sessionId?: string,
    limit: number = 8
  ): Promise<SemanticMemoryResult> {
    const startTime = Date.now();
    
    console.log('[SemanticMemory] Using keyword fallback retrieval');
    
    // Extract keywords from message
    const keywords = this.extractKeywords(message);
    
    // Build query with keyword filtering
    const query = supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter down
    
    const { data: memories } = await query;
    
    if (!memories) {
      return {
        memories: [],
        clusters: [],
        retrievalTime: Date.now() - startTime,
        similarityScores: {},
        fallbackUsed: true
      };
    }
    
    // Score memories based on keyword overlap
    const scoredMemories = memories
      .map(memory => ({
        ...memory,
        relevance_score: this.calculateKeywordScore(memory.content, keywords)
      }))
      .filter(memory => memory.relevance_score > 0.2)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
    
    const clusters = await this.clusterMemories(scoredMemories, userId);
    
    const similarityScores: Record<string, number> = {};
    scoredMemories.forEach(memory => {
      similarityScores[memory.id] = memory.relevance_score;
    });
    
    return {
      memories: scoredMemories,
      clusters,
      retrievalTime: Date.now() - startTime,
      similarityScores,
      fallbackUsed: true
    };
  }

  /**
   * Extract meaningful keywords from message
   */
  private extractKeywords(message: string): string[] {
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Remove duplicates and return
    return [...new Set(words)];
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been',
      'were', 'said', 'each', 'which', 'their', 'would', 'there',
      'could', 'other', 'more', 'very', 'what', 'know', 'just',
      'first', 'also', 'after', 'back', 'good', 'come', 'most'
    ]);
    
    return stopWords.has(word);
  }

  /**
   * Calculate keyword-based similarity score
   */
  private calculateKeywordScore(content: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    
    const contentWords = content.toLowerCase().split(/\s+/);
    const matches = keywords.filter(keyword => 
      contentWords.some(word => word.includes(keyword) || keyword.includes(word))
    );
    
    return matches.length / keywords.length;
  }

  /**
   * Generate cache key for embedding
   */
  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `embed_${Math.abs(hash)}`;
  }

  /**
   * Clear expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.embeddingCache.entries()) {
      if (now - cached.timestamp.getTime() > EnhancedMemoryRetrieval.CACHE_TTL) {
        this.embeddingCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      entries: Array.from(this.embeddingCache.values()).map(entry => ({
        usage_count: entry.usage_count,
        age_ms: Date.now() - entry.timestamp.getTime()
      }))
    };
  }
}

// Export singleton instance
export const enhancedMemoryRetrieval = new EnhancedMemoryRetrieval();