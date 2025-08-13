-- Luma Memory System Database Schema
-- Run this in your Supabase SQL editor to create the required tables

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

-- Allow users to access their own data
CREATE POLICY "Users can access own messages" ON messages
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access own summaries" ON session_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM messages WHERE messages.session_id = session_summaries.session_id 
    AND messages.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can access own memories" ON user_memories
  FOR ALL USING (auth.uid()::text = user_id);

-- Grant permissions to service role for memory operations
GRANT ALL ON messages TO service_role;
GRANT ALL ON session_summaries TO service_role;
GRANT ALL ON user_memories TO service_role;
GRANT USAGE ON SEQUENCE messages_id_seq TO service_role;
GRANT USAGE ON SEQUENCE user_memories_id_seq TO service_role;

-- Test the schema (optional)
INSERT INTO messages (session_id, user_id, role, content) 
VALUES ('test-session-1', 'test-user-1', 'user', 'Hello, this is a test message');

INSERT INTO session_summaries (session_id, summary) 
VALUES ('test-session-1', 'This is a test summary of the conversation');

INSERT INTO user_memories (user_id, content, importance) 
VALUES ('test-user-1', 'User prefers gentle communication style', 4);

-- Clean up test data (uncomment to remove test data)
-- DELETE FROM messages WHERE session_id = 'test-session-1';
-- DELETE FROM session_summaries WHERE session_id = 'test-session-1';
-- DELETE FROM user_memories WHERE user_id = 'test-user-1';