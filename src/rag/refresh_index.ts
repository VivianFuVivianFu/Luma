/**
 * FAISS Index Refresh
 * Re-embeds documents and rebuilds FAISS index when needed
 */

import { FAISS } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { TextLoader } from '@langchain/community/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { existsSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';

// Load environment variables (debug: local-only dotenv)
if (!process.env.VERCEL) { 
  await import('dotenv/config'); 
}

interface RefreshOptions {
  files?: string[];
  full?: boolean;
  confirm?: boolean;
}

class IndexRefresher {
  private embeddings: any;
  private indexDir: string;
  private docsDir: string;
  
  constructor() {
    this.indexDir = process.env.FAISS_INDEX_DIR || '';
    this.docsDir = join(this.indexDir, '../../docs'); // Assuming docs are relative to index
    
    // Initialize embeddings based on USE_EMBEDDER env
    const embedderType = process.env.USE_EMBEDDER || 'current';
    
    switch (embedderType) {
      case 'current':
      default:
        this.embeddings = new OpenAIEmbeddings();
        break;
      // TODO: Add support for other embedders like 'bge-m3' when requested
      case 'bge-m3':
        console.warn('⚠️ BGE-M3 embedder not yet implemented, falling back to OpenAI');
        this.embeddings = new OpenAIEmbeddings();
        break;
    }
    
    console.log(`📁 Index directory: ${this.indexDir}`);
    console.log(`📚 Docs directory: ${this.docsDir}`);
    console.log(`🔧 Using embedder: ${embedderType}`);
  }
  
  private validateEnvironment(): void {
    if (!this.indexDir) {
      throw new Error('FAISS_INDEX_DIR environment variable not set');
    }
    
    if (!existsSync(this.indexDir)) {
      throw new Error(`FAISS index directory does not exist: ${this.indexDir}`);
    }
  }
  
  private async loadDocuments(fileList?: string[]): Promise<Document[]> {
    const documents: Document[] = [];
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    let filesToProcess: string[];
    
    if (fileList) {
      // Process specific files
      filesToProcess = fileList;
      console.log(`📄 Processing ${filesToProcess.length} specific files`);
    } else {
      // Process all .txt files in docs directory
      if (!existsSync(this.docsDir)) {
        throw new Error(`Documents directory does not exist: ${this.docsDir}`);
      }
      
      filesToProcess = readdirSync(this.docsDir)
        .filter(file => file.endsWith('.txt'))
        .map(file => join(this.docsDir, file));
      
      console.log(`📄 Processing ${filesToProcess.length} files from ${this.docsDir}`);
    }
    
    for (const filePath of filesToProcess) {
      if (!existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        continue;
      }
      
      try {
        console.log(`📖 Loading: ${filePath}`);
        const loader = new TextLoader(filePath);
        const docs = await loader.load();
        
        // Split documents into chunks
        const splitDocs = await textSplitter.splitDocuments(docs);
        
        // Add metadata
        splitDocs.forEach((doc, index) => {
          doc.metadata = {
            ...doc.metadata,
            source: filePath,
            chunk_id: `${filePath}_${index}`,
            id: `${filePath}_${index}` // For compatibility with retrieve.ts
          };
        });
        
        documents.push(...splitDocs);
        console.log(`✅ Loaded ${splitDocs.length} chunks from ${filePath}`);
        
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
      }
    }
    
    console.log(`📊 Total documents loaded: ${documents.length}`);
    return documents;
  }
  
  private createBackup(): void {
    const backupDir = `${this.indexDir}.bak`;
    const indexFile = join(this.indexDir, 'index.faiss');
    const metaFile = join(this.indexDir, 'index.pkl');
    
    if (existsSync(indexFile) && existsSync(metaFile)) {
      try {
        console.log(`💾 Creating backup at: ${backupDir}`);
        
        if (!existsSync(backupDir)) {
          require('fs').mkdirSync(backupDir, { recursive: true });
        }
        
        copyFileSync(indexFile, join(backupDir, 'index.faiss'));
        copyFileSync(metaFile, join(backupDir, 'index.pkl'));
        
        console.log('✅ Backup created successfully');
      } catch (error) {
        console.error('❌ Failed to create backup:', error);
        throw error;
      }
    }
  }
  
  async refreshIndex(options: RefreshOptions = {}): Promise<void> {
    this.validateEnvironment();
    
    console.log('🔄 Starting index refresh...');
    
    // Confirmation for full rebuild
    if (options.full && !options.confirm) {
      console.log('⚠️ FULL REBUILD REQUESTED');
      console.log('This will completely rebuild the FAISS index from all documents.');
      console.log('Add --confirm flag to proceed with full rebuild.');
      return;
    }
    
    try {
      // Create backup for full rebuild
      if (options.full) {
        this.createBackup();
      }
      
      // Load documents
      const documents = await this.loadDocuments(options.files);
      
      if (documents.length === 0) {
        console.warn('⚠️ No documents to process');
        return;
      }
      
      // Build/update FAISS index
      console.log('🔧 Building FAISS index...');
      let vectorStore: FAISS;
      
      if (options.full || options.files) {
        // Full rebuild or partial update
        vectorStore = await FAISS.fromDocuments(documents, this.embeddings);
      } else {
        // Load existing and add new documents
        try {
          vectorStore = await FAISS.load(this.indexDir, this.embeddings);
          await vectorStore.addDocuments(documents);
        } catch (error) {
          console.warn('⚠️ Failed to load existing index, creating new one');
          vectorStore = await FAISS.fromDocuments(documents, this.embeddings);
        }
      }
      
      // Save updated index
      console.log(`💾 Saving index to: ${this.indexDir}`);
      await vectorStore.save(this.indexDir);
      
      console.log('✅ Index refresh completed successfully');
      
    } catch (error) {
      console.error('❌ Index refresh failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: RefreshOptions = {};
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--files':
        const filesList = args[i + 1];
        if (filesList) {
          options.files = filesList.split(',').map(f => f.trim());
          i++; // Skip next argument
        }
        break;
      case '--full':
        options.full = true;
        break;
      case '--confirm':
        options.confirm = true;
        break;
      default:
        console.log('Usage: tsx refresh_index.ts [--files file1,file2] [--full] [--confirm]');
        process.exit(1);
    }
  }
  
  const refresher = new IndexRefresher();
  await refresher.refreshIndex(options);
}

// Export for programmatic use
export { IndexRefresher };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}