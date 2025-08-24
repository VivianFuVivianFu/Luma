# Vercel Environment Variables Setup

The conversation system requires the following environment variables to be set in your Vercel dashboard:

## Required Environment Variables

### 1. Claude API Key
**Variable Name:** `CLAUDE_API_KEY`  
**Value:** `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`  
**Description:** API key for Claude 3.5 Haiku model

### 2. Alternative Claude API Key (fallback)
**Variable Name:** `VITE_CLAUDE_API_KEY`  
**Value:** `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`  
**Description:** Fallback API key (same value as above)

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (Luma-3)
3. Go to Settings → Environment Variables
4. Add both variables above with their respective values
5. Set them for all environments (Production, Preview, Development)
6. Redeploy your project

## Testing After Setup

After setting the environment variables:
1. Visit your deployed app
2. Try sending a message in the chat
3. Check the browser console for debugging messages
4. Look for: `[Dashboard] Claude AI initialization: Success`

## Troubleshooting

If conversations still don't work:
- Check browser console for error messages
- Verify the Vercel function logs in the dashboard
- Make sure both environment variables are set correctly
- Try redeploying the project after setting the variables

## Current Status
- ✅ Direct Claude API test: Working
- ✅ Edge Function code: Updated with fallback support
- ❓ Vercel Environment Variables: Need to be set
- ❓ Production deployment: Waiting for env vars