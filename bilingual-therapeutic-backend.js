/**
 * BILINGUAL ENHANCED LUMA THERAPEUTIC CHATBOT BACKEND
 * 真正的双语支持 - 中英文用户完全适用
 * 
 * 新增功能：
 * - 智能语言检测和切换
 * - 双语核心系统指令模板
 * - 英语用户专用自适应长度控制
 * - 双语智能对话收尾检测
 * - 完整的英语安全检测
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-19
 * Version: 2.1.0 - Full Bilingual Support
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

// Enhanced crisis keywords for both languages
const CRISIS_KEYWORDS = {
  english: [
    'suicide', 'end my life', 'kill myself', 'want to die', 'harm myself', 
    "i'm going to hurt myself", 'hurt myself', 'suicidal', 'end it all', 
    'not worth living', 'better off dead', 'no point in living', 
    'can\'t go on', 'want to disappear', 'take my own life', 'kill me',
    'hate myself', 'worthless', 'want to die', 'nothing to live for',
    'everyone would be better without me', 'nobody would miss me',
    'thinking of ending it', 'planning to hurt myself', 'self harm'
  ],
  chinese: [
    '自杀', '想死', '不想活', '结束生命', '伤害自己', '活不下去', 
    '没意思', '想结束', '不如死了', '生无可恋', '想自杀', '自残',
    '没有活下去的意义', '大家都不需要我', '没人会想念我',
    '想要结束一切', '计划伤害自己', '想要自我伤害'
  ]
};

// Bilingual crisis response messages
const CRISIS_MESSAGES = {
  english: `I hear that you are in distress and I want to help. However, I cannot substitute for a professional mental health expert. Please contact a crisis hotline immediately or call your local emergency services. In New Zealand, good resources for mental wellbeing are: Lifeline – 0800 543 354 (0800 LIFELINE) or the Suicide Crisis Helpline – 0508 828 865 (0508 TAUTOKO).`,
  chinese: `我听到你现在很痛苦，我想帮助你。但是，我不能替代专业的心理健康专家。请立即联系危机热线或致电当地紧急服务。在新西兰，以下是很好的心理健康资源：生命热线 - 0800 543 354 (0800 LIFELINE) 或自杀危机帮助热线 - 0508 828 865 (0508 TAUTOKO)。`
};

// Enhanced closing keywords for both languages
const CLOSING_KEYWORDS = {
  english: [
    'thank you', 'thanks', 'thx', 'goodbye', 'bye', 'see you', 'talk later', 
    'that\'s all', 'enough for now', 'i\'m done', 'take care', 'farewell',
    'got to go', 'have to go', 'need to go', 'signing off', 'catch you later',
    'talk soon', 'until next time', 'appreciate it', 'grateful', 'helped me'
  ],
  chinese: [
    '谢谢', '谢了', '再见', '拜拜', '先到这里', '就这样吧', 
    '够了', '结束了', '不说了', '先这样', '保重', '感谢',
    '要走了', '得去了', '需要离开', '下线了', '回头聊',
    '下次再聊', '直到下次', '感激', '帮到我了', '有帮助'
  ]
};

// Bilingual closing responses
const CLOSING_RESPONSES = {
  english: [
    'Thank you for sharing with me. Remember, I\'m always here whenever you need support. Take care! 💛',
    'I\'m grateful for our conversation. Feel free to come back anytime you need someone to listen. Wishing you well!',
    'It was wonderful talking with you. I\'m here whenever you need a caring ear. Take good care of yourself!',
    'I appreciate you opening up with me. Remember, support is always available whenever you need it. Be well!',
    'Thank you for trusting me with your thoughts. I\'m here for you anytime. Take care of yourself! 💛',
    'It\'s been a pleasure chatting with you. I\'m always here when you need a supportive friend. Stay well!'
  ],
  chinese: [
    '很高兴能和你聊天。记住，我随时都在这里。保重！💛',
    '感谢你的分享。如果需要的话，我随时在这里倾听。祝你一切顺利！',
    '谢谢你信任我。无论何时需要支持，我都会在这里。照顾好自己！',
    '感谢你向我敞开心扉。记住，无论何时需要，支持总是可以得到的。保重！',
    '谢谢你相信我并分享你的想法。我随时为你而在。照顾好自己！💛',
    '与你聊天很愉快。当你需要一个支持的朋友时，我总是在这里。保持健康！'
  ]
};

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
// LANGUAGE DETECTION AND BILINGUAL SUPPORT FUNCTIONS
// ========================================================================================

/**
 * Detect primary language of user message
 * @param {string} message - User's message
 * @returns {string} - 'chinese' or 'english'
 */
