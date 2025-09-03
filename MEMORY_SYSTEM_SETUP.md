# 🧠 Luma Memory System Setup Guide

## Migration Instructions for Existing Users

**⚠️ IMPORTANT**: If you already have the memory system tables (`profiles`, `sessions`, `messages`, `session_summaries`, `user_memories`) deployed, you should use the **migration patch** instead of recreating everything.

### For Existing Users: Run the Migration Patch

1. **Open your Supabase Dashboard → SQL Editor**
2. **Run the migration patch file**:
   ```bash
   # Execute: migrations/merge_memory_system.sql
   ```
   
   This migration will:
   - ✅ Keep your existing tables intact
   - ✅ Add `updated_at` columns where missing
   - ✅ Create automatic update triggers
   - ✅ Add helpful views and functions
   - ✅ Grant service role permissions
   - ✅ Adapt to your existing `profiles` table structure

3. **Verify the migration worked**:
   - Check the console output for verification results
   - Look for "✅" indicators showing successful migration
   - Any "❌" indicates issues that need attention

## For New Users: Full Setup

### Step 1: Check Your Environment Variables

Ensure these are set in your `.env.local` file or Vercel environment:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # ← This is crucial
```

**Critical**: The `VITE_SUPABASE_SERVICE_ROLE_KEY` is required for the memory system to bypass Row Level Security.

### Step 2: Create Memory System Database Tables (New Users Only)

**⚠️ Skip this if you already have existing tables - use the migration instead!**

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run your existing schema** or the original memory system schema

```sql
-- =====================================================
-- LUMA MEMORY SYSTEM DATABASE SCHEMA
-- =====================================================

