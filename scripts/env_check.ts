#!/usr/bin/env tsx
/**
 * Pre-flight environment check for RAG evaluation system
 * Verifies required environment variables are set
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
}

const ENV_CHECKS: EnvCheck[] = [
  {
    key: 'FAISS_INDEX_DIR',
    required: true,
    description: 'Path to FAISS vector store directory'
  },
  {
    key: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for database operations'
  },
  {
    key: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for email notifications'
  },
  {
    key: 'ADMIN_TOKEN',
    required: false,
    description: 'Bearer token for admin API routes'
  },
  {
    key: 'USE_EMBEDDER',
    required: false,
    description: 'Embedder configuration (default: current)'
  }
];

function checkEnvironment(): boolean {
  let allGood = true;
  
  console.log('🔍 RAG Evaluation System - Environment Check');
  console.log('=' .repeat(50));
  
  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    const status = value ? '✅' : (check.required ? '❌' : '⚠️');
    
    console.log(`${status} ${check.key}`);
    console.log(`   ${check.description}`);
    
    if (value) {
      // Mask sensitive values
      const displayValue = check.key.includes('KEY') || check.key.includes('TOKEN') 
        ? `${value.substring(0, 8)}...` 
        : value;
      console.log(`   Value: ${displayValue}`);
      
      // Special validation for FAISS_INDEX_DIR
      if (check.key === 'FAISS_INDEX_DIR') {
        if (existsSync(value)) {
          const indexFile = join(value, 'index.faiss');
          const metaFile = join(value, 'index.pkl');
          
          if (existsSync(indexFile) && existsSync(metaFile)) {
            console.log(`   ✅ FAISS index files found`);
          } else {
            console.log(`   ⚠️  FAISS index files missing (${indexFile}, ${metaFile})`);
          }
        } else {
          console.log(`   ❌ Directory does not exist: ${value}`);
          allGood = false;
        }
      }
    } else {
      console.log(`   Value: (not set)`);
      if (check.required) {
        allGood = false;
      }
    }
    console.log();
  }
  
  // Summary
  console.log('=' .repeat(50));
  if (allGood) {
    console.log('✅ Environment check passed! All required variables are set.');
  } else {
    console.log('❌ Environment check failed! Please set missing required variables.');
    console.log('\nRequired variables that are missing:');
    for (const check of ENV_CHECKS) {
      if (check.required && !process.env[check.key]) {
        console.log(`  - ${check.key}: ${check.description}`);
      }
    }
  }
  
  // Optional warnings
  const optionalMissing = ENV_CHECKS
    .filter(check => !check.required && !process.env[check.key])
    .map(check => check.key);
    
  if (optionalMissing.length > 0) {
    console.log('\n⚠️  Optional variables not set:');
    for (const key of optionalMissing) {
      const check = ENV_CHECKS.find(c => c.key === key);
      console.log(`  - ${key}: ${check?.description || ''}`);
    }
  }
  
  return allGood;
}

if (require.main === module) {
  const success = checkEnvironment();
  process.exit(success ? 0 : 1);
}

export { checkEnvironment };