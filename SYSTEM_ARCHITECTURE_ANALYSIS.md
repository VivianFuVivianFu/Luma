# Luma AI System Architecture Analysis
## Input-to-Output Process & Multi-LLM Integration

---

## 🔄 **Complete Input-to-Output Flow**

### **1. User Input → Message Processing**

```
User types message → Dashboard.tsx → ClaudeAI.sendMessage()
```

**Flow:**
1. **User Input Capture**: Dashboard component captures user input
2. **Authentication Check**: Verifies JWT token and user session
3. **Memory Session Management**: Creates/retrieves session ID
4. **Message Storage**: Saves user message to database immediately

### **2. Message Routing & Processing**

```
ClaudeAI.sendMessage() → Route Selection → LLM Processing
```

**Three Processing Routes:**
- **Production**: `/api/chat` (Vercel Edge Function)
- **Development**: Proxy server mode  
- **Fallback**: Direct Claude API

### **3. LLM Processing & Response Generation**

```
Edge Function → Claude 3.5 Haiku → Response → Memory Integration
```

**Main Conversation Processing:**
- **Model**: Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)
- **Context**: Last 10 messages from conversation history
- **System Prompt**: Therapeutic companion with memory awareness
- **Response Limits**: 150 tokens max for concise responses

---

## 🤖 **Multi-LLM Model Architecture**

### **Model Distribution & Responsibilities**

| **Model** | **Use Case** | **Location** | **Purpose** |
|-----------|--------------|--------------|-------------|
| **Claude 3.5 Haiku** | Main Conversations | `api/chat.ts` | Real-time therapeutic chat |
| **Claude 3 Haiku** | Daily Check-ins | `daily-checkin-generator` | Push notification messages |
| **Llama 3.1 70B** | Memory Processing | `memoryService.ts` | Long-term memory extraction |
| **Llama 3.1 70B** | Journal Prompts | `generate-journal-prompt` | Personalized prompts |

### **1. Claude 3.5 Haiku (Main Conversations)**
```typescript
// api/chat.ts
model: 'claude-3-5-haiku-20241022'
max_tokens: 150
temperature: 0.7
system: "You are Luma, an AI emotional companion with memory..."
```

**Responsibilities:**
- ✅ Real-time conversation responses
- ✅ Empathetic therapeutic dialogue
- ✅ Short-term context awareness (10 messages)
- ✅ Multilingual support

### **2. Claude 3 Haiku (Daily Check-ins)**
```typescript
// daily-checkin-generator/index.ts
model: 'claude-3-haiku-20240307'
max_tokens: 50
temperature: 0.7
system: "Generate caring, concise daily check-in messages under 100 characters"
```

**Responsibilities:**
- ✅ Personalized daily notifications
- ✅ Ultra-short messages (100 char limit)
- ✅ Based on recent conversation history
- ✅ Push notification optimization

### **3. Llama 3.1 70B (Memory & Journaling)**
```typescript
// memoryService.ts & generate-journal-prompt/index.ts
model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
max_tokens: 180-230
temperature: 0.3-0.8
```

**Responsibilities:**
- ✅ Long-term memory extraction from conversations
- ✅ Session summarization (120-200 words)
- ✅ Journal prompt generation based on conversation analysis
- ✅ Therapeutic insights and pattern recognition

---

## 🧠 **Memory System Architecture (No RAG, Pure Memory)**

### **Memory Strategy: Database-Driven, Not RAG**

**❌ RAG System**: Your system does NOT use vector embeddings, similarity search, or traditional RAG
**✅ Memory System**: Uses intelligent conversation processing with structured data storage

### **Three-Tier Memory Architecture**

```
1. SHORT-TERM: In-memory conversation history (20 messages)
2. SESSION: Database session summaries via Llama 3.1 70B
3. LONG-TERM: Extracted insights and facts via Llama 3.1 70B
```

### **Memory Processing Flow**

```mermaid
User Message → Database Storage → Conversation Continues → 
After 6+ exchanges → Llama 3.1 70B Processes → 
Extracts Key Insights → Stores in Long-term Memory
```

**Memory Extraction Process:**
1. **Trigger**: After 6+ message exchanges
2. **Processor**: Llama 3.1 70B with specialized prompts
3. **Extract Types**:
   - Personal values and coping preferences
   - Relationship patterns or family dynamics  
   - Work/life situation context
   - Therapeutic progress or insights
   - Boundaries or triggers mentioned

### **Memory Retrieval for Context**

