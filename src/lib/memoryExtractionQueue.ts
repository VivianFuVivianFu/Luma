// Asynchronous Memory Extraction Pipeline
// Background processing for continuous learning without blocking user responses

import { supabase } from './supabase';
import { ConversationMessage } from './memoryFirstService';
// import { IntentType } from './intentClassifier'; // Currently unused

export interface ExtractionJob {
  id: string;
  userId: string;
  sessionId: string;
  conversation: ConversationMessage[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  extractedInsights?: ExtractedInsight[];
  errorMessage?: string;
  retryCount: number;
}

export interface ExtractedInsight {
  type: 'insight' | 'preference' | 'trigger' | 'progress' | 'relationship' | 'goal' | 'pattern';
  content: string;
  confidence: number;
  theme: string;
  sessionContext: string;
  emotionalTone: string;
  relevanceScore: number;
}

export interface QueueStats {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

export class MemoryExtractionQueue {
  private jobs: Map<string, ExtractionJob> = new Map();
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly MAX_CONCURRENT_JOBS = 3;
  private readonly RETRY_LIMIT = 3;
  private readonly PROCESSING_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startProcessing();
    console.log('[MemoryQueue] Initialized async memory extraction pipeline');
  }

  /**
   * Add extraction job to queue
   */
  async addExtractionJob(
    userId: string,
    sessionId: string,
    conversation: ConversationMessage[],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    
    // Don't queue if conversation too short
    if (conversation.length < 4) {
      console.log('[MemoryQueue] Skipping extraction - conversation too short');
      return '';
    }

    // Don't queue if recent extraction exists for this session
    const recentJob = Array.from(this.jobs.values()).find(job => 
      job.sessionId === sessionId && 
      job.status === 'completed' &&
      (Date.now() - job.createdAt.getTime()) < 10 * 60 * 1000 // 10 minutes
    );

    if (recentJob) {
      console.log('[MemoryQueue] Skipping extraction - recent job exists');
      return recentJob.id;
    }

    const jobId = `extract_${userId}_${sessionId}_${Date.now()}`;
    const job: ExtractionJob = {
      id: jobId,
      userId,
      sessionId,
      conversation: [...conversation], // Clone to prevent mutation
      priority,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    };

    this.jobs.set(jobId, job);
    
    console.log(`[MemoryQueue] Added ${priority} priority extraction job: ${jobId}`);
    
    // Trigger immediate processing for high priority jobs
    if (priority === 'critical' || priority === 'high') {
      this.processNextJob();
    }

    return jobId;
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processInterval) return;

    this.processInterval = setInterval(() => {
      this.processNextJob();
    }, this.PROCESSING_INTERVAL);

    console.log('[MemoryQueue] Started background processing');
  }

