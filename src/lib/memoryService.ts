// Memory Service for Luma AI - Long-term and short-term memory management
import { sbAdmin } from './supabase'

// LLM completion function for memory processing
async function chatCompletion(messages: Array<{role: string, content: string}>, maxTokens: number = 200): Promise<string> {
  const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY || '';
  const TOGETHER_BASE_URL = 'https://api.together.xyz/v1/chat/completions';
  const LLAMA_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  try {
    const response = await fetch(TOGETHER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Memory LLM completion error:', error);
    return '';
  }
}

// Memory Service Class
export class MemoryService {
  
  // Start a new session for a user
  async startSession(userId: string): Promise<string | null> {
    try {
      const { data, error } = await sbAdmin.from('sessions')
        .insert({ user_id: userId, status: 'active' })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return null;
      }

      // Initialize empty summary for the new session
      try {
        await sbAdmin.from('session_summaries')
          .insert({ session_id: data.id, summary: '' });
      } catch (error) {
        // Ignore duplicate key errors
        console.log('Session summary already exists or insert failed:', error);
      }

      return data.id;
    } catch (error) {
      console.error('Error in startSession:', error);
      return null;
    }
  }

  // Get active session for a user or create a new one
  async getActiveSession(userId: string): Promise<string> {
    try {
      // First try to find an active session
      const { data: existingSession } = await sbAdmin.from('sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (existingSession) {
        return existingSession.id;
      }

      // If no active session exists, create a new one
      const newSessionId = await this.startSession(userId);
      return newSessionId || this.generateSessionId(userId);
    } catch (error) {
      console.error('Error getting active session:', error);
      return this.generateSessionId(userId);
    }
  }

  // Load context for a user session (short-term summary + long-term memories)
  async loadContext(userId: string, sessionId: string): Promise<{summary: string, longMem: string}> {
    try {
      // 1) Get previous session summary (short-term memory)
      const { data: ss } = await sbAdmin.from('session_summaries')
        .select('summary')
        .eq('session_id', sessionId)
        .maybeSingle();

      // 2) Get user's recent long-term memories (ordered by creation time, limit 5)
      const { data: mems } = await sbAdmin.from('user_memories')
        .select('content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const longMemText = (mems || []).map((m: any) => `- ${m.content}`).join('\n');

      return { 
        summary: ss?.summary || '', 
        longMem: longMemText 
      };
    } catch (error) {
      console.error('Error loading context:', error);
      return { summary: '', longMem: '' };
    }
  }

  // Update session summary (short-term memory)
  async updateSummary(sessionId: string): Promise<void> {
    try {
      // Get recent messages from this session
      const { data: msgs } = await sbAdmin.from('messages')
        .select('role,content,created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(30);

      if (!msgs || msgs.length === 0) return;

      const dialogue = msgs.map((m: any) => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const prompt = [
        { 
          role: 'system', 
          content: 'Summarize the key points of this mental health conversation in 120-200 words. Focus on the user\'s emotional state, main concerns, progress made, and therapeutic insights shared. Be concise and clinically informed for future context recall.'
        },
        { role: 'user', content: dialogue }
      ];

      const summary = await chatCompletion(prompt, 230);

      if (summary.trim()) {
        await sbAdmin.from('session_summaries')
          .upsert({ 
            session_id: sessionId, 
            summary: summary.trim(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating summary:', error);
    }
  }

  // Extract long-term memories from conversation
  async extractLongMemories(userId: string, sessionId: string): Promise<void> {
    try {
      // Get recent messages from this session
      const { data: lastMsgs } = await sbAdmin.from('messages')
        .select('role,content,created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!lastMsgs || lastMsgs.length === 0) return;

      const dialogue = lastMsgs.reverse().map((m: any) => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const prompt = [
        { 
          role: 'system', 
          content: `From this mental health conversation, extract 1-3 durable facts, preferences, boundaries, or insights about the user that would be helpful for future support sessions. Each should be a single factual sentence. Avoid diagnoses or medical claims. Focus on:
- Personal values and coping preferences
- Relationship patterns or family dynamics
- Work/life situation context
- Therapeutic progress or insights gained
- Boundaries or triggers mentioned`
        },
        { role: 'user', content: dialogue }
      ];

      const bullets = await chatCompletion(prompt, 180);
      
      if (!bullets.trim()) return;

      const lines = bullets.split('\n')
        .map(s => s.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);

      for (const content of lines) {
        if (content.length < 8) continue;
        
        try {
          await sbAdmin.from('user_memories').insert({ 
            user_id: userId, 
            content, 
            importance: 3,
            created_at: new Date().toISOString()
          });
        } catch (insertError) {
          console.error('Error inserting memory:', insertError);
        }
      }
    } catch (error) {
      console.error('Error extracting long memories:', error);
    }
  }

  // Save a message to the database
  async saveMessage(sessionId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      await sbAdmin.from('messages').insert({
        session_id: sessionId,
        user_id: userId,
        role,
        content,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  // Get or create session ID for an authenticated user
  generateSessionId(userId: string): string {
    // Generate a unique session ID based on date and authenticated user UUID
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${userId}-${dateStr}-${randomStr}`;
  }

  // Initialize database tables (run this once to set up the schema)
  async initializeTables(): Promise<void> {
    console.log('Note: Database tables should be created via Supabase dashboard or migration files.');
    console.log('Required tables:');
    console.log('1. messages (session_id, user_id, role, content, created_at)');
    console.log('2. session_summaries (session_id, summary, created_at, updated_at)'); 
    console.log('3. user_memories (id, user_id, content, importance, created_at)');
  }

  // Get conversation context for LumaAI integration
  async getConversationContext(userId: string, sessionId: string): Promise<string> {
    const { summary, longMem } = await this.loadContext(userId, sessionId);
    
    let context = '';
    if (longMem) {
      context += `LONG-TERM USER CONTEXT:\n${longMem}\n\n`;
    }
    if (summary) {
      context += `RECENT SESSION SUMMARY:\n${summary}\n\n`;
    }
    
    return context;
  }

  // Close a session
  async closeSession(sessionId: string): Promise<void> {
    try {
      await sbAdmin.from('sessions')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error closing session:', error);
    }
  }

  // Get recent active sessions for a user
  async getUserSessions(userId: string, limit: number = 5): Promise<Array<{ id: string, created_at: string, status: string }>> {
    try {
      const { data, error } = await sbAdmin.from('sessions')
        .select('id, created_at, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService();

// Database schema SQL for reference (to be run in Supabase)
export const DATABASE_SCHEMA = `
-- Messages table for storing conversation history
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session summaries for short-term memory
CREATE TABLE IF NOT EXISTS session_summaries (
  session_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User memories for long-term context
CREATE TABLE IF NOT EXISTS user_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_created_at ON user_memories(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS for memory operations
-- Regular users can only access their own data
CREATE POLICY "Users can access own messages" ON messages
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access own summaries" ON session_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM messages WHERE messages.session_id = session_summaries.session_id 
    AND messages.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can access own memories" ON user_memories
  FOR ALL USING (auth.uid()::text = user_id);
`;