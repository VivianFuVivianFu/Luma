// ES6 wrapper for CommonJS multimodel system
// This allows the frontend to import the multimodel system

export interface MultiModelResponse {
  response: string;
  metadata: {
    model: string;
    confidence: number;
    triageType?: string;
    escalated: boolean;
    error?: string;
  };
}

export class MultiModelSystemWrapper {
  constructor() {
    console.log('[MultiModel] Frontend wrapper initialized');
  }

  async processMessage(userMessage: string, _options: any = {}): Promise<MultiModelResponse> {
    try {
      console.log(`[MultiModel] Processing: "${userMessage.substring(0, 50)}..."`);
      
      // For now, return a placeholder response
      // In a real implementation, you might call the backend API
      return {
        response: "I'm here to listen and support you. This is a placeholder response while the multi-model system is being integrated.",
        metadata: {
          model: 'placeholder',
          confidence: 0.8,
          escalated: false
        }
      };
    } catch (error) {
      console.error('[MultiModel] Error processing message:', error);
      return {
        response: "I'm here to listen and support you. Sometimes I have technical difficulties, but I care about what you're sharing with me. Can you tell me more about what's on your mind?",
        metadata: {
          model: 'fallback',
          confidence: 0.3,
          escalated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  getSystemMetrics() {
    return {
      system: {
        totalRequests: 0,
        successfulResponses: 0,
        averageResponseTime: 0
      }
    };
  }

  clearSystem() {
    console.log('[MultiModel] System cleared');
  }
}

// Export a default instance
export const MultiModelSystem = MultiModelSystemWrapper;