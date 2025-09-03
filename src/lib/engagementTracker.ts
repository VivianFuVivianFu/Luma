// Real-time Engagement Tracking System
// Monitors user engagement patterns and adjusts responses accordingly

import { supabase } from './supabase';
import { IntentType } from './intentClassifier';

export interface EngagementMetrics {
  userId: string;
  sessionId: string;
  messageCount: number;
  averageMessageLength: number;
  responseTime: number; // ms between bot message and user response
  conversationDuration: number; // total session time in minutes
  emotionalTrajectory: 'improving' | 'declining' | 'stable' | 'unknown';
  engagementLevel: 'high' | 'medium' | 'low' | 'disengaged';
  lastActivity: Date;
  patterns: EngagementPattern[];
}

export interface EngagementPattern {
  type: 'message_length_increase' | 'message_length_decrease' | 'response_time_change' | 
        'topic_persistence' | 'emotional_shift' | 'engagement_drop' | 'breakthrough_indicator';
  description: string;
  confidence: number;
  detectedAt: Date;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface UserPreferences {
  userId: string;
  preferredResponseLength: 'brief' | 'moderate' | 'detailed';
  preferredStyle: 'direct' | 'gentle' | 'analytical';
  preferredFocus: 'emotional' | 'practical' | 'mixed';
  responseTimePattern: 'quick' | 'thoughtful' | 'variable';
  engagementTriggers: string[]; // Topics that increase engagement
  lastUpdated: Date;
}

export interface ConversationAnalytics {
  totalMessages: number;
  avgMessagesPerSession: number;
  avgSessionDuration: number;
  completionRate: number; // % of conversations that reach natural conclusion
  satisfactionScore: number; // derived from engagement patterns
  improvementTrend: 'up' | 'down' | 'stable';
  keyTopics: string[];
  emotionalProfile: {
    dominant_emotions: string[];
    emotion_stability: number;
    progress_indicators: string[];
  };
}

export class EngagementTracker {
  private userMetrics: Map<string, EngagementMetrics> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private conversationStartTimes: Map<string, Date> = new Map();
  private lastMessageTimes: Map<string, Date> = new Map();
  
  constructor() {
    console.log('[EngagementTracker] Initialized real-time engagement tracking');
    
    // Load existing preferences from database
    this.loadUserPreferences();
  }

  /**
   * Track message event and update engagement metrics
   */
  async trackMessage(
    userId: string,
    sessionId: string,
    messageContent: string,
    messageType: 'user' | 'assistant',
    intent?: IntentType
  ): Promise<void> {
    const timestamp = new Date();
    
    try {
      // Initialize tracking if new user/session
      if (!this.userMetrics.has(userId)) {
        await this.initializeUserTracking(userId, sessionId);
      }

      const metrics = this.userMetrics.get(userId)!;
      
      if (messageType === 'user') {
        await this.trackUserMessage(userId, sessionId, messageContent, timestamp, intent);
      } else {
        await this.trackAssistantMessage(userId, sessionId, messageContent, timestamp);
      }

      // Update engagement level
      this.updateEngagementLevel(userId, metrics);

      // Detect engagement patterns
      const patterns = this.detectEngagementPatterns(userId, messageContent, messageType);
      metrics.patterns.push(...patterns);

      // Clean old patterns (keep last 20)
      if (metrics.patterns.length > 20) {
        metrics.patterns = metrics.patterns.slice(-20);
      }

      // Update user preferences based on engagement
      await this.adaptUserPreferences(userId, metrics, patterns);

      // Store metrics periodically
      if (metrics.messageCount % 5 === 0) {
        await this.persistMetrics(userId, metrics);
      }

      console.log(`[EngagementTracker] Updated metrics for ${userId}: ${metrics.engagementLevel} engagement`);

    } catch (error) {
      console.error('[EngagementTracker] Error tracking message:', error);
    }
  }

