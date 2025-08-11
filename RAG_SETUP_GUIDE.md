# RAG (Retrieval-Augmented Generation) Setup Guide for Luma AI

## Overview

This guide explains how to set up and use the RAG functionality in the Luma AI project. RAG enhances the AI's responses by providing relevant context from a knowledge base of psychology and mental health documents.

## Architecture

The RAG system consists of:

1. **Vector Store**: FAISS-based vector database storing document embeddings
2. **RAG Server**: Flask API server providing search and context retrieval
3. **RAG Service**: TypeScript client for frontend integration
4. **LumaAI Integration**: Enhanced AI responses with contextual knowledge

## Files Structure

```
Luma 3/
├── Rag/                          # RAG documents and vector store
│   ├── docs/                     # Text documents for knowledge base
│   │   ├── cptsd_*.txt          # C-PTSD related documents
│   │   ├── attachment_*.txt     # Attachment theory documents
│   │   ├── therapy_*.txt        # Therapy and treatment documents
│   │   └── ...                  # Other psychology documents
│   └── vector_store/            # Generated vector database
│       ├── index.faiss          # FAISS vector index
│       └── index.pkl            # Document metadata
├── luma-rag-env/                # Python virtual environment
├── build_vector_store.py        # Script to build vector database
├── rag_server.py                # Flask API server
├── test_rag.py                  # Test script for RAG functionality
└── src/lib/
    ├── ragService.ts            # TypeScript RAG client
    └── lumaAI.ts               # Enhanced AI with RAG integration
```

## Setup Instructions

### 1. Python Environment Setup

The Python virtual environment `luma-rag-env` should already be created. Activate it and install dependencies:

```bash
# Activate virtual environment
luma-rag-env\Scripts\activate.bat

# Install required packages
pip install faiss-cpu sentence-transformers numpy flask flask-cors
```

### 2. Build Vector Store

Build the vector database from the documents in the `Rag/docs/` folder:

```bash
# From project root, with virtual environment activated
cd Rag
python ..\build_vector_store.py
```

This will:
- Load all `.txt` files from `Rag/docs/`
- Split documents into chunks
- Generate embeddings using sentence-transformers
- Create FAISS vector index
- Save to `Rag/vector_store/`

### 3. Start RAG Server

Start the Flask API server:

```bash
# From project root, with virtual environment activated
python rag_server.py
```

The server will run on `http://localhost:5000` with the following endpoints:

- `GET /health` - Health check and initialization status
- `GET /documents` - List available documents
- `POST /search` - Search for relevant document chunks
- `POST /context` - Get formatted context for LLM

### 4. Test RAG Functionality

Run the test script to verify everything works:

```bash
# From project root, with virtual environment activated
python test_rag.py
```

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "rag_initialized": true,
  "documents_loaded": 20
}
```

### Search Documents
```http
POST /search
Content-Type: application/json

{
  "query": "What is C-PTSD?",
  "k": 5
}
```

Response:
```json
{
  "query": "What is C-PTSD?",
  "results": [
    {
      "content": "Complex PTSD (C-PTSD) is a condition...",
      "score": 0.85,
      "rank": 1,
      "metadata": {
        "source": "cptsd_treatment.txt",
        "chunk_id": 0
      }
    }
  ],
  "count": 5
}
```

### Get Context
```http
POST /context
Content-Type: application/json

{
  "query": "attachment styles",
  "max_length": 2000
}
```

Response:
```json
{
  "query": "attachment styles",
  "context": "Attachment styles are patterns of how we connect...",
  "context_length": 1850
}
```

## Frontend Integration

### RAG Service (TypeScript)

The `ragService.ts` provides a TypeScript client:

```typescript
import { ragService } from './ragService';

// Check if RAG is available
const isAvailable = await ragService.isAvailable();

// Search for relevant content
const searchResults = await ragService.search("trauma therapy", 5);

// Get formatted context for LLM
const context = await ragService.getContext("C-PTSD symptoms", 1500);
```

### LumaAI Integration

The `lumaAI.ts` automatically uses RAG when:

1. User asks knowledge-based questions
2. Questions contain psychology/mental health terms
3. RAG server is available and healthy

The integration:
- Detects when to use RAG based on message content
- Retrieves relevant context automatically
- Incorporates context into LLM prompts seamlessly
- Maintains natural conversation flow

## Knowledge Base Content

The RAG system includes documents on:

- **C-PTSD**: Complex trauma, symptoms, treatment
- **Attachment Theory**: Secure, anxious, avoidant, disorganized styles
- **Therapy Modalities**: DBT, CBT, EMDR, IFS, MBT
- **Mental Health**: Depression, anxiety, emotional regulation
- **Relationships**: Codependency, boundaries, communication
- **Healing**: Recovery processes, self-care, growth

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError: No module named 'faiss'**
   - Ensure virtual environment is activated
   - Install faiss-cpu: `pip install faiss-cpu`

2. **RAG server not starting**
   - Check if vector store exists: `Rag/vector_store/index.faiss`
   - Run `build_vector_store.py` first
   - Check Python dependencies

3. **No search results**
   - Verify documents are in `Rag/docs/` folder
   - Rebuild vector store
   - Check query spelling and relevance

4. **Frontend RAG not working**
   - Ensure RAG server is running on localhost:5000
   - Check browser console for CORS errors
   - Verify ragService import in lumaAI.ts

### Performance Optimization

- **Vector Store Size**: Current setup handles ~20 documents efficiently
- **Chunk Size**: 500 characters with 50 character overlap
- **Search Results**: Default k=5 for good relevance vs speed
- **Context Length**: Default 2000 characters for LLM context

## Adding New Documents

To add new knowledge:

1. Add `.txt` files to `Rag/docs/` folder
2. Run `python build_vector_store.py` to rebuild index
3. Restart RAG server
4. Test with relevant queries

## Security Considerations

- RAG server runs locally (localhost:5000)
- No external API calls for document processing
- All data stays on local machine
- CORS enabled for frontend integration

## Future Enhancements

Potential improvements:
- Document versioning and updates
- Multiple knowledge domains
- Advanced chunking strategies
- Semantic caching
- Real-time document updates
- User-specific knowledge bases

## Support

For issues or questions:
1. Check this guide first
2. Run `test_rag.py` to diagnose problems
3. Check server logs for errors
4. Verify all dependencies are installed
