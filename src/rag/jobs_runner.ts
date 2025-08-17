/**
 * RAG Jobs Runner
 * Consumes the index_jobs queue and executes re-embedding tasks
 */

import { getSupabaseClient } from '../lib/supabaseClient.js';
import { IndexRefresher } from './refresh_index';
import { sendEmail } from './email_notify';
import { spawn } from 'child_process';

const supabase = getSupabaseClient();

interface IndexJob {
  id: number;
  job_type: string;
  reason: string;
  payload: any;
  status: string;
  created_at: string;
}

class JobsRunner {
  private readonly MAX_CONCURRENT_JOBS = 1; // Process one job at a time for safety
  
  async getQueuedJobs(limit: number = 5): Promise<IndexJob[]> {
    console.log(`📋 Fetching queued jobs (limit: ${limit})`);
    
    const { data, error } = await supabase
      .from('index_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) {
      console.error('❌ Failed to fetch jobs:', error);
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
    
    console.log(`📝 Found ${data?.length || 0} queued jobs`);
    return data || [];
  }
  
  async updateJobStatus(jobId: number, status: string, error?: string): Promise<void> {
    const updateData: any = {
      status,
      finished_at: new Date().toISOString()
    };
    
    if (error) {
      updateData.error_message = error;
    }
    
    const { error: updateError } = await supabase
      .from('index_jobs')
      .update(updateData)
      .eq('id', jobId);
    
    if (updateError) {
      console.error(`❌ Failed to update job ${jobId}:`, updateError);
    } else {
      console.log(`✅ Job ${jobId} marked as ${status}`);
    }
  }
  
  async executeReembedJob(job: IndexJob): Promise<void> {
    console.log(`🔧 Executing re-embed job ${job.id}: ${job.reason}`);
    
    try {
      const refresher = new IndexRefresher();
      
      // Determine refresh strategy based on job reason and payload
      const { hints: _hints = [], metrics = {} } = job.payload || {};
      
      if (job.reason === 'low_score' && metrics.lowScoreQueries < 10) {
        // Incremental refresh for minor issues
        console.log('📈 Performing incremental index refresh...');
        await refresher.refreshIndex({ files: undefined, full: false });
      } else {
        // Full rebuild for major issues or hallucinations
        console.log('🔄 Performing full index rebuild...');
        await refresher.refreshIndex({ full: true, confirm: true });
      }
      
      await this.updateJobStatus(job.id, 'done');
      
      // Notify affected users (if user tracking is available)
      await this.notifyAffectedUsers(job);
      
      console.log(`✅ Re-embed job ${job.id} completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Re-embed job ${job.id} failed:`, errorMessage);
      
      await this.updateJobStatus(job.id, 'failed', errorMessage);
      
      // Alert maintainer about job failure
      await this.notifyJobFailure(job, errorMessage);
    }
  }
  
  async notifyAffectedUsers(job: IndexJob): Promise<void> {
    try {
      const { metrics } = job.payload || {};
      
      if (!metrics || !metrics.worstQueries) {
        return;
      }
      
      // Get unique user IDs from worst queries
      const userIds = [...new Set(metrics.worstQueries.map((q: any) => q.user_id))];
      
      console.log(`📧 Notifying ${userIds.length} affected users about knowledge update`);
      
      for (const userId of userIds) {
        try {
          const summary = `Knowledge base updated based on your recent queries. You may notice improved search results.`;
          const userIdStr = typeof userId === 'string' ? userId : String(userId);
          await sendEmail.notifyKnowledgeUpdate(userIdStr, summary);
        } catch (error) {
          console.warn(`⚠️ Failed to notify user ${userId}:`, error);
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to notify affected users:', error);
    }
  }
  
  async notifyJobFailure(job: IndexJob, errorMessage: string): Promise<void> {
    try {
      const subject = `RAG Job Failure: Re-embed Job ${job.id}`;
      const details = `
Job Details:
- ID: ${job.id}
- Type: ${job.job_type}
- Reason: ${job.reason}
- Created: ${job.created_at}

Error:
${errorMessage}

Payload:
${JSON.stringify(job.payload, null, 2)}

Please investigate and retry if necessary.
      `.trim();
      
      await sendEmail.alertMaintainer(subject, details);
      console.log('📧 Job failure notification sent to maintainer');
      
    } catch (error) {
      console.warn('⚠️ Failed to send job failure notification:', error);
    }
  }
  
  async processJob(job: IndexJob): Promise<void> {
    console.log(`⚙️ Processing job ${job.id} (${job.job_type})`);
    
    // Mark job as running
    await this.updateJobStatus(job.id, 'running');
    
    try {
      switch (job.job_type) {
        case 'reembed':
          await this.executeReembedJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }
    } catch (error) {
      // Error handling is done in specific job methods
      throw error;
    }
  }
  
  async runJobs(): Promise<void> {
    console.log('🚀 Starting jobs runner...');
    
    try {
      // Get queued jobs
      const jobs = await this.getQueuedJobs(this.MAX_CONCURRENT_JOBS);
      
      if (jobs.length === 0) {
        console.log('ℹ️ No queued jobs to process');
        return;
      }
      
      // Process jobs sequentially for safety
      for (const job of jobs) {
        await this.processJob(job);
      }
      
      console.log(`✅ Processed ${jobs.length} jobs successfully`);
      
    } catch (error) {
      console.error('❌ Jobs runner failed:', error);
      throw error;
    }
  }
}

// Alternative: Use child_process for isolated job execution (currently unused)
async function _runJobInProcess(job: IndexJob): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['src/rag/refresh_index.ts'];
    
    // Add arguments based on job configuration
    if (job.payload?.fullRebuild) {
      args.push('--full', '--confirm');
    }
    
    const child = spawn('tsx', args, {
      stdio: 'pipe',
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Job process completed successfully');
        console.log('Output:', stdout);
        resolve();
      } else {
        console.error('❌ Job process failed with code:', code);
        console.error('Error:', stderr);
        reject(new Error(`Job failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ Failed to start job process:', error);
      reject(error);
    });
  });
}

// Export for programmatic use
export { JobsRunner };

// CLI interface
async function main() {
  const runner = new JobsRunner();
  await runner.runJobs();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}