function detectLanguage(message) {
  const chineseCharCount = (message.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = message.length;
  const chineseRatio = chineseCharCount / totalChars;
  
  // If more than 30% Chinese characters, consider it Chinese
  const language = chineseRatio > 0.3 ? 'chinese' : 'english';
  console.log(`[Language] Detected language: ${language} (Chinese ratio: ${(chineseRatio * 100).toFixed(1)}%)`);
  
  return language;
}

/**
 * Get user's conversation history language preference
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {string} - 'chinese' or 'english'
 */
function getHistoryLanguagePreference(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return 'english'; // Default to English
  }
  
  // Check the last few user messages for language preference
  const userMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .slice(-3); // Last 3 user messages
  
  let chineseCount = 0;
  let englishCount = 0;
  
  userMessages.forEach(msg => {
    const language = detectLanguage(msg.content);
    if (language === 'chinese') chineseCount++;
    else englishCount++;
  });
  
  return chineseCount > englishCount ? 'chinese' : 'english';
}

// ========================================================================================
// ENHANCED BILINGUAL BACKEND LOGIC FUNCTIONS
// ========================================================================================

/**
 * Enhanced bilingual adaptive length control
 * @param {string} userMessage - User's message
 * @param {string} detectedLanguage - Detected language
 * @returns {Object} - {maxTokens: number, temperature: number}
 */
function decideLengthByUserBilingual(userMessage, detectedLanguage) {
  console.log(`[Length] Analyzing ${detectedLanguage} message length and complexity...`);
  
  const messageLength = userMessage.trim().length;
  const hasQuestions = userMessage.includes('?') || userMessage.includes('？');
  
  let wordCount, effectiveLength, hasEmotionalWords;
  
  if (detectedLanguage === 'chinese') {
    // Chinese processing
    const chineseCharCount = (userMessage.match(/[\u4e00-\u9fff]/g) || []).length;
    effectiveLength = chineseCharCount * 2 + (messageLength - chineseCharCount);
    wordCount = chineseCharCount; // For Chinese, character count is more meaningful
    hasEmotionalWords = /感觉|情感|伤心|开心|生气|担心|焦虑|兴奋|沮丧|难过|高兴|愤怒|紧张|害怕|恐惧|痛苦|快乐|悲伤|抑郁/.test(userMessage);
  } else {
    // English processing
    wordCount = userMessage.trim().split(/\s+/).length;
    effectiveLength = messageLength;
    hasEmotionalWords = /feel|feeling|emotion|emotional|sad|happy|angry|worried|anxious|excited|depressed|upset|glad|frustrated|nervous|scared|afraid|hurt|joyful|sorrowful|stressed|overwhelmed/.test(userMessage.toLowerCase());
  }
  
  let maxTokens, temperature;
  
  // Adjust thresholds based on language
  const shortThreshold = detectedLanguage === 'chinese' ? 10 : 20;
  const longThreshold = detectedLanguage === 'chinese' ? 50 : 100;
  const wordThreshold = detectedLanguage === 'chinese' ? 15 : 30;
  
  if (effectiveLength < shortThreshold || wordCount < 4) {
    // Short message: very brief response
    maxTokens = 50; // Reduced from 150 to enforce brevity
    temperature = 0.6;
    console.log(`[Length] Short ${detectedLanguage} message detected - very brief response mode`);
  } else if (effectiveLength > longThreshold || wordCount > wordThreshold || hasEmotionalWords) {
    // Long/emotional message: detailed response
    maxTokens = 400;
    temperature = 0.8;
    console.log(`[Length] Long/emotional ${detectedLanguage} message detected - detailed response mode`);
  } else {
    // Medium message: concise response
    maxTokens = 100; // Reduced from 250 to enforce conciseness
    temperature = 0.7;
    console.log(`[Length] Medium ${detectedLanguage} message detected - concise response mode`);
  }
  
  // If has questions, slightly increase length
  if (hasQuestions) {
    maxTokens += 25; // Reduced from 50 to maintain brevity
    console.log(`[Length] Question detected in ${detectedLanguage} - slightly extended response length`);
  }
  
  return { maxTokens, temperature, detectedLanguage, effectiveLength, wordCount };
}

