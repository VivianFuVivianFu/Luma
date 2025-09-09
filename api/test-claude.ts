// Test endpoint to isolate Claude API issues
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
    
    console.log('[TestClaude] Environment check:', {
      hasClaudeKey: !!process.env.CLAUDE_API_KEY,
      hasViteClaudeKey: !!process.env.VITE_CLAUDE_API_KEY,
      claudeKeyLength: process.env.CLAUDE_API_KEY?.length || 0,
      viteClaudeKeyLength: process.env.VITE_CLAUDE_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'No Claude API key found',
        debug: {
          hasClaudeKey: !!process.env.CLAUDE_API_KEY,
          hasViteClaudeKey: !!process.env.VITE_CLAUDE_API_KEY,
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('CLAUDE'))
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test Claude API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 50,
        temperature: 0.7,
        system: 'You are a test assistant. Respond briefly.',
        messages: [{ role: 'user', content: 'Hello, can you hear me?' }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TestClaude] API Error:', { status: response.status, error: errorText });
      
      return new Response(JSON.stringify({
        error: 'Claude API call failed',
        status: response.status,
        message: errorText,
        debug: {
          apiKeyPresent: !!apiKey,
          apiKeyLength: apiKey.length,
          headers: Object.fromEntries(response.headers.entries())
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log('[TestClaude] Success:', { hasContent: !!data.content });

    return new Response(JSON.stringify({
      success: true,
      message: 'Claude API is working!',
      response: data.content[0]?.text || 'No response text',
      debug: {
        apiKeyLength: apiKey.length,
        responseKeys: Object.keys(data)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[TestClaude] Exception:', error);
    
    return new Response(JSON.stringify({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}