# 🧠 Luma Memory System Testing Guide

This guide helps you test and verify the long-term and short-term memory functionality in Luma.

## 🚀 Quick Start

### Method 1: Visual Status Indicator
1. Open your Luma application
2. Look at the bottom of the chat window for the memory status indicator
3. Click on it to see detailed status information
4. Follow any provided instructions to fix issues

### Method 2: Full Test Panel
1. Add `?test-memory` to your URL (e.g., `http://localhost:5173?test-memory`)
2. Click "🚀 Run All Tests" button
3. Review detailed test results and follow recommendations

### Method 3: Browser Console Tests
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Use these commands:

```javascript
// Quick status check
window.checkMemoryStatus()

// Full database and system check
window.testMemorySystem()

// Run comprehensive conversation tests (requires login)
window.runMemoryTests()
```

## 📋 Pre-requisites Checklist

### ✅ Database Setup
**CRITICAL:** You must run the SQL schema in Supabase first:

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → SQL Editor
3. Copy and paste the contents of `supabase_schema.sql`
4. Click "RUN" to create the tables

**Required Tables:**
- `sessions` - Tracks conversation sessions
- `messages` - Stores all chat messages  
- `session_summaries` - Short-term memory summaries
- `user_memories` - Long-term user insights

### ✅ Environment Variables
Ensure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_TOGETHER_API_KEY=your_together_ai_key
```

## 🧪 Testing Scenarios

### Basic Functionality Tests
1. **Database Connection**: Verifies Supabase connectivity
2. **Table Existence**: Checks all required tables are created
3. **Authentication**: Tests user login/session management
4. **Memory Initialization**: Validates memory system startup

### Memory Functionality Tests
1. **Session Management**: Tests session creation and tracking
2. **Message Storage**: Verifies messages are saved to database
3. **Summary Generation**: Tests short-term memory creation
4. **Long-term Extraction**: Tests user insight extraction

### Real Conversation Tests
The system includes predefined test conversations for:
- **Anxiety and Work Stress** - Tests work-related memory retention
- **Relationship Difficulties** - Tests relationship pattern memory
- **Personal Growth Journey** - Tests progress tracking memory

## 📊 Understanding Test Results

### Status Indicators
- 🟢 **Green**: Fully functional
- 🟡 **Yellow**: Partially working, may have limitations
- 🔴 **Red**: Not working, requires attention

### Common Issues & Solutions

#### ❌ "Database tables missing"
**Solution:** Run `supabase_schema.sql` in your Supabase SQL Editor

#### ❌ "Not authenticated"  
**Solution:** Log in to enable personalized memory features

#### ❌ "Memory system not enabled"
**Solution:** Ensure authentication is working and try starting a conversation

#### ❌ "API connection failed"
**Solution:** Check your API keys in `.env` file

## 🔍 Manual Testing Process

### Phase 1: Basic Setup
1. Run database tests to ensure tables exist
2. Verify authentication is working
3. Check memory system initializes properly

### Phase 2: Conversation Testing
1. **Login** to your account
2. **Start a conversation** - memory should auto-enable
3. **Send 5+ messages** - triggers summary generation
4. **Send 10+ messages** - triggers long-term memory extraction
5. **Refresh page** and start new chat - should reference previous context

### Phase 3: Memory Verification
1. Check the memory status indicator shows "active"
2. In console, run `window.lumaAI.getSessionInfo()` to see current state
3. Have an extended conversation and look for references to previous topics
4. Try multiple sessions to test long-term persistence

## 🎯 Expected Memory Behavior

### Short-term Memory (Session Summaries)
- **Generated**: After every message
- **Contains**: Recent conversation context, emotional state, current topics
- **Purpose**: Maintain conversation continuity within session

### Long-term Memory (User Memories)  
- **Extracted**: Every 5 exchanges
- **Contains**: Persistent user traits, preferences, patterns, progress
- **Purpose**: Personalize experience across multiple sessions

### Memory Integration
- **Context Loading**: Previous memories automatically loaded at session start
- **Contextual Responses**: AI references past conversations naturally
- **Progressive Understanding**: Deeper insights over time

## 🛠 Troubleshooting

### Memory Not Working?
1. Check status indicator at bottom of chat
2. Verify you're logged in
3. Ensure database tables exist
4. Check browser console for errors

### No Memory Persistence?
1. Verify service role key is correct
2. Check Supabase RLS policies are applied
3. Ensure user has proper permissions

### Performance Issues?
1. Check database indexes are created
2. Monitor memory processing frequency
3. Verify API rate limits not exceeded

## 📞 Support

If tests continue to fail after following this guide:
1. Check browser console for specific error messages
2. Verify all environment variables are correct
3. Ensure Supabase project is active and properly configured
4. Test with a fresh user account

---

**Note**: Memory functionality requires user authentication. Guest users will see basic functionality but won't have persistent memory features.