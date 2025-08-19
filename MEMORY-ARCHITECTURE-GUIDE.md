# LUMA MEMORY SYSTEM - Architecture & User Flow Guide

## 🏗️ **Memory System Architecture**

The Luma therapeutic chatbot implements a sophisticated **three-tier memory system** designed to provide personalized, context-aware therapeutic support for both registered and non-registered users.

---

## 📊 **Memory Tiers Overview**

### 🧠 **Tier 1: Immediate Context Memory**
- **Duration**: Current conversation only
- **Scope**: Session-based, volatile
- **Storage**: Browser memory, temporary user ID
- **Usage**: Real-time conversation flow, adaptive responses

### 🗂️ **Tier 2: Short-Term Session Memory** 
- **Duration**: Single therapeutic session (until explicit closure)
- **Scope**: Session summaries, key conversation points
- **Storage**: Supabase `session_summaries` table
- **Usage**: Context continuity within extended conversations

### 🧠 **Tier 3: Long-Term User Memory**
- **Duration**: Persistent across all sessions
- **Scope**: Durable user insights, preferences, therapeutic progress
- **Storage**: Supabase `user_memories` table
- **Usage**: Deep personalization, therapeutic relationship building

---

## 👤 **User Classification & Memory Behavior**

### 🔒 **Registered Users (Authenticated)**
```
User Journey: Registration → Authentication → Persistent Memory
├── User ID: Supabase Auth UUID
├── Memory Persistence: Full 3-tier system
├── Session Tracking: Database-backed sessions
└── Cross-Device Sync: Full synchronization
```

**Memory Features:**
- ✅ **Full Memory Persistence**: All conversations saved long-term
- ✅ **Cross-Device Continuity**: Access memories from any device
- ✅ **Advanced Personalization**: Deep therapeutic insights over time
- ✅ **Session History**: Access to previous conversation sessions
- ✅ **Privacy Controls**: RLS (Row Level Security) policies
- ✅ **Memory Management**: Users can view/delete their memories

### 🔓 **Non-Registered Users (Anonymous)**
```
User Journey: Visit → Temporary ID → Session-Only Memory
├── User ID: Generated temporary ID (user-{timestamp})
├── Memory Persistence: Tier 1 + Limited Tier 2
├── Session Tracking: Browser-session only
└── Cross-Device Sync: None
```

**Memory Features:**
- ✅ **Immediate Context**: Full conversation awareness
- ⚠️ **Session Memory**: Lost on browser close/refresh
- ❌ **Long-Term Memory**: Not preserved
- ❌ **Cross-Device**: No synchronization
- ✅ **Privacy**: No permanent data storage
- ✅ **Quick Start**: No registration required

---

## 🔄 **Memory Workflow & Processing Logic**

### **Phase 1: User Identification & Memory Loading**

```javascript
// 1. User Classification
if (userAuthenticated) {
  userId = supabase.auth.user.id;  // Persistent UUID
  memoryMode = "FULL_PERSISTENCE";
} else {
  userId = 'user-' + Date.now();   // Temporary ID
  memoryMode = "SESSION_ONLY";
}

// 2. Memory Context Loading
const memoryContext = await supabaseMemory.getMemory(userId, userMessage);
// Returns: { shortTermSummary, longTermInsights[] }
```

### **Phase 2: Conversation Processing**

```javascript
// 3. Bilingual Therapeutic Processing
const response = await processBilingualTherapeuticChat(
  userId, 
  userMessage, 
  conversationHistory
);
```

**Processing Flow:**
```
userMessage → languageDetection → safetyCheck → closureDetection 
    ↓
dynamicParamCalculation → memoryContextRetrieval
    ↓  
claudeHaikuResponse + backgroundLlamaAnalysis
    ↓
memoryExtraction → sessionSummaryUpdate → longTermMemoryStorage
```

### **Phase 3: Memory Storage & Analysis**

```javascript
// 4. Memory Analysis & Storage
if (authenticated) {
  // Full memory processing
  await memoryService.extractLongMemories(userId, sessionId);
  await memoryService.updateSummary(sessionId);
} else {
  // Session-only memory
  sessionStorage.setItem(`luma_session_${userId}`, summary);
}
```

---

## 🗄️ **Database Schema Design**

### **Core Memory Tables**

