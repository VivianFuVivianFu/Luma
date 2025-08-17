// src/multimodel/user.behavior.analyzer.js
// Advanced User Behavior Pattern Analysis System

const { createClient } = require('@supabase/supabase-js');

const supa = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Advanced User Behavior Analyzer
 */
class UserBehaviorAnalyzer {
  constructor(userId) {
    this.userId = userId;
    this.analysisCache = new Map();
    this.behaviorMetrics = {
      sessionPatterns: {},
      emotionalJourney: {},
      topicProgression: {},
      responsePatterns: {},
      engagementLevels: {}
    };
  }

  /**
   * Comprehensive behavior analysis
   */
  async analyzeComprehensiveBehavior(timeWindowDays = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeWindowDays * 24 * 60 * 60 * 1000);

      // Gather all relevant data
      const [sessions, memories, messages] = await Promise.all([
        this.getSessionsData(startDate, endDate),
        this.getMemoryData(startDate, endDate),
        this.getMessagesData(startDate, endDate)
      ]);

      // Perform multi-dimensional analysis
      const analysis = {
        timeframe: { start: startDate, end: endDate, days: timeWindowDays },
        sessionAnalysis: this.analyzeSessionPatterns(sessions),
        emotionalAnalysis: this.analyzeEmotionalJourney(memories, messages),
        topicAnalysis: this.analyzeTopicProgression(memories, messages),
        engagementAnalysis: this.analyzeEngagementPatterns(sessions, messages),
        crisisIndicators: this.detectCrisisIndicators(memories, messages),
        progressIndicators: this.detectProgressIndicators(memories, messages),
        personalityInsights: this.extractPersonalityInsights(memories),
        behaviorPredictions: this.generateBehaviorPredictions(sessions, memories)
      };

      // Cache the analysis
      this.analysisCache.set('comprehensive', {
        data: analysis,
        timestamp: new Date(),
        expiry: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      });

