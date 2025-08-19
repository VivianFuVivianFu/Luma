/**
 * ENHANCED LUMA THERAPEUTIC CHATBOT BACKEND
 * 整合功能的Prompt模板 + 自适应长度控制 + 自然收尾检测
 * 
 * 新增功能：
 * - 中文核心系统指令模板
 * - 自适应回复长度控制
 * - 智能对话收尾检测
 * - 动态参数调整
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-19
 * Version: 2.0.0 - Enhanced with Chinese Prompt Template
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
  'no point in living', 'can\'t go on', 'want to disappear',
  // 中文危机关键词
  '自杀', '想死', '不想活', '结束生命', '伤害自己', '活不下去', 
  '没意思', '想结束', '不如死了', '生无可恋'
];

// Crisis response message for New Zealand (bilingual)
const CRISIS_MESSAGE = `我听到你现在很痛苦，我想帮助你。但是，我不能替代专业的心理健康专家。请立即联系危机热线或致电当地紧急服务。在新西兰，以下是很好的心理健康资源：生命热线 - 0800 543 354 (0800 LIFELINE) 或自杀危机帮助热线 - 0508 828 865 (0508 TAUTOKO)。

I hear that you are in distress and I want to help. However, I cannot substitute for a professional mental health expert. Please contact a crisis hotline immediately or call your local emergency services. In New Zealand, good resources for mental wellbeing are: Lifeline – 0800 543 354 (0800 LIFELINE) or the Suicide Crisis Helpline – 0508 828 865 (0508 TAUTOKO).`;

// 对话结束关键词检测
const CLOSING_KEYWORDS = [
  // 英文
  'thank you', 'thanks', 'goodbye', 'bye', 'see you', 'talk later', 
  'that\'s all', 'enough for now', 'i\'m done', 'take care',
  // 中文
  '谢谢', '谢了', '再见', '拜拜', '先到这里', '就这样吧', 
  '够了', '结束了', '不说了', '先这样', '保重'
];

// 温暖的结束语
const CLOSING_RESPONSES = [
  '很高兴能和你聊天。记住，我随时都在这里。保重！💛',
  '感谢你的分享。如果需要的话，我随时在这里倾听。祝你一切顺利！',
  '谢谢你信任我。无论何时需要支持，我都会在这里。照顾好自己！',
  'Thank you for sharing with me. Remember, I\'m always here whenever you need support. Take care! 💛',
  'I\'m grateful for our conversation. Feel free to come back anytime you need someone to listen. Wishing you well!',
  'It was wonderful talking with you. I\'m here whenever you need a caring ear. Take good care of yourself!'
];

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
// ENHANCED BACKEND LOGIC FUNCTIONS
// ========================================================================================

/**
 * 自适应长度控制 - 根据用户消息动态调整回复参数
 * @param {string} userMessage - 用户消息
 * @returns {Object} - {maxTokens: number, temperature: number}
 */
function decideLengthByUser(userMessage) {
  console.log('[Length] Analyzing user message length and complexity...');
  
  const messageLength = userMessage.trim().length;
  const wordCount = userMessage.trim().split(/\s+/).length;
  const hasQuestions = userMessage.includes('?') || userMessage.includes('？');
  const hasEmotionalWords = /feel|emotion|sad|happy|angry|worried|anxious|excited|感觉|情感|伤心|开心|生气|担心|焦虑|兴奋/.test(userMessage.toLowerCase());
  
  // 中文字符计算（中文没有空格分隔，需要特别处理）
  const chineseCharCount = (userMessage.match(/[\u4e00-\u9fff]/g) || []).length;
  const effectiveLength = chineseCharCount > 0 ? chineseCharCount * 2 + (messageLength - chineseCharCount) : messageLength;
  
  let maxTokens, temperature;
  
  if (effectiveLength < 20 || (chineseCharCount < 10 && wordCount < 4)) {
    // 短消息：简短回复
    maxTokens = 150;
    temperature = 0.6;
    console.log('[Length] Short message detected - brief response mode');
  } else if (effectiveLength > 100 || chineseCharCount > 30 || wordCount > 30 || hasEmotionalWords) {
    // 长消息或情感丰富：详细回复
    maxTokens = 400;
    temperature = 0.8;
    console.log('[Length] Long/emotional message detected - detailed response mode');
  } else {
    // 中等消息：标准回复
    maxTokens = 250;
    temperature = 0.7;
    console.log('[Length] Medium message detected - standard response mode');
  }
  
  // 如果有问题，稍微增加长度以便充分回答
  if (hasQuestions) {
    maxTokens += 50;
    console.log('[Length] Question detected - extended response length');
  }
  
  return { maxTokens, temperature };
}

