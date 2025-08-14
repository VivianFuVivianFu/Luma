// Simple Memory System - Manages conversation context and user preferences

class SimpleMemory {
  constructor() {
    this.conversationMemory = [];
    this.userPreferences = {};
    this.emotionalState = {};
    this.sessionContext = {};
    this.maxMemorySize = 100; // Maximum number of interactions to remember
  }

  // Add a new interaction to memory
  addInteraction(userMessage, response, metadata = {}) {
    const interaction = {
      id: this.generateId(),
      timestamp: new Date(),
      user: userMessage,
      assistant: response,
      model: metadata.model || 'unknown',
      confidence: metadata.confidence || 0,
      routing: metadata.routing || {},
      emotionalScore: this.analyzeEmotionalContent(userMessage),
      topicsDiscussed: this.extractTopics(userMessage),
      ...metadata
    };

    this.conversationMemory.push(interaction);

    // Maintain memory size limit
    if (this.conversationMemory.length > this.maxMemorySize) {
      this.conversationMemory = this.conversationMemory.slice(-this.maxMemorySize);
    }

    // Update emotional state tracking
    this.updateEmotionalState(interaction);

    // Update user preferences
    this.updatePreferences(interaction);

    console.log(`[Memory] Added interaction ${interaction.id} with ${metadata.model} model`);
  }

  // Get recent conversation context
  getRecentContext(limit = 5) {
    const recent = this.conversationMemory.slice(-limit);
    return {
      interactions: recent,
      currentEmotionalState: this.emotionalState,
      sessionDuration: this.getSessionDuration(),
      mainTopics: this.getMainTopics(),
      preferredModel: this.getPreferredModel()
    };
  }

  // Get context for specific model routing
  getRoutingContext(userMessage) {
    const recentInteractions = this.conversationMemory.slice(-3);
    const emotionalTrend = this.getEmotionalTrend();
    const topicContinuity = this.checkTopicContinuity(userMessage);

    return {
      previousInteractions: recentInteractions,
      emotionalTrend: emotionalTrend,
      topicContinuity: topicContinuity,
      userMessage: userMessage,
      sessionLength: this.conversationMemory.length
    };
  }

