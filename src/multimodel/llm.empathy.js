// Empathy Model - Handles emotional support and empathetic responses
// Uses Facebook's BlenderBot for empathetic conversation

class EmpathyModel {
  constructor() {
    this.apiUrl = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';
    this.apiKey = process.env.HF_API_TOKEN || import.meta.env?.HF_API_TOKEN || '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';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Conversation history for context
    this.conversationHistory = [];
  }

  async generateEmpathicResponse(userMessage, context = null) {
    try {
      // Build conversation context
      const conversationContext = this.buildContext(userMessage, context);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: conversationContext,
          parameters: {
            max_length: 150,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            pad_token_id: 50256
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

      // Clean and enhance the response
      const empathicResponse = this.enhanceEmpathicResponse(generatedText, userMessage);
      
      // Add to conversation history
      this.conversationHistory.push({
        user: userMessage,
        bot: empathicResponse,
        timestamp: new Date()
      });

      // Keep only last 5 exchanges
      if (this.conversationHistory.length > 5) {
        this.conversationHistory = this.conversationHistory.slice(-5);
      }

      console.log(`[Empathy] Generated empathic response for emotional input`);
      
      return empathicResponse;

    } catch (error) {
      console.error('Empathy model error:', error);
      return this.getFallbackEmpathicResponse(userMessage);
    }
  }

  buildContext(userMessage, context) {
    // Add empathy system prompt
    let prompt = "You are a compassionate AI companion focused on providing emotional support. Respond with empathy, understanding, and care. ";
    
    // Add recent conversation history
    if (this.conversationHistory.length > 0) {
      const recentHistory = this.conversationHistory.slice(-2);
      recentHistory.forEach(exchange => {
        prompt += `Human: ${exchange.user} AI: ${exchange.bot} `;
      });
    }
    
    // Add current message
    prompt += `Human: ${userMessage} AI:`;
    
    return prompt;
  }

  enhanceEmpathicResponse(response, userMessage) {
    // Clean the response
    let cleanedResponse = response.replace(/Human:|AI:|bot:|human:/gi, '').trim();
    
    // Remove any repetition of the user's message
    cleanedResponse = cleanedResponse.replace(userMessage, '').trim();
    
    // Add empathic prefixes if response seems too short or generic
    const empathicPrefixes = [
      "I can hear that you're going through something difficult. ",
      "It sounds like you're dealing with a lot right now. ",
      "I understand this must be challenging for you. ",
      "Your feelings are completely valid. ",
      "Thank you for sharing this with me. "
    ];
    
    if (cleanedResponse.length < 30 || this.isGenericResponse(cleanedResponse)) {
      const prefix = empathicPrefixes[Math.floor(Math.random() * empathicPrefixes.length)];
      cleanedResponse = prefix + cleanedResponse;
    }
    
    return cleanedResponse || this.getFallbackEmpathicResponse(userMessage);
  }

  isGenericResponse(response) {
    const genericPhrases = ['okay', 'i see', 'yes', 'no', 'sure', 'alright'];
    return genericPhrases.some(phrase => response.toLowerCase().includes(phrase)) && response.length < 20;
  }

  getFallbackEmpathicResponse(userMessage) {
    const fallbackResponses = [
      "I can hear the emotion in your words, and I want you to know that your feelings are valid. I'm here to listen and support you through this.",
      "Thank you for sharing something so personal with me. It takes courage to open up about difficult feelings. How can I best support you right now?",
      "I can sense this is weighing heavily on you. Sometimes just having someone acknowledge what you're going through can help. I'm here with you.",
      "Your emotions matter, and what you're experiencing is real and important. Take all the time you need - I'm here to listen without judgment.",
      "I understand this must be difficult to talk about. You don't have to go through this alone. What would feel most helpful for you right now?"
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export default EmpathyModel;