/**
 * 自然收尾检测 - 检测用户是否想结束对话
 * @param {string} userMessage - 用户消息
 * @returns {boolean} - 用户是否想结束对话
 */
function userWantsToClose(userMessage) {
  console.log('[Closing] Checking if user wants to end conversation...');
  
  const normalizedMessage = userMessage.toLowerCase().trim();
  
  // 检查结束关键词
  const foundClosingKeyword = CLOSING_KEYWORDS.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  // 检查简短感谢（通常表示想结束）
  const isSimpleThank = normalizedMessage.match(/^(谢谢|thank you?|thanks?)\.?$/);
  
  // 检查"再见"类型的表达
  const isGoodbye = normalizedMessage.match(/(再见|拜拜|bye|goodbye|see you)/);
  
  if (foundClosingKeyword || isSimpleThank || isGoodbye) {
    console.log('[Closing] ✅ User wants to end conversation');
    return true;
  }
  
  console.log('[Closing] User wants to continue conversation');
  return false;
}

/**
 * 生成温暖的结束回复
 * @returns {string} - 随机选择的结束语
 */
function generateClosingResponse() {
  const randomIndex = Math.floor(Math.random() * CLOSING_RESPONSES.length);
  return CLOSING_RESPONSES[randomIndex];
}

// ========================================================================================
// SAFETY LAYER FUNCTIONS (Enhanced with Chinese support)
// ========================================================================================

/**
 * Check user message for crisis-related keywords (supports Chinese)
 * @param {string} userMessage - The user's input message
 * @returns {Object} - {isCrisis: boolean, message?: string}
 */
