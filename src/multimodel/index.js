// Multi-Model System - Main coordinator for LUMA's enhanced chat functionality
// Orchestrates triage, empathy, reasoning models with memory and routing policy

import TriageModel from './llm.triage.js';
import EmpathyModel from './llm.empathy.js';
import ReasoningModel from './llm.reason.together.js';
import PsychologicalModel from './llm.psychological.js';
import MentalHealthClassifier from './llm.mentalhealth-classifier.js';
import RouterPolicy from './router.policy.js';
import SimpleMemory from './memory.simple.js';

class MultiModelSystem {
  constructor() {
    // Initialize all models
    this.triageModel = new TriageModel();
    this.empathyModel = new EmpathyModel();
    this.reasoningModel = new ReasoningModel();
    this.psychologicalModel = new PsychologicalModel();
    this.mentalHealthClassifier = new MentalHealthClassifier();
    this.routerPolicy = new RouterPolicy();
    this.memory = new SimpleMemory();
    
    // System state
    this.isInitialized = false;
    this.systemMetrics = {
      totalRequests: 0,
      successfulResponses: 0,
      averageResponseTime: 0,
      modelUsage: {
        empathy: 0,
        reasoning: 0,
        psychological: 0,
        fallback: 0
      }
    };
    
    console.log('[MultiModel] System initialized with 5 models + memory + routing');
  }

