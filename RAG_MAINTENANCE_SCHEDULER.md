# RAG Maintenance Scheduler

Automated scheduling system for RAG evaluation and maintenance jobs using GitHub Actions and optional Supabase Edge Functions.

## GitHub Actions Workflow

### Automatic Schedule
- **RAG Evaluation**: Daily at 02:00 UTC
- **RAG Jobs**: Every hour

### Manual Trigger
Run workflow manually from GitHub Actions tab with options:
- `both` - Run both evaluation and jobs
- `eval` - Run evaluation only  
- `jobs` - Run jobs only

### Required Repository Secrets

Set these in GitHub repository settings → Secrets and variables → Actions:

| Secret | Description | Example |
|--------|-------------|---------|
| `API_BASE` | Base URL of your deployed API | `https://your-api.vercel.app` |
| `ADMIN_TOKEN` | Bearer token for API authentication | `your-secure-admin-token-here` |

### API Endpoints Called

1. **POST `/api/rag/eval`** - Daily evaluation of RAG system performance
   ```json
   {
     "source": "github_actions"
   }
   ```

2. **POST `/api/rag/jobs/run`** - Hourly maintenance jobs
   ```json
   {
     "source": "github_actions"
   }
   ```

## Supabase Edge Functions (Optional)

If using Supabase, you can also trigger RAG maintenance via Edge Functions.

### Deploy Functions

```bash
# Deploy RAG evaluation function
supabase functions deploy rag_eval

# Deploy RAG jobs function
supabase functions deploy rag_jobs
```

### Set Function Secrets

In Supabase Dashboard → Edge Functions → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `API_BASE` | Your API base URL |
| `ADMIN_TOKEN` | Admin authentication token |

### Function URLs

After deployment, functions are available at:
- `https://[project-ref].supabase.co/functions/v1/rag_eval`
- `https://[project-ref].supabase.co/functions/v1/rag_jobs`

### Cron Examples

You can also set up cron jobs in Supabase using these functions:

#### Option 1: pg_cron (if enabled)
```sql
-- Daily evaluation at 02:00 UTC
SELECT cron.schedule('rag-eval-daily', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/rag_eval',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [anon-key]"}'::jsonb,
    body := '{"source": "supabase_cron"}'::jsonb
  );
$$);

-- Hourly jobs
SELECT cron.schedule('rag-jobs-hourly', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/rag_jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [anon-key]"}'::jsonb,
    body := '{"source": "supabase_cron"}'::jsonb
  );
$$);
```

#### Option 2: External Cron Service
Use any external cron service (like cron-job.org) to call the function URLs directly.

## Monitoring

### GitHub Actions Logs
Check workflow execution in GitHub → Actions → RAG Maintenance Scheduler

### Supabase Function Logs
View function logs in Supabase Dashboard → Edge Functions → [function-name] → Logs

### Expected Response Format

Both endpoints should return:
```json
{
  "success": true,
  "timestamp": "2024-01-15T02:00:00.000Z",
  "details": {
    "tasks_completed": 5,
    "duration_ms": 1234
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify `ADMIN_TOKEN` is correct in secrets
   - Check API endpoint accepts Bearer token authentication

2. **Connection Timeout**
   - Verify `API_BASE` URL is correct and accessible
   - Check if API server is running

3. **Function Deployment Failed**
   - Ensure Supabase CLI is logged in: `supabase auth login`
   - Verify project is linked: `supabase link --project-ref [your-ref]`

4. **Cron Not Triggering**
   - GitHub Actions: Check if workflows are enabled in repository settings
   - Supabase: Verify pg_cron extension is enabled in database extensions

### Manual Testing

Test endpoints manually:

```bash
# Test evaluation endpoint
curl -X POST "https://your-api.vercel.app/api/rag/eval" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"source": "manual_test"}'

# Test jobs endpoint  
curl -X POST "https://your-api.vercel.app/api/rag/jobs/run" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"source": "manual_test"}'
```

## Files Created

- `.github/workflows/rag-cron.yml` - GitHub Actions workflow
- `supabase/functions/rag_eval/index.ts` - Supabase Edge Function for evaluation
- `supabase/functions/rag_jobs/index.ts` - Supabase Edge Function for jobs
- `RAG_MAINTENANCE_SCHEDULER.md` - This documentation