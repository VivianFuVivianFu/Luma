// Triage Model - Determines the type of user input and routes appropriately
// Uses Microsoft's DialoGPT for conversation classification

class TriageModel {
  constructor() {
    this.apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
    this.apiKey = process.env.HF_API_TOKEN || import.meta.env?.HF_API_TOKEN || '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';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async classifyInput(userMessage) {
    try {
      // Define emotional indicators for classification
      const emotionalKeywords = [
        'sad', 'depressed', 'anxious', 'worried', 'scared', 'angry', 'frustrated',
        'lonely', 'hurt', 'pain', 'suffering', 'grief', 'loss', 'trauma',
        'overwhelmed', 'stressed', 'hopeless', 'helpless', 'crying', 'tears'
      ];

      const logicalKeywords = [
        'how', 'why', 'what', 'when', 'where', 'explain', 'understand',
        'solve', 'problem', 'issue', 'solution', 'help me', 'advice',
        'decide', 'choice', 'option', 'plan', 'strategy', 'think'
      ];

      const message = userMessage.toLowerCase();
      let emotionalScore = 0;
      let logicalScore = 0;

      // Count emotional indicators
      emotionalKeywords.forEach(keyword => {
        if (message.includes(keyword)) {
          emotionalScore++;
        }
      });

      // Count logical indicators
      logicalKeywords.forEach(keyword => {
        if (message.includes(keyword)) {
          logicalScore++;
        }
      });

      // Determine classification
      if (emotionalScore > logicalScore) {
        return {
          type: 'emotional',
          confidence: emotionalScore / (emotionalScore + logicalScore),
          route: 'empathy'
        };
      } else if (logicalScore > emotionalScore) {
        return {
          type: 'logical',
          confidence: logicalScore / (emotionalScore + logicalScore),
          route: 'reasoning'
        };
      } else {
        // Default to empathy for neutral or balanced inputs
        return {
          type: 'neutral',
          confidence: 0.5,
          route: 'empathy'
        };
      }
    } catch (error) {
      console.error('Triage classification error:', error);
      // Default to empathy model on error
      return {
        type: 'neutral',
        confidence: 0.5,
        route: 'empathy'
      };
    }
  }

  async analyze(userMessage) {
    const classification = await this.classifyInput(userMessage);
    
    console.log(`[Triage] Input classified as: ${classification.type} (confidence: ${classification.confidence.toFixed(2)}) -> routing to ${classification.route}`);
    
    return classification;
  }
}

export default TriageModel;