  /**
   * Track user message and calculate engagement indicators
   */
  private async trackUserMessage(
    userId: string,
    sessionId: string,
    content: string,
    timestamp: Date,
    intent?: IntentType
  ): Promise<void> {
    const metrics = this.userMetrics.get(userId)!;
    const lastMessageTime = this.lastMessageTimes.get(userId);
    
    // Calculate response time (time since last assistant message)
    let responseTime = 0;
    if (lastMessageTime) {
      responseTime = timestamp.getTime() - lastMessageTime.getTime();
    }

    // Update metrics
    metrics.messageCount++;
    metrics.averageMessageLength = (
      (metrics.averageMessageLength * (metrics.messageCount - 1)) + content.length
    ) / metrics.messageCount;

    if (responseTime > 0) {
      metrics.responseTime = responseTime;
    }

    // Update conversation duration
    const sessionStart = this.conversationStartTimes.get(sessionId);
    if (sessionStart) {
      metrics.conversationDuration = (timestamp.getTime() - sessionStart.getTime()) / (1000 * 60);
    }

    metrics.lastActivity = timestamp;
    this.lastMessageTimes.set(userId, timestamp);

    // Analyze emotional trajectory
    metrics.emotionalTrajectory = this.analyzeEmotionalTrajectory(content, metrics.patterns);

    // Track intent patterns
    if (intent) {
      this.trackIntentPattern(userId, intent, timestamp);
    }
  }

  /**
   * Track assistant message
   */
  private async trackAssistantMessage(
    userId: string,
    sessionId: string,
    content: string,
    timestamp: Date
  ): Promise<void> {
    this.lastMessageTimes.set(userId, timestamp);
    
    // Track if response references user history (engagement indicator)
    const referencesHistory = content.toLowerCase().includes('you mentioned') || 
                             content.toLowerCase().includes('last time') ||
                             content.toLowerCase().includes('remember when');
    
    if (referencesHistory) {
      const metrics = this.userMetrics.get(userId)!;
      metrics.patterns.push({
        type: 'topic_persistence',
        description: 'Assistant referenced conversation history',
        confidence: 0.8,
        detectedAt: timestamp,
        impact: 'positive'
      });
    }
  }

  /**
   * Detect engagement patterns from recent activity
   */
  private detectEngagementPatterns(
    userId: string,
    content: string,
    messageType: 'user' | 'assistant'
  ): EngagementPattern[] {
    const patterns: EngagementPattern[] = [];
    const metrics = this.userMetrics.get(userId)!;
    
    if (messageType !== 'user') return patterns;

    // Detect message length changes
    const lengthChange = content.length - metrics.averageMessageLength;
    if (Math.abs(lengthChange) > 50) {
      patterns.push({
        type: lengthChange > 0 ? 'message_length_increase' : 'message_length_decrease',
        description: `User messages ${lengthChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(lengthChange)} characters`,
        confidence: 0.7,
        detectedAt: new Date(),
        impact: lengthChange > 0 ? 'positive' : 'negative'
      });
    }

    // Detect emotional shifts
    const emotionalWords = {
      positive: ['better', 'good', 'happy', 'excited', 'progress', 'breakthrough', 'clarity'],
      negative: ['worse', 'bad', 'sad', 'frustrated', 'stuck', 'confused', 'overwhelmed']
    };

    const contentLower = content.toLowerCase();
    const positiveCount = emotionalWords.positive.filter(word => contentLower.includes(word)).length;
    const negativeCount = emotionalWords.negative.filter(word => contentLower.includes(word)).length;

    if (positiveCount > negativeCount && positiveCount >= 2) {
      patterns.push({
        type: 'emotional_shift',
        description: 'User expressing more positive emotions',
        confidence: 0.8,
        detectedAt: new Date(),
        impact: 'positive'
      });
    } else if (negativeCount > positiveCount && negativeCount >= 2) {
      patterns.push({
        type: 'emotional_shift',
        description: 'User expressing more negative emotions',
        confidence: 0.8,
        detectedAt: new Date(),
        impact: 'negative'
      });
    }

    // Detect breakthrough indicators
    const breakthroughWords = ['understand', 'realize', 'insight', 'clarity', 'breakthrough', 'makes sense'];
    if (breakthroughWords.some(word => contentLower.includes(word))) {
      patterns.push({
        type: 'breakthrough_indicator',
        description: 'User expressing understanding or realization',
        confidence: 0.9,
        detectedAt: new Date(),
        impact: 'positive'
      });
    }

    // Detect engagement drop indicators
    const disengagementWords = ['whatever', 'fine', 'okay', 'sure', 'i guess'];
    if (disengagementWords.some(word => contentLower.includes(word)) && content.length < 50) {
      patterns.push({
        type: 'engagement_drop',
        description: 'User showing signs of disengagement',
        confidence: 0.7,
        detectedAt: new Date(),
        impact: 'negative'
      });
    }

    return patterns;
  }

