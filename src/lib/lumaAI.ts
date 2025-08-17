// src/lib/lumaAI.ts
// Optimized version - uses LLaMA 3 70B through Together AI with streamlined prompt
// Enhanced with RAG (Retrieval-Augmented Generation) for knowledge-based responses
// Enhanced with Memory Service for long-term and short-term memory

// RAG service temporarily disabled for deployment
import { memoryService } from './memoryService';
import { supabase } from './supabase';
import { MultiModelSystem } from './multiModelWrapper';

// Together AI configuration - Only LLaMA 3 70B
const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_BASE_URL = 'https://api.together.xyz/v1/chat/completions';
const LLAMA_MODEL = 'meta-llama/Llama-3-70b-chat-hf'; // Fixed model

// Enhanced Luma System Prompt - Conversational, Insightful, Psychology-Informed Dialogue
const LUMA_SYSTEM_PROMPT = `You are Luma, a warm and empathetic AI mental health companion with deep knowledge of psychology and neuroscience. You maintain coherent, evolving conversations that never repeat content.

## CORE PRINCIPLES
- You are not a therapist or doctor - you provide emotional support and psychological insights
- NEVER repeat previous responses or similar content - each response must be unique and build forward
- Always remember what has been discussed and reference it naturally
- Progress conversations logically by building on previous exchanges
- Respond directly to the user's actual words and meaning
- Use your memory of the conversation to provide contextual, relevant responses
- Be conversational, not robotic - avoid question-after-question patterns

## CONVERSATION EVOLUTION APPROACH
**Early Conversation (First 2-3 exchanges):**
- Acknowledge courage and validate their feelings
- Build trust through empathy and understanding
- Keep responses warm but concise (40-60 words)

**Mid Conversation (Once context is established):**
- Begin offering psychological perspectives and patterns you notice
- Share relevant insights about human behavior, emotions, and thought processes
- Connect their experience to broader psychological principles
- Expand responses to 60-100 words when offering deeper insights

**Deep Conversation (When you understand their situation well):**
- Provide sophisticated psychological and neuroscientific insights
- Explain the "why" behind their experiences using psychological knowledge
- Offer unique perspectives they likely haven't considered
- Share evidence-based understanding of their patterns
- Use 80-150 words for complex psychological insights when valuable

## PSYCHOLOGICAL KNOWLEDGE TO DRAW FROM
**Attachment Theory**: Anxious, avoidant, secure patterns and how they show up in relationships
**Trauma Response**: Fight/flight/freeze/fawn, nervous system regulation, window of tolerance
**Neuroscience**: How the brain processes emotions, memory, stress, and change
**Cognitive Patterns**: Thought distortions, rumination, cognitive flexibility
**Emotional Intelligence**: Emotional awareness, regulation, and interpersonal skills
**Behavioral Psychology**: Habit formation, motivation, reward systems
**Developmental Psychology**: How early experiences shape current patterns
**Positive Psychology**: Resilience, growth mindset, post-traumatic growth

## RESPONSE STRUCTURE EVOLUTION

**Early Responses:**
**Warm Acknowledgment** + **Encouraging Validation** + **Gentle Forward Movement**

**Mid-Conversation Responses:**
**Recognition** + **Psychological Insight/Pattern** + **Connection to Their Goal**

**Deep Responses:**
**Sophisticated Psychological Analysis** + **Neuroscientific/Evidence-Based Explanation** + **Unique Perspective** + **Actionable Understanding**

## EXAMPLE PROGRESSION

**Early Response (40-60 words):**
"It takes courage to want to understand your emotions like this. The fact that you're questioning these patterns shows real self-awareness and readiness for growth."

**Mid-Conversation Response (60-100 words):**
"What you're describing sounds like what psychologists call 'rumination' - when our minds get caught in loops trying to solve emotional problems the same way we'd solve logical ones. Your brain is actually trying to protect you by analyzing, but emotions need a different approach than thoughts. The fact that you're noticing this pattern is the first step toward breaking free from it."

**Deep Response (80-150 words):**
"This pattern you're describing aligns with what neuroscience research shows about how our brains process unresolved experiences. When we experience disappointment or trauma, our limbic system can get stuck in a loop, constantly scanning for threats or trying to 'solve' what happened. Your prefrontal cortex - the part that handles logic and planning - keeps trying to analyze your way out, but emotional healing requires engaging different neural pathways. The good news is that your awareness of this cycle indicates your brain is actually starting to integrate these experiences differently. This is what therapists call 'metacognition' - thinking about thinking - and it's one of the strongest predictors of positive change. Your brain is literally rewiring itself through this self-reflection process."

## CONVERSATIONAL BALANCE BY STAGE
**Early:** 80% Encouragement, 20% Light Insights
**Mid:** 50% Encouragement, 50% Psychological Insights  
**Deep:** 30% Encouragement, 70% Sophisticated Psychological Understanding

## DEEPER INSIGHT TRIGGERS
Offer more sophisticated insights when you notice:
- Repeated emotional patterns they're describing
- Specific psychological concepts that clearly apply to their situation
- Opportunities to explain the "why" behind their experiences
- Moments where neuroscience or psychology can provide clarity
- When they seem ready for a deeper understanding

## RESPONSE GUIDELINES
**DO:**
- ALWAYS check what you've said before and say something completely different
- Build on previous conversation points rather than starting fresh
- Reference specific things the user has shared earlier
- Progress the conversation forward with new insights or perspectives
- Respond directly to their current message with relevant, fresh content
- Use your memory to show you're listening and understanding their journey
- Vary your response style and avoid falling into patterns

**ABSOLUTELY AVOID:**
- Repeating any content from previous responses
- Using the same phrases, examples, or psychological concepts you've already mentioned
- Ignoring what the user just said in favor of generic responses
- Saying similar things in different words
- Restarting conversations as if nothing was discussed before
- Question-after-question patterns
- Generic responses that could apply to anyone

## PSYCHOLOGY-INFORMED LANGUAGE PATTERNS
**Instead of generic responses, offer insights like:**
- "From a neuroscience perspective, what you're experiencing makes perfect sense because..."
- "This pattern you're describing aligns with attachment theory research that shows..."
- "What's happening in your brain right now is actually a normal trauma response where..."
- "Psychology research suggests that this kind of thinking pattern often develops when..."
- "Your nervous system is likely responding this way because..."

## CRITICAL CONVERSATION MEMORY RULES:
- Before responding, mentally review what you've already said in this conversation
- NEVER repeat the same psychological concepts, metaphors, or advice
- If you've mentioned "forgiveness is a journey," "hyperarousal," or "self-compassion" - find completely different approaches
- Each response must introduce NEW ideas, perspectives, or insights
- Build on what you've established rather than repeating it
- Show progression in your understanding of their situation

Remember: Every response must be unique, contextual, and advance the conversation. NEVER repeat content. Always progress forward with fresh insights that build on your growing understanding of their specific situation.`;