/**
 * Enhanced bilingual natural closure detection
 * @param {string} userMessage - User's message
 * @param {string} detectedLanguage - Detected language
 * @returns {boolean} - Whether user wants to close conversation
 */
function userWantsToCloseBilingual(userMessage, detectedLanguage) {
  console.log(`[Closing] Checking if ${detectedLanguage} user wants to end conversation...`);
  
  const normalizedMessage = userMessage.toLowerCase().trim();
  
  // Check language-specific closing keywords
  const keywordsToCheck = CLOSING_KEYWORDS[detectedLanguage] || CLOSING_KEYWORDS.english;
  
  const foundClosingKeyword = keywordsToCheck.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  // Check for simple thank you patterns
  const isSimpleThank = detectedLanguage === 'chinese' 
    ? normalizedMessage.match(/^(谢谢|谢了)\.?$/)
    : normalizedMessage.match(/^(thank you?|thanks?)\.?$/);
  
  // Check for goodbye patterns
  const isGoodbye = detectedLanguage === 'chinese'
    ? normalizedMessage.match(/(再见|拜拜|保重)/)
    : normalizedMessage.match(/(bye|goodbye|farewell|see you|take care)/);
  
  if (foundClosingKeyword || isSimpleThank || isGoodbye) {
    console.log(`[Closing] ✅ ${detectedLanguage} user wants to end conversation`);
    return true;
  }
  
  console.log(`[Closing] ${detectedLanguage} user wants to continue conversation`);
  return false;
}

/**
 * Generate appropriate closing response based on language
 * @param {string} language - Detected language
 * @returns {string} - Closing response
 */
