// Test endpoint to verify LLM routing logic without API key issues
export const config = {
  runtime: 'edge',
};

interface ComplexityAnalysis {
  score: number;
  type: string;
  factors: string[];
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message, history = [] } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Test complexity analysis
    const complexity = analyzeMessageComplexity(message);
    const requiresDeepAnalysis = complexity.score > 0.6;
    
    // Test environment variable access
    const hasClaudeKey = !!process.env.CLAUDE_API_KEY || !!process.env.VITE_CLAUDE_API_KEY;
    const hasLlamaKey = !!process.env.VITE_TOGETHER_API_KEY;
    
    // Determine routing
    let routingDecision = '';
    let modelChoice = '';
    
    if (requiresDeepAnalysis && hasLlamaKey) {
      routingDecision = 'Route to LLaMA 3.1 70B for complex analysis';
      modelChoice = 'LLaMA-3.1-70B';
    } else if (hasClaudeKey) {
      routingDecision = 'Route to Claude 3.5 Haiku';
      modelChoice = 'Claude-3.5-Haiku';
    } else {
      routingDecision = 'Fallback to intelligent response';
      modelChoice = 'Intelligent-Fallback';
    }

    return new Response(JSON.stringify({
      message,
      complexity,
      routing: {
        decision: routingDecision,
        model: modelChoice,
        requiresDeepAnalysis,
        hasClaudeKey,
        hasLlamaKey
      },
      environmentDebug: {
        claudeKeyPresent: !!process.env.CLAUDE_API_KEY,
        viteClaudeKeyPresent: !!process.env.VITE_CLAUDE_API_KEY,
        llamaKeyPresent: !!process.env.VITE_TOGETHER_API_KEY,
        claudeKeyLength: process.env.CLAUDE_API_KEY?.length || 0,
        viteClaudeKeyLength: process.env.VITE_CLAUDE_API_KEY?.length || 0,
        llamaKeyLength: process.env.VITE_TOGETHER_API_KEY?.length || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[TestRouting] Error:', error);
    return new Response(JSON.stringify({
      error: 'Test routing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function analyzeMessageComplexity(message: string): ComplexityAnalysis {
  const text = message.toLowerCase();
  let score = 0;
  const factors: string[] = [];

  // Length factor
  if (message.length > 200) {
    score += 0.2;
    factors.push('long-message');
  }

  // Multi-part scenarios
  if (text.includes(' and ') || text.includes(' but ') || text.includes(' however ')) {
    score += 0.3;
    factors.push('multi-part');
  }

  // Therapeutic and workplace content
  const therapeuticKeywords = ['therapy', 'counselor', 'relationship', 'trauma', 'anxiety', 'depression', 'stress', 'panic'];
  const workplaceKeywords = ['work', 'workplace', 'job', 'boss', 'colleague', 'office', 'career', 'employment', 'manager'];
  const emotionalKeywords = ['feel', 'feeling', 'hurt', 'sad', 'angry', 'frustrated', 'worried', 'scared', 'upset'];
  
  if (therapeuticKeywords.some(keyword => text.includes(keyword))) {
    score += 0.3;
    factors.push('therapeutic-content');
  }
  
  if (workplaceKeywords.some(keyword => text.includes(keyword))) {
    score += 0.2;
    factors.push('workplace-context');
  }
  
  if (emotionalKeywords.some(keyword => text.includes(keyword))) {
    score += 0.2;
    factors.push('emotional-content');
  }

  let type = 'simple';
  if (score > 0.8) type = 'very-complex';
  else if (score > 0.6) type = 'complex';
  else if (score > 0.3) type = 'moderate';

  return { score, type, factors };
}