function checkSafety(userMessage) {
  try {
    console.log('[Safety] Checking message for crisis keywords (Chinese + English)...');
    
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
// SUPABASE MEMORY INTEGRATION (Unchanged - reuses existing system)
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
// ENHANCED LLM API INTEGRATION WITH CHINESE PROMPT TEMPLATE
// ========================================================================================

/**
 * Call Claude Haiku API with enhanced Chinese prompt template
 * @param {string} userMessage - User's message
 * @param {Array} memoryContext - Retrieved memory snippets
 * @param {Array} conversationHistory - Recent conversation history
 * @param {Object} dynamicParams - Dynamic parameters from decideLengthByUser
 * @returns {Promise<string>} - Claude's response
 */
async function callClaudeHaikuEnhanced(userMessage, memoryContext, conversationHistory, dynamicParams) {
  try {
    console.log('[Claude] Preparing enhanced prompt with Chinese template...');
    
    // Build context from memory
    const memoryText = memoryContext.length > 0 
      ? memoryContext.map(m => `- ${m.summary || m.content}`).join('\n')
      : '暂无历史对话记录';
    
    // Build conversation history  
    const historyText = conversationHistory.length > 0
      ? conversationHistory.slice(-6).map(msg => 
          `${msg.role === 'user' ? '用户' : 'Luma'}: ${msg.content}`
        ).join('\n')
      : '这是我们对话的开始';
    
    // 核心系统指令 - 中文模板
    const enhancedSystemPrompt = `你是一个温暖、富有同理心和非评判性的情绪支持AI。你的主要目标是倾听、验证用户的情绪，并提供一个安全的对话空间。

**你的核心行为准则如下：**

1. **主动倾听与同理心:** 你的回复应始终基于用户的感受。使用"听起来..."或"我能感受到..."之类的短语来验证他们的情绪，而不是直接提供解决方案。

2. **非评判性:** 你的语言必须是温和、鼓励和不带任何评判的。避免使用"你应该..."或"你必须..."之类的命令式词语。

3. **深度与广度:** 当用户提出简短消息时，请给出简短而重点的回复；当用户分享更多细节时，请给予更深入和细致的反馈，以表明你正在认真倾听。

4. **引导性提问:** 除非用户明确要求，否则不要直接给出建议。相反，提出开放式问题来鼓励用户自我探索，例如："你觉得这背后可能有什么原因呢？"

5. **自然收尾:** 如果用户明确表示结束对话（例如："谢谢"、"先到这里吧"），你的回复应以简短的致谢或祝福语作为结尾，并传递出"我随时都在"的温情。不要继续提问或试图延长对话。

**重要提示：**
- 你不是一个专业的治疗师或医生
- 如果用户表达出任何自残或对他人的伤害意图，立即引导他们寻求专业帮助
- 避免使用任何星号表达式如*微笑*、*点头*等
- 直接说话，不要描述动作或表情
- 支持中英文双语对话，根据用户的语言习惯响应

**对话历史记录：**
${historyText}

**记忆上下文：**
${memoryText}

现在请根据用户的新消息，以温暖、同理心和非评判的方式回应。记住要根据消息的长度和复杂度调整你的回复深度。`;

    // Prepare messages for Claude API
    const messages = [
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    const requestBody = {
      model: CONFIG.claude.model,
      max_tokens: dynamicParams.maxTokens, // 使用动态参数
      temperature: dynamicParams.temperature, // 使用动态参数
      system: enhancedSystemPrompt,
      messages: messages
    };
    
    console.log(`[Claude] Using dynamic params - maxTokens: ${dynamicParams.maxTokens}, temperature: ${dynamicParams.temperature}`);
    
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
    
    let claudeResponse = data.content[0].text.trim();
    console.log(`[Claude] ✅ Response generated (${data.usage?.output_tokens || 0} tokens)`);
    
    return claudeResponse;
    
  } catch (error) {
    console.error('[Claude] Error calling enhanced Claude Haiku:', error);
    throw error;
  }
}

/**
 * Call Llama 3.1 70B API for background analysis (Enhanced with Chinese support)
 * @param {string} userMessage - User's message
 * @param {Array} fullConversationHistory - Complete conversation history
 * @returns {Promise<Object>} - Analysis results
 */
async function callLlamaAnalysisEnhanced(userMessage, fullConversationHistory) {
  try {
    console.log('[Llama] Starting enhanced background analysis with Chinese support...');
    
    // Build full conversation context
    const conversationText = fullConversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'Luma'}: ${msg.content}`)
      .join('\n');
    
    // Create analysis prompt for Llama (bilingual)
    const analysisPrompt = `你是一个治疗性AI助手，正在分析对话以获得更深入的见解。请用中文回复。

对话历史：
${conversationText}

最新用户消息: ${userMessage}

请分析这次对话并提供：

1. **情感模式**: 你注意到哪些重复的情感主题或模式？
2. **认知模式**: 是否存在任何认知扭曲或思维模式？
3. **会话摘要**: 提供这次会话要点的简洁摘要
4. **治疗性洞察**: 哪些治疗性重构或见解可能有帮助？
5. **建议**: 哪些领域可能受益于持续探索？

请以结构化JSON格式回复：
{
  "emotional_patterns": "...",
  "cognitive_patterns": "...", 
  "session_summary": "...",
  "therapeutic_insights": "...",
  "recommendations": "..."
}

请专业、有见地，专注于模式而不是做出诊断。`;

    const requestBody = {
      model: CONFIG.llama.model,
      max_tokens: CONFIG.llama.maxTokens,
      temperature: CONFIG.llama.temperature,
      messages: [
        {
          role: 'system',
          content: '你是一个提供结构化对话洞察的治疗分析AI。请用中文回复。'
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
    console.log(`[Llama] ✅ Enhanced analysis completed (${data.usage?.completion_tokens || 0} tokens)`);
    
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
    console.error('[Llama] Error in enhanced background analysis:', error);
    // Return minimal analysis on error
    return {
      session_summary: `会话摘要 ${new Date().toISOString()}: 用户讨论了各种话题。由于技术问题，分析暂不可用。`,
      error: error.message
    };
  }
}

// ========================================================================================
// ENHANCED THERAPEUTIC CHATBOT WORKFLOW
// ========================================================================================

/**
 * Enhanced process user message through complete therapeutic workflow
 * @param {string} userId - User identifier
 * @param {string} userMessage - User's input message
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {Promise<Object>} - Response object with Claude response and status
 */
async function processEnhancedTherapeuticChat(userId, userMessage, conversationHistory = []) {
  const startTime = Date.now();
  console.log(`[Enhanced Workflow] Starting enhanced therapeutic chat processing for user: ${userId}`);
  
  try {
    // ============================================================================
    // STEP 1: SAFETY CHECK (Enhanced with Chinese)
    // ============================================================================
    console.log('[Enhanced Workflow] Step 1: Enhanced safety check...');
    const safetyResult = checkSafety(userMessage);
    
    if (safetyResult.isCrisis) {
      console.log('[Enhanced Workflow] ⚠️ Crisis detected, returning safety message');
      return {
        success: true,
        response: safetyResult.message,
        isCrisis: true,
        keyword: safetyResult.keyword,
        processingTime: Date.now() - startTime
      };
    }
    
    // ============================================================================
    // STEP 2: CHECK IF USER WANTS TO CLOSE CONVERSATION
    // ============================================================================
    console.log('[Enhanced Workflow] Step 2: Checking for conversation closure...');
    const wantsToClose = userWantsToClose(userMessage);
    
    if (wantsToClose) {
      console.log('[Enhanced Workflow] 👋 User wants to end conversation');
      const closingResponse = generateClosingResponse();
      return {
        success: true,
        response: closingResponse,
        isClosure: true,
        processingTime: Date.now() - startTime
      };
    }
    
    // ============================================================================
    // STEP 3: DYNAMIC PARAMETER CALCULATION
    // ============================================================================
    console.log('[Enhanced Workflow] Step 3: Calculating dynamic response parameters...');
    const dynamicParams = decideLengthByUser(userMessage);
    
    // ============================================================================
    // STEP 4: RETRIEVE MEMORY CONTEXT
    // ============================================================================
    console.log('[Enhanced Workflow] Step 4: Retrieving memory context...');
    const memoryContext = await supabaseMemory.getMemory(userId, userMessage);
    
    // ============================================================================
    // STEP 5: CALL ENHANCED CLAUDE HAIKU FOR IMMEDIATE RESPONSE
    // ============================================================================
    console.log('[Enhanced Workflow] Step 5: Getting enhanced Claude Haiku response...');
    const claudeResponse = await callClaudeHaikuEnhanced(userMessage, memoryContext, conversationHistory, dynamicParams);
    
    // ============================================================================
    // STEP 6: BACKGROUND ENHANCED LLAMA ANALYSIS (NON-BLOCKING)
    // ============================================================================
    console.log('[Enhanced Workflow] Step 6: Starting enhanced background Llama analysis...');
    
    // Update conversation history with new exchange
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: claudeResponse, timestamp: new Date().toISOString() }
    ];
    
    // Start background analysis (non-blocking)
    callLlamaAnalysisEnhanced(userMessage, updatedHistory)
      .then(async (analysis) => {
        console.log('[Enhanced Workflow] Enhanced background analysis completed');
        
        // ================================================================
        // STEP 7: SAVE ENHANCED ANALYSIS TO MEMORY (BACKGROUND)
        // ================================================================
        const sessionSummary = analysis.session_summary || `会话摘要: 用户讨论了与消息"${userMessage.substring(0, 100)}..."相关的话题`;
        const saveSuccess = await supabaseMemory.saveMemory(userId, sessionSummary);
        
        if (saveSuccess) {
          console.log('[Enhanced Workflow] ✅ Enhanced session summary saved to memory');
        } else {
          console.log('[Enhanced Workflow] ⚠️ Failed to save enhanced session summary');
        }
      })
      .catch((error) => {
        console.error('[Enhanced Workflow] Enhanced background analysis failed:', error);
      });
    
    // ============================================================================
    // RETURN IMMEDIATE ENHANCED RESPONSE
    // ============================================================================
    console.log(`[Enhanced Workflow] ✅ Enhanced workflow completed in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      response: claudeResponse,
      isCrisis: false,
      isClosure: false,
      memoryCount: memoryContext.length,
      dynamicParams: dynamicParams,
      processingTime: Date.now() - startTime,
      backgroundAnalysisStarted: true
    };
    
  } catch (error) {
    console.error('[Enhanced Workflow] Error in enhanced therapeutic chat processing:', error);
    
    return {
      success: false,
      error: error.message,
      response: "很抱歉，我现在遇到了一些技术困难。请稍后再试，或者如果这是紧急情况，请联系您当地的危机热线。I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment, or if this is an emergency, please contact your local crisis helpline.",
      processingTime: Date.now() - startTime
    };
  }
}

// ========================================================================================
// ENHANCED API ENDPOINTS
// ========================================================================================

/**
 * Enhanced therapeutic chat endpoint
 */
app.post('/api/enhanced-therapeutic-chat', async (req, res) => {
  try {
    const { userId, message, history = [] } = req.body;
    
    // Validate required parameters
    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: userId and message',
        message: '缺少必需参数：userId 和 message'
      });
    }
    
    console.log(`[Enhanced API] Processing enhanced therapeutic chat for user: ${userId}`);
    
    // Process the enhanced therapeutic conversation
    const result = await processEnhancedTherapeuticChat(userId, message, history);
    
    // Return result
    if (result.success) {
      res.json({
        reply: result.response,
        isCrisis: result.isCrisis,
        isClosure: result.isClosure,
        metadata: {
          memoryCount: result.memoryCount,
          processingTime: result.processingTime,
          backgroundAnalysisStarted: result.backgroundAnalysisStarted,
          dynamicParams: result.dynamicParams,
          keyword: result.keyword
        }
      });
    } else {
      res.status(500).json({
        error: 'Enhanced processing failed',
        message: result.response,
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('[Enhanced API] Error in enhanced therapeutic chat endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Keep original endpoint for backwards compatibility
app.post('/api/therapeutic-chat', async (req, res) => {
  // Redirect to enhanced endpoint
  req.url = '/api/enhanced-therapeutic-chat';
  return app._router.handle(req, res);
});

/**
 * Enhanced health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.0-enhanced',
    timestamp: new Date().toISOString(),
    services: {
      claude: !!CONFIG.claude.apiKey,
      llama: !!CONFIG.llama.apiKey,
      supabase: !!CONFIG.supabase.url
    },
    features: {
      chineseSupport: true,
      dynamicLengthControl: true,
      intelligentClosure: true,
      enhancedSafety: true
    }
  });
});

/**
 * Enhanced safety check endpoint
 */
app.post('/api/safety-check', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required', message: '消息是必需的' });
    }
    
    const result = checkSafety(message);
    res.json(result);
    
  } catch (error) {
    console.error('[Enhanced API] Error in enhanced safety check:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test dynamic length control endpoint
 */
app.post('/api/test-length-control', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required', message: '消息是必需的' });
    }
    
    const params = decideLengthByUser(message);
    const closureCheck = userWantsToClose(message);
    
    res.json({
      dynamicParams: params,
      wantsToClose: closureCheck,
      messageAnalysis: {
        length: message.length,
        wordCount: message.split(/\s+/).length,
        hasQuestions: message.includes('?') || message.includes('？'),
        hasEmotionalWords: /feel|emotion|sad|happy|angry|worried|anxious|excited|感觉|情感|伤心|开心|生气|担心|焦虑|兴奋/.test(message.toLowerCase())
      }
    });
    
  } catch (error) {
    console.error('[Enhanced API] Error in length control test:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================================
// ENHANCED SERVER STARTUP
// ========================================================================================

/**
 * Start the enhanced therapeutic chatbot server
 */
app.listen(PORT, () => {
  console.log('');
  console.log('🧠 =========================================');
  console.log('   ENHANCED LUMA THERAPEUTIC CHATBOT');
  console.log('   增强版心理支持聊天机器人后端');
  console.log('🧠 =========================================');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for development ports`);
  console.log(`🔑 Claude API: ${CONFIG.claude.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Llama API: ${CONFIG.llama.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Supabase: ${CONFIG.supabase.url ? 'Configured' : 'Missing'}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   POST /api/enhanced-therapeutic-chat - 增强治疗对话处理');
  console.log('   POST /api/therapeutic-chat - 兼容旧版接口');
  console.log('   POST /api/safety-check - 安全检测测试');
  console.log('   POST /api/test-length-control - 动态长度控制测试');
  console.log('   GET  /health - 健康检查');
  console.log('');
  console.log('🌟 Enhanced Features:');
  console.log('🛡️  Enhanced safety layer (中英文危机检测)');
  console.log('🧠 Hybrid LLM: Claude Haiku + Llama 3.1 70B');
  console.log('💾 Memory system: Supabase integration');
  console.log('📏 Dynamic length control (自适应回复长度)');
  console.log('👋 Intelligent closure detection (智能对话收尾)');
  console.log('🈳️ Chinese + English bilingual support');
  console.log('');
});

// ========================================================================================
// EXPORT FOR TESTING (Enhanced)
// ========================================================================================

export {
  checkSafety,
  decideLengthByUser,
  userWantsToClose,
  generateClosingResponse,
  supabaseMemory,
  callClaudeHaikuEnhanced,
  callLlamaAnalysisEnhanced,
  processEnhancedTherapeuticChat
};