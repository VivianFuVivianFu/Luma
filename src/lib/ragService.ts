// src/lib/ragService.ts
// RAG (Retrieval-Augmented Generation) Service for Luma
// Connects to the Python RAG server running on localhost:5000

interface RAGSearchResult {
  content: string;
  score: number;
  metadata: {
    source: string;
    [key: string]: any;
  };
}

interface RAGContextResponse {
  query: string;
  context: string;
  context_length: number;
}

interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
  count: number;
}

class RAGService {
  private baseUrl = import.meta.env.VITE_RAG_SERVER_URL || 'http://localhost:5000';
  private isServiceAvailable = false;
  private lastAvailabilityCheck = 0;
  private availabilityCheckInterval = 60000; // Check every minute

  /**
   * Check if the RAG service is available
   */
  async isAvailable(): Promise<boolean> {
    const now = Date.now();
    
    // Only check availability once per minute to avoid excessive requests
    if (now - this.lastAvailabilityCheck < this.availabilityCheckInterval) {
      return this.isServiceAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      this.isServiceAvailable = response.ok;
      this.lastAvailabilityCheck = now;
      
      if (this.isServiceAvailable) {
        console.log('RAG service is available');
      } else {
        console.warn('RAG service health check failed');
      }
      
      return this.isServiceAvailable;
    } catch (error) {
      console.warn('RAG service unavailable:', error);
      this.isServiceAvailable = false;
      this.lastAvailabilityCheck = now;
      return false;
    }
  }

  /**
   * Get context for a query using RAG
   */
  async getContext(query: string, maxLength: number = 1500): Promise<RAGContextResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          max_length: maxLength
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RAG service error: ${response.status} ${response.statusText}`);
      }

      const data: RAGContextResponse = await response.json();
      
      console.log(`RAG context retrieved for query: "${query}" (${data.context_length} chars)`);
      
      return data;
    } catch (error) {
      console.error('Failed to get RAG context:', error);
      // Return empty context on error
      return {
        query,
        context: '',
        context_length: 0
      };
    }
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, k: number = 5): Promise<RAGSearchResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          k
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RAG search error: ${response.status} ${response.statusText}`);
      }

      const data: RAGSearchResponse = await response.json();
      
      console.log(`RAG search completed for query: "${query}" (${data.count} results)`);
      
      return data;
    } catch (error) {
      console.error('Failed to search RAG:', error);
      // Return empty results on error
      return {
        query,
        results: [],
        count: 0
      };
    }
  }

  /**
   * Get the list of available documents
   */
  async getDocuments(): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RAG documents error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Failed to get RAG documents:', error);
      return [];
    }
  }

  /**
   * Initialize the RAG service
   */
  async initialize(): Promise<boolean> {
    console.log('Initializing RAG service...');
    
    const available = await this.isAvailable();
    
    if (available) {
      try {
        const documents = await this.getDocuments();
        console.log(`RAG service initialized with ${documents.length} documents:`, documents);
        return true;
      } catch (error) {
        console.error('Failed to initialize RAG service:', error);
        return false;
      }
    } else {
      console.warn('RAG service is not available. Running without RAG functionality.');
      return false;
    }
  }
}

// Export singleton instance
export const ragService = new RAGService();

// Auto-initialize on import (but don't block)
ragService.initialize().catch(error => {
  console.warn('RAG service auto-initialization failed:', error);
});
