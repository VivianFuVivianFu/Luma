/**
 * LUMA THERAPEUTIC CHATBOT BACKEND
 * Complete self-contained JavaScript backend logic for therapeutic chatbot
 * Integrates: Safety Layer + Claude Haiku + Llama 3.1 70B + Supabase Memory
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================================================================
// CONFIGURATION & CONSTANTS
// ========================================================================================

// API Configuration
const CONFIG = {
  claude: {
    apiKey: process.env.VITE_CLAUDE_API_KEY,
    model: 'claude-3-haiku-20240307',
    maxTokens: 1024,
    temperature: 0.7,
    apiUrl: 'https://api.anthropic.com/v1/messages'
  },
  llama: {
    apiKey: process.env.VITE_TOGETHER_API_KEY,
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    maxTokens: 2048,
    temperature: 0.6,
    apiUrl: 'https://api.together.xyz/v1/chat/completions'
  },
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    serviceKey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  }
};

// Crisis keywords for safety detection
const CRISIS_KEYWORDS = [
  'suicide', 'end my life', 'kill myself', 'want to die', 
  'harm myself', "i'm going to hurt myself", 'hurt myself',
  'suicidal', 'end it all', 'not worth living', 'better off dead',
  'no point in living', 'can\'t go on', 'want to disappear'
];

// Crisis response message for New Zealand
const CRISIS_MESSAGE = `I hear that you are in distress and I'm here to help. However, I am not a substitute for a human therapist in an emergency. Please contact a crisis hotline immediately or call your local emergency services. In New Zealand, good resources for mental wellbeing are: Lifeline – 0800 543 354 (0800 LIFELINE) or the Suicide Crisis Helpline – 0508 828 865 (0508 TAUTOKO).`;

// ========================================================================================
// MIDDLEWARE SETUP
// ========================================================================================

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========================================================================================
// SAFETY LAYER FUNCTIONS
// ========================================================================================

/**
 * Check user message for crisis-related keywords
 * @param {string} userMessage - The user's input message
 * @returns {Object} - {isCrisis: boolean, message?: string}
 */
function checkSafety(userMessage) {
  try {
    console.log('[Safety] Checking message for crisis keywords...');
    
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // Check for crisis keywords
    const foundKeyword = CRISIS_KEYWORDS.find(keyword => 
      normalizedMessage.includes(keyword.toLowerCase())
    );
    
    if (foundKeyword) {
      console.log(`[Safety] ⚠️ Crisis keyword detected: "${foundKeyword}"`);
      return {
        isCrisis: true,
        message: CRISIS_MESSAGE,
        keyword: foundKeyword
      };
    }
    
    console.log('[Safety] ✅ No crisis keywords detected');
    return { isCrisis: false };
    
  } catch (error) {
    console.error('[Safety] Error in safety check:', error);
    // In case of error, err on the side of caution
    return {
      isCrisis: true,
      message: CRISIS_MESSAGE,
      error: 'Safety check failed'
    };
  }
}

// ========================================================================================
// SUPABASE MEMORY INTEGRATION
// ========================================================================================

/**
 * Supabase Memory System Integration
 * Note: These functions call the existing Supabase memory system
 */
