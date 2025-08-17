# RAG Server Deployment Guide

This guide explains how to deploy the RAG (Retrieval-Augmented Generation) server for Luma.

## Overview

The RAG system provides enhanced responses by retrieving relevant information from a knowledge base of psychology, therapy, and mental health resources.

## Architecture

- **Frontend**: React app (deployed on Vercel)
- **RAG Service**: Python Flask server (needs separate deployment)
- **Knowledge Base**: FAISS vector database with embeddings

## RAG Server Deployment Options

### Option 1: Heroku (Recommended)

1. **Prerequisites**:
   - Heroku account
   - Heroku CLI installed
   - Git repository

2. **Prepare for deployment**:
   ```bash
   cd luma-rag/
   git init
   git add .
   git commit -m "Initial RAG server commit"
   ```

3. **Create Heroku app**:
   ```bash
   heroku create luma-rag-server
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set OPENAI_API_KEY="your_openai_key"
   heroku config:set TOGETHER_API_KEY="your_together_key"
   heroku config:set RAG_PORT=80
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

6. **Get deployment URL**:
   ```bash
   heroku apps:info luma-rag-server
   ```

### Option 2: Railway

1. **Connect repository** to Railway
2. **Set environment variables**:
   - `OPENAI_API_KEY`
   - `TOGETHER_API_KEY`
   - `RAG_PORT=80`
3. **Deploy** automatically

### Option 3: Google Cloud Run

1. **Build and push container**:
   ```bash
   cd luma-rag/
   gcloud builds submit --tag gcr.io/PROJECT_ID/luma-rag
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy luma-rag \\
     --image gcr.io/PROJECT_ID/luma-rag \\
     --platform managed \\
     --region us-central1 \\
     --allow-unauthenticated
   ```

## Frontend Configuration

After deploying the RAG server, update the frontend environment variables:

### Vercel Environment Variables

1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Add:
   ```
   VITE_RAG_SERVER_URL=https://your-rag-server-url.herokuapp.com
   ```

### Local Development

Add to `.env.local`:
```
VITE_RAG_SERVER_URL=http://localhost:5000
```

## Testing the Deployment

1. **Health check**:
   ```bash
   curl https://your-rag-server-url.herokuapp.com/health
   ```

2. **Test context endpoint**:
   ```bash
   curl -X POST https://your-rag-server-url.herokuapp.com/context \\
     -H "Content-Type: application/json" \\
     -d '{"query": "anxiety coping strategies", "max_length": 500}'
   ```

## Local Development

To run the RAG server locally:

1. **Install dependencies**:
   ```bash
   cd luma-rag/
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   export OPENAI_API_KEY="your_key"
   export TOGETHER_API_KEY="your_key"
   ```

3. **Start server**:
   ```bash
   python rag_server.py
   # OR
   python start_rag_server.py
   ```

## Troubleshooting

### Common Issues

1. **"Vectorstore not found"**:
   - Ensure FAISS index files are included in deployment
   - Check `rag_paths.py` configuration

2. **"Module not found"**:
   - Verify all requirements are in `requirements.txt`
   - Check Python version compatibility

3. **CORS errors**:
   - Ensure `flask-cors` is installed
   - Verify frontend URL is allowed

### Performance Optimization

1. **Use cached vectorstore loading**
2. **Implement request rate limiting**
3. **Add response caching**
4. **Monitor memory usage**

## Security Considerations

1. **API Keys**: Store securely as environment variables
2. **CORS**: Configure appropriately for production
3. **Rate Limiting**: Implement to prevent abuse
4. **Health Monitoring**: Set up alerts for service health

## Monitoring

### Logs
- Check application logs for errors
- Monitor RAG query performance
- Track vectorstore loading issues

### Metrics
- Response times
- Error rates
- Memory usage
- Query frequency

## Maintenance

### Regular Tasks
1. **Update knowledge base** when new content is added
2. **Monitor performance** and optimize as needed
3. **Update dependencies** for security patches
4. **Backup vectorstore** regularly

### Scaling
- Consider multiple server instances for high load
- Implement load balancing if needed
- Monitor and scale based on usage patterns