      return analysis;
    } catch (error) {
      console.error('[UserBehaviorAnalyzer] Error in comprehensive analysis:', error);
      return null;
    }
  }

  /**
   * Analyze session patterns and habits
   */
  analyzeSessionPatterns(sessions) {
    if (!sessions.length) return { confidence: 0 };

    const patterns = {
      frequency: this.calculateSessionFrequency(sessions),
      duration: this.calculateSessionDuration(sessions),
      timing: this.analyzeSessionTiming(sessions),
      consistency: this.calculateConsistency(sessions),
      weeklyPattern: this.analyzeWeeklyPattern(sessions)
    };

    const insights = [];

    // Frequency insights
    if (patterns.frequency.average > 1) {
      insights.push({
        type: 'high_frequency',
        message: '用户互动频率较高，表现出积极的参与度',
        confidence: 0.8,
        actionable: true,
        suggestion: '继续保持互动频率，适时提供深度支持'
      });
    } else if (patterns.frequency.average < 0.3) {
      insights.push({
        type: 'low_frequency',
        message: '用户互动频率较低，可能需要更多关注',
        confidence: 0.7,
        actionable: true,
        suggestion: '主动发送关怀信息，降低互动门槛'
      });
    }

    // Timing insights
    if (patterns.timing.peakHours.length > 0) {
      insights.push({
        type: 'timing_preference',
        message: `用户倾向于在${patterns.timing.peakHours.join(', ')}点进行互动`,
        confidence: 0.8,
        actionable: true,
        suggestion: '在用户活跃时间段发送主动关怀'
      });
    }

    // Consistency insights
    if (patterns.consistency.score > 0.7) {
      insights.push({
        type: 'high_consistency',
        message: '用户表现出很好的使用习惯一致性',
        confidence: 0.9,
        actionable: true,
        suggestion: '可以建立例行化的互动模式'
      });
    }

    return {
      ...patterns,
      insights,
      confidence: Math.min(0.9, sessions.length / 10),
      riskLevel: this.calculateRiskLevel(patterns)
    };
  }

  /**
   * Analyze emotional journey over time
   */
  analyzeEmotionalJourney(memories, messages) {
    const emotionalMarkers = {
      positive: ['开心', '兴奋', '满足', '感激', '希望', '乐观', '平静', '安心', 'happy', 'excited', 'grateful', 'calm'],
      negative: ['焦虑', '抑郁', '压力', '担心', '痛苦', '无助', '孤独', '愤怒', 'anxious', 'depressed', 'stressed', 'worried'],
      neutral: ['还好', '平常', '正常', 'okay', 'fine', 'normal'],
      crisis: ['绝望', '崩溃', '想死', '自杀', '结束', 'suicidal', 'hopeless', 'give up']
    };

    const journey = [];
    const allTexts = [
      ...memories.map(m => ({ text: m.text, date: m.created_at, type: 'memory' })),
      ...messages.map(m => ({ text: m.content, date: m.created_at, type: 'message' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Analyze emotional state over time
    allTexts.forEach((item, index) => {
      const emotion = this.detectEmotion(item.text, emotionalMarkers);
      journey.push({
        index,
        date: item.date,
        type: item.type,
        emotion,
        intensity: this.calculateEmotionalIntensity(item.text, emotion),
        text: item.text.substring(0, 100)
      });
    });

    // Calculate trends
    const recentWindow = Math.max(5, Math.floor(journey.length * 0.3));
    const recentEmotions = journey.slice(-recentWindow);
    const overallTrend = this.calculateEmotionalTrend(journey);
    const recentTrend = this.calculateEmotionalTrend(recentEmotions);

    const insights = [];

    // Crisis detection
    const crisisSignals = journey.filter(j => j.emotion === 'crisis');
    if (crisisSignals.length > 0) {
      insights.push({
        type: 'crisis_detected',
        message: '检测到危机信号，需要立即关注',
        confidence: 0.95,
        priority: 'critical',
        actionable: true,
        suggestion: '立即提供专业支持资源和紧急联系方式'
      });
    }

    // Negative trend detection
    if (recentTrend.direction === 'declining' && recentTrend.strength > 0.5) {
      insights.push({
        type: 'emotional_decline',
        message: '近期情绪状态呈下降趋势',
        confidence: 0.8,
        actionable: true,
        suggestion: '增加情感支持和积极引导'
      });
    }

    // Positive trend detection
    if (recentTrend.direction === 'improving' && recentTrend.strength > 0.5) {
      insights.push({
        type: 'emotional_improvement',
        message: '近期情绪状态在改善',
        confidence: 0.8,
        actionable: true,
        suggestion: '强化积极因素，维持改善趋势'
      });
    }

    return {
      journey,
      overallTrend,
      recentTrend,
      emotionalStability: this.calculateEmotionalStability(journey),
      dominantEmotion: this.findDominantEmotion(journey),
      insights,
      confidence: Math.min(0.9, journey.length / 15)
    };
  }

  /**
   * Analyze topic progression and interests
   */
  analyzeTopicProgression(memories, messages) {
    const allTexts = [
      ...memories.map(m => ({ text: m.text, date: m.created_at, importance: m.importance })),
      ...messages.filter(m => m.role === 'user').map(m => ({ text: m.content, date: m.created_at, importance: 5 }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Extract topics using keyword clustering
    const topicClusters = this.extractTopicClusters(allTexts);
    const topicEvolution = this.analyzeTopicEvolution(topicClusters, allTexts);

    const insights = [];

    // New interests detection
    const emergingTopics = topicEvolution.filter(t => t.trend === 'emerging');
    emergingTopics.forEach(topic => {
      insights.push({
        type: 'new_interest',
        topic: topic.name,
        message: `用户开始关注"${topic.name}"相关话题`,
        confidence: topic.confidence,
        actionable: true,
        suggestion: `深入了解用户对${topic.name}的具体需求`
      });
    });

    // Declining interests
    const decliningTopics = topicEvolution.filter(t => t.trend === 'declining');
    decliningTopics.forEach(topic => {
      insights.push({
        type: 'declining_interest',
        topic: topic.name,
        message: `用户对"${topic.name}"的关注度在下降`,
        confidence: topic.confidence,
        actionable: true,
        suggestion: `检查相关问题是否已解决或需要新的视角`
      });
    });

    // Persistent themes
    const persistentTopics = topicEvolution.filter(t => t.trend === 'persistent');
    persistentTopics.forEach(topic => {
      if (topic.importance > 7) {
        insights.push({
          type: 'core_concern',
          topic: topic.name,
          message: `"${topic.name}"是用户的核心关注点`,
          confidence: topic.confidence,
          actionable: true,
          suggestion: `为此核心话题制定长期支持策略`
        });
      }
    });

    return {
      topicClusters,
      topicEvolution,
      insights,
      confidence: Math.min(0.9, allTexts.length / 20)
    };
  }

  /**
   * Analyze engagement patterns
   */
  analyzeEngagementPatterns(sessions, messages) {
    const engagementMetrics = {
      responseRate: this.calculateResponseRate(messages),
      messageLength: this.analyzeMessageLength(messages),
      questionAsking: this.analyzeQuestionAsking(messages),
      topicInitiation: this.analyzeTopicInitiation(messages),
      sessionDepth: this.analyzeSessionDepth(sessions, messages)
    };

    const insights = [];

    // High engagement indicators
    if (engagementMetrics.responseRate > 0.8) {
      insights.push({
        type: 'high_engagement',
        message: '用户表现出很高的参与度',
        confidence: 0.9,
        actionable: true,
        suggestion: '继续提供深度互动内容'
      });
    }

    // Low engagement indicators
    if (engagementMetrics.responseRate < 0.3) {
      insights.push({
        type: 'low_engagement',
        message: '用户参与度较低，需要激发兴趣',
        confidence: 0.8,
        actionable: true,
        suggestion: '尝试不同的互动方式和话题'
      });
    }

    // Question asking behavior
    if (engagementMetrics.questionAsking.frequency > 0.3) {
      insights.push({
        type: 'curious_user',
        message: '用户善于提问，求知欲强',
        confidence: 0.8,
        actionable: true,
        suggestion: '提供详细的信息和教育性内容'
      });
    }

    return {
      ...engagementMetrics,
      insights,
      overallScore: this.calculateOverallEngagement(engagementMetrics),
      confidence: Math.min(0.9, messages.length / 30)
    };
  }

  /**
   * Detect crisis indicators
   */
  detectCrisisIndicators(memories, messages) {
    const crisisKeywords = [
      // 中文危机词汇
      '绝望', '崩溃', '想死', '自杀', '结束生命', '没有希望', '活不下去', '痛不欲生',
      '无法承受', '完全失控', '想要逃避', '无法继续', '一切都完了',
      // 英文危机词汇
      'suicidal', 'kill myself', 'end it all', 'give up', 'hopeless', 'can\'t go on',
      'want to die', 'no point', 'worthless', 'better off dead'
    ];

    const escalationWords = [
      '越来越', '更加', '更严重', '恶化', '失控', 'getting worse', 'escalating', 'deteriorating'
    ];

    const allTexts = [
      ...memories.map(m => ({ text: m.text, date: m.created_at, type: 'memory' })),
      ...messages.map(m => ({ text: m.content, date: m.created_at, type: 'message' }))
    ];

    const indicators = [];

    allTexts.forEach(item => {
      const text = item.text.toLowerCase();
      
      // Direct crisis keywords
      crisisKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          indicators.push({
            type: 'direct_crisis',
            keyword,
            text: item.text,
            date: item.date,
            severity: 'critical',
            confidence: 0.95
          });
        }
      });

      // Escalation patterns
      escalationWords.forEach(word => {
        if (text.includes(word)) {
          indicators.push({
            type: 'escalation',
            keyword: word,
            text: item.text,
            date: item.date,
            severity: 'high',
            confidence: 0.7
          });
        }
      });
    });

    // Analyze frequency and recency
    const recentIndicators = indicators.filter(i => 
      new Date(i.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      totalIndicators: indicators.length,
      recentIndicators: recentIndicators.length,
      highestSeverity: indicators.length > 0 ? Math.max(...indicators.map(i => 
        i.severity === 'critical' ? 3 : i.severity === 'high' ? 2 : 1
      )) : 0,
      details: indicators,
      riskLevel: this.calculateCrisisRiskLevel(indicators),
      recommendations: this.generateCrisisRecommendations(indicators)
    };
  }

  /**
   * Detect progress indicators
   */
  detectProgressIndicators(memories, messages) {
    const progressKeywords = [
      // 中文进步词汇
      '改善', '进步', '好转', '恢复', '成功', '完成', '达成', '实现', '克服', '突破',
      '更好', '有效', '有用', '帮助', '收获', '学会', '掌握', '提升',
      // 英文进步词汇
      'improved', 'better', 'progress', 'achievement', 'success', 'overcome', 'breakthrough',
      'learned', 'mastered', 'accomplished', 'effective', 'helpful', 'positive'
    ];

    const goalKeywords = [
      '目标', '计划', '坚持', '习惯', 'goal', 'plan', 'habit', 'routine'
    ];

    const allTexts = [
      ...memories.map(m => ({ text: m.text, date: m.created_at, importance: m.importance, type: 'memory' })),
      ...messages.map(m => ({ text: m.content, date: m.created_at, type: 'message' }))
    ];

    const progressMarkers = [];

    allTexts.forEach(item => {
      const text = item.text.toLowerCase();
      
      progressKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          progressMarkers.push({
            type: 'progress',
            keyword,
            text: item.text,
            date: item.date,
            importance: item.importance || 5,
            confidence: 0.8
          });
        }
      });

      goalKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          progressMarkers.push({
            type: 'goal_related',
            keyword,
            text: item.text,
            date: item.date,
            importance: item.importance || 5,
            confidence: 0.7
          });
        }
      });
    });

    // Analyze progress trajectory
    const progressTrajectory = this.analyzeProgressTrajectory(progressMarkers);

    return {
      totalMarkers: progressMarkers.length,
      progressTrajectory,
      details: progressMarkers,
      overallDirection: this.calculateProgressDirection(progressMarkers),
      recommendations: this.generateProgressRecommendations(progressMarkers)
    };
  }

  // Helper methods for data retrieval
  async getSessionsData(startDate, endDate) {
    try {
      const { data, error } = await supa
        .from('sessions')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[UserBehaviorAnalyzer] Error getting sessions:', error);
      return [];
    }
  }

  async getMemoryData(startDate, endDate) {
    try {
      const { data, error } = await supa
        .from('user_long_memory')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[UserBehaviorAnalyzer] Error getting memory data:', error);
      return [];
    }
  }

  async getMessagesData(startDate, endDate) {
    try {
      const { data, error } = await supa
        .from('messages')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[UserBehaviorAnalyzer] Error getting messages:', error);
      return [];
    }
  }

  // Additional helper methods for analysis calculations
  calculateSessionFrequency(sessions) {
    if (!sessions.length) return { average: 0, trend: 'unknown' };
    
    const daySpan = (new Date(sessions[sessions.length - 1].created_at) - new Date(sessions[0].created_at)) / (1000 * 60 * 60 * 24);
    const average = sessions.length / Math.max(daySpan, 1);
    
    return { average, trend: this.calculateTrend(sessions, 'frequency') };
  }

  calculateSessionDuration(sessions) {
    // Placeholder - would need session end times
    return { average: 15, trend: 'stable' };
  }

  analyzeSessionTiming(sessions) {
    const hourCounts = new Array(24).fill(0);
    sessions.forEach(session => {
      const hour = new Date(session.created_at).getHours();
      hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }))
      .filter(item => item.count === maxCount)
      .map(item => item.hour);
    
    return { hourCounts, peakHours };
  }

  calculateConsistency(sessions) {
    // Simple consistency based on regular intervals
    if (sessions.length < 3) return { score: 0 };
    
    const intervals = [];
    for (let i = 1; i < sessions.length; i++) {
      const interval = new Date(sessions[i].created_at) - new Date(sessions[i-1].created_at);
      intervals.push(interval);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const consistency = 1 / (1 + variance / (avgInterval * avgInterval));
    
    return { score: consistency, avgInterval };
  }

  analyzeWeeklyPattern(sessions) {
    const dayOfWeekCounts = new Array(7).fill(0);
    sessions.forEach(session => {
      const dayOfWeek = new Date(session.created_at).getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });
    
    return { dayOfWeekCounts };
  }

  calculateRiskLevel(patterns) {
    let risk = 0;
    if (patterns.frequency.average < 0.2) risk += 0.3;
    if (patterns.consistency.score < 0.3) risk += 0.2;
    return Math.min(1, risk);
  }

  detectEmotion(text, emotionalMarkers) {
    const lowerText = text.toLowerCase();
    
    if (emotionalMarkers.crisis.some(word => lowerText.includes(word))) return 'crisis';
    if (emotionalMarkers.negative.some(word => lowerText.includes(word))) return 'negative';
    if (emotionalMarkers.positive.some(word => lowerText.includes(word))) return 'positive';
    if (emotionalMarkers.neutral.some(word => lowerText.includes(word))) return 'neutral';
    
    return 'unknown';
  }

  calculateEmotionalIntensity(text, emotion) {
    const intensityWords = ['极度', '非常', '特别', 'extremely', 'very', 'incredibly'];
    const lowerText = text.toLowerCase();
    
    let intensity = emotion === 'crisis' ? 1.0 : 
                   emotion === 'negative' ? 0.7 :
                   emotion === 'positive' ? 0.6 : 0.3;
    
    if (intensityWords.some(word => lowerText.includes(word))) {
      intensity = Math.min(1.0, intensity + 0.3);
    }
    
    return intensity;
  }

  calculateEmotionalTrend(journey) {
    if (journey.length < 3) return { direction: 'unknown', strength: 0 };
    
    const emotionValues = journey.map(j => {
      switch(j.emotion) {
        case 'crisis': return -2;
        case 'negative': return -1;
        case 'neutral': return 0;
        case 'positive': return 1;
        default: return 0;
      }
    });
    
    // Simple linear trend
    const n = emotionValues.length;
    const sumX = n * (n - 1) / 2;
    const sumY = emotionValues.reduce((a, b) => a + b, 0);
    const sumXY = emotionValues.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return {
      direction: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      strength: Math.abs(slope)
    };
  }

  calculateEmotionalStability(journey) {
    if (journey.length < 2) return 0;
    
    const emotionValues = journey.map(j => {
      switch(j.emotion) {
        case 'crisis': return -2;
        case 'negative': return -1;
        case 'neutral': return 0;
        case 'positive': return 1;
        default: return 0;
      }
    });
    
    let changes = 0;
    for (let i = 1; i < emotionValues.length; i++) {
      changes += Math.abs(emotionValues[i] - emotionValues[i-1]);
    }
    
    const avgChange = changes / (emotionValues.length - 1);
    return Math.max(0, 1 - avgChange / 2); // Normalize to 0-1
  }

  findDominantEmotion(journey) {
    const emotionCounts = {};
    journey.forEach(j => {
      emotionCounts[j.emotion] = (emotionCounts[j.emotion] || 0) + 1;
    });
    
    return Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  extractTopicClusters(texts) {
    // Simple keyword-based clustering
    const wordFreq = {};
    const stopWords = new Set(['的', '是', '在', '了', '和', '与', '我', '你', 'the', 'is', 'and', 'or']);
    
    texts.forEach(item => {
      const words = item.text.toLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
      
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
    
    // Group related words into topics
    const topics = Object.entries(wordFreq)
      .filter(([word, freq]) => freq >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, freq]) => ({ name: word, frequency: freq }));
    
    return topics;
  }

  analyzeTopicEvolution(topicClusters, texts) {
    // Analyze how topics change over time
    return topicClusters.map(cluster => {
      const mentions = texts.filter(text => 
        text.text.toLowerCase().includes(cluster.name)
      );
      
      const recentMentions = mentions.filter(m => 
        new Date(m.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      );
      
      const trend = recentMentions.length / Math.max(mentions.length, 1) > 0.5 ? 'emerging' :
                   recentMentions.length === 0 ? 'declining' : 'persistent';
      
      return {
        name: cluster.name,
        trend,
        totalMentions: mentions.length,
        recentMentions: recentMentions.length,
        confidence: Math.min(0.9, mentions.length / 5),
        importance: mentions.reduce((sum, m) => sum + (m.importance || 5), 0) / mentions.length
      };
    });
  }

  // Additional analysis methods...
  calculateResponseRate(messages) {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    return assistantMessages > 0 ? userMessages / assistantMessages : 0;
  }

  analyzeMessageLength(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    if (!userMessages.length) return { average: 0, trend: 'unknown' };
    
    const lengths = userMessages.map(m => m.content.length);
    const average = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    return { average, min: Math.min(...lengths), max: Math.max(...lengths) };
  }

  analyzeQuestionAsking(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    const questionsAsked = userMessages.filter(m => 
      m.content.includes('?') || m.content.includes('？') || 
      m.content.toLowerCase().includes('what') || 
      m.content.includes('什么') || m.content.includes('怎么')
    ).length;
    
    return {
      total: questionsAsked,
      frequency: userMessages.length > 0 ? questionsAsked / userMessages.length : 0
    };
  }

  analyzeTopicInitiation(messages) {
    // Placeholder for topic initiation analysis
    return { frequency: 0.5 };
  }

  analyzeSessionDepth(sessions, messages) {
    if (!sessions.length) return { average: 0 };
    
    const messagesPerSession = messages.length / sessions.length;
    return { average: messagesPerSession };
  }

  calculateOverallEngagement(metrics) {
    const weights = {
      responseRate: 0.3,
      messageLength: 0.2,
      questionAsking: 0.2,
      topicInitiation: 0.15,
      sessionDepth: 0.15
    };
    
    const normalizedMetrics = {
      responseRate: Math.min(1, metrics.responseRate),
      messageLength: Math.min(1, metrics.messageLength.average / 100),
      questionAsking: Math.min(1, metrics.questionAsking.frequency * 2),
      topicInitiation: Math.min(1, metrics.topicInitiation.frequency * 2),
      sessionDepth: Math.min(1, metrics.sessionDepth.average / 10)
    };
    
    return Object.entries(weights)
      .reduce((sum, [metric, weight]) => sum + normalizedMetrics[metric] * weight, 0);
  }

  calculateCrisisRiskLevel(indicators) {
    if (!indicators.length) return 'low';
    
    const criticalCount = indicators.filter(i => i.severity === 'critical').length;
    const recentCount = indicators.filter(i => 
      new Date(i.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    if (criticalCount > 0 || recentCount > 2) return 'critical';
    if (indicators.length > 3) return 'high';
    if (indicators.length > 1) return 'medium';
    return 'low';
  }

  generateCrisisRecommendations(indicators) {
    const recommendations = [];
    
    if (indicators.some(i => i.severity === 'critical')) {
      recommendations.push({
        priority: 'immediate',
        action: '立即提供危机干预资源',
        description: '检测到自杀或自伤想法，需要专业帮助'
      });
    }
    
    if (indicators.length > 2) {
      recommendations.push({
        priority: 'urgent',
        action: '增加监控频率',
        description: '提高关注度，缩短互动间隔'
      });
    }
    
    return recommendations;
  }

  analyzeProgressTrajectory(progressMarkers) {
    if (!progressMarkers.length) return { direction: 'unknown', strength: 0 };
    
    // Sort by date and analyze progression
    const sortedMarkers = progressMarkers.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentMarkers = sortedMarkers.slice(-Math.max(3, Math.floor(sortedMarkers.length * 0.3)));
    
    const avgImportance = recentMarkers.reduce((sum, m) => sum + m.importance, 0) / recentMarkers.length;
    const trend = avgImportance > 6 ? 'strong_progress' : avgImportance > 4 ? 'moderate_progress' : 'slow_progress';
    
    return { direction: trend, strength: avgImportance / 10 };
  }

  calculateProgressDirection(progressMarkers) {
    const recentWeek = progressMarkers.filter(m => 
      new Date(m.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentWeek.length > 2) return 'accelerating';
    if (recentWeek.length > 0) return 'maintaining';
    return 'stagnating';
  }

  generateProgressRecommendations(progressMarkers) {
    const recommendations = [];
    const recentProgress = progressMarkers.filter(m => 
      new Date(m.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );
    
    if (recentProgress.length > 3) {
      recommendations.push({
        priority: 'maintain',
        action: '强化积极因素',
        description: '识别并强化导致进步的因素'
      });
    } else if (recentProgress.length === 0) {
      recommendations.push({
        priority: 'motivate',
        action: '重新激发动力',
        description: '回顾过往成就，设定新的可达成目标'
      });
    }
    
    return recommendations;
  }

  calculateTrend(items, metric) {
    // Simple trend calculation placeholder
    return 'stable';
  }

  extractPersonalityInsights(memories) {
    // Analyze personality traits from memory patterns
    const traits = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0
    };
    
    // Simple trait detection based on keywords
    memories.forEach(memory => {
      const text = memory.text.toLowerCase();
      
      if (text.includes('新') || text.includes('尝试') || text.includes('探索')) {
        traits.openness += 0.1;
      }
      if (text.includes('计划') || text.includes('目标') || text.includes('组织')) {
        traits.conscientiousness += 0.1;
      }
      if (text.includes('社交') || text.includes('朋友') || text.includes('聚会')) {
        traits.extraversion += 0.1;
      }
      if (text.includes('帮助') || text.includes('关心') || text.includes('同情')) {
        traits.agreeableness += 0.1;
      }
      if (text.includes('焦虑') || text.includes('担心') || text.includes('压力')) {
        traits.neuroticism += 0.1;
      }
    });
    
    // Normalize scores
    Object.keys(traits).forEach(trait => {
      traits[trait] = Math.min(1, traits[trait]);
    });
    
    return traits;
  }

  generateBehaviorPredictions(sessions, memories) {
    // Generate predictions about future behavior patterns
    const predictions = [];
    
    // Predict optimal interaction times
    if (sessions.length > 5) {
      const hourPattern = this.analyzeSessionTiming(sessions);
      predictions.push({
        type: 'optimal_timing',
        prediction: `用户可能在${hourPattern.peakHours[0]}点左右最需要支持`,
        confidence: 0.7
      });
    }
    
    // Predict emotional needs
    if (memories.length > 10) {
      const emotionalPattern = this.analyzeEmotionalJourney(memories, []);
      if (emotionalPattern.recentTrend.direction === 'declining') {
        predictions.push({
          type: 'emotional_support',
          prediction: '用户可能需要更多情感支持',
          confidence: 0.8
        });
      }
    }
    
    return predictions;
  }
}

/**
 * Factory function to create analyzer instances
 */
function createUserBehaviorAnalyzer(userId) {
  return new UserBehaviorAnalyzer(userId);
}

module.exports = {
  UserBehaviorAnalyzer,
  createUserBehaviorAnalyzer
};