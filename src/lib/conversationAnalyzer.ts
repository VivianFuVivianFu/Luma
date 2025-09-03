// Conversation Analysis Service - Analyzes chat breakdowns and patterns
import { claudeAI } from './claudeAI';
import { getCurrentUser } from './auth';

export interface ConversationBreakdown {
  type: 'Contextual Loss / Memory Gaps' | 'Misinterpretation of User Intent' | 'Over-Generic or Cliché Responses' | 'Contradictory / Confusing Advice' | 'Failure in Multi-Step Reasoning';
  example: string;
  memory_triggered: boolean;
  root_cause: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommended_solution: string;
}

export interface ConversationAnalysisResult {
  breakdowns: ConversationBreakdown[];
  summary: string;
  patterns: string[];
  recommendations: string[];
}

export class ConversationAnalyzer {
  private static readonly ANALYSIS_PROMPT = `
You are an expert AI engineer and LLM analyst with deep experience in multi-turn chatbot systems, memory integration, and natural language understanding. 
Your task is to **analyze conversation breakdowns** in chat logs from a hybrid LLM system using Claude Haiku and LLaMA 3.1 70B, and provide actionable insights.

Specifically, follow these instructions:

1️⃣ **Categorize Conversation Breakdowns**
- Examine the provided chat logs.
- Classify each breakdown into one of the following categories:
    1. Contextual Loss / Memory Gaps: Bot forgets prior context or fails to recall user goals or past events.
    2. Misinterpretation of User Intent: Bot answers incorrectly or misreads nuance.
    3. Over-Generic or Cliché Responses: Bot gives vague advice instead of actionable insights.
    4. Contradictory / Confusing Advice: Bot provides inconsistent guidance across multi-turn conversations.
    5. Failure in Multi-Step Reasoning: Bot cannot connect past events, track progress, or produce structured advice.
- For each breakdown, include an example snippet from the chat.

2️⃣ **Collect Data Metrics**
- Note whether memory retrieval (short-term or long-term) was triggered.
- Flag sessions where memory retrieval succeeded, failed, or returned irrelevant info.
- Compare performance trends between Claude Haiku and LLaMA 3.1 70B.

3️⃣ **Analyze Root Causes**
- Identify potential causes for each breakdown, such as:
    - Prompt design issues (insufficient persona conditioning, unclear instructions)
    - Memory integration issues (truncation, irrelevant retrievals)
    - Reasoning gaps (difficulty in multi-step or reflective tasks)
    - Input ambiguity (unclear or vague user messages)
- Provide a severity score or priority level for each cause.

4️⃣ **Provide Suggested Solutions**
- Recommend concrete improvements to reduce breakdowns, including:
    - Prompt refinement strategies
    - Memory retrieval optimization
    - Clarification question triggers
    - Output structuring or reasoning chain guidance

5️⃣ **Format Your Output**
- Return results in JSON with the following structure:

{
  "breakdowns": [
    {
      "type": "Contextual Loss / Memory Gaps",
      "example": "User: 'I want to achieve X goal...' Bot: 'Sure, let's talk about Y...' ",
      "memory_triggered": true,
      "root_cause": "Short-term memory truncated; bot lost prior context",
      "severity": "High",
      "recommended_solution": "Increase short-term memory window; prepend relevant long-term memory chunks"
    }
  ],
  "summary": "Concise overview of the main breakdown patterns, most frequent types, and key recommendations.",
  "patterns": ["List of recurring patterns identified"],
  "recommendations": ["List of actionable improvements for the development team"]
}

6️⃣ **Additional Guidelines**
- Be precise and technical; justify each classification with evidence from the logs.
- Highlight patterns or recurring issues across multiple sessions.
- Suggest actionable improvements that a development team can implement immediately.
- Always reference memory interactions where relevant.
`;

  /**
   * Analyze a conversation log for breakdowns and patterns
   */
  static async analyzeConversation(chatLog: string): Promise<ConversationAnalysisResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User must be authenticated to perform conversation analysis');
      }

      console.log('[ConversationAnalyzer] Starting conversation analysis...');

      const analysisRequest = `${this.ANALYSIS_PROMPT}

---

TASK: Analyze the following chat logs using the above framework:

${chatLog}

Please provide your analysis in the specified JSON format.`;

      const response = await claudeAI.sendMessage(analysisRequest);
      
      // Try to parse JSON response
      try {
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error('No JSON found in response');
        }
        
        const jsonString = response.substring(jsonStart, jsonEnd);
        const analysisResult: ConversationAnalysisResult = JSON.parse(jsonString);
        
        console.log('[ConversationAnalyzer] Analysis completed successfully');
        return analysisResult;
        
      } catch (parseError) {
        console.error('[ConversationAnalyzer] Failed to parse JSON response:', parseError);
        
        // Fallback: create structured analysis from text response
        return this.createFallbackAnalysis(response, chatLog);
      }

    } catch (error) {
      console.error('[ConversationAnalyzer] Error during analysis:', error);
      throw error;
    }
  }

  /**
   * Create fallback analysis when JSON parsing fails
   */
  private static createFallbackAnalysis(response: string, chatLog: string): ConversationAnalysisResult {
    return {
      breakdowns: [
        {
          type: 'Over-Generic or Cliché Responses',
          example: 'Analysis response could not be parsed properly',
          memory_triggered: false,
          root_cause: 'System analysis parsing failure',
          severity: 'Medium' as const,
          recommended_solution: 'Improve response parsing and JSON structure validation'
        }
      ],
      summary: 'Analysis completed but response parsing failed. Raw analysis available in logs.',
      patterns: ['Response parsing issues detected'],
      recommendations: ['Implement better JSON response validation', 'Add fallback analysis methods']
    };
  }

  /**
   * Quick analysis of recent conversation patterns
   */
  static async analyzeRecentPatterns(messageHistory: Array<{role: string, content: string, timestamp: Date}>): Promise<string[]> {
    try {
      const patterns: string[] = [];
      
      // Check for repetitive responses
      const assistantMessages = messageHistory.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 3) {
        const lastThree = assistantMessages.slice(-3);
        const similarities = this.checkResponseSimilarity(lastThree.map(m => m.content));
        if (similarities > 0.7) {
          patterns.push('Repetitive response pattern detected');
        }
      }

      // Check for memory acknowledgment
      const hasMemoryReferences = assistantMessages.some(m => 
        m.content.toLowerCase().includes('remember') || 
        m.content.toLowerCase().includes('previous') || 
        m.content.toLowerCase().includes('before')
      );
      
      if (!hasMemoryReferences && messageHistory.length > 6) {
        patterns.push('Lack of memory references in extended conversation');
      }

      // Check for generic responses
      const genericPhrases = [
        'I understand',
        'That sounds difficult',
        'How are you feeling',
        'What would you like to talk about'
      ];
      
      const genericCount = assistantMessages.filter(m => 
        genericPhrases.some(phrase => m.content.toLowerCase().includes(phrase.toLowerCase()))
      ).length;
      
      if (genericCount / assistantMessages.length > 0.5) {
        patterns.push('High frequency of generic responses');
      }

      return patterns;

    } catch (error) {
      console.error('[ConversationAnalyzer] Error in pattern analysis:', error);
      return ['Pattern analysis failed'];
    }
  }

  /**
   * Check similarity between responses (simple implementation)
   */
  private static checkResponseSimilarity(responses: string[]): number {
    if (responses.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateStringSimilarity(responses[i], responses[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate simple string similarity (Jaccard index of words)
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const conversationAnalyzer = ConversationAnalyzer;