const supabaseMemory = {
  
  /**
   * Retrieve relevant memory snippets for user
   * @param {string} userId - User identifier
   * @param {string} userMessage - Current user message for context
   * @returns {Promise<Array>} - Array of memory objects
   */
  async getMemory(userId, userMessage) {
    try {
      console.log(`[Memory] Retrieving memory for user: ${userId}`);
      
      // Call existing Supabase memory function
      // This assumes the existing supabase.getMemory function exists
      const response = await fetch(`${CONFIG.supabase.url}/rest/v1/rpc/get_memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.supabase.serviceKey}`,
          'apikey': CONFIG.supabase.serviceKey
        },
        body: JSON.stringify({
          user_id: userId,
          query_message: userMessage,
          limit: 5
        })
      });
      
      if (!response.ok) {
        throw new Error(`Supabase memory retrieval failed: ${response.status}`);
      }
      
      const memories = await response.json();
      console.log(`[Memory] Retrieved ${memories.length} memory snippets`);
      return memories || [];
      
    } catch (error) {
      console.error('[Memory] Error retrieving memory:', error);
      return []; // Return empty array on error
    }
  },
  
  /**
   * Save session summary to long-term memory
   * @param {string} userId - User identifier  
   * @param {string} sessionSummary - Summary generated by Llama
   * @returns {Promise<boolean>} - Success status
   */
  async saveMemory(userId, sessionSummary) {
    try {
      console.log(`[Memory] Saving session summary for user: ${userId}`);
      
      // Call existing Supabase memory function
      const response = await fetch(`${CONFIG.supabase.url}/rest/v1/rpc/save_memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.supabase.serviceKey}`,
          'apikey': CONFIG.supabase.serviceKey
        },
        body: JSON.stringify({
          user_id: userId,
          summary: sessionSummary,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Supabase memory save failed: ${response.status}`);
      }
      
      console.log('[Memory] ✅ Session summary saved successfully');
      return true;
      
    } catch (error) {
      console.error('[Memory] Error saving memory:', error);
      return false;
    }
  }
};

// ========================================================================================
// LLM API INTEGRATION FUNCTIONS
// ========================================================================================

/**
 * Call Claude Haiku API for immediate user response
 * @param {string} userMessage - User's message
 * @param {Array} memoryContext - Retrieved memory snippets
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {Promise<string>} - Claude's response
 */
async function callClaudeHaiku(userMessage, memoryContext, conversationHistory) {
  try {
    console.log('[Claude] Preparing prompt with memory context...');
    
    // Build context from memory
    const memoryText = memoryContext.length > 0 
      ? memoryContext.map(m => `- ${m.summary || m.content}`).join('\n')
      : 'No previous context available.';
    
    // Build conversation history
    const historyText = conversationHistory.length > 0
      ? conversationHistory.slice(-6).map(msg => 
          `${msg.role}: ${msg.content}`
        ).join('\n')
      : '';
    
    // Create system prompt for Luma personality
    const systemPrompt = `You are Luma, a warm and genuine emotional support companion for users in New Zealand.

Core Personality:
- Respond naturally and conversationally to what the user says
- Be authentic, supportive, and human-like in your responses
- Answer their questions directly and honestly
- Be warm but not overly therapeutic or clinical
- Use natural language, not rigid therapeutic responses
- Show genuine interest in connecting with them
- Respond as a friend would, not as a therapist
- Remember and reference previous conversation naturally

Guidelines:
- Keep responses conversational and natural (50-150 words typically)
- Avoid clinical psychology jargon unless specifically relevant
- Don't end every response with a question
- Show genuine warmth and interest in the person
- Be supportive without being preachy
- Reference the conversation flow naturally
- NEVER use asterisk expressions like *smiles*, *nods*, *laughs*, etc.
- Do not include action descriptions or emotional expressions in asterisks
- Speak directly without describing physical actions or facial expressions

Memory Context:
${memoryText}

Recent Conversation:
${historyText}

You are NOT a therapist, doctor, or healthcare provider. You provide emotional support and companionship, never medical advice or diagnosis.

Respond as Luma would - naturally, warmly, and authentically, but without any asterisk expressions or action descriptions.`;

    // Prepare messages for Claude API
    const messages = [
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    const requestBody = {
      model: CONFIG.claude.model,
      max_tokens: CONFIG.claude.maxTokens,
      temperature: CONFIG.claude.temperature,
      system: systemPrompt,
      messages: messages
    };
    
    console.log('[Claude] Making API request...');
    
    const response = await fetch(CONFIG.claude.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.claude.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }
    
    const claudeResponse = data.content[0].text.trim();
    console.log(`[Claude] ✅ Response generated (${data.usage?.output_tokens || 0} tokens)`);
    
    return claudeResponse;
    
  } catch (error) {
    console.error('[Claude] Error calling Claude Haiku:', error);
    throw error;
  }
}

/**
 * Call Llama 3.1 70B API for background analysis
 * @param {string} userMessage - User's message
 * @param {Array} fullConversationHistory - Complete conversation history
 * @returns {Promise<Object>} - Analysis results
 */
async function callLlamaAnalysis(userMessage, fullConversationHistory) {
  try {
    console.log('[Llama] Starting background analysis...');
    
    // Build full conversation context
    const conversationText = fullConversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    // Create analysis prompt for Llama
    const analysisPrompt = `You are a therapeutic AI assistant analyzing a conversation for deeper insights. 

Conversation History:
${conversationText}

Latest User Message: ${userMessage}

Please analyze this conversation and provide:

1. **Emotional Patterns**: What recurring emotional themes or patterns do you notice?
2. **Cognitive Patterns**: Are there any cognitive distortions or thinking patterns evident?
3. **Session Summary**: Provide a concise summary of this session's key points
4. **Therapeutic Insights**: What therapeutic reframing or insights might be helpful?
5. **Recommendations**: What areas might benefit from continued exploration?

Format your response as structured JSON:
{
  "emotional_patterns": "...",
  "cognitive_patterns": "...", 
  "session_summary": "...",
  "therapeutic_insights": "...",
  "recommendations": "..."
}

Be professional, insightful, and focus on patterns rather than making diagnoses.`;

    const requestBody = {
      model: CONFIG.llama.model,
      max_tokens: CONFIG.llama.maxTokens,
      temperature: CONFIG.llama.temperature,
      messages: [
        {
          role: 'system',
          content: 'You are a therapeutic analysis AI that provides structured insights about conversations.'
        },
        {
          role: 'user', 
          content: analysisPrompt
        }
      ]
    };
    
    console.log('[Llama] Making API request...');
    
    const response = await fetch(CONFIG.llama.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.llama.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Llama API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Llama API');
    }
    
    const analysisText = data.choices[0].message.content.trim();
    console.log(`[Llama] ✅ Analysis completed (${data.usage?.completion_tokens || 0} tokens)`);
    
    // Try to parse JSON response
    let analysisObject;
    try {
      analysisObject = JSON.parse(analysisText);
    } catch (parseError) {
      console.warn('[Llama] Could not parse JSON, using text response');
      analysisObject = {
        session_summary: analysisText,
        analysis_type: 'text_response'
      };
    }
    
    return analysisObject;
    
  } catch (error) {
    console.error('[Llama] Error in background analysis:', error);
    // Return minimal analysis on error
    return {
      session_summary: `Session on ${new Date().toISOString()}: User discussed various topics. Analysis unavailable due to technical issues.`,
      error: error.message
    };
  }
}

// ========================================================================================
// MAIN THERAPEUTIC CHATBOT WORKFLOW
// ========================================================================================

/**
 * Process user message through complete therapeutic workflow
 * @param {string} userId - User identifier
 * @param {string} userMessage - User's input message
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {Promise<Object>} - Response object with Claude response and status
 */
async function processTherapeuticChat(userId, userMessage, conversationHistory = []) {
  const startTime = Date.now();
  console.log(`[Workflow] Starting therapeutic chat processing for user: ${userId}`);
  
  try {
    // ============================================================================
    // STEP 1: SAFETY CHECK
    // ============================================================================
    console.log('[Workflow] Step 1: Safety check...');
    const safetyResult = checkSafety(userMessage);
    
    if (safetyResult.isCrisis) {
      console.log('[Workflow] ⚠️ Crisis detected, returning safety message');
      return {
        success: true,
        response: safetyResult.message,
        isCrisis: true,
        keyword: safetyResult.keyword,
        processingTime: Date.now() - startTime
      };
    }
    
    // ============================================================================
    // STEP 2: RETRIEVE MEMORY CONTEXT
    // ============================================================================
    console.log('[Workflow] Step 2: Retrieving memory context...');
    const memoryContext = await supabaseMemory.getMemory(userId, userMessage);
    
    // ============================================================================
    // STEP 3: CALL CLAUDE HAIKU FOR IMMEDIATE RESPONSE
    // ============================================================================
    console.log('[Workflow] Step 3: Getting Claude Haiku response...');
    const claudeResponse = await callClaudeHaiku(userMessage, memoryContext, conversationHistory);
    
    // ============================================================================
    // STEP 4: BACKGROUND LLAMA ANALYSIS (NON-BLOCKING)
    // ============================================================================
    console.log('[Workflow] Step 4: Starting background Llama analysis...');
    
    // Update conversation history with new exchange
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: claudeResponse, timestamp: new Date().toISOString() }
    ];
    
    // Start background analysis (non-blocking)
    callLlamaAnalysis(userMessage, updatedHistory)
      .then(async (analysis) => {
        console.log('[Workflow] Background analysis completed');
        
        // ================================================================
        // STEP 5: SAVE ANALYSIS TO MEMORY (BACKGROUND)
        // ================================================================
        const sessionSummary = analysis.session_summary || `Session summary: User discussed topics related to their message: "${userMessage.substring(0, 100)}..."`;
        const saveSuccess = await supabaseMemory.saveMemory(userId, sessionSummary);
        
        if (saveSuccess) {
          console.log('[Workflow] ✅ Session summary saved to memory');
        } else {
          console.log('[Workflow] ⚠️ Failed to save session summary');
        }
      })
      .catch((error) => {
        console.error('[Workflow] Background analysis failed:', error);
      });
    
    // ============================================================================
    // RETURN IMMEDIATE RESPONSE
    // ============================================================================
    console.log(`[Workflow] ✅ Workflow completed in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      response: claudeResponse,
      isCrisis: false,
      memoryCount: memoryContext.length,
      processingTime: Date.now() - startTime,
      backgroundAnalysisStarted: true
    };
    
  } catch (error) {
    console.error('[Workflow] Error in therapeutic chat processing:', error);
    
    return {
      success: false,
      error: error.message,
      response: "I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment, or if this is an emergency, please contact your local crisis helpline.",
      processingTime: Date.now() - startTime
    };
  }
}

// ========================================================================================
// API ENDPOINTS
// ========================================================================================

/**
 * Main chat endpoint - handles therapeutic conversations
 */
app.post('/api/therapeutic-chat', async (req, res) => {
  try {
    const { userId, message, history = [] } = req.body;
    
    // Validate required parameters
    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: userId and message'
      });
    }
    
    console.log(`[API] Processing therapeutic chat for user: ${userId}`);
    
    // Process the therapeutic conversation
    const result = await processTherapeuticChat(userId, message, history);
    
    // Return result
    if (result.success) {
      res.json({
        reply: result.response,
        isCrisis: result.isCrisis,
        metadata: {
          memoryCount: result.memoryCount,
          processingTime: result.processingTime,
          backgroundAnalysisStarted: result.backgroundAnalysisStarted,
          keyword: result.keyword
        }
      });
    } else {
      res.status(500).json({
        error: 'Processing failed',
        message: result.response,
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('[API] Error in therapeutic chat endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      claude: !!CONFIG.claude.apiKey,
      llama: !!CONFIG.llama.apiKey,
      supabase: !!CONFIG.supabase.url
    }
  });
});

