// High-Performance Memory Caching Service
// Sub-300ms memory retrieval with Redis-like caching and smart prefetching

import { MemoryRetrievalResult } from './memoryFirstService';

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl: number; // Time to live in milliseconds
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageRetrievalTime: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number; // Estimated in MB
  topKeys: string[];
}

export interface PrefetchStrategy {
  userId: string;
  sessionId: string;
  predictedQueries: string[];
  confidence: number;
  scheduledAt: Date;
}

export class MemoryCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private retrievalTimes: number[] = [];
  
  // Cache configuration
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly PREFETCH_THRESHOLD = 0.7; // Confidence threshold for prefetching
  
  // Performance targets
  private readonly TARGET_RETRIEVAL_TIME = 300; // 300ms
  private readonly FAST_RETRIEVAL_TIME = 100; // 100ms for cached items
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  private prefetchQueue: PrefetchStrategy[] = [];
  
  constructor() {
    this.startCleanupTimer();
    console.log('[MemoryCache] Initialized high-performance caching service');
  }

  /**
   * Get cached memories with sub-300ms performance target
   */
  async getMemoriesFromCache(
    userId: string,
    messageContent: string,
    sessionId?: string
  ): Promise<MemoryRetrievalResult | null> {
    const startTime = Date.now();
    
    try {
      // Generate cache key based on user, message hash, and session
      const cacheKey = this.generateCacheKey(userId, messageContent, sessionId);
      
      // Check primary cache
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        // Update access statistics
        cached.accessCount++;
        cached.lastAccessed = new Date();
        this.hitCount++;
        
        const retrievalTime = Date.now() - startTime;
        this.retrievalTimes.push(retrievalTime);
        
        console.log(`[MemoryCache] Cache HIT for ${cacheKey} in ${retrievalTime}ms`);
        
        return cached.data as MemoryRetrievalResult;
      }

      // Check for similar cache entries (fuzzy matching)
      const similarEntry = await this.findSimilarCacheEntry(userId, messageContent);
      
      if (similarEntry) {
        this.hitCount++;
        const retrievalTime = Date.now() - startTime;
        this.retrievalTimes.push(retrievalTime);
        
        console.log(`[MemoryCache] Similar cache HIT in ${retrievalTime}ms`);
        return similarEntry;
      }

      // Cache miss
      this.missCount++;
      console.log(`[MemoryCache] Cache MISS for ${cacheKey}`);
      
      return null;
      
    } catch (error) {
      console.error('[MemoryCache] Error retrieving from cache:', error);
      this.missCount++;
      return null;
    }
  }

  /**
   * Store memories in cache with intelligent TTL and priority
   */
  async storeMemoriesInCache(
    userId: string,
    messageContent: string,
    memoryResult: MemoryRetrievalResult,
    sessionId?: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    
    try {
      const cacheKey = this.generateCacheKey(userId, messageContent, sessionId);
      
      // Calculate TTL based on priority and memory relevance
      let ttl = this.DEFAULT_TTL;
      if (priority === 'critical') {
        ttl = 60 * 60 * 1000; // 1 hour
      } else if (priority === 'high') {
        ttl = 30 * 60 * 1000; // 30 minutes
      } else if (memoryResult.currentSessionMemories.length > 0) {
        ttl = 20 * 60 * 1000; // 20 minutes for session-relevant memories
      }

      const cacheEntry: CacheEntry = {
        key: cacheKey,
        data: memoryResult,
        timestamp: new Date(),
        accessCount: 1,
        lastAccessed: new Date(),
        ttl,
        priority
      };

      // Store in cache
      this.cache.set(cacheKey, cacheEntry);
      
      // Trigger cache cleanup if needed
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        this.evictLeastRelevantEntries();
      }

      console.log(`[MemoryCache] Stored ${cacheKey} with ${priority} priority (TTL: ${ttl}ms)`);
      
      // Schedule prefetch for related queries
      this.schedulePrefetch(userId, sessionId, messageContent);
      
    } catch (error) {
      console.error('[MemoryCache] Error storing in cache:', error);
    }
  }

  /**
   * Preload frequently accessed memories for active users
   */
  async preloadUserMemories(userId: string, sessionId: string): Promise<void> {
    console.log(`[MemoryCache] Preloading memories for active user ${userId}`);
    
    try {
      // Get common query patterns for this user
      const commonPatterns = this.getCommonQueryPatterns(userId);
      
      for (const pattern of commonPatterns) {
        const cacheKey = this.generateCacheKey(userId, pattern, sessionId);
        
        if (!this.cache.has(cacheKey)) {
          // This would trigger the actual memory retrieval and caching
          // For now, we'll just log the intent
          console.log(`[MemoryCache] Would preload: ${pattern}`);
        }
      }
      
    } catch (error) {
      console.error('[MemoryCache] Error in preload:', error);
    }
  }

  /**
   * Intelligent cache warming for predicted queries
   */
  async warmCache(userId: string, predictedQueries: string[]): Promise<void> {
    console.log(`[MemoryCache] Warming cache with ${predictedQueries.length} predicted queries`);
    
    for (const query of predictedQueries.slice(0, 5)) { // Limit to top 5
      const cacheKey = this.generateCacheKey(userId, query);
      
      if (!this.cache.has(cacheKey)) {
        // Schedule for background prefetch
        this.prefetchQueue.push({
          userId,
          sessionId: 'prefetch',
          predictedQueries: [query],
          confidence: 0.8,
          scheduledAt: new Date()
        });
      }
    }
  }

  /**
   * Get optimized memories with fallback chain
   */
  async getOptimizedMemories(
    userId: string,
    messageContent: string,
    sessionId?: string,
    fallbackFn?: () => Promise<MemoryRetrievalResult>
  ): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();
    
    // Try cache first
    const cachedResult = await this.getMemoriesFromCache(userId, messageContent, sessionId);
    
    if (cachedResult) {
      const retrievalTime = Date.now() - startTime;
      
      // Add performance annotation
      cachedResult.totalRetrievalTime = retrievalTime;
      return cachedResult;
    }

    // Fallback to actual retrieval
    if (fallbackFn) {
      const result = await fallbackFn();
      
      // Store result in cache for future use
      await this.storeMemoriesInCache(userId, messageContent, result, sessionId);
      
      return result;
    }

    // Return empty result if no fallback
    return {
      currentSessionMemories: [],
      crossSessionMemories: [],
      criticalInsights: [],
      totalRetrievalTime: Date.now() - startTime
    };
  }

  /**
   * Clear cache for specific user (e.g., after new memories added)
   */
  invalidateUserCache(userId: string): void {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`user_${userId}_`)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    console.log(`[MemoryCache] Invalidated ${deletedCount} cache entries for user ${userId}`);
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    const averageRetrievalTime = this.retrievalTimes.length > 0 
      ? this.retrievalTimes.reduce((sum, time) => sum + time, 0) / this.retrievalTimes.length
      : 0;

    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => {
        return total + JSON.stringify(entry.data).length;
      }, 0) / 1024 / 1024; // Convert to MB

    // Get top accessed keys
    const topKeys = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => entry.key);

    return {
      totalEntries: this.cache.size,
      hitRate,
      averageRetrievalTime,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      memoryUsage: estimatedMemoryUsage,
      topKeys
    };
  }

  /**
   * Private helper methods
   */
  private generateCacheKey(userId: string, messageContent: string, sessionId?: string): string {
    // Create a hash-like key from message content
    const contentHash = this.simpleHash(messageContent.toLowerCase().trim());
    const sessionPart = sessionId ? `_session_${sessionId}` : '';
    
    return `user_${userId}_msg_${contentHash}${sessionPart}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    return age < entry.ttl;
  }

  private async findSimilarCacheEntry(userId: string, messageContent: string): Promise<MemoryRetrievalResult | null> {
    const userEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(`user_${userId}_`))
      .map(([key, entry]) => ({ key, entry }));

    if (userEntries.length === 0) return null;

    // Find entries with similar message content (simple keyword matching)
    const messageWords = messageContent.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    
    for (const { key, entry } of userEntries) {
      if (!this.isCacheValid(entry)) continue;
      
      // Extract similar semantic patterns (basic implementation)
      const similarity = this.calculateMessageSimilarity(messageContent, key);
      
      if (similarity > 0.7) { // 70% similarity threshold
        entry.accessCount++;
        entry.lastAccessed = new Date();
        return entry.data as MemoryRetrievalResult;
      }
    }

    return null;
  }

  private calculateMessageSimilarity(message1: string, cacheKey: string): number {
    // Extract message hash from cache key and compare patterns
    // This is a simplified implementation - in production, use proper semantic similarity
    
    const words1 = message1.toLowerCase().split(/\s+/);
    const emotionWords = ['sad', 'happy', 'angry', 'worried', 'excited', 'frustrated'];
    const topicWords = ['work', 'family', 'relationship', 'health', 'goal'];
    
    // Check for similar emotional or topical content
    const hasEmotion1 = words1.some(word => emotionWords.includes(word));
    const hasTopic1 = words1.some(word => topicWords.includes(word));
    
    // Simple pattern matching (would be replaced with semantic similarity in production)
    if (hasEmotion1 && cacheKey.includes('emotion')) return 0.8;
    if (hasTopic1 && cacheKey.includes('topic')) return 0.8;
    
    return 0.3; // Default low similarity
  }

  private evictLeastRelevantEntries(): void {
    // Get entries sorted by relevance score (combination of access count, recency, priority)
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => {
      const recencyScore = (Date.now() - entry.lastAccessed.getTime()) / (24 * 60 * 60 * 1000); // Days since last access
      const priorityScore = { low: 1, medium: 2, high: 3, critical: 4 }[entry.priority];
      const relevanceScore = entry.accessCount * priorityScore / (1 + recencyScore);
      
      return { key, entry, relevanceScore };
    });

    entries.sort((a, b) => a.relevanceScore - b.relevanceScore);

    // Remove least relevant entries (bottom 20%)
    const entriesToRemove = Math.ceil(entries.length * 0.2);
    
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i].key);
    }

    console.log(`[MemoryCache] Evicted ${entriesToRemove} least relevant entries`);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupExpiredEntries(): void {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[MemoryCache] Cleaned up ${removedCount} expired entries`);
    }
  }

  private getCommonQueryPatterns(userId: string): string[] {
    // This would analyze user's query history to predict common patterns
    // For now, return some common therapeutic query patterns
    return [
      'feeling anxious',
      'work stress',
      'relationship issue',
      'how are you',
      'need advice',
      'feeling better',
      'making progress'
    ];
  }

  private schedulePrefetch(userId: string, sessionId: string | undefined, messageContent: string): void {
    // Predict related queries based on current message
    const relatedQueries = this.predictRelatedQueries(messageContent);
    
    if (relatedQueries.length > 0) {
      this.prefetchQueue.push({
        userId,
        sessionId: sessionId || 'unknown',
        predictedQueries: relatedQueries,
        confidence: 0.6,
        scheduledAt: new Date()
      });
    }
  }

  private predictRelatedQueries(messageContent: string): string[] {
    const words = messageContent.toLowerCase().split(/\s+/);
    const queries: string[] = [];

    // Simple prediction based on content patterns
    if (words.includes('anxious') || words.includes('worried')) {
      queries.push('coping with anxiety', 'anxiety management');
    }

    if (words.includes('work') || words.includes('job')) {
      queries.push('work stress', 'career advice', 'workplace issues');
    }

    if (words.includes('relationship') || words.includes('partner')) {
      queries.push('relationship advice', 'communication issues', 'relationship problems');
    }

    return queries.slice(0, 3); // Limit to top 3 predictions
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    console.log('[MemoryCache] Service shut down and cache cleared');
  }

  /**
   * Force cache refresh for development/testing
   */
  forceRefresh(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.retrievalTimes = [];
    console.log('[MemoryCache] Cache forcefully refreshed');
  }

  /**
   * Export cache for backup/analysis
   */
  exportCache(): any {
    return {
      entries: Array.from(this.cache.entries()),
      stats: this.getCacheStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const memoryCacheService = new MemoryCacheService();