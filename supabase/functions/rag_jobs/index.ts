import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  try {
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get environment variables
    const API_BASE = Deno.env.get('API_BASE')
    const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN')

    if (!API_BASE || !ADMIN_TOKEN) {
      console.error('Missing required environment variables: API_BASE, ADMIN_TOKEN')
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error', 
          details: 'Missing API_BASE or ADMIN_TOKEN' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`⚙️ RAG Jobs request: ${req.method} from ${req.headers.get('user-agent')}`)
    console.log(`Forwarding to: ${API_BASE}/api/rag/jobs/run`)

    // Get request body if present
    let body = null
    if (req.method === 'POST') {
      try {
        body = await req.json()
        body.source = body.source || 'supabase_edge_function'
      } catch {
        body = { source: 'supabase_edge_function' }
      }
    }

    // Forward request to main API
    const response = await fetch(`${API_BASE}/api/rag/jobs/run`, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': `Supabase-Edge-Function/${req.headers.get('user-agent')}`,
      },
      body: body ? JSON.stringify(body) : null,
    })

    const responseData = await response.text()
    console.log(`✅ Response: ${response.status} (${responseData.length} chars)`)

    return new Response(responseData, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })

  } catch (error) {
    console.error('❌ RAG Jobs function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal function error', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})