/**
 * Safety check endpoint (for testing)
 */
app.post('/api/safety-check', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = checkSafety(message);
    res.json(result);
    
  } catch (error) {
    console.error('[API] Error in safety check:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================================
// SERVER STARTUP
// ========================================================================================

/**
 * Start the therapeutic chatbot server
 */
app.listen(PORT, () => {
  console.log('');
  console.log('🧠 ====================================');
  console.log('   LUMA THERAPEUTIC CHATBOT BACKEND');
  console.log('🧠 ====================================');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for development ports`);
  console.log(`🔑 Claude API: ${CONFIG.claude.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Llama API: ${CONFIG.llama.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Supabase: ${CONFIG.supabase.url ? 'Configured' : 'Missing'}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   POST /api/therapeutic-chat - Main chat processing');
  console.log('   POST /api/safety-check - Test safety detection');
  console.log('   GET  /health - Health check');
  console.log('');
  console.log('🛡️  Safety layer active with crisis detection');
  console.log('🧠 Hybrid LLM: Claude Haiku + Llama 3.1 70B');
  console.log('💾 Memory system: Supabase integration');
  console.log('');
});

// ========================================================================================
// EXPORT FOR TESTING (Optional)
// ========================================================================================

export {
  checkSafety,
  supabaseMemory,
  callClaudeHaiku,
  callLlamaAnalysis,
  processTherapeuticChat
};