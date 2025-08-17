/**
 * RAG API Routes
 * Handles retrieval, evaluation, and job management for the RAG system
 */

// Helper function to dynamically import ES modules from CommonJS
async function importESModule(modulePath) {
  const module = await import(modulePath);
  return module;
}

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'ADMIN_TOKEN not configured'
    });
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      details: 'Bearer token required'
    });
  }
  
  const token = authHeader.substring(7);
  if (token !== adminToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      details: 'Invalid admin token'
    });
  }
  
  next();
}

// POST /api/rag/retrieve - Perform vector search with logging
async function ragRetrieve(req, res) {
  try {
    const { userId, query, topK = 5 } = req.body;
    
    if (!userId || !query) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId and query are required'
      });
    }
    
    if (typeof topK !== 'number' || topK < 1 || topK > 50) {
      return res.status(400).json({
        error: 'Invalid topK',
        details: 'topK must be a number between 1 and 50'
      });
    }
    
    console.log(`🔍 RAG retrieve request: user=${userId}, query="${query.substring(0, 50)}...", topK=${topK}`);
    
    // Import and call the retrieve function
    const { retrieveAndLog } = await importESModule('../../rag/retrieve.ts');
    
    const result = await retrieveAndLog({
      userId,
      query,
      topK
    });
    
    res.json({
      success: true,
      result: {
        texts: result.texts,
        scores: result.scores,
        scoreMean: result.scoreMean,
        totalResults: result.texts.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG retrieve error:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// POST /api/rag/eval - Run evaluation loop (admin only)
async function ragEval(req, res) {
  try {
    console.log('🔍 RAG evaluation triggered by admin');
    
    // Import and run evaluation
    const { EvaluationLoop } = await importESModule('../../rag/eval_loop.ts');
    
    const evaluator = new EvaluationLoop();
    await evaluator.runEvaluation();
    
    res.json({
      success: true,
      message: 'Evaluation completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG evaluation error:', error);
    res.status(500).json({
      error: 'Evaluation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// POST /api/rag/jobs/run - Run job processor (admin only)
async function ragJobsRun(req, res) {
  try {
    console.log('⚙️ RAG jobs processing triggered by admin');
    
    // Import and run jobs
    const { JobsRunner } = await importESModule('../../rag/jobs_runner.ts');
    
    const runner = new JobsRunner();
    await runner.runJobs();
    
    res.json({
      success: true,
      message: 'Jobs processing completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ RAG jobs error:', error);
    res.status(500).json({
      error: 'Jobs processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/rag/status - Get system status (optional)
async function ragStatus(req, res) {
  try {
    const status = {
      faissIndexDir: process.env.FAISS_INDEX_DIR,
      useEmbedder: process.env.USE_EMBEDDER || 'current',
      adminConfigured: !!process.env.ADMIN_TOKEN,
      resendConfigured: !!process.env.RESEND_API_KEY,
      supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      timestamp: new Date().toISOString()
    };
    
    // Check if FAISS index exists
    const fs = require('fs');
    const path = require('path');
    
    if (status.faissIndexDir) {
      const indexPath = path.join(status.faissIndexDir, 'index.faiss');
      const metaPath = path.join(status.faissIndexDir, 'index.pkl');
      status.faissIndexExists = fs.existsSync(indexPath) && fs.existsSync(metaPath);
    } else {
      status.faissIndexExists = false;
    }
    
    res.json(status);
    
  } catch (error) {
    console.error('❌ RAG status error:', error);
    res.status(500).json({
      error: 'Status check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  ragRetrieve,
  ragEval: [requireAdminAuth, ragEval],
  ragJobsRun: [requireAdminAuth, ragJobsRun],
  ragStatus
};