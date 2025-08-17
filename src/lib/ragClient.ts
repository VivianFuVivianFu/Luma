interface RAGResponse {
  success: boolean;
  result?: {
    texts: string[];
    scores: number[];
    scoreMean: number;
    totalResults: number;
  };
  error?: string;
  details?: string;
  timestamp: string;
}

interface RAGRequest {
  userId: string;
  query: string;
  topK?: number;
}

interface RAGClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class RAGClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(options: RAGClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8787';
    this.timeout = options.timeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  async retrieve(request: RAGRequest): Promise<RAGResponse> {
    const url = `${this.baseUrl}/api/rag/retrieve`;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔍 RAG retrieve attempt ${attempt}/${this.maxRetries} for query: "${request.query.substring(0, 50)}..."`);
        
        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }, this.timeout);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data: RAGResponse = await response.json();
        console.log(`✅ RAG retrieve successful on attempt ${attempt}`);
        return data;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`❌ RAG retrieve attempt ${attempt} failed: ${errorMessage}`);

        if (attempt === this.maxRetries) {
          console.error(`🚫 RAG retrieve failed after ${this.maxRetries} attempts`);
          return {
            success: false,
            error: 'RAG service unavailable',
            details: `Failed after ${this.maxRetries} attempts. Last error: ${errorMessage}`,
            timestamp: new Date().toISOString()
          };
        }

        // Wait before retrying, with exponential backoff
        const delayMs = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await this.delay(delayMs);
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: 'Unexpected error',
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/rag/status`, {
        method: 'GET',
      }, 5000); // 5 second timeout for health check

      if (!response.ok) {
        return { 
          healthy: false, 
          details: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        healthy: true, 
        details: data 
      };

    } catch (error) {
      return { 
        healthy: false, 
        details: error instanceof Error ? error.message : 'Health check failed' 
      };
    }
  }
}

// Singleton instance for the application
let ragClientInstance: RAGClient | null = null;

export function getRagClient(options?: RAGClientOptions): RAGClient {
  if (!ragClientInstance) {
    // Use environment variables or defaults
    const baseUrl = process.env.VITE_API_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8787');
    
    ragClientInstance = new RAGClient({
      baseUrl,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    });
  }
  
  return ragClientInstance;
}

// Export types for use in other files
export type { RAGResponse, RAGRequest, RAGClientOptions };
export { RAGClient };