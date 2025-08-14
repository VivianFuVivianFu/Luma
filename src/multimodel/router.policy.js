// Router Policy - Manages routing between different models and handles policy decisions

class RouterPolicy {
  constructor() {
    this.routingHistory = [];
    this.performanceMetrics = {
      empathy: { successes: 0, failures: 0, avgResponseTime: 0 },
      reasoning: { successes: 0, failures: 0, avgResponseTime: 0 },
      triage: { successes: 0, failures: 0, avgResponseTime: 0 }
    };
  }

  // Main routing decision based on triage results and policy rules
  async routeMessage(triageResult, userMessage, context = null) {
    const startTime = Date.now();
    
    try {
      // Apply routing policies
      const routingDecision = this.applyRoutingPolicies(triageResult, userMessage, context);
      
      // Log routing decision
      this.logRoutingDecision(userMessage, triageResult, routingDecision);
      
      // Track metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics('triage', true, responseTime);
      
      return routingDecision;
      
    } catch (error) {
      console.error('Router policy error:', error);
      this.updateMetrics('triage', false, Date.now() - startTime);
      
      // Fallback to empathy model on routing error
      return {
        model: 'empathy',
        confidence: 0.5,
        reason: 'fallback_due_to_error',
        override: true
      };
    }
  }

  applyRoutingPolicies(triageResult, userMessage, context) {
    // Policy 1: Emergency or crisis detection
    if (this.detectCrisis(userMessage)) {
      return {
        model: 'empathy',
        confidence: 1.0,
        reason: 'crisis_detected',
        priority: 'high',
        override: true
      };
    }

    // Policy 2: Explicit reasoning request
    if (this.detectExplicitReasoningRequest(userMessage)) {
      return {
        model: 'reasoning',
        confidence: 0.9,
        reason: 'explicit_reasoning_request',
        priority: 'medium'
      };
    }

    // Policy 3: Follow-up context consideration
    const contextualRoute = this.considerContext(context, triageResult);
    if (contextualRoute) {
      return contextualRoute;
    }

    // Policy 4: Model performance consideration
    const performanceRoute = this.considerPerformance(triageResult);
    if (performanceRoute) {
      return performanceRoute;
    }

    // Policy 5: Default to triage recommendation
    return {
      model: triageResult.route,
      confidence: triageResult.confidence,
      reason: 'triage_recommendation',
      priority: 'normal'
    };
  }

  detectCrisis(userMessage) {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'want to die', 'no point living',
      'harm myself', 'hurt myself', 'emergency', 'crisis', 'urgent help',
      'can\'t go on', 'give up', 'hopeless', 'worthless'
    ];
    
    const message = userMessage.toLowerCase();
    return crisisKeywords.some(keyword => message.includes(keyword));
  }

  detectExplicitReasoningRequest(userMessage) {
    const reasoningPhrases = [
      'help me think through', 'analyze this', 'break this down',
      'logical approach', 'step by step', 'pros and cons',
      'systematic', 'analytical', 'logical reasoning'
    ];
    
    const message = userMessage.toLowerCase();
    return reasoningPhrases.some(phrase => message.includes(phrase));
  }

  considerContext(context, triageResult) {
    if (!context || !context.previousInteractions) {
      return null;
    }

    // If last interaction was emotional and current is neutral, continue with empathy
    const lastInteraction = context.previousInteractions.slice(-1)[0];
    if (lastInteraction && lastInteraction.model === 'empathy' && triageResult.type === 'neutral') {
      return {
        model: 'empathy',
        confidence: 0.7,
        reason: 'contextual_continuity',
        priority: 'medium'
      };
    }

    // If in the middle of a reasoning chain, continue with reasoning
    if (lastInteraction && lastInteraction.model === 'reasoning' && 
        this.isFollowUpQuestion(context.userMessage)) {
      return {
        model: 'reasoning',
        confidence: 0.8,
        reason: 'reasoning_continuity',
        priority: 'medium'
      };
    }

    return null;
  }

  isFollowUpQuestion(userMessage) {
    const followUpPhrases = [
      'what about', 'and also', 'but what if', 'can you explain',
      'tell me more', 'elaborate', 'continue', 'next step'
    ];
    
    const message = userMessage.toLowerCase();
    return followUpPhrases.some(phrase => message.includes(phrase));
  }

  considerPerformance(triageResult) {
    const recommendedModel = triageResult.route;
    const metrics = this.performanceMetrics[recommendedModel];
    
    if (!metrics) return null;
    
    // If recommended model has high failure rate, consider alternative
    const failureRate = metrics.failures / (metrics.successes + metrics.failures);
    if (failureRate > 0.3 && (metrics.successes + metrics.failures) > 5) {
      
      // Switch to alternative model based on context
      const alternativeModel = recommendedModel === 'empathy' ? 'reasoning' : 'empathy';
      
      return {
        model: alternativeModel,
        confidence: triageResult.confidence * 0.7,
        reason: 'performance_consideration',
        priority: 'low',
        originalRecommendation: recommendedModel
      };
    }
    
    return null;
  }

  logRoutingDecision(userMessage, triageResult, routingDecision) {
    const logEntry = {
      timestamp: new Date(),
      userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
      triageType: triageResult.type,
      triageRoute: triageResult.route,
      triageConfidence: triageResult.confidence,
      finalRoute: routingDecision.model,
      finalConfidence: routingDecision.confidence,
      reason: routingDecision.reason,
      priority: routingDecision.priority,
      override: routingDecision.override || false
    };
    
    this.routingHistory.push(logEntry);
    
    // Keep only last 50 routing decisions
    if (this.routingHistory.length > 50) {
      this.routingHistory = this.routingHistory.slice(-50);
    }
    
    console.log(`[Router] ${userMessage.substring(0, 50)}... -> ${routingDecision.model} (${routingDecision.reason})`);
  }

  updateMetrics(model, success, responseTime) {
    if (!this.performanceMetrics[model]) {
      this.performanceMetrics[model] = { successes: 0, failures: 0, avgResponseTime: 0 };
    }
    
    const metrics = this.performanceMetrics[model];
    
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }
    
    // Update average response time
    const totalInteractions = metrics.successes + metrics.failures;
    metrics.avgResponseTime = ((metrics.avgResponseTime * (totalInteractions - 1)) + responseTime) / totalInteractions;
  }

  getMetrics() {
    return {
      performance: this.performanceMetrics,
      recentRouting: this.routingHistory.slice(-10),
      totalRoutingDecisions: this.routingHistory.length
    };
  }

  getRoutingStats() {
    const stats = {
      empathy: 0,
      reasoning: 0,
      total: this.routingHistory.length
    };
    
    this.routingHistory.forEach(entry => {
      if (stats[entry.finalRoute] !== undefined) {
        stats[entry.finalRoute]++;
      }
    });
    
    return stats;
  }

  clearHistory() {
    this.routingHistory = [];
    this.performanceMetrics = {
      empathy: { successes: 0, failures: 0, avgResponseTime: 0 },
      reasoning: { successes: 0, failures: 0, avgResponseTime: 0 },
      triage: { successes: 0, failures: 0, avgResponseTime: 0 }
    };
  }
}

export default RouterPolicy;