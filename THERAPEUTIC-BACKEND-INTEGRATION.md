# LUMA THERAPEUTIC CHATBOT BACKEND - INTEGRATION GUIDE

## 🎯 Overview

The `therapeutic-chatbot-backend.js` file contains a complete, self-contained JavaScript backend that implements:

- **Safety Layer**: Crisis keyword detection with New Zealand resources
- **Hybrid LLM**: Claude Haiku (frontend) + Llama 3.1 70B (background analysis)
- **Memory System**: Integration with existing Supabase memory functions
- **Therapeutic Workflow**: Complete conversation processing pipeline

## 🚀 Quick Start

### 1. Start the Therapeutic Backend

```bash
# Start the new therapeutic backend (replaces claude-proxy-server.js)
node therapeutic-chatbot-backend.js
```

The server will run on `http://localhost:3001` with the following endpoints:

- `POST /api/therapeutic-chat` - Main therapeutic conversation endpoint
- `POST /api/safety-check` - Test safety detection
- `GET /health` - Health check

### 2. Update Your Frontend Integration

Replace your existing Claude API calls with the new therapeutic endpoint:

```javascript
// OLD: Direct Claude API call
const response = await fetch('http://localhost:3001/api/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage, history: [] })
});

// NEW: Therapeutic chatbot endpoint
const response = await fetch('http://localhost:3001/api/therapeutic-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    userId: 'user-123', // Your user ID
    message: userMessage, 
    history: conversationHistory 
  })
});

const data = await response.json();
console.log('Response:', data.reply);
console.log('Crisis detected:', data.isCrisis);
console.log('Processing time:', data.metadata.processingTime);
```

## 🛡️ Safety Layer Features

### Crisis Detection

The backend automatically scans all user messages for crisis keywords:

```javascript
const crisisKeywords = [
  'suicide', 'end my life', 'kill myself', 'want to die', 
  'harm myself', "i'm going to hurt myself", 'hurt myself',
  'suicidal', 'end it all', 'not worth living', 'better off dead'
];
```

### Crisis Response

When detected, returns immediate New Zealand-specific crisis resources:

```
"I hear that you are in distress and I'm here to help. However, I am not a substitute for a human therapist in an emergency. Please contact a crisis hotline immediately or call your local emergency services. In New Zealand, good resources for mental wellbeing are: Lifeline – 0800 543 354 (0800 LIFELINE) or the Suicide Crisis Helpline – 0508 828 865 (0508 TAUTOKO)."
```

## 🧠 Hybrid LLM Architecture

### Frontend Processing (Claude Haiku)
- **Purpose**: Immediate, empathetic response to user
- **Speed**: Fast response (~1-3 seconds)
- **Tone**: Supportive, conversational, warm
- **Memory**: Uses retrieved context from Supabase

### Background Analysis (Llama 3.1 70B)
- **Purpose**: Deep therapeutic analysis and insights
- **Speed**: Runs asynchronously (doesn't block user)
- **Analysis**: 
  - Emotional patterns
  - Cognitive distortions
  - Session summaries
  - Therapeutic insights
- **Storage**: Saves analysis to Supabase memory

## 💾 Memory System Integration

### Assumed Supabase Functions

The backend calls your existing Supabase memory functions:

```javascript
// These functions are assumed to exist in your Supabase setup
supabase.getMemory(userId, userMessage) // Retrieves relevant memories
supabase.saveMemory(userId, sessionSummary) // Saves session analysis
```

### Memory Workflow

1. **Retrieve**: Gets relevant past conversations for context
2. **Enhance**: Claude uses memory context for better responses  
3. **Analyze**: Llama analyzes full conversation in background
4. **Store**: Session summary saved for future reference

## 🔧 Configuration

### Environment Variables Required

```bash
# Claude 3 Haiku API
VITE_CLAUDE_API_KEY=sk-ant-api03-...

# Together AI for Llama 3.1 70B  
VITE_TOGETHER_API_KEY=tgp_v1_...

# Supabase
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Response Format

### Successful Response
```json
{
  "reply": "I understand you're feeling overwhelmed...",
  "isCrisis": false,
  "metadata": {
    "memoryCount": 3,
    "processingTime": 1247,
    "backgroundAnalysisStarted": true
  }
}
```

### Crisis Response
```json
{
  "reply": "I hear that you are in distress...",
  "isCrisis": true,
  "metadata": {
    "keyword": "kill myself",
    "processingTime": 23
  }
}
```

## 🧪 Testing

### Test Safety Layer
```bash
curl -X POST http://localhost:3001/api/safety-check \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to hurt myself"}'
```

### Test Full Workflow
```bash
curl -X POST http://localhost:3001/api/therapeutic-chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "I feel really anxious about work",
    "history": []
  }'
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 🔄 Migration from Existing System

### Replace claude-proxy-server.js

1. **Stop** the old proxy server
2. **Start** the new therapeutic backend:
   ```bash
   node therapeutic-chatbot-backend.js
   ```
3. **Update** frontend API calls to use `/api/therapeutic-chat`
4. **Test** the crisis detection and memory integration

### Advantages of New System

- ✅ **Safety-First**: Automatic crisis detection
- ✅ **Dual Intelligence**: Claude for empathy + Llama for analysis  
- ✅ **Memory Integration**: Uses your existing Supabase system
- ✅ **Performance**: Non-blocking background analysis
- ✅ **Monitoring**: Detailed logging and health checks
- ✅ **Therapeutic**: Designed specifically for emotional support

## 🚨 Important Notes

1. **Crisis Safety**: Always prioritize user safety - the system blocks LLM calls during crisis detection
2. **Memory Privacy**: Ensure your Supabase RLS policies protect user data
3. **API Limits**: Monitor your Claude and Together AI usage
4. **Background Processing**: Llama analysis runs async and may take 10-30 seconds
5. **Error Handling**: All API calls have try-catch blocks with graceful fallbacks

## 📞 Support

The backend provides comprehensive logging. Check console output for:
- `[Safety]` - Crisis detection logs
- `[Memory]` - Supabase memory operations  
- `[Claude]` - Frontend response generation
- `[Llama]` - Background analysis
- `[Workflow]` - Overall processing flow

---

**Ready to integrate!** 🎉 The therapeutic backend is designed to work seamlessly with your existing frontend and ElevenLabs voice integration.