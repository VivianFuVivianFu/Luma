// src/multimodel/self.improving.index.js
// Self-Improving Index System for Proactive User Updates

const { createClient } = require('@supabase/supabase-js');
const { analyzeMemoryStats, getHighQualityMemories } = require('./memory.selector.js');

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Configuration constants
const CONFIG = {
  ANALYSIS_WINDOW_DAYS: 7,
  MIN_SESSIONS_FOR_PATTERN: 3,
  TREND_SIGNIFICANCE_THRESHOLD: 0.3,
  MAX_PROACTIVE_NOTIFICATIONS: 2,
  IMPROVEMENT_LEARNING_RATE: 0.1,
  INDEX_UPDATE_INTERVAL_HOURS: 6
};

/**
 * Core Self-Improving Index Class
 */
class SelfImprovingIndex {
  constructor(userId) {
    this.userId = userId;
    this.patterns = new Map();
    this.trends = new Map();
    this.indexWeights = new Map();
    this.lastAnalysis = null;
  }

  /**
   * Analyze user behavior patterns from memory and session data
   */
  async analyzeUserPatterns() {
    try {
      const memoryStats = await analyzeMemoryStats(this.userId);
      const recentSessions = await this.getRecentSessions();
      const memoryTrends = await this.detectMemoryTrends();

      const patterns = {
        emotionalState: this.analyzeEmotionalPatterns(memoryStats),
        goalProgress: this.analyzeGoalPatterns(recentSessions),
        interactionTiming: this.analyzeTimingPatterns(recentSessions),
        topicEvolution: this.analyzeTopicEvolution(memoryTrends),
        responseEffectiveness: await this.analyzeResponseEffectiveness()
      };

      this.patterns = new Map(Object.entries(patterns));
      this.lastAnalysis = new Date();

      return patterns;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error analyzing patterns:', error);
      return null;
    }
  }

  /**
   * Detect emotional state patterns
   */
  analyzeEmotionalPatterns(memoryStats) {
    if (!memoryStats) return { confidence: 0, insights: [] };

    const emotionalWords = {
      positive: ['开心', '兴奋', '满足', '感激', '希望', '乐观', '平静', 'happy', 'excited', 'grateful'],
      negative: ['焦虑', '抑郁', '压力', '担心', '痛苦', '无助', '孤独', 'anxious', 'depressed', 'stressed'],
      neutral: ['平常', '正常', '还好', 'okay', 'fine', 'normal']
    };

    // Analyze emotional distribution in recent memories
    const insights = [];
    if (memoryStats.recent30Days > 10) {
      insights.push({
        type: 'high_activity',
        message: '用户最近记忆活跃度很高，可能处于重要生活阶段',
        confidence: 0.8
      });
    }

    if (memoryStats.importanceDistribution.high > memoryStats.importanceDistribution.medium) {
      insights.push({
        type: 'high_impact_period',
        message: '用户正在经历高影响力的生活事件',
        confidence: 0.7
      });
    }

    return {
      confidence: Math.min(0.9, memoryStats.total / 20),
      insights,
      emotionalTrend: this.calculateEmotionalTrend(memoryStats)
    };
  }

  /**
   * Analyze goal-related patterns
   */
  analyzeGoalPatterns(sessions) {
    const goalKeywords = ['目标', '计划', '打算', '想要', '希望', 'goal', 'plan', 'want'];
    const goalSessions = sessions.filter(s => 
      goalKeywords.some(kw => s.summary?.toLowerCase().includes(kw))
    );

    const insights = [];
    if (goalSessions.length >= 2) {
      const timeSpan = goalSessions[goalSessions.length - 1].created_at - goalSessions[0].created_at;
      const daysBetween = timeSpan / (1000 * 60 * 60 * 24);

      if (daysBetween > 7) {
        insights.push({
          type: 'goal_consistency',
          message: '用户在设定目标方面表现出持续性',
          confidence: 0.8,
          actionable: true,
          suggestion: '可以主动询问目标进展并提供支持'
        });
      }
    }

    return {
      goalFrequency: goalSessions.length / Math.max(sessions.length, 1),
      insights,
      confidence: goalSessions.length >= 2 ? 0.7 : 0.3
    };
  }

  /**
   * Analyze interaction timing patterns
   */
  analyzeTimingPatterns(sessions) {
    if (!sessions.length) return { confidence: 0 };

    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);

