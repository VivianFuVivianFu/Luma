// Psychological Reasoning Model - Specialized for mental health and psychological insights
// Uses Qwen3 Psychological Reasoning model for advanced psychological analysis

class PsychologicalModel {
  constructor() {
    this.apiUrl = 'https://api-inference.huggingface.co/models/gustavecortal/Qwen3-psychological-reasoning-4B';
    this.apiKey = process.env.HF_API_TOKEN || import.meta.env?.HF_API_TOKEN || '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';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Specialized psychological conversation history
    this.psychologicalHistory = [];
  }

  async generatePsychologicalInsight(userMessage, context = null) {
    try {
      // Build psychological context
      const psychPrompt = this.buildPsychologicalPrompt(userMessage, context);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          inputs: psychPrompt,
          parameters: {
            max_length: 300,
            temperature: 0.6, // Slightly lower for more focused psychological insights
            do_sample: true,
            top_p: 0.85,
            repetition_penalty: 1.15
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

      // Process and enhance the psychological response
      const psychologicalResponse = this.enhancePsychologicalResponse(generatedText, userMessage);
      
      // Add to psychological history
      this.psychologicalHistory.push({
        user: userMessage,
        bot: psychologicalResponse,
        timestamp: new Date(),
        type: 'psychological_insight'
      });

      // Keep only last 3 psychological exchanges
      if (this.psychologicalHistory.length > 3) {
        this.psychologicalHistory = this.psychologicalHistory.slice(-3);
      }

      console.log(`[Psychological] Generated evidence-based psychological insight`);
      
      return psychologicalResponse;

    } catch (error) {
      console.error('Psychological model error:', error);
      return this.getFallbackPsychologicalResponse(userMessage);
    }
  }

  buildPsychologicalPrompt(userMessage, context) {
    // Create a psychology-focused prompt
    let prompt = "You are a specialized psychological reasoning assistant with deep knowledge of evidence-based therapeutic approaches. ";
    prompt += "Provide calm, evidence-based psychological insights and cognitive reframing techniques. ";
    
    // Add context from previous psychological exchanges
    if (this.psychologicalHistory.length > 0) {
      const recentPsych = this.psychologicalHistory.slice(-1);
      recentPsych.forEach(exchange => {
        prompt += `Previous insight: ${exchange.user} Analysis: ${exchange.bot} `;
      });
    }
    
    // Add specific psychological frameworks based on message type
    if (this.isAnxietyRelated(userMessage)) {
      prompt += "Focus on anxiety management techniques, cognitive reframing, and grounding exercises. ";
    } else if (this.isDepressionRelated(userMessage)) {
      prompt += "Focus on mood regulation, behavioral activation, and self-compassion techniques. ";
    } else if (this.isWorkplaceRelated(userMessage)) {
      prompt += "Focus on workplace psychology, stress management, and professional resilience. ";
    } else if (this.isRelationshipRelated(userMessage)) {
      prompt += "Focus on attachment theory, communication patterns, and relationship dynamics. ";
    }
    
    prompt += `Psychological Question: ${userMessage} Evidence-Based Response:`;
    
    return prompt;
  }

  isAnxietyRelated(message) {
    const anxietyKeywords = ['anxiety', 'anxious', 'worry', 'worried', 'panic', 'nervous', 'stress', 'overwhelmed'];
    return anxietyKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isDepressionRelated(message) {
    const depressionKeywords = ['depressed', 'sad', 'hopeless', 'empty', 'worthless', 'low mood', 'down'];
    return depressionKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isWorkplaceRelated(message) {
    const workKeywords = ['work', 'job', 'workplace', 'office', 'career', 'boss', 'colleague', 'professional'];
    return workKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isRelationshipRelated(message) {
    const relationshipKeywords = ['relationship', 'partner', 'family', 'friend', 'social', 'communication', 'conflict'];
    return relationshipKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  enhancePsychologicalResponse(response, userMessage) {
    // Clean the response
    let cleanedResponse = response.replace(/Psychological Question:|Evidence-Based Response:|Previous insight:|Analysis:/gi, '').trim();
    
    // Remove repetition of user message
    cleanedResponse = cleanedResponse.replace(userMessage, '').trim();
    
    // Add psychological framework structure if response lacks it
    if (cleanedResponse.length > 0 && !this.hasPsychologicalStructure(cleanedResponse)) {
      cleanedResponse = this.addPsychologicalStructure(cleanedResponse, userMessage);
    }
    
    return cleanedResponse || this.getFallbackPsychologicalResponse(userMessage);
  }

  hasPsychologicalStructure(response) {
    // Check if response has psychological framework elements
    const structureIndicators = ['cognitive', 'behavioral', 'reframe', 'evidence', 'technique', 'approach', 'research shows'];
    return structureIndicators.some(indicator => response.toLowerCase().includes(indicator));
  }

  addPsychologicalStructure(response, userMessage) {
    if (this.isAnxietyRelated(userMessage)) {
      return `From a cognitive-behavioral perspective: ${response}\n\nThis approach helps interrupt anxiety cycles by addressing both thoughts and behaviors.`;
    } else if (this.isDepressionRelated(userMessage)) {
      return `From a mood regulation standpoint: ${response}\n\nResearch shows that combining cognitive techniques with behavioral changes can be particularly effective.`;
    } else if (this.isWorkplaceRelated(userMessage)) {
      return `From an occupational psychology perspective: ${response}\n\nThis framework helps build professional resilience and workplace wellbeing.`;
    } else {
      return `From an evidence-based psychological perspective: ${response}\n\nThis approach integrates multiple therapeutic frameworks for comprehensive support.`;
    }
  }

  getFallbackPsychologicalResponse(userMessage) {
    if (this.isAnxietyRelated(userMessage)) {
      return `Here's an evidence-based approach to managing anxiety:

1. **Cognitive Reframing**: Challenge anxious thoughts by asking "What evidence supports this worry?" and "What would I tell a friend in this situation?"

2. **Grounding Techniques**: Use the 5-4-3-2-1 method (5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste) to stay present.

3. **Breathing Regulation**: Practice 4-7-8 breathing (inhale 4, hold 7, exhale 8) to activate your parasympathetic nervous system.

Research shows these techniques can significantly reduce anxiety symptoms when practiced consistently.`;

    } else if (this.isDepressionRelated(userMessage)) {
      return `Here's an evidence-based approach to managing low mood:

1. **Behavioral Activation**: Schedule small, meaningful activities even when you don't feel motivated. Action often precedes motivation.

2. **Self-Compassion**: Treat yourself with the same kindness you'd show a good friend. Self-criticism often worsens depression.

3. **Thought Monitoring**: Notice negative thought patterns and gently challenge them with more balanced perspectives.

These techniques are core components of effective depression treatment and can provide meaningful relief over time.`;

    } else if (this.isWorkplaceRelated(userMessage)) {
      return `Here's an evidence-based approach to workplace psychological challenges:

1. **Stress Reframing**: View challenges as opportunities for growth rather than threats. This builds resilience over time.

2. **Boundary Setting**: Clearly define work-life boundaries and communicate them professionally but firmly.

3. **Focus Control**: Concentrate on what you can influence rather than what's outside your control.

Occupational psychology research shows these strategies significantly improve workplace wellbeing and performance.`;

    } else {
      return `Here's an evidence-based psychological approach:

1. **Mindful Awareness**: Notice your thoughts and feelings without judgment. Awareness is the first step to change.

2. **Values Alignment**: Consider how this situation relates to your core values and what actions would align with them.

3. **Growth Mindset**: View challenges as opportunities to develop resilience and psychological flexibility.

This integrative approach draws from multiple therapeutic modalities to support psychological wellbeing.`;
    }
  }

  clearHistory() {
    this.psychologicalHistory = [];
  }
}

export default PsychologicalModel;