export interface LumaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LumaAI {
  private conversationHistory: LumaMessage[] = [
    {
      role: 'system',
      content: LUMA_SYSTEM_PROMPT
    }
  ];
  private exchangeCount = 0;
  private userGoal: string | null = null;
  private lastResponses: string[] = [];
  private conversationContext: Map<string, string> = new Map();
  private usedResponsePatterns: Set<string> = new Set();
  private lastQuestions: string[] = [];
  private repetitionCount = 0;
  private stuckInLoop = false;
  
  // Memory system properties
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  private memoryEnabled = false;
  
  // Multi-model system
  private multiModelSystem: any = null; // Temporarily disabled
  private useMultiModel = true; // Flag to enable/disable multi-model system

  // Initialize memory system for authenticated users
  async initializeMemory(): Promise<void> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        this.memoryEnabled = false;
        return;
      }

      this.currentUserId = session.user.id;
      this.currentSessionId = await memoryService.getActiveSession(this.currentUserId);
      this.memoryEnabled = true;
      
      // Initialize multi-model system if enabled
      if (this.useMultiModel && !this.multiModelSystem) {
        try {
          this.multiModelSystem = new MultiModelSystem();
          console.log('[LumaAI] Multi-model system initialized');
        } catch (error) {
          console.error('[LumaAI] Failed to initialize multi-model system:', error);
          this.useMultiModel = false;
        }
      }

      // Load existing conversation context from memory
      const memoryContext = await memoryService.getConversationContext(
        this.currentUserId, 
        this.currentSessionId
      );

      if (memoryContext) {
        // Add memory context to system prompt (similar to Express API approach)
        this.conversationHistory.push({
          role: 'system',
          content: `PERSONALIZATION CONTEXT:
${memoryContext}

IMPORTANT: Use this context naturally to:
- Show continuity with previous conversations
- Reference their preferences and patterns
- Build on therapeutic progress made
- Avoid repeating insights they already understand
- Demonstrate deep understanding of their journey

Safety: Do not provide medical or legal advice. Encourage seeking professional help for crises.`
        });
      }

    } catch (error) {
      console.error('Memory initialization error:', error);
      this.memoryEnabled = false;
    }
  }

  async sendMessage(userMessage: string): Promise<string> {
    try {
      // Initialize memory if not done yet and user is authenticated
      if (!this.memoryEnabled && this.currentUserId === null) {
        await this.initializeMemory();
      }

      // Increment exchange count
      this.exchangeCount++;

      // Check for crisis keywords
      if (this.checkCrisisIndicators(userMessage)) {
        return this.getCrisisResponse();
      }

      // Try multi-model system first if available and enabled
      if (this.useMultiModel && this.multiModelSystem) {
        try {
          console.log('[LumaAI] Using multi-model system for response generation');
          const multiModelResult = await this.multiModelSystem.processMessage(userMessage);
          
          if (multiModelResult && multiModelResult.response) {
            // Use the multi-model response but continue with memory storage
            const assistantMessage = multiModelResult.response;
            
            // Save user message to memory if enabled
            if (this.memoryEnabled && this.currentUserId && this.currentSessionId) {
              await memoryService.saveMessage(
                this.currentSessionId, 
                this.currentUserId, 
                'user', 
                userMessage
              );
              
              // Save assistant message to memory if enabled
              await memoryService.saveMessage(
                this.currentSessionId, 
                this.currentUserId, 
                'assistant', 
                assistantMessage
              );
            }
            
            // Add to conversation history for context
            this.conversationHistory.push({
              role: 'user',
              content: userMessage
            });
            
            this.conversationHistory.push({
              role: 'assistant',
              content: assistantMessage
            });
            
            console.log(`[LumaAI] Multi-model response via ${multiModelResult.metadata?.model} model`);
            return assistantMessage;
          }
        } catch (error) {
          console.error('[LumaAI] Multi-model system failed, falling back to LLaMA:', error);
          // Fall through to original LLaMA system
        }
      }

      // Check if user is stating a goal and clean it up
      if (this.userGoal === null && this.isGoalStatement(userMessage)) {
        this.userGoal = this.extractCleanGoal(userMessage);
      }

      // RAG context temporarily disabled for deployment
      let ragContext = '';
      // TODO: Re-enable RAG service after deployment issues are resolved

      // Save user message to memory if enabled
      if (this.memoryEnabled && this.currentUserId && this.currentSessionId) {
        await memoryService.saveMessage(
          this.currentSessionId, 
          this.currentUserId, 
          'user', 
          userMessage
        );
      }

      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Store context from user message
      this.updateConversationContext(userMessage);

      // Enhanced goal-setting and early conversation context
      const messages = [...this.conversationHistory];
      
      // Add repetition prevention system message
      if (this.conversationHistory.length > 3) {
        messages.push({
          role: 'system',
          content: `CONVERSATION MEMORY: You've been talking with this person for ${this.exchangeCount} exchanges. Review the conversation history carefully. Your next response must:
- Be completely different from anything you've said before
- Build on what they just shared, not repeat previous topics
- Reference their specific situation and progress
- Introduce NEW perspectives or insights
- NEVER repeat psychological concepts you've already mentioned
- Show you remember and are progressing the conversation forward`
        });
      }
      
      // Early conversation goal identification (2nd exchange)
      if (this.exchangeCount === 2 && this.userGoal === null) {
        messages.push({
          role: 'system',
          content: 'EARLY CONVERSATION: This is your second response. Acknowledge their courage for sharing. Use encouraging, warm language (under 50 words). Help them see their readiness to explore rather than asking what to explore.'
        });
      }
      // Follow up on goal setting if still unclear
      else if (this.exchangeCount >= 4 && this.exchangeCount % 5 === 0 && this.userGoal === null) {
        messages.push({
          role: 'system',
          content: 'GOAL EXPLORATION: Gently encourage them to reflect on what feels most meaningful. Acknowledge their thoughtfulness and help them see what they might be ready to explore. Be encouraging rather than questioning.'
        });
      }
      // Use established goal to guide conversation
      else if (this.userGoal) {
        messages.push({
          role: 'system',
          content: `USER GOAL: ${this.userGoal}

OUTCOME-FOCUSED GUIDANCE:
- Use encouraging, conversational language (under 50 words typically)  
- Focus on helping them reach this specific outcome
- Build on their insights and encourage deeper thinking
- Don't tell them what to do - help them discover their own solutions
- Acknowledge their progress and wisdom throughout the conversation`
        });
      }

      // Add RAG context if available
      if (ragContext) {
        messages.push({
          role: 'system',
          content: ragContext
        });
      }

      // Call Together AI LLaMA 3 70B model
      const response = await fetch(TOGETHER_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLAMA_MODEL,
          messages: messages,
          max_tokens: 200, // Reduced to encourage conciseness
          temperature: 0.7, // Slightly lower for more focused responses
          top_p: 0.9,
          repetition_penalty: 1.2, // Higher to avoid repetition
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Together AI API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let assistantMessage = data.choices[0]?.message?.content ||
        "I'm sorry, I'm having trouble connecting right now. Please try again.";
      
      // Remove quote marks from the beginning and end of the response
      assistantMessage = assistantMessage.replace(/^["']|["']$/g, '').trim();

      // Enhanced repetition detection and conversation flow management
      const currentResponseLower = assistantMessage.trim().toLowerCase();
      const isTooSimilar = this.detectAdvancedRepetition(currentResponseLower);
      const isRepeatingQuestions = this.detectRepeatingQuestions(assistantMessage);
      
      // Check if user is indicating confusion or frustration with conversation flow
      const userFrustrated = this.detectUserFrustration(userMessage);

      if (isTooSimilar || isRepeatingQuestions || userFrustrated) {
        this.repetitionCount++;
        this.stuckInLoop = this.repetitionCount >= 2;
        
        console.warn('Detected conversation flow issue, generating recovery response...');
        assistantMessage = this.generateRecoveryResponse(userMessage, {
          repetitive: isTooSimilar,
          repeatingQuestions: isRepeatingQuestions,
          userFrustrated: userFrustrated
        });
      } else {
        this.repetitionCount = 0;
        this.stuckInLoop = false;
      }

      // Track questions to prevent repetition
      if (this.containsQuestion(assistantMessage)) {
        this.lastQuestions.push(assistantMessage);
        if (this.lastQuestions.length > 5) {
          this.lastQuestions = this.lastQuestions.slice(-5);
        }
      }

      // Save assistant message to memory if enabled
      if (this.memoryEnabled && this.currentUserId && this.currentSessionId) {
        await memoryService.saveMessage(
          this.currentSessionId, 
          this.currentUserId, 
          'assistant', 
          assistantMessage
        );

        // Process memory after each exchange (like Express API approach)
        try {
          // Update session summary after every message (more frequent updates)
          await memoryService.updateSummary(this.currentSessionId);
          
          // Extract long-term memories every 5 exchanges (more frequent extraction)
          if (this.exchangeCount % 5 === 0) {
            await memoryService.extractLongMemories(this.currentUserId, this.currentSessionId);
          }
        } catch (memoryError) {
          console.error('Memory processing error:', memoryError);
          // Don't fail the conversation if memory processing fails
        }
      }

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      // Enhanced memory management for long conversations
      if (this.conversationHistory.length > 33) { // 1 system + 32 messages (16 exchanges)
        // Keep system prompt + summary + recent 24 messages
        const recentMessages = this.conversationHistory.slice(-24);
        const conversationSummary = this.generateConversationSummary();
        
        this.conversationHistory = [
          this.conversationHistory[0], // System prompt
          {
            role: 'system',
            content: `CONVERSATION CONTEXT: ${conversationSummary}`
          },
          ...recentMessages
        ];
      }
      
      // Track response for advanced repetition detection
      this.lastResponses.push(assistantMessage);
      if (this.lastResponses.length > 10) {
        this.lastResponses = this.lastResponses.slice(-10);
      }

      return assistantMessage;

    } catch (error) {
      console.error('LLaMA 3 70B API Error:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  private getFallbackResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();

    // If we're stuck in a loop, be honest about it
    if (this.stuckInLoop) {
      return "I'm having trouble connecting with my usual responses right now. Rather than give you something generic, could you help me understand what you most need from our conversation?";
    }

    // Handle greetings
    if (message === 'hello' || message === 'hi' || message === 'hey' ||
        message === '你好' || message === 'hola' || message === 'bonjour') {
      const greetings = [
        "Hi there! I'm glad you're here. What would feel most helpful to explore together?",
        "Hello! What's been on your heart that you'd like to talk through?",
        "Hey! What would you like to work on together today?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Handle uncertain responses with better context awareness
    if (message.includes("don't know") || message === "不知道" || message === "idk") {
      if (this.conversationContext.has('career_mentioned')) {
        return "That's completely okay. What do you think might feel most manageable for you right now?";
      } else {
        return "Not knowing is perfectly valid. What feels most present for you in this moment?";
      }
    }

    // Handle vague or unclear responses
    if (message.length < 5 || message === 'ok' || message === 'yeah' || message === 'sure') {
      return "I wonder what would be most helpful for us to explore together?";
    }

    // Handle positive responses
    if (message.includes('good') || message.includes('great')) {
      return "That's wonderful to hear. What do you think is contributing most to this positive feeling?";
    }

    // If API connection issues, be honest
    return "I'm sorry, I'm having some technical difficulties connecting to my response system right now. Could you try rephrasing what you'd like to talk about?";
  }


  private checkCrisisIndicators(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead',
      'self-harm', 'hurt myself', 'cutting', 'overdose', 'can\'t go on'
    ];
    return crisisKeywords.some(keyword => message.includes(keyword));
  }

  private getCrisisResponse(): string {
    return `I hear how much pain you're in right now. Your life has value beyond what you can see in this moment.

Please reach out for immediate support:
• Call suicide & Crisis Lifeline
• Text "HELLO" to 1737 (Crisis Text Line)  
• Go to your nearest emergency room

You deserve immediate, professional support. I'm here with you, but you need specialized care right now.`;
  }

  private isGoalStatement(message: string): boolean {
    const goalIndicators = [
      'i want to', 'i need to', 'i\'d like to', 'help me', 'i\'m trying to',
      'i hope to', 'my goal is', 'i\'m working on', 'i\'m struggling with',
      'understand why', 'figure out', 'work through', 'get over', 'move past',
      'i came here to', 'i\'m here because', 'looking for help with', 'need support with',
      'want to talk about', 'hoping to discuss', 'need advice on', 'can you help me',
      'dealing with', 'going through', 'having trouble with', 'feeling stuck with',
      'want to explore', 'need to process', 'trying to understand', 'confused about'
    ];
    const lowerMessage = message.toLowerCase();
    return goalIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  // Extract a clean, actionable goal from user message
  private extractCleanGoal(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Remove common prefixes and clean up the goal
    let cleanGoal = message;
    
    const prefixesToRemove = [
      /^yes,?\s*/i,
      /^well,?\s*/i,
      /^actually,?\s*/i,
      /^i think,?\s*/i,
      /^i guess,?\s*/i
    ];
    
    prefixesToRemove.forEach(prefix => {
      cleanGoal = cleanGoal.replace(prefix, '');
    });
    
    // Extract the core goal from common patterns
    if (lowerMessage.includes('i want to know how to')) {
      const match = message.match(/i want to know how to (.+?)(?:\.|$)/i);
      if (match) return `learn how to ${match[1]}`;
    }
    
    if (lowerMessage.includes('i need advice on')) {
      const match = message.match(/i need advice on (.+?)(?:\.|$)/i);
      if (match) return `get advice on ${match[1]}`;
    }
    
    if (lowerMessage.includes('help me')) {
      const match = message.match(/help me (.+?)(?:\.|$)/i);
      if (match) return match[1];
    }
    
    if (lowerMessage.includes('dealing with')) {
      const match = message.match(/dealing with (.+?)(?:\.|$)/i);
      if (match) return `deal with ${match[1]}`;
    }
    
    return cleanGoal.trim();
  }

  // RAG logic temporarily disabled for deployment
  // private shouldUseRAG(message: string): boolean { ... }

  // Update conversation context with key information
  private updateConversationContext(userMessage: string): void {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('career') || lowerMessage.includes('dream') || lowerMessage.includes('job')) {
      this.conversationContext.set('career_mentioned', userMessage);
    }
    if (lowerMessage.includes('good') || lowerMessage.includes('great') || lowerMessage.includes('happy')) {
      this.conversationContext.set('positive_mood', userMessage);
    }
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worried')) {
      this.conversationContext.set('anxiety_mentioned', userMessage);
    }
  }




  // Advanced repetition detection - made less aggressive
  private detectAdvancedRepetition(currentResponse: string): boolean {
    if (this.lastResponses.length < 2) return false;
    
    // Check for exact matches
    for (const pastResponse of this.lastResponses) {
      const pastLower = pastResponse.trim().toLowerCase();
      if (pastLower === currentResponse) return true;
    }
    
    // Check for very similar responses only in recent history
    const recentResponses = this.lastResponses.slice(-3); // Only check last 3 responses
    for (const pastResponse of recentResponses) {
      const pastLower = pastResponse.trim().toLowerCase();
      const similarity = this.calculateSimilarity(currentResponse, pastLower);
      
      // Increase threshold to be less aggressive
      if (similarity > 0.8) return true;
      
      // Check for specific recovery phrases being repeated
      if (this.isRecoveryPhrase(currentResponse) && this.isRecoveryPhrase(pastResponse)) {
        return true;
      }
    }
    return false;
  }
  
  // Check if this is a recovery phrase (which should not be repeated)
  private isRecoveryPhrase(response: string): boolean {
    const recoveryIndicators = [
      'let me refocus',
      'notice i\'m not being as helpful',
      'finding myself uncertain',
      'want to give you a meaningful response',
      'what aspect of that feels most important'
    ];
    const lowerResponse = response.toLowerCase();
    return recoveryIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  // Calculate text similarity
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const allWords = new Set([...words1, ...words2]);
    
    let commonWords = 0;
    for (const word of allWords) {
      if (words1.includes(word) && words2.includes(word)) {
        commonWords++;
      }
    }
    return commonWords / allWords.size;
  }

  // Detect if user is frustrated with conversation flow
  private detectUserFrustration(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    const frustrationIndicators = [
      'why you cannot carry conversation',
      'you keep asking',
      'you already asked',
      'same question',
      'stop asking',
      'not answering',
      'don\'t understand',
      'you\'re confused',
      'make sense',
      'what are you talking about',
      'that doesn\'t help',
      'you\'re not listening',
      'this isn\'t working'
    ];
    return frustrationIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  // Detect if we're repeating similar questions
  private detectRepeatingQuestions(currentResponse: string): boolean {
    if (!this.containsQuestion(currentResponse)) return false;
    
    const currentQuestionWords = this.extractQuestionWords(currentResponse);
    
    for (const pastQuestion of this.lastQuestions) {
      const pastQuestionWords = this.extractQuestionWords(pastQuestion);
      const similarity = this.calculateWordSimilarity(currentQuestionWords, pastQuestionWords);
      if (similarity > 0.5) return true;
    }
    return false;
  }

  // Check if response contains a question
  private containsQuestion(text: string): boolean {
    return text.includes('?') || 
           text.toLowerCase().includes('what') || 
           text.toLowerCase().includes('how') || 
           text.toLowerCase().includes('why') ||
           text.toLowerCase().includes('would you') ||
           text.toLowerCase().includes('could you') ||
           text.toLowerCase().includes('do you');
  }

  // Extract question-related words from text
  private extractQuestionWords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'would', 'could', 'should', 'can', 'do', 'does', 'did', 'is', 'are', 'was', 'were'];
    return words.filter(word => questionWords.includes(word) || word.includes('?'));
  }

  // Calculate similarity between word arrays
  private calculateWordSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 && words2.length === 0) return 0;
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Generate recovery response for conversation flow issues
  private generateRecoveryResponse(userMessage: string, issues: {
    repetitive: boolean;
    repeatingQuestions: boolean;
    userFrustrated: boolean;
  }): string {
    const lowerMessage = userMessage.toLowerCase();

    // If user is explicitly frustrated with conversation flow
    if (issues.userFrustrated) {
      if (this.userGoal) {
        return `You're absolutely right, and I apologize for that. Let me refocus on what you wanted to work on - ${this.userGoal}. How can I better support you with that?`;
      } else {
        return "You're completely right, and I apologize for not being more present with you. Let me step back - what's really on your heart right now that you'd like to talk about?";
      }
    }

    // If stuck in a repetitive loop, provide actual helpful content
    if (this.stuckInLoop) {
      // Reset the loop flag to prevent continuous recovery mode
      this.stuckInLoop = false;
      this.repetitionCount = 0;
      
      // If it's about dealing with difficult people (from the example)
      if (lowerMessage.includes('deal with') && (lowerMessage.includes('isolation') || lowerMessage.includes('cooperate') || lowerMessage.includes('difficult'))) {
        return this.getSpecificAdviceResponse('dealing with difficult colleagues');
      }
      
      // If they're asking for specific advice
      if (this.userGoal && (this.userGoal.includes('deal with') || this.userGoal.includes('advice') || this.userGoal.includes('how to'))) {
        return this.getSpecificAdviceResponse(this.userGoal);
      }
      
      // Fallback: provide something concrete
      return "Let me give you something concrete to work with. Based on what you've shared, here are some specific strategies that might help...";
    }

    // Default recovery with context
    return this.getContextualRecoveryResponse();
  }
  
  // Provide specific advice for common issues
  private getSpecificAdviceResponse(topic: string): string {
    const lowerTopic = topic.toLowerCase();
    
    if (lowerTopic.includes('difficult') && lowerTopic.includes('colleague')) {
      return `Here are some concrete strategies for dealing with difficult colleagues:

1. **Document everything**: Keep records of interactions and decisions
2. **Stay professional**: Don't let their behavior change how you act
3. **Set clear boundaries**: Be direct about what you need to do your job
4. **Loop in your manager**: When it affects your work, involve leadership
5. **Focus on work outcomes**: Keep conversations task-focused, not personal

Which of these feels most relevant to your specific situation?`;
    }
    
    if (lowerTopic.includes('isolation') || lowerTopic.includes('cooperate')) {
      return `When someone is isolating you or refusing to cooperate, try this approach:

1. **Address it directly**: "I notice you didn't respond to my email about X. I need this information to complete the project."
2. **Copy relevant people**: Include your manager or other stakeholders in important communications
3. **Create accountability**: Follow up in writing after verbal conversations
4. **Build other relationships**: Don't let one person limit your connections with the team

What feels like the most challenging part of this situation for you?`;
    }
    
    return "Let me provide some specific strategies based on what you've described. What aspect would be most helpful to focus on first?";
  }

  // Get contextual recovery response
  private getContextualRecoveryResponse(): string {
    // Prioritize established goal
    if (this.userGoal) {
      return `Let me refocus on what you wanted to achieve - ${this.userGoal}. What feels most important about that right now?`;
    }
    
    if (this.conversationContext.has('career_mentioned')) {
      return "Let me focus on what you shared about your career aspirations. Being close to achieving a dream brings its own unique challenges. What's been most on your mind about that?";
    }
    
    if (this.conversationContext.has('anxiety_mentioned')) {
      return "I want to better understand the anxiety you mentioned. Sometimes our minds can feel scattered when we're anxious. What's feeling most important for you to process right now?";
    }
    
    return "I want to make sure I'm really hearing you. What feels most present or important for you in this moment?";
  }

  // Generate conversation summary
  private generateConversationSummary(): string {
    const contexts = Array.from(this.conversationContext.entries());
    let summary = `User has discussed: `;
    
    if (contexts.length > 0) {
      summary += contexts.map(([key]) => {
        if (key === 'career_mentioned') return 'career aspirations';
        if (key === 'positive_mood') return 'positive feelings';
        if (key === 'anxiety_mentioned') return 'anxiety concerns';
        return key.replace('_mentioned', '');
      }).join(', ');
    } else {
      summary += 'general topics';
    }
    
    if (this.userGoal) {
      summary += `. User goal: ${this.userGoal}`;
    }
    
    return summary + '.';
  }

  clearHistory(): void {
    this.conversationHistory = [{ role: 'system', content: LUMA_SYSTEM_PROMPT }];
    this.exchangeCount = 0;
    this.userGoal = null;
    this.conversationContext.clear();
    this.usedResponsePatterns.clear();
    this.lastQuestions = [];
    this.repetitionCount = 0;
    this.stuckInLoop = false;
    
    // Reset memory session but keep user ID
    if (this.memoryEnabled && this.currentUserId) {
      this.currentSessionId = memoryService.generateSessionId(this.currentUserId);
    }
  }

  resetConversation(): void {
    this.clearHistory();
    this.lastResponses = [];
    console.log('Conversation history reset');
    
    // Close current session if it exists
    if (this.memoryEnabled && this.currentSessionId) {
      memoryService.closeSession(this.currentSessionId);
    }
    
    // Reset memory completely
    this.currentUserId = null;
    this.currentSessionId = null;
    this.memoryEnabled = false;
  }

  // Public method to manually enable memory for authenticated users
  async enableMemory(): Promise<boolean> {
    await this.initializeMemory();
    return this.memoryEnabled;
  }

  // Check if memory is enabled
  isMemoryEnabled(): boolean {
    return this.memoryEnabled;
  }

  // Get current session info
  getSessionInfo(): { userId: string | null, sessionId: string | null, memoryEnabled: boolean } {
    return {
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      memoryEnabled: this.memoryEnabled
    };
  }

  // Multi-model system controls
  enableMultiModel(): boolean {
    this.useMultiModel = true;
    if (!this.multiModelSystem) {
      try {
        this.multiModelSystem = new MultiModelSystem();
        console.log('[LumaAI] Multi-model system enabled');
        return true;
      } catch (error) {
        console.error('[LumaAI] Failed to enable multi-model system:', error);
        this.useMultiModel = false;
        return false;
      }
    }
    return true;
  }

  disableMultiModel(): void {
    this.useMultiModel = false;
    console.log('[LumaAI] Multi-model system disabled');
  }

  isMultiModelEnabled(): boolean {
    return this.useMultiModel && this.multiModelSystem !== null;
  }

  getMultiModelMetrics(): any {
    if (this.multiModelSystem) {
      return this.multiModelSystem.getSystemMetrics();
    }
    return null;
  }

  getHistoryLength(): number {
    return this.conversationHistory.length;
  }

  getRecentMessages(count: number = 5): LumaMessage[] {
    return this.conversationHistory.slice(-count);
  }
}

export const lumaAI = new LumaAI();