  /**
   * Stop background processing
   */
  stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('[MemoryQueue] Stopped background processing');
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.processing) return;

    // Find next job by priority
    const nextJob = this.getNextJob();
    if (!nextJob) return;

    this.processing = true;
    nextJob.status = 'processing';
    
    console.log(`[MemoryQueue] Processing job ${nextJob.id} (priority: ${nextJob.priority})`);

    try {
      const startTime = Date.now();
      
      // Extract insights from conversation
      const insights = await this.extractInsights(nextJob.conversation, nextJob.userId);
      
      if (insights.length > 0) {
        // Store insights in database
        await this.storeInsights(nextJob.userId, nextJob.sessionId, insights);
        
        nextJob.extractedInsights = insights;
        nextJob.status = 'completed';
        nextJob.processedAt = new Date();
        
        const processingTime = Date.now() - startTime;
        console.log(`[MemoryQueue] Completed job ${nextJob.id} in ${processingTime}ms - extracted ${insights.length} insights`);
      } else {
        nextJob.status = 'completed';
        nextJob.processedAt = new Date();
        console.log(`[MemoryQueue] Completed job ${nextJob.id} - no insights extracted`);
      }

    } catch (error) {
      console.error(`[MemoryQueue] Job ${nextJob.id} failed:`, error);
      
      nextJob.retryCount++;
      nextJob.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (nextJob.retryCount < this.RETRY_LIMIT) {
        nextJob.status = 'pending'; // Retry
        console.log(`[MemoryQueue] Retrying job ${nextJob.id} (attempt ${nextJob.retryCount + 1})`);
      } else {
        nextJob.status = 'failed';
        console.error(`[MemoryQueue] Job ${nextJob.id} failed permanently after ${nextJob.retryCount} attempts`);
      }
    } finally {
      this.processing = false;
      
      // Clean up old jobs
      this.cleanupOldJobs();
    }
  }

  /**
   * Get next job by priority
   */
  private getNextJob(): ExtractionJob | null {
    const pendingJobs = Array.from(this.jobs.values()).filter(job => job.status === 'pending');
    
    if (pendingJobs.length === 0) return null;

    // Sort by priority and age
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    pendingJobs.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Same priority, older jobs first
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return pendingJobs[0];
  }

  /**
   * Extract insights from conversation using LLaMA
   */
  private async extractInsights(conversation: ConversationMessage[], userId: string): Promise<ExtractedInsight[]> {
    const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
    if (!apiKey) {
      console.warn('[MemoryQueue] No LLaMA API key available for insight extraction');
      return [];
    }

    // Build conversation context
    const conversationText = conversation
      .slice(-12) // Use last 12 messages for context
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    // Create extraction prompt
    const extractionPrompt = `You are an expert therapeutic insight extractor. Analyze this conversation and extract structured insights about the user's patterns, preferences, triggers, progress, relationships, and goals.

CONVERSATION:
${conversationText}

INSTRUCTIONS:
- Extract 2-5 specific, actionable insights
- Each insight should be a complete sentence
- Focus on patterns, preferences, emotional triggers, progress indicators, relationship dynamics, and personal goals
- Avoid generic statements
- Be specific and contextual

RESPONSE FORMAT (JSON only):
[
  {
    "type": "insight|preference|trigger|progress|relationship|goal|pattern",
    "content": "Specific insight about the user",
    "confidence": 0.0-1.0,
    "theme": "main theme (work, family, health, etc)",
    "emotionalTone": "positive|negative|neutral|mixed",
    "relevanceScore": 0.0-1.0
  }
]

ONLY return valid JSON array, no other text:`;

    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert at extracting therapeutic insights from conversations. Return only valid JSON arrays.' 
            },
            { role: 'user', content: extractionPrompt }
          ],
          max_tokens: 500,
          temperature: 0.3,
          top_p: 0.9,
        })
      });

      if (!response.ok) {
        throw new Error(`LLaMA API error: ${response.status}`);
      }

      const data = await response.json();
      const rawResponse = data.choices[0]?.message?.content?.trim();

      if (!rawResponse) {
        throw new Error('Empty response from LLaMA');
      }

      // Parse JSON response
      const insights: ExtractedInsight[] = JSON.parse(rawResponse);
      
      // Validate and enhance insights
      return insights
        .filter(insight => insight.content && insight.type && insight.confidence > 0.6)
        .map(insight => ({
          ...insight,
          sessionContext: `Session ${conversation[0]?.session_id || 'unknown'} - ${new Date().toISOString().split('T')[0]}`
        }));

    } catch (error) {
      console.error('[MemoryQueue] Error extracting insights:', error);
      
      // Fallback to simple pattern extraction
      return this.extractSimplePatterns(conversation);
    }
  }

  /**
   * Fallback simple pattern extraction
   */
  private extractSimplePatterns(conversation: ConversationMessage[]): ExtractedInsight[] {
    const insights: ExtractedInsight[] = [];
    const userMessages = conversation.filter(msg => msg.role === 'user');
    
    if (userMessages.length < 2) return insights;

    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');

    // Detect emotional patterns
    const emotionWords = ['stressed', 'anxious', 'worried', 'frustrated', 'happy', 'excited', 'sad'];
    const foundEmotions = emotionWords.filter(emotion => allText.includes(emotion));
    
    if (foundEmotions.length > 0) {
      insights.push({
        type: 'pattern',
        content: `User frequently expresses ${foundEmotions.join(', ')} emotions`,
        confidence: 0.7,
        theme: 'emotional patterns',
        sessionContext: `Pattern detected from ${userMessages.length} messages`,
        emotionalTone: foundEmotions.some(e => ['happy', 'excited'].includes(e)) ? 'positive' : 'negative',
        relevanceScore: 0.8
      });
    }

    // Detect goal-oriented language
    if (allText.includes('want to') || allText.includes('need to') || allText.includes('goal')) {
      insights.push({
        type: 'goal',
        content: 'User is actively setting goals and expressing desires for change',
        confidence: 0.8,
        theme: 'personal development',
        sessionContext: 'Goal-oriented language detected',
        emotionalTone: 'positive',
        relevanceScore: 0.9
      });
    }

    // Detect relationship focus
    if (allText.includes('family') || allText.includes('friend') || allText.includes('partner')) {
      insights.push({
        type: 'relationship',
        content: 'User frequently discusses relationships and social connections',
        confidence: 0.75,
        theme: 'relationships',
        sessionContext: 'Relationship-focused conversation',
        emotionalTone: 'mixed',
        relevanceScore: 0.7
      });
    }

    return insights;
  }

  /**
   * Store extracted insights in database
   */
  private async storeInsights(userId: string, sessionId: string, insights: ExtractedInsight[]): Promise<void> {
    try {
      const memoriesToInsert = insights.map(insight => ({
        user_id: userId,
        session_id: sessionId,
        content: insight.content,
        type: insight.type,
        theme: insight.theme,
        session_context: insight.sessionContext,
        confidence: insight.confidence,
        relevance_score: insight.relevanceScore,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_memories')
        .insert(memoriesToInsert);

      if (error) {
        throw error;
      }

      console.log(`[MemoryQueue] Stored ${insights.length} insights for user ${userId}`);

    } catch (error) {
      console.error('[MemoryQueue] Error storing insights:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  private cleanupOldJobs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.createdAt.getTime() < cutoffTime) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const jobs = Array.from(this.jobs.values());
    
    const pendingJobs = jobs.filter(job => job.status === 'pending').length;
    const processingJobs = jobs.filter(job => job.status === 'processing').length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;

    const completedJobsWithTime = jobs.filter(job => job.status === 'completed' && job.processedAt);
    const averageProcessingTime = completedJobsWithTime.length > 0 
      ? completedJobsWithTime.reduce((sum, job) => {
          return sum + (job.processedAt!.getTime() - job.createdAt.getTime());
        }, 0) / completedJobsWithTime.length
      : 0;

    const totalProcessed = completedJobs + failedJobs;
    const successRate = totalProcessed > 0 ? completedJobs / totalProcessed : 0;

    return {
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      successRate
    };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ExtractionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      this.jobs.delete(jobId);
      console.log(`[MemoryQueue] Canceled job ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Force immediate processing of specific job
   */
  async prioritizeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.priority = 'critical';
      this.processNextJob(); // Trigger immediate processing
      return true;
    }
    return false;
  }

  /**
   * Get insights for user from completed jobs
   */
  getExtractedInsights(userId: string, limit: number = 10): ExtractedInsight[] {
    const userJobs = Array.from(this.jobs.values())
      .filter(job => job.userId === userId && job.status === 'completed' && job.extractedInsights)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const allInsights: ExtractedInsight[] = [];
    
    for (const job of userJobs) {
      if (job.extractedInsights) {
        allInsights.push(...job.extractedInsights);
      }
      if (allInsights.length >= limit) break;
    }

    return allInsights.slice(0, limit);
  }
}

// Export singleton instance
export const memoryExtractionQueue = new MemoryExtractionQueue();