  // Analyze emotional content of a message
  analyzeEmotionalContent(message) {
    const positiveWords = ['happy', 'joy', 'excited', 'grateful', 'love', 'amazing', 'wonderful', 'good', 'great'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'worried', 'anxious', 'depressed', 'hurt', 'pain', 'terrible', 'awful'];
    const neutralWords = ['think', 'consider', 'maybe', 'question', 'wonder', 'curious', 'information'];

    const words = message.toLowerCase().split(/\s+/);
    let positive = 0, negative = 0, neutral = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positive++;
      if (negativeWords.includes(word)) negative++;
      if (neutralWords.includes(word)) neutral++;
    });

    return {
      positive: positive,
      negative: negative,
      neutral: neutral,
      overall: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'
    };
  }

  // Extract topics from user message
  extractTopics(message) {
    const topicKeywords = {
      'relationships': ['relationship', 'partner', 'friend', 'family', 'love', 'dating', 'marriage'],
      'work': ['job', 'work', 'career', 'boss', 'colleague', 'office', 'employment'],
      'mental_health': ['anxiety', 'depression', 'stress', 'mental', 'therapy', 'counseling'],
      'decision_making': ['decide', 'choice', 'option', 'should', 'decision'],
      'personal_growth': ['growth', 'development', 'learning', 'improvement', 'goals'],
      'daily_life': ['day', 'routine', 'daily', 'morning', 'evening', 'weekend']
    };

    const message_lower = message.toLowerCase();
    const topics = [];

    Object.keys(topicKeywords).forEach(topic => {
      if (topicKeywords[topic].some(keyword => message_lower.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['general'];
  }

  // Update emotional state tracking
  updateEmotionalState(interaction) {
    const emotional = interaction.emotionalScore;
    
    if (!this.emotionalState.history) {
      this.emotionalState.history = [];
    }

    this.emotionalState.history.push({
      timestamp: interaction.timestamp,
      score: emotional,
      model: interaction.model
    });

    // Keep only last 20 emotional states
    if (this.emotionalState.history.length > 20) {
      this.emotionalState.history = this.emotionalState.history.slice(-20);
    }

    // Update current state
    this.emotionalState.current = emotional.overall;
    this.emotionalState.trend = this.calculateEmotionalTrend();
  }

  // Update user preferences based on interactions
  updatePreferences(interaction) {
    // Track model effectiveness
    if (!this.userPreferences.modelPreferences) {
      this.userPreferences.modelPreferences = {};
    }

    const model = interaction.model;
    if (!this.userPreferences.modelPreferences[model]) {
      this.userPreferences.modelPreferences[model] = {
        uses: 0,
        positiveResponses: 0,
        topics: {}
      };
    }

    this.userPreferences.modelPreferences[model].uses++;

    // Track topic preferences
    interaction.topicsDiscussed.forEach(topic => {
      if (!this.userPreferences.modelPreferences[model].topics[topic]) {
        this.userPreferences.modelPreferences[model].topics[topic] = 0;
      }
      this.userPreferences.modelPreferences[model].topics[topic]++;
    });

    // Update conversation style preferences
    this.userPreferences.averageMessageLength = this.calculateAverageMessageLength();
    this.userPreferences.preferredTopics = this.getTopTopics();
  }

  // Calculate emotional trend
  calculateEmotionalTrend() {
    if (!this.emotionalState.history || this.emotionalState.history.length < 3) {
      return 'stable';
    }

    const recent = this.emotionalState.history.slice(-3);
    let positiveCount = 0, negativeCount = 0;

    recent.forEach(state => {
      if (state.score.overall === 'positive') positiveCount++;
      if (state.score.overall === 'negative') negativeCount++;
    });

    if (positiveCount > negativeCount) return 'improving';
    if (negativeCount > positiveCount) return 'declining';
    return 'stable';
  }

  // Get emotional trend for routing
  getEmotionalTrend() {
    return {
      current: this.emotionalState.current || 'neutral',
      trend: this.emotionalState.trend || 'stable',
      recentHistory: this.emotionalState.history ? this.emotionalState.history.slice(-5) : []
    };
  }

  // Check topic continuity
  checkTopicContinuity(currentMessage) {
    if (this.conversationMemory.length === 0) return null;

    const currentTopics = this.extractTopics(currentMessage);
    const lastInteraction = this.conversationMemory.slice(-1)[0];
    
    if (!lastInteraction) return null;

    const lastTopics = lastInteraction.topicsDiscussed;
    const commonTopics = currentTopics.filter(topic => lastTopics.includes(topic));

    return {
      continuingTopics: commonTopics,
      newTopics: currentTopics.filter(topic => !lastTopics.includes(topic)),
      isContinuation: commonTopics.length > 0
    };
  }

  // Get main topics discussed in session
  getMainTopics() {
    const topicCounts = {};
    
    this.conversationMemory.forEach(interaction => {
      interaction.topicsDiscussed.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  // Get preferred model based on usage and topics
  getPreferredModel() {
    if (!this.userPreferences.modelPreferences) return null;

    const models = Object.entries(this.userPreferences.modelPreferences);
    if (models.length === 0) return null;

    return models.sort((a, b) => b[1].uses - a[1].uses)[0][0];
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  getSessionDuration() {
    if (this.conversationMemory.length === 0) return 0;
    
    const firstInteraction = this.conversationMemory[0];
    const lastInteraction = this.conversationMemory[this.conversationMemory.length - 1];
    
    return lastInteraction.timestamp - firstInteraction.timestamp;
  }

  calculateAverageMessageLength() {
    if (this.conversationMemory.length === 0) return 0;
    
    const totalLength = this.conversationMemory.reduce((sum, interaction) => 
      sum + interaction.user.length, 0
    );
    
    return Math.round(totalLength / this.conversationMemory.length);
  }

  getTopTopics() {
    const topicCounts = {};
    
    this.conversationMemory.forEach(interaction => {
      interaction.topicsDiscussed.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => ({ topic: entry[0], count: entry[1] }));
  }

  // Clear all memory
  clearMemory() {
    this.conversationMemory = [];
    this.userPreferences = {};
    this.emotionalState = {};
    this.sessionContext = {};
    console.log('[Memory] All memory cleared');
  }

  // Get memory statistics
  getMemoryStats() {
    return {
      totalInteractions: this.conversationMemory.length,
      sessionDuration: this.getSessionDuration(),
      mainTopics: this.getMainTopics(),
      emotionalTrend: this.getEmotionalTrend(),
      preferredModel: this.getPreferredModel(),
      averageMessageLength: this.userPreferences.averageMessageLength || 0
    };
  }
}

export default SimpleMemory;