    sessions.forEach(session => {
      const date = new Date(session.created_at);
      hourCounts[date.getHours()]++;
      dayOfWeekCounts[date.getDay()]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    const insights = [];
    if (sessions.length >= 5) {
      insights.push({
        type: 'optimal_timing',
        message: `用户倾向于在${peakHour}点时最活跃`,
        confidence: 0.7,
        actionable: true,
        suggestion: `可以在${peakHour-1}点左右发送主动关怀`
      });
    }

    return {
      peakHour,
      peakDay,
      insights,
      confidence: sessions.length >= 3 ? 0.6 : 0.2
    };
  }

  /**
   * Analyze topic evolution over time
   */
  analyzeTopicEvolution(trends) {
    const insights = [];
    
    for (const [topic, trend] of trends.entries()) {
      if (trend.growth > CONFIG.TREND_SIGNIFICANCE_THRESHOLD) {
        insights.push({
          type: 'emerging_topic',
          topic,
          message: `"${topic}"主题正在增长`,
          confidence: 0.8,
          actionable: true,
          suggestion: `主动询问关于${topic}的更多信息`
        });
      } else if (trend.growth < -CONFIG.TREND_SIGNIFICANCE_THRESHOLD) {
        insights.push({
          type: 'declining_topic',
          topic,
          message: `"${topic}"主题关注度在下降`,
          confidence: 0.7,
          actionable: true,
          suggestion: `检查用户是否已解决相关问题`
        });
      }
    }

    return {
      trendingTopics: insights.filter(i => i.type === 'emerging_topic'),
      decliningTopics: insights.filter(i => i.type === 'declining_topic'),
      insights,
      confidence: insights.length > 0 ? 0.8 : 0.4
    };
  }

  /**
   * Detect memory trends using temporal analysis
   */
  async detectMemoryTrends() {
    try {
      const { data, error } = await supa
        .from('user_long_memory')
        .select('text, importance, created_at, source')
        .eq('user_id', this.userId)
        .eq('confirmed', true)
        .gte('created_at', new Date(Date.now() - CONFIG.ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const trends = new Map();
      const memories = data || [];

      // Extract key topics and track their frequency over time
      memories.forEach((memory, index) => {
        const words = this.extractKeywords(memory.text);
        const timeWeight = (index + 1) / memories.length; // Recent memories get higher weight

        words.forEach(word => {
          if (!trends.has(word)) {
            trends.set(word, { count: 0, recentWeight: 0, growth: 0 });
          }
          
          const trend = trends.get(word);
          trend.count++;
          trend.recentWeight += timeWeight;
        });
      });

      // Calculate growth trends
      for (const [word, trend] of trends.entries()) {
        const avgPosition = trend.recentWeight / trend.count;
        trend.growth = (avgPosition - 0.5) * 2; // -1 to 1 scale
      }

      return trends;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error detecting trends:', error);
      return new Map();
    }
  }

  /**
   * Generate proactive notifications based on patterns
   */
  async generateProactiveNotifications() {
    const patterns = await this.analyzeUserPatterns();
    if (!patterns) return [];

    const notifications = [];
    let notificationCount = 0;

    // Process each pattern type for actionable insights
    for (const [patternType, pattern] of this.patterns.entries()) {
      if (notificationCount >= CONFIG.MAX_PROACTIVE_NOTIFICATIONS) break;

      const actionableInsights = pattern.insights?.filter(insight => 
        insight.actionable && insight.confidence > 0.6
      ) || [];

      for (const insight of actionableInsights) {
        if (notificationCount >= CONFIG.MAX_PROACTIVE_NOTIFICATIONS) break;

        const notification = {
          id: `proactive_${Date.now()}_${notificationCount}`,
          userId: this.userId,
          type: 'proactive_insight',
          category: patternType,
          title: this.generateNotificationTitle(insight),
          message: insight.suggestion || insight.message,
          confidence: insight.confidence,
          metadata: {
            insightType: insight.type,
            topic: insight.topic,
            pattern: patternType
          },
          createdAt: new Date().toISOString(),
          priority: this.calculatePriority(insight),
          actionable: true
        };

        notifications.push(notification);
        notificationCount++;
      }
    }

    // Store notifications for delivery
    if (notifications.length > 0) {
      await this.storeNotifications(notifications);
    }

    return notifications;
  }

  /**
   * Self-improvement: Learn from user interactions and adjust weights
   */
  async improveFromFeedback(interactionData) {
    try {
      const { notificationId, userResponse, effectiveness } = interactionData;
      
      // Update index weights based on effectiveness
      if (effectiveness !== undefined) {
        const notification = await this.getNotificationById(notificationId);
        if (notification) {
          const category = notification.metadata.pattern;
          const currentWeight = this.indexWeights.get(category) || 1.0;
          const adjustment = (effectiveness - 0.5) * CONFIG.IMPROVEMENT_LEARNING_RATE;
          const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
          
          this.indexWeights.set(category, newWeight);
          
          // Store learning data
          await this.storeLearningData({
            userId: this.userId,
            category,
            oldWeight: currentWeight,
            newWeight,
            effectiveness,
            timestamp: new Date().toISOString()
          });
        }
      }

      return {
        success: true,
        updatedWeights: Object.fromEntries(this.indexWeights),
        learningApplied: true
      };
    } catch (error) {
      console.error('[SelfImprovingIndex] Error improving from feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update index automatically based on patterns
   */
  async updateIndex() {
    try {
      const patterns = await this.analyzeUserPatterns();
      const trends = await this.detectMemoryTrends();
      
      // Update internal indexes
      this.patterns = new Map(Object.entries(patterns || {}));
      this.trends = trends;
      
      // Generate new notifications if significant patterns detected
      const notifications = await this.generateProactiveNotifications();
      
      // Self-optimize based on historical effectiveness
      await this.optimizeIndexWeights();
      
      return {
        patternsDetected: this.patterns.size,
        trendsIdentified: this.trends.size,
        notificationsGenerated: notifications.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SelfImprovingIndex] Error updating index:', error);
      return { error: error.message };
    }
  }

  // Helper methods
  async getRecentSessions() {
    try {
      const { data, error } = await supa
        .from('sessions')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', new Date(Date.now() - CONFIG.ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SelfImprovingIndex] Error getting recent sessions:', error);
      return [];
    }
  }

  extractKeywords(text) {
    // Simple keyword extraction - could be enhanced with NLP
    const stopWords = new Set(['的', '是', '在', '了', '和', '与', '我', '你', 'the', 'is', 'and', 'or']);
    return text.toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  calculateEmotionalTrend(memoryStats) {
    // Simple trend calculation based on importance distribution
    const { high, medium, low } = memoryStats.importanceDistribution;
    const total = high + medium + low;
    if (total === 0) return 'neutral';
    
    const highRatio = high / total;
    if (highRatio > 0.6) return 'intense';
    if (highRatio > 0.3) return 'moderate';
    return 'stable';
  }

  generateNotificationTitle(insight) {
    const titleMap = {
      goal_consistency: '目标跟进提醒',
      optimal_timing: '最佳互动时间',
      emerging_topic: '新话题关注',
      declining_topic: '状态检查',
      high_activity: '活跃期关怀',
      high_impact_period: '重要时期支持'
    };
    return titleMap[insight.type] || '个性化提醒';
  }

  calculatePriority(insight) {
    if (insight.confidence > 0.8) return 'high';
    if (insight.confidence > 0.6) return 'medium';
    return 'low';
  }

  async storeNotifications(notifications) {
    try {
      const { error } = await supa
        .from('proactive_notifications')
        .insert(notifications);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error storing notifications:', error);
      return false;
    }
  }

  async getNotificationById(id) {
    try {
      const { data, error } = await supa
        .from('proactive_notifications')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error getting notification:', error);
      return null;
    }
  }

  async storeLearningData(learningData) {
    try {
      const { error } = await supa
        .from('index_learning_data')
        .insert([learningData]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error storing learning data:', error);
      return false;
    }
  }

  async optimizeIndexWeights() {
    try {
      // Analyze historical effectiveness and adjust weights
      const { data, error } = await supa
        .from('index_learning_data')
        .select('*')
        .eq('userId', this.userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by category and calculate average effectiveness
      const categoryEffectiveness = {};
      (data || []).forEach(entry => {
        if (!categoryEffectiveness[entry.category]) {
          categoryEffectiveness[entry.category] = [];
        }
        categoryEffectiveness[entry.category].push(entry.effectiveness);
      });

      // Update weights based on effectiveness
      for (const [category, effectivenessScores] of Object.entries(categoryEffectiveness)) {
        const avgEffectiveness = effectivenessScores.reduce((a, b) => a + b, 0) / effectivenessScores.length;
        const currentWeight = this.indexWeights.get(category) || 1.0;
        const targetWeight = 0.5 + avgEffectiveness; // 0.5 to 1.5 range
        const newWeight = currentWeight * 0.9 + targetWeight * 0.1; // Smooth adjustment
        this.indexWeights.set(category, newWeight);
      }

      return true;
    } catch (error) {
      console.error('[SelfImprovingIndex] Error optimizing weights:', error);
      return false;
    }
  }

  async analyzeResponseEffectiveness() {
    // Placeholder for analyzing how effective previous responses were
    // This would integrate with user feedback systems
    return {
      insights: [],
      confidence: 0.5,
      avgEffectiveness: 0.7
    };
  }
}

/**
 * Factory function to create index instances
 */
function createSelfImprovingIndex(userId) {
  return new SelfImprovingIndex(userId);
}

/**
 * Global index manager for handling multiple users
 */
class IndexManager {
  constructor() {
    this.indexes = new Map();
    this.updateInterval = null;
  }

  getIndex(userId) {
    if (!this.indexes.has(userId)) {
      this.indexes.set(userId, new SelfImprovingIndex(userId));
    }
    return this.indexes.get(userId);
  }

  async updateAllIndexes() {
    const results = [];
    for (const [userId, index] of this.indexes.entries()) {
      try {
        const result = await index.updateIndex();
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ userId, error: error.message });
      }
    }
    return results;
  }

  startAutoUpdate() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(async () => {
      console.log('[IndexManager] Running scheduled index updates...');
      const results = await this.updateAllIndexes();
      console.log(`[IndexManager] Updated ${results.length} indexes`);
    }, CONFIG.INDEX_UPDATE_INTERVAL_HOURS * 60 * 60 * 1000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Global instance
const indexManager = new IndexManager();

module.exports = {
  SelfImprovingIndex,
  IndexManager,
  createSelfImprovingIndex,
  indexManager,
  CONFIG
};