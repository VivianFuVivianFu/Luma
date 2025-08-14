// Reasoning Model - Handles logical reasoning and problem-solving
// Uses Google's Flan-T5 for logical reasoning tasks

class ReasoningModel {
  constructor() {
    this.apiUrl = 'https://api-inference.huggingface.co/models/google/flan-t5-large';
    this.apiKey = process.env.HF_API_TOKEN || import.meta.env?.HF_API_TOKEN || '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';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Reasoning context and history
    this.reasoningHistory = [];
  }

  async generateLogicalResponse(userMessage, context = null) {
    try {
      // Preprocess the message for reasoning
      const reasoningPrompt = this.buildReasoningPrompt(userMessage, context);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: reasoningPrompt,
          parameters: {
            max_length: 200,
            temperature: 0.3, // Lower temperature for more focused reasoning
            do_sample: true,
            top_p: 0.8,
            repetition_penalty: 1.1
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

      let generatedText = '';
      if (Array.isArray(data) && data.length > 0) {
        generatedText = data[0].generated_text || '';
      } else if (data.generated_text) {
        generatedText = data.generated_text;
      }

      // Process and enhance the reasoning response
      const reasoningResponse = this.enhanceReasoningResponse(generatedText, userMessage);
      
      // Add to reasoning history
      this.reasoningHistory.push({
        user: userMessage,
        bot: reasoningResponse,
        timestamp: new Date(),
        type: 'reasoning'
      });

      // Keep only last 3 reasoning exchanges
      if (this.reasoningHistory.length > 3) {
        this.reasoningHistory = this.reasoningHistory.slice(-3);
      }

      console.log(`[Reasoning] Generated logical response for analytical input`);
      
      return reasoningResponse;

    } catch (error) {
      console.error('Reasoning model error:', error);
      return this.getFallbackReasoningResponse(userMessage);
    }
  }

  buildReasoningPrompt(userMessage, context) {
    // Create a reasoning-focused prompt
    let prompt = "You are an analytical AI assistant that helps with logical thinking, problem-solving, and providing clear explanations. ";
    prompt += "Break down complex problems into steps and provide structured reasoning. ";
    
    // Add context from previous reasoning exchanges
    if (this.reasoningHistory.length > 0) {
      const recentReasoning = this.reasoningHistory.slice(-1);
      recentReasoning.forEach(exchange => {
        prompt += `Previous question: ${exchange.user} Previous analysis: ${exchange.bot} `;
      });
    }
    
    // Add task-specific prompts based on the message type
    if (this.isDecisionMaking(userMessage)) {
      prompt += "Help analyze the options and provide a structured decision-making framework. ";
    } else if (this.isProblemSolving(userMessage)) {
      prompt += "Break down this problem into steps and suggest systematic solutions. ";
    } else if (this.isExplanationRequest(userMessage)) {
      prompt += "Provide a clear, logical explanation with examples where helpful. ";
    }
    
    prompt += `Question: ${userMessage} Analysis:`;
    
    return prompt;
  }

  isDecisionMaking(message) {
    const decisionKeywords = ['decide', 'choice', 'option', 'should i', 'which', 'better', 'choose'];
    return decisionKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isProblemSolving(message) {
    const problemKeywords = ['problem', 'solve', 'fix', 'issue', 'trouble', 'stuck', 'difficulty'];
    return problemKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isExplanationRequest(message) {
    const explanationKeywords = ['explain', 'why', 'how', 'what', 'understand', 'meaning'];
    return explanationKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  enhanceReasoningResponse(response, userMessage) {
    // Clean the response
    let cleanedResponse = response.replace(/Question:|Analysis:|Previous question:|Previous analysis:/gi, '').trim();
    
    // Remove repetition of user message
    cleanedResponse = cleanedResponse.replace(userMessage, '').trim();
    
    // Add structure if response lacks it
    if (cleanedResponse.length > 0 && !this.hasStructure(cleanedResponse)) {
      cleanedResponse = this.addStructure(cleanedResponse, userMessage);
    }
    
    return cleanedResponse || this.getFallbackReasoningResponse(userMessage);
  }

  hasStructure(response) {
    // Check if response already has structured elements
    const structureIndicators = ['first', 'second', 'step', 'option', '1.', '2.', 'because', 'therefore'];
    return structureIndicators.some(indicator => response.toLowerCase().includes(indicator));
  }

  addStructure(response, userMessage) {
    if (this.isDecisionMaking(userMessage)) {
      return `Here's a structured approach to your decision:\n\n${response}\n\nConsider weighing the pros and cons of each option to help guide your choice.`;
    } else if (this.isProblemSolving(userMessage)) {
      return `Let's break this down systematically:\n\n${response}\n\nWould you like me to help you explore any of these aspects in more detail?`;
    } else {
      return `${response}\n\nThis analysis addresses the key aspects of your question. Let me know if you'd like me to elaborate on any particular point.`;
    }
  }

  getFallbackReasoningResponse(userMessage) {
    if (this.isDecisionMaking(userMessage)) {
      return "To help you make this decision, let's consider the key factors involved. What are the main options you're weighing, and what outcomes are most important to you? I can help you create a structured comparison to guide your choice.";
    } else if (this.isProblemSolving(userMessage)) {
      return "Let's approach this problem systematically. First, we should clearly define what the core issue is, then identify potential causes, and finally explore different solution strategies. What aspect of this problem would you like to tackle first?";
    } else if (this.isExplanationRequest(userMessage)) {
      return "I'd be happy to help explain this concept. To give you the most useful explanation, could you let me know what specific aspect you'd like me to focus on, or what level of detail would be most helpful for your understanding?";
    } else {
      return "I can help you think through this logically. Let me break down the key elements and provide a structured analysis. What specific aspect would you like me to focus on first?";
    }
  }

  clearHistory() {
    this.reasoningHistory = [];
  }
}

export default ReasoningModel;