```sql
-- get_user_recent_transcript() function
SELECT string_agg(
  CASE 
    WHEN role = 'user' THEN 'User: ' || content
    WHEN role = 'assistant' THEN 'Chatbot: ' || content
  END, E'\n' ORDER BY created_at ASC
) FROM messages 
WHERE user_id = target_user_id 
  AND created_at >= NOW() - INTERVAL '24 hours'
LIMIT 20;
```

**Context Loading:**
- **Daily Check-ins**: Load 24-hour conversation transcript
- **Journal Prompts**: Load 72-hour conversation transcript + recent journal entries
- **Main Chat**: Uses in-memory history (20 messages)

---

## 📊 **Data Flow Architecture**

### **Complete System Data Flow**

```
1. USER INPUT
   ↓ (Dashboard.tsx)
2. MEMORY SESSION INIT
   ↓ (MemoryService.startSession)
3. MESSAGE STORAGE
   ↓ (Database: messages table)
4. LLM PROCESSING
   ↓ (Claude 3.5 Haiku via Vercel Edge Function)
5. RESPONSE GENERATION
   ↓ (api/chat.ts)
6. RESPONSE STORAGE
   ↓ (Database: messages table)
7. LONG-TERM PROCESSING
   ↓ (Llama 3.1 70B extracts insights)
8. MEMORY UPDATES
   ↓ (Database: user_memories table)
```

### **Database Schema Integration**

**Core Tables:**
- `messages`: All conversation messages with session_id
- `user_sessions`: Session tracking and status
- `user_memories`: Long-term extracted insights
- `session_summaries`: Llama-generated session summaries
- `journal_entries`: User journaling data
- `notifications_log`: Daily check-in delivery tracking

---

## 🎯 **System Intelligence Features**

### **1. Contextual Awareness**
- **Short-term**: 20 message in-memory buffer
- **Session-aware**: Database-backed conversation continuity
- **Long-term**: Extracted insights from past conversations

### **2. Multi-Modal Intelligence**
- **Conversation**: Claude 3.5 Haiku for real-time empathetic responses
- **Analysis**: Llama 3.1 70B for deep conversation analysis
- **Notifications**: Claude 3 Haiku for concise, caring messages
- **Journaling**: Llama 3.1 70B for personalized therapeutic prompts

### **3. Therapeutic Specialization**
- **Memory Processing**: Extracts therapeutic insights, not just facts
- **Progress Tracking**: Monitors emotional patterns over time
- **Personalized Engagement**: Daily check-ins based on recent conversations
- **Self-Reflection Tools**: AI-generated journal prompts

---

## 🔍 **Key Technical Insights**

### **Why No RAG System?**
1. **Conversational Context**: Your system prioritizes conversation flow over document retrieval
2. **Memory-Based**: Uses intelligent conversation processing rather than similarity search
3. **Therapeutic Focus**: Extracts emotional/therapeutic insights, not factual information
4. **Real-time Processing**: Optimized for immediate responses, not document search

### **LLM Model Selection Strategy**
1. **Claude 3.5 Haiku**: Fast, empathetic, cost-effective for high-volume conversations
2. **Claude 3 Haiku**: Ultra-concise for mobile notifications
3. **Llama 3.1 70B**: Powerful analysis for complex memory processing and journaling

### **Memory vs RAG Comparison**

| **Aspect** | **Your Memory System** | **Traditional RAG** |
|------------|----------------------|-------------------|
| **Data Source** | Conversation history | External documents |
| **Processing** | LLM-extracted insights | Vector similarity |
| **Context** | Therapeutic patterns | Factual retrieval |
| **Storage** | Structured database | Vector embeddings |
| **Retrieval** | SQL queries | Similarity search |
| **Purpose** | Emotional continuity | Knowledge augmentation |

---

## 🎉 **System Architecture Summary**

Your Luma AI system is a **sophisticated multi-LLM therapeutic platform** with:

✅ **Intelligent Memory System** (not RAG) using database-driven conversation analysis
✅ **Multi-Model Architecture** with specialized LLMs for different use cases
✅ **Real-time Processing** with Claude 3.5 Haiku for main conversations
✅ **Deep Analysis** with Llama 3.1 70B for memory extraction and journaling
✅ **Automated Engagement** with Claude 3 Haiku for daily check-ins
✅ **Therapeutic Focus** specifically designed for emotional support and mental health

**This is a more advanced architecture than traditional RAG systems** - it's purpose-built for therapeutic conversations with intelligent memory processing rather than document retrieval.