  // Main entry point for processing user messages
  async processMessage(userMessage, options = {}) {
    const startTime = Date.now();
    this.systemMetrics.totalRequests++;
    
    try {
      console.log(`[MultiModel] Processing: "${userMessage.substring(0, 50)}..."`);
      
      // Step 1: Mental Health Classification
      const mentalHealthClassification = await this.mentalHealthClassifier.classifyMentalHealth(userMessage);
      
      // Step 2: Triage - Classify the input
      const triageResult = await this.triageModel.analyze(userMessage);
      
      // Step 3: Get memory context for routing
      const memoryContext = this.memory.getRoutingContext(userMessage);
      
      // Step 4: Apply routing policy (enhanced with mental health data)
      const routingDecision = await this.routerPolicy.routeMessage(
        triageResult, 
        userMessage, 
        { ...memoryContext, mentalHealthClassification }
      );
      
      // Step 5: Generate response using selected model
      const response = await this.generateResponse(
        routingDecision, 
        userMessage, 
        { ...memoryContext, mentalHealthClassification }
      );
      
      // Step 6: Store interaction in memory (with mental health data)
      this.memory.addInteraction(userMessage, response, {
        model: routingDecision.model,
        confidence: routingDecision.confidence,
        routing: routingDecision,
        triage: triageResult,
        mentalHealthClassification: mentalHealthClassification,
        responseTime: Date.now() - startTime
      });
      
      // Step 6: Update system metrics
      this.updateSystemMetrics(routingDecision.model, true, Date.now() - startTime);
      
      console.log(`[MultiModel] Response generated via ${routingDecision.model} model (${Date.now() - startTime}ms)`);
      
      return {
        response: response,
        metadata: {
          model: routingDecision.model,
          confidence: routingDecision.confidence,
          triageType: triageResult.type,
          responseTime: Date.now() - startTime,
          routing: routingDecision
        }
      };
      
    } catch (error) {
      console.error('[MultiModel] Error processing message:', error);
      
      // Fallback response
      const fallbackResponse = this.getFallbackResponse(userMessage);
      this.updateSystemMetrics('fallback', false, Date.now() - startTime);
      
      return {
        response: fallbackResponse,
        metadata: {
          model: 'fallback',
          confidence: 0.3,
          triageType: 'error',
          responseTime: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  // Generate response using the selected model
  async generateResponse(routingDecision, userMessage, context) {
    const model = routingDecision.model;
    
    try {
      let response;
      
      switch (model) {
        case 'empathy':
          response = await this.empathyModel.generateEmpathicResponse(userMessage, context);
          break;
          
        case 'reasoning':
          response = await this.reasoningModel.generateLogicalResponse(userMessage, context);
          break;
          
        case 'psychological':
          response = await this.psychologicalModel.generatePsychologicalInsight(userMessage, context);
          break;
          
        default:
          console.warn(`[MultiModel] Unknown model ${model}, defaulting to empathy`);
          response = await this.empathyModel.generateEmpathicResponse(userMessage, context);
          break;
      }
      
      return response;
      
    } catch (error) {
      console.error(`[MultiModel] Error generating response with ${model} model:`, error);
      
      // Try alternative model
      const alternativeModel = model === 'empathy' ? 'reasoning' : 'empathy';
      console.log(`[MultiModel] Attempting fallback to ${alternativeModel} model`);
      
      try {
        if (alternativeModel === 'empathy') {
          return await this.empathyModel.generateEmpathicResponse(userMessage, context);
        } else {
          return await this.reasoningModel.generateLogicalResponse(userMessage, context);
        }
      } catch (fallbackError) {
        console.error(`[MultiModel] Fallback model also failed:`, fallbackError);
        return this.getFallbackResponse(userMessage);
      }
    }
  }

  // Get fallback response when all models fail
  getFallbackResponse(userMessage) {
    const fallbackResponses = [
      "I'm here to listen and support you. Sometimes I have technical difficulties, but I care about what you're sharing with me. Can you tell me more about what's on your mind?",
      "I want to help you work through this. While I'm having some technical issues right now, your feelings and thoughts are important to me. What would be most helpful for you right now?",
      "I'm experiencing some technical difficulties, but I'm still here with you. What you're sharing matters, and I'd like to understand better how I can support you today.",
      "Even though I'm having some technical challenges right now, I want you to know that I'm here to listen. What's the most important thing you'd like to talk about?",
      "I'm having some technical issues, but your wellbeing is important to me. Can you help me understand what kind of support would be most helpful for you right now?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  // Update system performance metrics
  updateSystemMetrics(model, success, responseTime) {
    if (success) {
      this.systemMetrics.successfulResponses++;
    }
    
    // Update model usage
    if (this.systemMetrics.modelUsage[model] !== undefined) {
      this.systemMetrics.modelUsage[model]++;
    }
    
    // Update average response time
    const totalRequests = this.systemMetrics.totalRequests;
    this.systemMetrics.averageResponseTime = 
      ((this.systemMetrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Get system statistics and performance metrics
  getSystemMetrics() {
    return {
      system: this.systemMetrics,
      router: this.routerPolicy.getMetrics(),
      memory: this.memory.getMemoryStats(),
      models: {
        empathy: this.empathyModel.conversationHistory?.length || 0,
        reasoning: this.reasoningModel.reasoningHistory?.length || 0
      }
    };
  }

  // Get routing statistics
  getRoutingStats() {
    return this.routerPolicy.getRoutingStats();
  }

  // Test the system with sample inputs
  async testSystem() {
    console.log('[MultiModel] Running system tests...');
    
    const testMessages = [
      "I'm feeling really sad and overwhelmed today",
      "Can you help me analyze the pros and cons of changing jobs?",
      "I'm anxious about my relationship and don't know what to do",
      "What's the best logical approach to solving this problem?",
      "I feel so hopeless and can't see a way forward"
    ];
    
    const results = [];
    
    for (const message of testMessages) {
      try {
        const result = await this.processMessage(message);
        results.push({
          input: message,
          model: result.metadata.model,
          confidence: result.metadata.confidence,
          responseTime: result.metadata.responseTime,
          success: true
        });
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          input: message,
          error: error.message,
          success: false
        });
      }
    }
    
    console.log('[MultiModel] Test results:', results);
    return results;
  }

  // Clear all system memory and reset
  clearSystem() {
    this.memory.clearMemory();
    this.routerPolicy.clearHistory();
    this.empathyModel.clearHistory();
    this.reasoningModel.clearHistory();
    
    // Reset metrics
    this.systemMetrics = {
      totalRequests: 0,
      successfulResponses: 0,
      averageResponseTime: 0,
      modelUsage: {
        empathy: 0,
        reasoning: 0,
        psychological: 0,
        fallback: 0
      }
    };
    
    console.log('[MultiModel] System cleared and reset');
  }

  // Check system health
  getSystemHealth() {
    const metrics = this.getSystemMetrics();
    const successRate = metrics.system.totalRequests > 0 ? 
      (metrics.system.successfulResponses / metrics.system.totalRequests) : 1;
    
    return {
      status: successRate > 0.8 ? 'healthy' : successRate > 0.5 ? 'degraded' : 'unhealthy',
      successRate: successRate,
      averageResponseTime: metrics.system.averageResponseTime,
      totalRequests: metrics.system.totalRequests,
      memorySize: metrics.memory.totalInteractions,
      lastUpdated: new Date()
    };
  }
}

export default MultiModelSystem;