  /**
   * Update engagement level based on current metrics
   */
  private updateEngagementLevel(userId: string, metrics: EngagementMetrics): void {
    let score = 0;

    // Message length factor (longer messages = higher engagement)
    if (metrics.averageMessageLength > 100) score += 2;
    else if (metrics.averageMessageLength > 50) score += 1;

    // Response time factor (quick responses can indicate engagement)
    if (metrics.responseTime > 0) {
      if (metrics.responseTime < 30000) score += 2; // Less than 30 seconds
      else if (metrics.responseTime < 120000) score += 1; // Less than 2 minutes
    }

    // Conversation duration factor
    if (metrics.conversationDuration > 10) score += 2;
    else if (metrics.conversationDuration > 5) score += 1;

    // Pattern analysis
    const recentPatterns = metrics.patterns.slice(-5);
    const positivePatterns = recentPatterns.filter(p => p.impact === 'positive').length;
    const negativePatterns = recentPatterns.filter(p => p.impact === 'negative').length;

    score += positivePatterns - negativePatterns;

    // Determine engagement level
    if (score >= 5) {
      metrics.engagementLevel = 'high';
    } else if (score >= 2) {
      metrics.engagementLevel = 'medium';
    } else if (score >= 0) {
      metrics.engagementLevel = 'low';
    } else {
      metrics.engagementLevel = 'disengaged';
    }
  }