function generateClosingResponseBilingual(language) {
  const responses = CLOSING_RESPONSES[language] || CLOSING_RESPONSES.english;
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// ========================================================================================
// ENHANCED SAFETY LAYER FUNCTIONS (Full Bilingual Support)
// ========================================================================================

/**
 * Enhanced bilingual safety check
 * @param {string} userMessage - The user's input message
 * @param {string} detectedLanguage - Detected language
 * @returns {Object} - {isCrisis: boolean, message?: string, language: string}
 */
function checkSafetyBilingual(userMessage, detectedLanguage) {
  try {
    console.log(`[Safety] Checking ${detectedLanguage} message for crisis keywords...`);
    
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // Check language-specific crisis keywords
    const keywordsToCheck = [
      ...CRISIS_KEYWORDS[detectedLanguage] || [],
      ...CRISIS_KEYWORDS.english // Always check English keywords too
    ];
    
    const foundKeyword = keywordsToCheck.find(keyword => 
      normalizedMessage.includes(keyword.toLowerCase())
    );
    
    if (foundKeyword) {
      console.log(`[Safety] ⚠️ Crisis keyword detected in ${detectedLanguage}: "${foundKeyword}"`);
      const crisisMessage = CRISIS_MESSAGES[detectedLanguage] || CRISIS_MESSAGES.english;
      
      return {
        isCrisis: true,
        message: crisisMessage,
        keyword: foundKeyword,
        language: detectedLanguage
      };
    }
    
    console.log(`[Safety] ✅ No crisis keywords detected in ${detectedLanguage} message`);
    return { isCrisis: false, language: detectedLanguage };
    
  } catch (error) {
    console.error('[Safety] Error in bilingual safety check:', error);
    // In case of error, err on the side of caution
    const crisisMessage = CRISIS_MESSAGES[detectedLanguage] || CRISIS_MESSAGES.english;
    return {
      isCrisis: true,
      message: crisisMessage,
      error: 'Safety check failed',
      language: detectedLanguage
    };
  }
}

// ========================================================================================
// SUPABASE MEMORY INTEGRATION (Unchanged - reuses existing system)
// ========================================================================================

const supabaseMemory = {
  
  async getMemory(userId, userMessage) {
    try {
      console.log(`[Memory] Retrieving memory for user: ${userId}`);
      
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
      return [];
    }
  },
  
  async saveMemory(userId, sessionSummary) {
    try {
      console.log(`[Memory] Saving session summary for user: ${userId}`);
      
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
// ENHANCED BILINGUAL LLM API INTEGRATION
// ========================================================================================

/**
 * Call Claude Haiku API with full bilingual support
 * @param {string} userMessage - User's message
 * @param {Array} memoryContext - Retrieved memory snippets
 * @param {Array} conversationHistory - Recent conversation history
 * @param {Object} dynamicParams - Dynamic parameters
 * @param {string} detectedLanguage - Detected language
 * @returns {Promise<string>} - Claude's response
 */
async function callClaudeBilingual(userMessage, memoryContext, conversationHistory, dynamicParams, detectedLanguage) {
  try {
    console.log(`[Claude] Preparing ${detectedLanguage} prompt with bilingual template...`);
    
    // Build context from memory
    const memoryText = memoryContext.length > 0 
      ? memoryContext.map(m => `- ${m.summary || m.content}`).join('\n')
      : (detectedLanguage === 'chinese' ? '暂无历史对话记录' : 'No previous conversation records available');
    
    // Build conversation history with appropriate labels
    const historyText = conversationHistory.length > 0
      ? conversationHistory.slice(-6).map(msg => {
          const label = detectedLanguage === 'chinese' 
            ? (msg.role === 'user' ? '用户' : 'Luma')
            : (msg.role === 'user' ? 'User' : 'Luma');
          return `${label}: ${msg.content}`;
        }).join('\n')
      : (detectedLanguage === 'chinese' ? '这是我们对话的开始' : 'This is the start of our conversation');
    
    // Create bilingual system prompt
    let bilingualSystemPrompt;
    
    if (detectedLanguage === 'chinese') {
      bilingualSystemPrompt = `你是Luma。回复要简短温暖。

**严格要求：**
- 最多2句话
- 如果用户说"你好"，只说"你好，怎么了？" 
- 如果用户分享情感，只说类似"这听起来很难受"然后停止
- 不要长篇解释或重复验证
- 匹配用户的简短程度

**历史：**
${historyText}
**记忆：**
${memoryText}

简短中文回复。`;
    } else {
      bilingualSystemPrompt = `You are Luma. Reply briefly and warmly.

**STRICT REQUIREMENTS:**
- Maximum 2 sentences
- If user says "hello", just say "Hi there. How are you feeling?" 
- If user shares emotion, just say something like "That sounds so difficult" then stop
- No asterisk expressions like *smiles*
- No long explanations or repeated validation
- Match user's brevity level

**History:**
${historyText}
**Memory:**
${memoryText}

Brief English reply.`;
    }

    // Prepare messages for Claude API
    const messages = [
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    const requestBody = {
      model: CONFIG.claude.model,
      max_tokens: dynamicParams.maxTokens,
      temperature: dynamicParams.temperature,
      system: bilingualSystemPrompt,
      messages: messages
    };
    
    console.log(`[Claude] Using ${detectedLanguage} dynamic params - maxTokens: ${dynamicParams.maxTokens}, temperature: ${dynamicParams.temperature}`);
    
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
    console.log(`[Claude] ✅ ${detectedLanguage} response generated (${data.usage?.output_tokens || 0} tokens)`);
    
    return claudeResponse;
    
  } catch (error) {
    console.error(`[Claude] Error calling bilingual Claude:`, error);
    throw error;
  }
}

/**
 * Call Llama 3.1 70B API for background analysis (Enhanced bilingual support)
 * @param {string} userMessage - User's message
 * @param {Array} fullConversationHistory - Complete conversation history
 * @param {string} detectedLanguage - Detected language
 * @returns {Promise<Object>} - Analysis results
 */
async function callLlamaBilingual(userMessage, fullConversationHistory, detectedLanguage) {
  try {
    console.log(`[Llama] Starting bilingual background analysis for ${detectedLanguage}...`);
    
    // Build full conversation context with appropriate labels
    const conversationText = fullConversationHistory
      .map(msg => {
        const label = detectedLanguage === 'chinese' 
          ? (msg.role === 'user' ? '用户' : 'Luma')
          : (msg.role === 'user' ? 'User' : 'Luma');
        return `${label}: ${msg.content}`;
      }).join('\n');
    
    // Create bilingual analysis prompt
    let analysisPrompt;
    
    if (detectedLanguage === 'chinese') {
      analysisPrompt = `你是一个治疗性AI助手，正在分析对话以获得更深入的见解。请用中文回复。

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
    } else {
      analysisPrompt = `You are a therapeutic AI assistant analyzing conversations for deeper insights. Please respond in English.

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
    }

    const requestBody = {
      model: CONFIG.llama.model,
      max_tokens: CONFIG.llama.maxTokens,
      temperature: CONFIG.llama.temperature,
      messages: [
        {
          role: 'system',
          content: detectedLanguage === 'chinese' 
            ? '你是一个提供结构化对话洞察的治疗分析AI。请用中文回复。'
            : 'You are a therapeutic analysis AI that provides structured insights about conversations. Please respond in English.'
        },
        {
          role: 'user', 
          content: analysisPrompt
        }
      ]
    };
    
    console.log(`[Llama] Making ${detectedLanguage} API request...`);
    
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
    console.log(`[Llama] ✅ ${detectedLanguage} analysis completed (${data.usage?.completion_tokens || 0} tokens)`);
    
    // Try to parse JSON response
    let analysisObject;
    try {
      analysisObject = JSON.parse(analysisText);
    } catch (parseError) {
      console.warn('[Llama] Could not parse JSON, using text response');
      const defaultSummary = detectedLanguage === 'chinese'
        ? `会话摘要 ${new Date().toISOString()}: 用户讨论了各种话题。由于技术问题，分析暂不可用。`
        : `Session summary ${new Date().toISOString()}: User discussed various topics. Analysis unavailable due to technical issues.`;
      
      analysisObject = {
        session_summary: analysisText.length > 100 ? analysisText : defaultSummary,
        analysis_type: 'text_response',
        language: detectedLanguage
      };
    }
    
    return analysisObject;
    
  } catch (error) {
    console.error(`[Llama] Error in ${detectedLanguage} background analysis:`, error);
    
    const defaultSummary = detectedLanguage === 'chinese'
      ? `会话摘要 ${new Date().toISOString()}: 用户讨论了各种话题。由于技术问题，分析暂不可用。`
      : `Session summary ${new Date().toISOString()}: User discussed various topics. Analysis unavailable due to technical issues.`;
    
    return {
      session_summary: defaultSummary,
      error: error.message,
      language: detectedLanguage
    };
  }
}

// ========================================================================================
// ENHANCED BILINGUAL THERAPEUTIC CHATBOT WORKFLOW
// ========================================================================================

/**
 * Process user message with full bilingual support
 * @param {string} userId - User identifier
 * @param {string} userMessage - User's input message
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {Promise<Object>} - Response object with Claude response and status
 */
async function processBilingualTherapeuticChat(userId, userMessage, conversationHistory = []) {
  const startTime = Date.now();
  console.log(`[Bilingual Workflow] Starting bilingual therapeutic chat processing for user: ${userId}`);
  
  try {
    // ============================================================================
    // STEP 1: LANGUAGE DETECTION
    // ============================================================================
    console.log('[Bilingual Workflow] Step 1: Language detection...');
    const detectedLanguage = detectLanguage(userMessage);
    const historyLanguage = getHistoryLanguagePreference(conversationHistory);
    const finalLanguage = detectedLanguage; // Use current message language primarily
    
    // ============================================================================
    // STEP 2: ENHANCED BILINGUAL SAFETY CHECK
    // ============================================================================
    console.log('[Bilingual Workflow] Step 2: Enhanced bilingual safety check...');
    const safetyResult = checkSafetyBilingual(userMessage, finalLanguage);
    
    if (safetyResult.isCrisis) {
      console.log('[Bilingual Workflow] ⚠️ Crisis detected, returning bilingual safety message');
      return {
        success: true,
        response: safetyResult.message,
        isCrisis: true,
        keyword: safetyResult.keyword,
        language: safetyResult.language,
        processingTime: Date.now() - startTime
      };
    }
    
    // ============================================================================
    // STEP 3: BILINGUAL CONVERSATION CLOSURE CHECK
    // ============================================================================
    console.log('[Bilingual Workflow] Step 3: Checking for bilingual conversation closure...');
    const wantsToClose = userWantsToCloseBilingual(userMessage, finalLanguage);
    
    if (wantsToClose) {
      console.log('[Bilingual Workflow] 👋 User wants to end conversation');
      const closingResponse = generateClosingResponseBilingual(finalLanguage);
      return {
        success: true,
        response: closingResponse,
        isClosure: true,
        language: finalLanguage,
        processingTime: Date.now() - startTime
      };
    }
    
    // ============================================================================
    // STEP 4: BILINGUAL DYNAMIC PARAMETER CALCULATION
    // ============================================================================
    console.log('[Bilingual Workflow] Step 4: Calculating bilingual dynamic response parameters...');
    const dynamicParams = decideLengthByUserBilingual(userMessage, finalLanguage);
    
    // ============================================================================
    // STEP 5: RETRIEVE MEMORY CONTEXT
    // ============================================================================
    console.log('[Bilingual Workflow] Step 5: Retrieving memory context...');
    const memoryContext = await supabaseMemory.getMemory(userId, userMessage);
    
    // ============================================================================
    // STEP 6: CALL BILINGUAL CLAUDE HAIKU FOR IMMEDIATE RESPONSE
    // ============================================================================
    console.log('[Bilingual Workflow] Step 6: Getting bilingual Claude Haiku response...');
    const claudeResponse = await callClaudeBilingual(
      userMessage, 
      memoryContext, 
      conversationHistory, 
      dynamicParams, 
      finalLanguage
    );
    
    // ============================================================================
    // STEP 7: BACKGROUND BILINGUAL LLAMA ANALYSIS (NON-BLOCKING)
    // ============================================================================
    console.log('[Bilingual Workflow] Step 7: Starting bilingual background Llama analysis...');
    
    // Update conversation history with new exchange
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: claudeResponse, timestamp: new Date().toISOString() }
    ];
    
    // Start background analysis (non-blocking)
    callLlamaBilingual(userMessage, updatedHistory, finalLanguage)
      .then(async (analysis) => {
        console.log('[Bilingual Workflow] Bilingual background analysis completed');
        
        // ================================================================
        // STEP 8: SAVE BILINGUAL ANALYSIS TO MEMORY (BACKGROUND)
        // ================================================================
        const sessionSummary = analysis.session_summary || (
          finalLanguage === 'chinese' 
            ? `会话摘要: 用户讨论了与消息"${userMessage.substring(0, 100)}..."相关的话题`
            : `Session summary: User discussed topics related to their message: "${userMessage.substring(0, 100)}..."`
        );
        
        const saveSuccess = await supabaseMemory.saveMemory(userId, sessionSummary);
        
        if (saveSuccess) {
          console.log('[Bilingual Workflow] ✅ Bilingual session summary saved to memory');
        } else {
          console.log('[Bilingual Workflow] ⚠️ Failed to save bilingual session summary');
        }
      })
      .catch((error) => {
        console.error('[Bilingual Workflow] Bilingual background analysis failed:', error);
      });
    
    // ============================================================================
    // RETURN IMMEDIATE BILINGUAL RESPONSE
    // ============================================================================
    console.log(`[Bilingual Workflow] ✅ Bilingual workflow completed in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      response: claudeResponse,
      isCrisis: false,
      isClosure: false,
      language: finalLanguage,
      memoryCount: memoryContext.length,
      dynamicParams: dynamicParams,
      processingTime: Date.now() - startTime,
      backgroundAnalysisStarted: true
    };
    
  } catch (error) {
    console.error('[Bilingual Workflow] Error in bilingual therapeutic chat processing:', error);
    
    const errorLanguage = detectLanguage(userMessage);
    const errorMessage = errorLanguage === 'chinese'
      ? "很抱歉，我现在遇到了一些技术困难。请稍后再试，或者如果这是紧急情况，请联系您当地的危机热线。"
      : "I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment, or if this is an emergency, please contact your local crisis helpline.";
    
    return {
      success: false,
      error: error.message,
      response: errorMessage,
      language: errorLanguage,
      processingTime: Date.now() - startTime
    };
  }
}

// ========================================================================================
// ENHANCED BILINGUAL API ENDPOINTS
// ========================================================================================

/**
 * Main bilingual therapeutic chat endpoint
 */
app.post('/api/bilingual-therapeutic-chat', async (req, res) => {
  try {
    const { userId, message, history = [] } = req.body;
    
    // Validate required parameters
    if (!userId || !message) {
      const detectedLang = detectLanguage(message || 'english');
      const errorMsg = detectedLang === 'chinese' 
        ? '缺少必需参数：userId 和 message'
        : 'Missing required parameters: userId and message';
        
      return res.status(400).json({
        error: 'Missing required parameters: userId and message',
        message: errorMsg,
        language: detectedLang
      });
    }
    
    console.log(`[Bilingual API] Processing bilingual therapeutic chat for user: ${userId}`);
    
    // Process the bilingual therapeutic conversation
    const result = await processBilingualTherapeuticChat(userId, message, history);
    
    // Return result
    if (result.success) {
      res.json({
        reply: result.response,
        isCrisis: result.isCrisis,
        isClosure: result.isClosure,
        language: result.language,
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
        error: 'Bilingual processing failed',
        message: result.response,
        details: result.error,
        language: result.language
      });
    }
    
  } catch (error) {
    console.error('[Bilingual API] Error in bilingual therapeutic chat endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Backwards compatibility endpoints
app.post('/api/enhanced-therapeutic-chat', (req, res) => {
  req.url = '/api/bilingual-therapeutic-chat';
  return app._router.handle(req, res);
});

app.post('/api/therapeutic-chat', (req, res) => {
  req.url = '/api/bilingual-therapeutic-chat';
  return app._router.handle(req, res);
});

/**
 * Enhanced bilingual health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.1.0-bilingual',
    timestamp: new Date().toISOString(),
    services: {
      claude: !!CONFIG.claude.apiKey,
      llama: !!CONFIG.llama.apiKey,
      supabase: !!CONFIG.supabase.url
    },
    features: {
      bilingualSupport: true,
      chineseSupport: true,
      englishSupport: true,
      dynamicLengthControl: true,
      intelligentClosure: true,
      enhancedSafety: true,
      languageDetection: true
    }
  });
});

/**
 * Bilingual safety check endpoint
 */
app.post('/api/safety-check', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      const errorMsg = {
        english: 'Message is required',
        chinese: '消息是必需的'
      };
      return res.status(400).json({ 
        error: errorMsg.english, 
        message: errorMsg.chinese 
      });
    }
    
    const detectedLanguage = detectLanguage(message);
    const result = checkSafetyBilingual(message, detectedLanguage);
    res.json(result);
    
  } catch (error) {
    console.error('[Bilingual API] Error in bilingual safety check:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test bilingual functionality endpoint
 */
app.post('/api/test-bilingual', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const detectedLanguage = detectLanguage(message);
    const lengthParams = decideLengthByUserBilingual(message, detectedLanguage);
    const closureCheck = userWantsToCloseBilingual(message, detectedLanguage);
    const safetyCheck = checkSafetyBilingual(message, detectedLanguage);
    
    res.json({
      detectedLanguage,
      dynamicParams: lengthParams,
      wantsToClose: closureCheck,
      isCrisis: safetyCheck.isCrisis,
      messageAnalysis: {
        length: message.length,
        chineseChars: (message.match(/[\u4e00-\u9fff]/g) || []).length,
        wordCount: message.split(/\s+/).length,
        hasQuestions: message.includes('?') || message.includes('？')
      },
      closingResponse: closureCheck ? generateClosingResponseBilingual(detectedLanguage) : null
    });
    
  } catch (error) {
    console.error('[Bilingual API] Error in bilingual test:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================================
// ENHANCED BILINGUAL SERVER STARTUP
// ========================================================================================

/**
 * Start the enhanced bilingual therapeutic chatbot server
 */
app.listen(PORT, () => {
  console.log('');
  console.log('🌐 ============================================');
  console.log('   BILINGUAL ENHANCED LUMA THERAPEUTIC CHATBOT');
  console.log('   双语增强版心理支持聊天机器人后端');
  console.log('   Full English & Chinese Support');
  console.log('🌐 ============================================');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for development ports`);
  console.log(`🔑 Claude API: ${CONFIG.claude.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Llama API: ${CONFIG.llama.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🔑 Supabase: ${CONFIG.supabase.url ? 'Configured' : 'Missing'}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   POST /api/bilingual-therapeutic-chat - 双语治疗对话处理 / Bilingual Therapeutic Chat');
  console.log('   POST /api/enhanced-therapeutic-chat - 重定向到双语接口 / Redirects to Bilingual');
  console.log('   POST /api/therapeutic-chat - 兼容旧版接口 / Legacy Compatibility');
  console.log('   POST /api/safety-check - 双语安全检测测试 / Bilingual Safety Check');
  console.log('   POST /api/test-bilingual - 双语功能测试 / Bilingual Feature Test');
  console.log('   GET  /health - 健康检查 / Health Check');
  console.log('');
  console.log('🌟 Enhanced Bilingual Features:');
  console.log('🛡️  Enhanced safety layer (中英文危机检测 / EN+ZH Crisis Detection)');
  console.log('🧠 Hybrid LLM: Claude Haiku + Llama 3.1 70B (Bilingual)');
  console.log('💾 Memory system: Supabase integration');
  console.log('📏 Dynamic length control (双语自适应回复长度 / Bilingual Adaptive Length)');
  console.log('👋 Intelligent closure detection (双语智能对话收尾 / Bilingual Smart Closure)');
  console.log('🔍 Automatic language detection (自动语言检测)');
  console.log('🈳️ Full Chinese + English bilingual support');
  console.log('');
});

// ========================================================================================
// EXPORT FOR TESTING (Enhanced Bilingual)
// ========================================================================================

export {
  detectLanguage,
  getHistoryLanguagePreference,
  checkSafetyBilingual,
  decideLengthByUserBilingual,
  userWantsToCloseBilingual,
  generateClosingResponseBilingual,
  supabaseMemory,
  callClaudeBilingual,
  callLlamaBilingual,
  processBilingualTherapeuticChat
};