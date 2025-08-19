// Simple Express proxy server for Claude API
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Enable CORS for your frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']
}));

app.use(express.json());

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    console.log('[Proxy] Received request for Claude API');
    
    const { message, history = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for Claude API
    const messages = [
      ...history,
      { role: 'user', content: message }
    ];

    const systemMessage = `You are Luma, a warm and genuine emotional support companion.

Core Personality:
- Respond naturally and conversationally to what the user says
- Be authentic, supportive, and human-like in your responses
- Answer their questions directly and honestly
- Be warm but not overly therapeutic or clinical
- Use natural language, not rigid therapeutic responses
- Show genuine interest in connecting with them
- If they want friendship, respond authentically
- Avoid templated responses or generic therapeutic language
- Be yourself - caring, understanding, and real
- Respond as a friend would, not as a therapist
- Remember and reference previous conversation naturally

Guidelines:
- Keep responses conversational and natural (50-150 words typically)
- Avoid clinical psychology jargon unless specifically relevant
- Don't end every response with a question
- Show genuine warmth and interest in the person
- Be supportive without being preachy
- Reference the conversation flow naturally
- NEVER use asterisk expressions like *smiles*, *nods*, *laughs*, etc.
- Do not include action descriptions or emotional expressions in asterisks
- Speak directly without describing physical actions or facial expressions

You are NOT a therapist, doctor, or healthcare provider. You provide emotional support and companionship, never medical advice or diagnosis.

Respond as Luma would - naturally, warmly, and authentically, but without any asterisk expressions or action descriptions.`;

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemMessage,
      messages: messages
    };

    console.log('[Proxy] Making request to Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] Claude API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('[Proxy] Invalid response format from Claude:', data);
      return res.status(500).json({ error: 'Invalid response from Claude API' });
    }

    const reply = data.content[0].text.trim();
    console.log('[Proxy] Claude responded successfully');

    res.json({ 
      reply,
      usage: data.usage 
    });

  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Claude proxy server running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for http://localhost:5173, 5174, and 5175`);
  console.log(`🔑 Claude API Key: ${process.env.VITE_CLAUDE_API_KEY ? 'Present' : 'Missing'}`);
});