  /**
   * Analyze emotional trajectory from content and patterns
   */
  private analyzeEmotionalTrajectory(
    content: string,
    patterns: EngagementPattern[]
  ): 'improving' | 'declining' | 'stable' | 'unknown' {
    
    const recentEmotionalPatterns = patterns
      .filter(p => p.type === 'emotional_shift')
      .slice(-3);

    if (recentEmotionalPatterns.length === 0) {
      return 'unknown';
    }

    const positiveShifts = recentEmotionalPatterns.filter(p => p.impact === 'positive').length;
    const negativeShifts = recentEmotionalPatterns.filter(p => p.impact === 'negative').length;

    if (positiveShifts > negativeShifts) {
      return 'improving';
    } else if (negativeShifts > positiveShifts) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Adapt user preferences based on engagement patterns
   */
  private async adaptUserPreferences(
    userId: string,
    metrics: EngagementMetrics,
    newPatterns: EngagementPattern[]
  ): Promise<void> {
    
    let preferences = this.userPreferences.get(userId);
    if (!preferences) {
      preferences = {
        userId,
        preferredResponseLength: 'moderate',
        preferredStyle: 'gentle',
        preferredFocus: 'mixed',
        responseTimePattern: 'thoughtful',
        engagementTriggers: [],
        lastUpdated: new Date()
      };
      this.userPreferences.set(userId, preferences);
    }

    // Adapt response length based on user message length
    if (metrics.averageMessageLength > 150) {
      preferences.preferredResponseLength = 'detailed';
    } else if (metrics.averageMessageLength < 50) {
      preferences.preferredResponseLength = 'brief';
    }

    // Adapt style based on engagement patterns
    const hasBreakthroughs = newPatterns.some(p => p.type === 'breakthrough_indicator');
    const hasEmotionalShifts = newPatterns.some(p => p.type === 'emotional_shift' && p.impact === 'positive');
    
    if (hasBreakthroughs || hasEmotionalShifts) {
      // User is making progress, can handle more direct approach
      preferences.preferredStyle = 'direct';
    } else if (metrics.engagementLevel === 'low') {
      // Low engagement, use gentler approach
      preferences.preferredStyle = 'gentle';
    }

    // Update response time pattern
    if (metrics.responseTime > 0) {
      if (metrics.responseTime < 30000) {
        preferences.responseTimePattern = 'quick';
      } else if (metrics.responseTime > 180000) {
        preferences.responseTimePattern = 'thoughtful';
      }
    }

    preferences.lastUpdated = new Date();

    // Persist preferences periodically
    if (Math.random() < 0.1) { // 10% chance to persist
      await this.persistUserPreferences(userId, preferences);
    }
  }

  /**
   * Initialize tracking for new user
   */
  private async initializeUserTracking(userId: string, sessionId: string): Promise<void> {
    const metrics: EngagementMetrics = {
      userId,
      sessionId,
      messageCount: 0,
      averageMessageLength: 0,
      responseTime: 0,
      conversationDuration: 0,
      emotionalTrajectory: 'unknown',
      engagementLevel: 'medium',
      lastActivity: new Date(),
      patterns: []
    };

    this.userMetrics.set(userId, metrics);
    this.conversationStartTimes.set(sessionId, new Date());

    console.log(`[EngagementTracker] Initialized tracking for user ${userId}`);
  }

  /**
   * Track intent patterns for preference learning
   */
  private trackIntentPattern(userId: string, intent: IntentType, timestamp: Date): void {
    // This could be expanded to learn which intents lead to higher engagement
    console.log(`[EngagementTracker] Intent ${intent} for user ${userId}`);
  }

  /**
   * Get current engagement metrics for user
   */
  getEngagementMetrics(userId: string): EngagementMetrics | null {
    return this.userMetrics.get(userId) || null;
  }

  /**
   * Get user preferences for response adaptation
   */
  getUserPreferences(userId: string): UserPreferences | null {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Generate conversation analytics
   */
  async generateConversationAnalytics(userId: string): Promise<ConversationAnalytics> {
    const metrics = this.userMetrics.get(userId);
    
    if (!metrics) {
      return this.getDefaultAnalytics();
    }

    // Calculate satisfaction score from engagement patterns
    const positivePatterns = metrics.patterns.filter(p => p.impact === 'positive').length;
    const totalPatterns = metrics.patterns.length;
    const satisfactionScore = totalPatterns > 0 ? positivePatterns / totalPatterns : 0.5;

    return {
      totalMessages: metrics.messageCount,
      avgMessagesPerSession: metrics.messageCount, // Would need session tracking for accurate average
      avgSessionDuration: metrics.conversationDuration,
      completionRate: 0.8, // Would need to track conversation completions
      satisfactionScore,
      improvementTrend: metrics.emotionalTrajectory === 'improving' ? 'up' : 
                       metrics.emotionalTrajectory === 'declining' ? 'down' : 'stable',
      keyTopics: this.extractKeyTopics(metrics.patterns),
      emotionalProfile: {
        dominant_emotions: this.extractDominantEmotions(metrics.patterns),
        emotion_stability: this.calculateEmotionStability(metrics.patterns),
        progress_indicators: this.extractProgressIndicators(metrics.patterns)
      }
    };
  }

  /**
   * Persist metrics to database
   */
  private async persistMetrics(userId: string, metrics: EngagementMetrics): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_engagement_metrics')
        .upsert({
          user_id: userId,
          session_id: metrics.sessionId,
          message_count: metrics.messageCount,
          average_message_length: metrics.averageMessageLength,
          response_time: metrics.responseTime,
          conversation_duration: metrics.conversationDuration,
          emotional_trajectory: metrics.emotionalTrajectory,
          engagement_level: metrics.engagementLevel,
          last_activity: metrics.lastActivity.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

    } catch (error) {
      console.error('[EngagementTracker] Error persisting metrics:', error);
    }
  }

  /**
   * Persist user preferences
   */
  private async persistUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferred_response_length: preferences.preferredResponseLength,
          preferred_style: preferences.preferredStyle,
          preferred_focus: preferences.preferredFocus,
          response_time_pattern: preferences.responseTimePattern,
          engagement_triggers: preferences.engagementTriggers,
          updated_at: preferences.lastUpdated.toISOString()
        });

