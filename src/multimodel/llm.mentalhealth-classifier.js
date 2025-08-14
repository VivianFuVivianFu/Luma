// Mental Health Classification Model - Detects mental health conditions from text
// Uses BERT fine-tuned for mental health classification

class MentalHealthClassifier {
  constructor() {
    this.apiUrl = 'https://api-inference.huggingface.co/models/Elite13/bert-finetuned-mental-health';
    this.apiKey = process.env.HF_API_TOKEN || import.meta.env?.HF_API_TOKEN || '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';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Classification history for tracking patterns
    this.classificationHistory = [];
  }

  async classifyMentalHealth(userMessage) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: userMessage,
          options: {
            wait_for_model: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Process classification results
      const classification = this.processClassificationResults(data, userMessage);
      
      // Store in history
      this.classificationHistory.push({
        input: userMessage,
        results: classification,
        timestamp: new Date()
      });

      // Keep only last 10 classifications
      if (this.classificationHistory.length > 10) {
        this.classificationHistory = this.classificationHistory.slice(-10);
      }

      console.log(`[MentalHealth] Classified: ${classification.primaryCondition} (${(classification.confidence * 100).toFixed(1)}%)`);
      
      return classification;

    } catch (error) {
      console.error('Mental health classification error:', error);
      return this.getFallbackClassification(userMessage);
    }
  }

  processClassificationResults(apiResults, userMessage) {
    // Handle different response formats
    let results = Array.isArray(apiResults) ? apiResults : [apiResults];
    
    // Sort by confidence score
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    const primaryResult = results[0] || {};
    const primaryCondition = primaryResult.label || 'general_concern';
    const confidence = primaryResult.score || 0;
    
    return {
      primaryCondition: primaryCondition,
      confidence: confidence,
      allResults: results,
      severity: this.assessSeverity(primaryCondition, confidence, userMessage),
      recommendations: this.getRecommendations(primaryCondition, confidence),
      timestamp: new Date()
    };
  }

  assessSeverity(condition, confidence, message) {
    // Assess severity based on condition, confidence, and content
    const severityKeywords = {
      high: ['suicide', 'kill myself', 'end it all', 'can\'t take it', 'hopeless', 'worthless'],
      medium: ['very', 'extremely', 'severe', 'terrible', 'awful', 'can\'t cope'],
      low: ['a bit', 'sometimes', 'occasionally', 'mild', 'slight']
    };
    
    const messageLower = message.toLowerCase();
    
    // Check for high severity indicators
    if (severityKeywords.high.some(keyword => messageLower.includes(keyword))) {
      return 'high';
    }
    
    // Check confidence and condition combination
    if (confidence > 0.8) {
      if (['depression', 'anxiety', 'ptsd', 'bipolar'].includes(condition.toLowerCase())) {
        if (severityKeywords.medium.some(keyword => messageLower.includes(keyword))) {
          return 'medium';
        }
      }
    }
    
    if (severityKeywords.low.some(keyword => messageLower.includes(keyword))) {
      return 'low';
    }
    
    // Default based on confidence
    if (confidence > 0.7) return 'medium';
    return 'low';
  }

  getRecommendations(condition, confidence) {
    const recommendations = {
      routing: 'empathy', // Default routing
      priority: 'normal',
      specializedResponse: false
    };

    switch (condition.toLowerCase()) {
      case 'anxiety':
        recommendations.routing = 'empathy';
        recommendations.specializedResponse = true;
        if (confidence > 0.8) {
          recommendations.priority = 'high';
        }
        break;
        
      case 'depression':
        recommendations.routing = 'empathy';
        recommendations.specializedResponse = true;
        recommendations.priority = 'high';
        break;
        
      case 'stress':
      case 'burnout':
        recommendations.routing = 'reasoning';
        recommendations.specializedResponse = true;
        break;
        
      case 'ptsd':
      case 'trauma':
        recommendations.routing = 'empathy';
        recommendations.priority = 'high';
        recommendations.specializedResponse = true;
        break;
        
      default:
        recommendations.routing = 'empathy';
        break;
    }
    
    return recommendations;
  }

  getFallbackClassification(userMessage) {
    // Keyword-based fallback classification
    const messageLower = userMessage.toLowerCase();
    
    const patterns = {
      anxiety: ['anxious', 'anxiety', 'worried', 'panic', 'nervous', 'stress'],
      depression: ['depressed', 'sad', 'hopeless', 'empty', 'down', 'low'],
      sleep_disorder: ['sleep', 'insomnia', 'tired', 'exhausted'],
      stress: ['stressed', 'overwhelmed', 'pressure', 'burden'],
      general_concern: ['help', 'support', 'talk', 'feel']
    };
    
    let bestMatch = 'general_concern';
    let bestScore = 0;
    
    for (const [condition, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => messageLower.includes(keyword)).length;
      const score = matches / keywords.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = condition;
      }
    }
    
    const confidence = Math.min(bestScore + 0.3, 0.9); // Cap at 0.9 for fallback
    
    return {
      primaryCondition: bestMatch,
      confidence: confidence,
      allResults: [{ label: bestMatch, score: confidence }],
      severity: this.assessSeverity(bestMatch, confidence, userMessage),
      recommendations: this.getRecommendations(bestMatch, confidence),
      timestamp: new Date(),
      fallback: true
    };
  }

  getClassificationHistory() {
    return this.classificationHistory;
  }

  getPatternAnalysis() {
    if (this.classificationHistory.length < 2) {
      return null;
    }
    
    const conditions = this.classificationHistory.map(item => item.results.primaryCondition);
    const conditionCounts = {};
    
    conditions.forEach(condition => {
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    
    const dominantCondition = Object.entries(conditionCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      dominantCondition: dominantCondition[0],
      frequency: dominantCondition[1],
      totalClassifications: this.classificationHistory.length,
      pattern: this.classificationHistory.length >= 3 ? 'recurring' : 'emerging'
    };
  }

  clearHistory() {
    this.classificationHistory = [];
  }
}

export default MentalHealthClassifier;