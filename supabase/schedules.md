# RAG Evaluation System - Scheduling Guide

This document provides exact commands and configurations for setting up automated RAG evaluation and job processing using Supabase Scheduled Functions and GitHub Actions.

## Supabase Scheduled Functions

### Prerequisites

1. Enable pg_cron extension in your Supabase project:
   ```sql
   -- Run in SQL Editor
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. Ensure your API endpoints are accessible and configured with proper authentication.

### Schedule Configuration

#### 1. Nightly RAG Evaluation (02:00 UTC)

```sql
-- Schedule nightly evaluation
SELECT cron.schedule(
    'rag-eval-nightly',
    '0 2 * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-api-domain.com/api/rag/eval',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.admin_token')
        ),
        body := jsonb_build_object(
            'source', 'supabase_cron',
            'timestamp', now()
        )
    );
    $$
);
```

#### 2. Hourly Job Processing

```sql
-- Schedule hourly job processing
SELECT cron.schedule(
    'rag-jobs-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-api-domain.com/api/rag/jobs/run',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.admin_token')
        ),
        body := jsonb_build_object(
            'source', 'supabase_cron',
            'timestamp', now()
        )
    );
    $$
);
```

### Alternative: Using Edge Functions

If you prefer using Supabase Edge Functions (already created in your project):

```sql
-- Schedule using Edge Functions
SELECT cron.schedule(
    'rag-eval-edge-function',
    '0 2 * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-project-ref.supabase.co/functions/v1/rag_eval',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.anon_key')
        ),
        body := jsonb_build_object('source', 'supabase_cron')
    );
    $$
);

SELECT cron.schedule(
    'rag-jobs-edge-function',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-project-ref.supabase.co/functions/v1/rag_jobs',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.anon_key')
        ),
        body := jsonb_build_object('source', 'supabase_cron')
    );
    $$
);
```

### Environment Variables for Supabase

Set these in your Supabase dashboard (Settings → Database → Custom Config):

```sql
-- Set admin token for API calls
ALTER DATABASE postgres SET app.admin_token = 'your-admin-token-here';

-- Set anon key for edge functions
ALTER DATABASE postgres SET app.anon_key = 'your-anon-key-here';
```

### Management Commands

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- Delete a scheduled job
SELECT cron.unschedule('rag-eval-nightly');
SELECT cron.unschedule('rag-jobs-hourly');

-- View job execution history
SELECT * FROM cron.job_run_details 
WHERE jobname IN ('rag-eval-nightly', 'rag-jobs-hourly')
ORDER BY start_time DESC 
LIMIT 10;
```

## GitHub Actions Alternative

### Workflow File

Already created at `.github/workflows/rag-cron.yml`, but here's the scheduling configuration:

```yaml
on:
  schedule:
    # Daily evaluation at 02:00 UTC
    - cron: '0 2 * * *'
    # Hourly jobs
    - cron: '0 * * * *'
  workflow_dispatch:
    inputs:
      task:
        description: 'Task to run (eval, jobs, or both)'
        required: false
        default: 'both'
        type: choice
        options:
          - both
          - eval
          - jobs
```

### Required Secrets

Set in GitHub repository settings → Secrets and variables → Actions:

| Secret | Value | Description |
|--------|--------|-------------|
| `API_BASE` | `https://your-api-domain.com` | Base URL of your API |
| `ADMIN_TOKEN` | `your-secure-admin-token` | Bearer token for admin endpoints |

## Local Development & Testing

### Manual Execution

```bash
# Check environment
npm run env:check

# Test retrieval system
npm run rag:retrieve:test

# Run evaluation manually
npm run rag:eval

# Process queued jobs
npm run rag:jobs

# Full index rebuild (with confirmation)
npm run rag:rebuild
```

### Testing API Endpoints

```bash
# Test retrieval
curl -X POST "http://localhost:8787/api/rag/retrieve" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "query": "How to manage anxiety?"}'

# Test evaluation (requires admin token)
curl -X POST "http://localhost:8787/api/rag/eval" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{"source": "manual_test"}'

# Test job processing (requires admin token)
curl -X POST "http://localhost:8787/api/rag/jobs/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{"source": "manual_test"}'

# Check system status
curl -X GET "http://localhost:8787/api/rag/status"
```

## Docker/Production Deployment

### Environment Variables Required

```bash
# Core configuration
FAISS_INDEX_DIR=./luma-rag/vector_store
USE_EMBEDDER=current
ADMIN_TOKEN=your-secure-admin-token

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email notifications
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL="Luma RAG <noreply@yourdomain.com>"
MAINTAINER_EMAIL=admin@yourdomain.com

# API Keys
OPENAI_API_KEY=your-openai-api-key
```

### Kubernetes CronJob (Alternative)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rag-eval
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: rag-eval
            image: your-api-image:latest
            command: ["npm", "run", "rag:eval"]
            env:
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: rag-secrets
                  key: supabase-url
            # ... other env vars
          restartPolicy: OnFailure

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rag-jobs
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: rag-jobs
            image: your-api-image:latest
            command: ["npm", "run", "rag:jobs"]
            env:
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: rag-secrets
                  key: supabase-url
            # ... other env vars
          restartPolicy: OnFailure
```

## Monitoring & Troubleshooting

### Check Logs

```sql
-- Supabase: Check cron job execution
SELECT 
    jobname,
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobname LIKE 'rag-%'
ORDER BY start_time DESC 
LIMIT 20;

-- Check evaluation metrics
SELECT * FROM get_retrieval_metrics(24);

-- Check queued jobs
SELECT * FROM index_jobs 
WHERE status IN ('queued', 'running')
ORDER BY created_at;
```

### Common Issues

1. **Jobs not running**: Check pg_cron is enabled and API endpoints are accessible
2. **Authentication errors**: Verify ADMIN_TOKEN is set correctly
3. **FAISS errors**: Ensure FAISS_INDEX_DIR exists and contains valid index files
4. **Email failures**: Check RESEND_API_KEY configuration

### Alerts

The system will automatically send email alerts for:
- Performance degradation (low scores, hallucinations)
- Job failures
- System errors

Configure `MAINTAINER_EMAIL` to receive these alerts.

## Next Steps

1. Apply the Supabase schema: `psql -f supabase/schema_rag_eval.sql`
2. Set up your preferred scheduling method (Supabase cron or GitHub Actions)
3. Configure environment variables
4. Test with `npm run env:check` and manual API calls
5. Monitor the first few automated runs