/**
 * RAG Retrieval with Logging
 * Performs vector search via existing FAISS index and logs results to Supabase
 */

import { FAISS } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { existsSync } from 'fs';

interface RetrieveOptions {
  userId: string;
  query: string;
  topK?: number;
}

interface RetrievalResult {
  ids: string[];
  texts: string[];
  scores: number[];
  scoreMean: number;
}

// Get Supabase singleton client
const supabase = getSupabaseClient();

// Initialize embeddings (using current setup)
const embeddings = new OpenAIEmbeddings();

async function loadFAISSIndex(): Promise<FAISS> {
  const indexDir = process.env.FAISS_INDEX_DIR;
  
  if (!indexDir) {
    throw new Error('FAISS_INDEX_DIR environment variable not set');
  }
  
  if (!existsSync(indexDir)) {
    throw new Error(`FAISS index directory does not exist: ${indexDir}`);
  }
  
  try {
    console.log(`Loading FAISS index from: ${indexDir}`);
    const vectorStore = await FAISS.load(indexDir, embeddings);
    console.log('✅ FAISS index loaded successfully');
    return vectorStore;
  } catch (error) {
    console.error('❌ Failed to load FAISS index:', error);
    throw new Error(`Failed to load FAISS index: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function retrieveAndLog({
  userId,
  query,
  topK = 5
}: RetrieveOptions): Promise<RetrievalResult> {
  console.log(`🔍 Retrieving for user ${userId}, query: "${query.substring(0, 50)}..."`);
  
  try {
    // Load FAISS index
    const vectorStore = await loadFAISSIndex();
    
    // Perform similarity search with scores
    const results = await vectorStore.similaritySearchWithScore(query, topK);
    
    // Extract data
    const texts = results.map(([doc]) => doc.pageContent);
    const scores = results.map(([, score]) => score);
    const ids = results.map(([doc], index) => doc.metadata?.id || `chunk_${index}`);
    
    // Calculate mean score
    const scoreMean = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    
    console.log(`📊 Retrieved ${results.length} results, mean score: ${scoreMean.toFixed(3)}`);
    
    // Log to Supabase
    try {
      const { error } = await supabase
        .from('retrieval_logs')
        .insert({
          user_id: userId,
          query: query,
          topk: topK,
          chunk_ids: ids,
          score_mean: scoreMean,
          outcome: 'success',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('⚠️ Failed to log retrieval to Supabase:', error);
      } else {
        console.log('✅ Retrieval logged to Supabase');
      }
    } catch (logError) {
      console.warn('⚠️ Error logging to Supabase:', logError);
    }
    
    return {
      ids,
      texts,
      scores,
      scoreMean
    };
    
  } catch (error) {
    console.error('❌ Retrieval failed:', error);
    
    // Log failure to Supabase
    try {
      await supabase
        .from('retrieval_logs')
        .insert({
          user_id: userId,
          query: query,
          topk: topK,
          chunk_ids: [],
          score_mean: 0,
          outcome: 'error',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('⚠️ Failed to log error to Supabase:', logError);
    }
    
    throw error;
  }
}

// Demo function for testing
async function demo() {
  if (process.argv.includes('--demo')) {
    console.log('🧪 Running retrieval demo...');
    
    try {
      const result = await retrieveAndLog({
        userId: 'demo-user',
        query: 'How to handle anxiety in relationships?',
        topK: 3
      });
      
      console.log('\n📋 Demo Results:');
      console.log(`- Found ${result.texts.length} chunks`);
      console.log(`- Mean score: ${result.scoreMean.toFixed(3)}`);
      console.log(`- First result: ${result.texts[0]?.substring(0, 100)}...`);
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  }
}

// Run demo if called directly with --demo flag
if (require.main === module) {
  demo();
}