-- 1. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SESSION SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS session_summaries (
  session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER MEMORIES TABLE
CREATE TABLE IF NOT EXISTS user_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_created_at ON user_memories(created_at);

-- ROW LEVEL SECURITY POLICIES
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access own sessions" ON sessions
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access own messages" ON messages
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access own summaries" ON session_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM sessions WHERE sessions.id = session_summaries.session_id 
    AND sessions.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can access own memories" ON user_memories
  FOR ALL USING (auth.uid()::text = user_id);

-- GRANT PERMISSIONS FOR SERVICE ROLE
GRANT ALL ON sessions TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON session_summaries TO service_role;  
GRANT ALL ON user_memories TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- AUTO-CREATE USER PROFILES TRIGGER
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

### Step 3: Test the Memory System

1. **Visit your app at `/diagnostics`**
2. **Click "Run Diagnostics"** in the Memory System section
3. **Verify all tables exist and are accessible**

Expected results:
- ✅ Authentication: User logged in
- ✅ User Profile: Exists with data
- ✅ Memory Tables: All 4 tables exist (sessions, messages, session_summaries, user_memories)
- ✅ Memory Service: Can create sessions and save messages

### Step 4: Test Memory in Chat

1. **Start a conversation with Luma**
2. **Ask: "Remember this: my favorite color is blue"**  
3. **Refresh the page**
4. **Ask: "What's my favorite color?"**

If working correctly, you should see:
- "Memory Active" indicator in chat header
- Luma will remember your previous messages
- Previous conversation will load when you return

## 🔍 Troubleshooting

### Issue: "Memory Active" doesn't show
**Solution**: Check that `VITE_SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Issue: Tables don't exist error
**Solution**: Run the SQL script above in Supabase SQL Editor

### Issue: Permission denied errors
**Solution**: Ensure service role has permissions (run GRANT statements in SQL)

### Issue: Messages not persisting
**Solution**: Check browser console for errors, verify user is authenticated

## 🔧 Advanced Configuration

### Memory Update Frequency
Memory summaries update every 6 messages. To change this, edit line 415 in `Dashboard.tsx`:
```typescript
if (messages.length % 6 === 0) { // Change 6 to your preferred number
```

### Long-term Memory Extraction
The system extracts 1-3 important facts per conversation. This happens automatically but can be triggered manually through the memory service.

## ✅ Success Indicators

When working properly, you'll see:
1. **"Memory Active" badge** in chat header
2. **Previous messages load** when returning to chat
3. **Contextual responses** from Luma based on chat history
4. **No "I don't have memory" messages** from Luma

## 📊 Memory System Features

- **Session Management**: Each user gets persistent chat sessions
- **Message Persistence**: All conversations saved to database
- **Short-term Memory**: Session summaries for context
- **Long-term Memory**: Important facts extracted automatically
- **Privacy**: Row Level Security ensures users only see their own data
- **Performance**: Indexed tables for fast queries

## 🔍 Verify Your Migration

After running the migration patch, verify everything is working:

### Step 1: Check Database Structure
Run this in Supabase SQL Editor:
```sql
-- Check that all views exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_sessions_view', 'session_context_view', 'active_users_24h');

-- Check that triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name IN ('trigger_update_session_timestamp', 'trigger_create_user_profile');

-- Check that functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_recent_transcript', 'log_notification', 'create_user_profile');
```

### Step 2: Test with Environment Check Script
```bash
node check-memory-system.cjs
```

Expected output:
```
🔍 Checking Luma Memory System Configuration...

📁 Environment File:
   .env.local exists: ✅

🔑 Required Environment Variables:
   VITE_SUPABASE_URL: ✅
   VITE_SUPABASE_ANON_KEY: ✅ 
   VITE_SUPABASE_SERVICE_ROLE_KEY: ✅

🔗 Memory Service Integration:
   Memory service imported: ✅
   Memory service used in chat: ✅

🔧 Diagnostics Tools:
   Memory diagnostics component: ✅
```

### Step 3: Test Memory System in App
1. **Visit `/diagnostics`** in your app
2. **Click "Run Diagnostics"** in Memory System section
3. **Check results**:
   - ✅ Authentication: User logged in
   - ✅ User Profile: Exists in `profiles` table
   - ✅ Memory Tables: All 5 tables accessible
   - ✅ Memory Service: Can create sessions and save messages

### Step 4: Test Chat Memory
1. **Start a conversation**: "Remember this: my favorite color is blue"
2. **Look for "Memory Active"** indicator in chat header
3. **Refresh the page**
4. **Ask**: "What's my favorite color?"
5. **Verify**: Luma should remember and respond with context

## 🚨 Troubleshooting Migration Issues

### Issue: Views not created
```sql
-- Manually create missing views
CREATE OR REPLACE VIEW user_sessions_view AS
SELECT s.*, COUNT(m.id) as message_count
FROM public.sessions s
LEFT JOIN public.messages m ON s.id = m.session_id
GROUP BY s.id;
```

### Issue: Triggers not working
```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'update_session_timestamp';

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS trigger_update_session_timestamp ON public.messages;
CREATE TRIGGER trigger_update_session_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_session_timestamp();
```

### Issue: Service role permissions
```sql
-- Grant all permissions to service_role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.session_summaries TO service_role;
GRANT ALL ON public.user_memories TO service_role;
```

## ✅ Success Indicators

When the migration is successful, you'll see:
1. **"Memory Active" badge** in chat header  
2. **Previous messages persist** across page refreshes
3. **Contextual AI responses** that reference past conversations
4. **User profiles auto-created** on signup/login
5. **Session timestamps update** when new messages arrive

## 📊 What the Migration Adds

The migration patch enhances your existing schema with:

- **🕐 Automatic Timestamps**: `updated_at` columns with triggers
- **📈 Analytics Views**: `user_sessions_view`, `session_context_view` 
- **🔧 Helper Functions**: `get_user_recent_transcript()`, `log_notification()`
- **🔐 Service Role Access**: Proper permissions for Edge Functions
- **👤 Profile Auto-Creation**: Trigger for new user signups
- **⚡ Performance Indexes**: Additional database optimizations

Your existing data remains completely intact while gaining all the advanced memory features!

After completing these steps, Luma will remember your conversations, user preferences, and provide much more personalized support!