      if (error) throw error;

      console.log(`[EngagementTracker] Persisted preferences for user ${userId}`);

    } catch (error) {
      console.error('[EngagementTracker] Error persisting preferences:', error);
    }
  }

  /**
   * Load existing user preferences from database
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*');

      if (error) throw error;

      if (data) {
        data.forEach(pref => {
          this.userPreferences.set(pref.user_id, {
            userId: pref.user_id,
            preferredResponseLength: pref.preferred_response_length || 'moderate',
            preferredStyle: pref.preferred_style || 'gentle',
            preferredFocus: pref.preferred_focus || 'mixed',
            responseTimePattern: pref.response_time_pattern || 'thoughtful',
            engagementTriggers: pref.engagement_triggers || [],
            lastUpdated: new Date(pref.updated_at)
          });
        });
      }

      console.log(`[EngagementTracker] Loaded preferences for ${this.userPreferences.size} users`);

    } catch (error) {
      console.error('[EngagementTracker] Error loading preferences:', error);
    }
  }

  /**
   * Helper methods for analytics
   */
  private getDefaultAnalytics(): ConversationAnalytics {
    return {
      totalMessages: 0,
      avgMessagesPerSession: 0,
      avgSessionDuration: 0,
      completionRate: 0,
      satisfactionScore: 0.5,
      improvementTrend: 'stable',
      keyTopics: [],
      emotionalProfile: {
        dominant_emotions: [],
        emotion_stability: 0.5,
        progress_indicators: []
      }
    };
  }

  private extractKeyTopics(patterns: EngagementPattern[]): string[] {
    const topics = patterns
      .filter(p => p.description.includes('topic') || p.type === 'topic_persistence')
      .map(p => p.description)
      .slice(0, 5);
    
    return topics;
  }

  private extractDominantEmotions(patterns: EngagementPattern[]): string[] {
    const emotionPattern = patterns.filter(p => p.type === 'emotional_shift');
    const emotions = emotionPattern
      .map(p => p.impact === 'positive' ? 'positive' : 'negative')
      .slice(-5);
    
    return emotions;
  }

  private calculateEmotionStability(patterns: EngagementPattern[]): number {
    const emotionalShifts = patterns.filter(p => p.type === 'emotional_shift');
    if (emotionalShifts.length < 2) return 1.0;
    
    const shifts = emotionalShifts.slice(-10);
    const changes = shifts.slice(1).filter((shift, i) => 
      shift.impact !== shifts[i].impact
    ).length;
    
    return Math.max(0, 1 - (changes / shifts.length));
  }

  private extractProgressIndicators(patterns: EngagementPattern[]): string[] {
    return patterns
      .filter(p => p.type === 'breakthrough_indicator' || p.impact === 'positive')
      .map(p => p.description)
      .slice(-3);
  }
}

// Export singleton instance
export const engagementTracker = new EngagementTracker();