#### 📝 `messages` Table
```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,          -- Links to user session
  user_id TEXT NOT NULL,             -- Auth UUID or temp ID
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,             -- Message content
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 📋 `session_summaries` Table  
```sql
CREATE TABLE session_summaries (
  session_id TEXT PRIMARY KEY,       -- Unique session identifier
  summary TEXT NOT NULL,             -- LLM-generated session summary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 🧠 `user_memories` Table
```sql
CREATE TABLE user_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,             -- Auth UUID only (no temp IDs)
  content TEXT NOT NULL,             -- Extracted user insight
  importance INTEGER DEFAULT 3,       -- Memory importance (1-5)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 🔒 `sessions` Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,               -- Session UUID
  user_id TEXT NOT NULL,            -- Auth UUID or temp ID
  status TEXT DEFAULT 'active',     -- active/closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 **Security & Privacy Architecture**

### **Row Level Security (RLS) Policies**

```sql
-- Users can only access their own data
CREATE POLICY "Users access own messages" ON messages
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users access own memories" ON user_memories  
  FOR ALL USING (auth.uid()::text = user_id);
```

### **Privacy Tiers**

| User Type | Data Collection | Storage Duration | Privacy Level |
|-----------|----------------|------------------|---------------|
| **Anonymous** | Minimal (session only) | Browser session | 🔒 **Maximum** |
| **Registered** | Full therapeutic data | Permanent (user controlled) | 🔐 **User Controlled** |

---

## 🧠 **Memory Processing Intelligence**

### **Short-Term Memory Generation**
```javascript
// LLM prompt for session summary
const summaryPrompt = `
Summarize this mental health conversation in 120-200 words. 
Focus on:
- User's emotional state and main concerns
- Progress made during session  
- Therapeutic insights shared
- Key topics discussed
Be clinically informed for future context recall.
`;
```

### **Long-Term Memory Extraction**
```javascript
// LLM prompt for durable insights
const memoryPrompt = `
Extract 1-3 durable facts about this user for future support:
- Personal values and coping preferences
- Relationship patterns or family dynamics  
- Work/life situation context
- Therapeutic progress or insights gained
- Boundaries or triggers mentioned
Avoid diagnoses. Focus on supportive context.
`;
```

---

## 🌊 **User Journey & Memory Experience**

### **Anonymous User Journey**
```
1. Visit Site → 2. Start Chat → 3. Immediate Context Only
   ↓
4. Extended Chat → 5. Session Summary → 6. Browser Close = Memory Lost
```

**Experience:**
- 🟢 **Quick Start**: No barriers to entry
- 🟡 **Session Continuity**: Within single browser session
- 🔴 **No Persistence**: Memory lost on page refresh/close

### **Registered User Journey**  
```
1. Register/Login → 2. Persistent User ID → 3. Full Memory System
   ↓
4. Session Memory → 5. Long-term Insights → 6. Cross-Device Sync
   ↓
7. Memory Management → 8. Privacy Controls → 9. Therapeutic Progression
```

**Experience:**
- 🟢 **Full Persistence**: All conversations remembered
- 🟢 **Deep Personalization**: AI learns and adapts over time
- 🟢 **Therapeutic Continuity**: Builds on previous insights
- 🟢 **Privacy Control**: User manages their own memory data

---

## 🔄 **Memory Workflow Integration with Bilingual Backend**

### **Memory Loading Process**
```javascript
// Step 5 in bilingual workflow
console.log('[Bilingual Workflow] Step 5: Retrieving memory context...');
const memoryContext = await supabaseMemory.getMemory(userId, userMessage);

// Memory context includes:
// - shortTermSummary: Recent session summary
// - longTermMemories: Up to 5 most recent user insights
```

### **Memory Storage Process**  
```javascript  
// Background process after Claude response
const sessionSummary = language === 'chinese' 
  ? `会话摘要: 用户讨论了与消息"${userMessage.substring(0, 100)}..."相关的话题`
  : `Session summary: User discussed topics related to: "${userMessage.substring(0, 100)}..."`;

await supabaseMemory.saveMemory(userId, sessionSummary);
```

---

## 🎯 **Memory System Benefits**

### **For Therapeutic Effectiveness:**
- 🧠 **Context Continuity**: AI remembers previous conversations
- 🔍 **Pattern Recognition**: Identifies recurring themes and progress
- 💡 **Personalized Insights**: Tailors responses based on user history
- 📈 **Progress Tracking**: Monitors therapeutic journey over time

### **For User Privacy:**
- 🔒 **Granular Control**: Users choose their privacy level
- 🗑️ **User Ownership**: Full control over memory deletion
- 🚪 **No Lock-in**: Anonymous option always available
- 🔐 **Secure Storage**: Bank-level encryption via Supabase

### **For System Scalability:**
- ⚡ **Performance**: Efficient memory retrieval and storage
- 📊 **Analytics**: Aggregate insights while preserving privacy
- 🔄 **Backup/Recovery**: Robust data persistence
- 🌐 **Multi-device**: Seamless cross-platform experience

---

## 🛠️ **Technical Implementation Details**

### **Frontend Memory Integration**
```typescript
// src/lib/claudeAI.ts - Line 89
body: JSON.stringify({
  userId: 'user-' + Date.now(), // Temporary ID for anonymous users
  message: userMessage,
  history: conversationHistory
})
```

### **Backend Memory Processing**
```javascript  
// bilingual-therapeutic-backend.js - Memory workflow
const memoryContext = await supabaseMemory.getMemory(userId, userMessage);
// Integration with therapeutic response generation
const claudeResponse = await callClaudeBilingual(
  userMessage, memoryContext, conversationHistory, dynamicParams, language
);
```

### **Database Connection**
```javascript
// Supabase configuration with service role for memory operations
const CONFIG = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    serviceRoleKey: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  }
};
```

---

## 📝 **Summary**

The Luma memory system provides a **flexible, privacy-conscious architecture** that serves both anonymous and registered users effectively:

- **Anonymous Users**: Get immediate therapeutic support without compromising privacy
- **Registered Users**: Benefit from deep, persistent therapeutic relationships with full memory continuity
- **Hybrid Architecture**: Seamless transition from anonymous to registered without data loss
- **Bilingual Support**: Memory system works identically for Chinese and English users
- **Therapeutic Focus**: Memory processing specifically designed for mental health conversations

This design ensures that **every user gets value** regardless of their privacy preferences while providing **maximum therapeutic benefit** for those who choose to register and persist their data.