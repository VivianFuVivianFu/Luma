/**
 * RAG Evaluation Loop
 * Analyzes recent retrieval performance and schedules re-embedding jobs when needed
 */

import { getSupabaseClient } from '../lib/supabaseClient.js';
import { sendEmail } from './email_notify';

const supabase = getSupabaseClient();

interface EvaluationMetrics {
  totalQueries: number;
  lowScoreQueries: number;
  hallucinations: number;
  averageScore: number;
  worstQueries: Array<{
    query: string;
    score: number;
    user_id: string;
    created_at: string;
  }>;
}

interface JobPayload {
  reason: string;
  metrics: EvaluationMetrics;
  hints?: string[];
}

class EvaluationLoop {
  private readonly SCORE_THRESHOLD = 0.55;
  private readonly MIN_ISSUES_FOR_REEMBED = 3;
  
  async getRecentLogs(hoursBack: number = 24): Promise<any[]> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    
    console.log(`📊 Analyzing retrieval logs from last ${hoursBack} hours (since ${since})`);
    
    const { data, error } = await supabase
      .from('retrieval_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Failed to fetch retrieval logs:', error);
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }
    
    console.log(`📋 Found ${data?.length || 0} retrieval logs`);
    return data || [];
  }
  
  analyzePerformance(logs: any[]): EvaluationMetrics {
    if (logs.length === 0) {
      return {
        totalQueries: 0,
        lowScoreQueries: 0,
        hallucinations: 0,
        averageScore: 0,
        worstQueries: []
      };
    }
    
    const successfulLogs = logs.filter(log => log.outcome === 'success');
    const lowScoreQueries = successfulLogs.filter(log => log.score_mean < this.SCORE_THRESHOLD);
    const hallucinations = logs.filter(log => log.outcome === 'hallucination_suspected');
    
    const totalScore = successfulLogs.reduce((sum, log) => sum + (log.score_mean || 0), 0);
    const averageScore = successfulLogs.length > 0 ? totalScore / successfulLogs.length : 0;
    
    // Get worst performing queries for analysis
    const worstQueries = successfulLogs
      .sort((a, b) => (a.score_mean || 0) - (b.score_mean || 0))
      .slice(0, 5)
      .map(log => ({
        query: log.query,
        score: log.score_mean || 0,
        user_id: log.user_id,
        created_at: log.created_at
      }));
    
    return {
      totalQueries: logs.length,
      lowScoreQueries: lowScoreQueries.length,
      hallucinations: hallucinations.length,
      averageScore,
      worstQueries
    };
  }
  
  async scheduleReembedJob(reason: string, metrics: EvaluationMetrics): Promise<void> {
    const payload: JobPayload = {
      reason,
      metrics,
      hints: this.generateHints(metrics)
    };
    
    console.log(`📝 Scheduling re-embed job: ${reason}`);
    
    const { error } = await supabase
      .from('index_jobs')
      .insert({
        job_type: 'reembed',
        reason,
        payload: payload as any,
        status: 'queued',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Failed to schedule job:', error);
      throw new Error(`Failed to schedule job: ${error.message}`);
    }
    
    console.log('✅ Re-embed job scheduled successfully');
  }
  
  private generateHints(metrics: EvaluationMetrics): string[] {
    const hints: string[] = [];
    
    if (metrics.averageScore < 0.4) {
      hints.push('Very low average scores - consider updating document corpus');
    }
    
    if (metrics.hallucinations > 0) {
      hints.push('Hallucinations detected - review retrieval quality');
    }
    
    if (metrics.worstQueries.length > 0) {
      const commonTerms = this.extractCommonTerms(metrics.worstQueries.map(q => q.query));
      if (commonTerms.length > 0) {
        hints.push(`Common problematic terms: ${commonTerms.join(', ')}`);
      }
    }
    
    return hints;
  }
  
  private extractCommonTerms(queries: string[]): string[] {
    // Simple term extraction for hints
    const termCounts: { [key: string]: number } = {};
    
    queries.forEach(query => {
      const terms = query.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3 && !['what', 'how', 'why', 'when', 'where', 'the', 'and', 'or'].includes(term));
      
      terms.forEach(term => {
        termCounts[term] = (termCounts[term] || 0) + 1;
      });
    });
    
    return Object.entries(termCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([term]) => term);
  }
  
  async notifyMaintainer(metrics: EvaluationMetrics): Promise<void> {
    try {
      const subject = `RAG System Alert: Performance Issues Detected`;
      const details = `
Evaluation Results (Last 24h):
- Total Queries: ${metrics.totalQueries}
- Low Score Queries: ${metrics.lowScoreQueries}
- Hallucinations: ${metrics.hallucinations}
- Average Score: ${metrics.averageScore.toFixed(3)}

Worst Performing Queries:
${metrics.worstQueries.map(q => `- "${q.query}" (score: ${q.score.toFixed(3)})`).join('\n')}

A re-embedding job has been scheduled to address these issues.
      `.trim();
      
      await sendEmail.alertMaintainer(subject, details);
      console.log('📧 Maintainer notification sent');
      
    } catch (error) {
      console.warn('⚠️ Failed to send maintainer notification:', error);
    }
  }
  
  async runEvaluation(): Promise<void> {
    console.log('🔍 Starting RAG evaluation loop...');
    
    try {
      // Get recent logs
      const logs = await this.getRecentLogs(24);
      
      if (logs.length === 0) {
        console.log('ℹ️ No recent logs to analyze');
        return;
      }
      
      // Analyze performance
      const metrics = this.analyzePerformance(logs);
      
      console.log('\n📊 Evaluation Results:');
      console.log(`- Total Queries: ${metrics.totalQueries}`);
      console.log(`- Low Score Queries: ${metrics.lowScoreQueries} (threshold: ${this.SCORE_THRESHOLD})`);
      console.log(`- Hallucinations: ${metrics.hallucinations}`);
      console.log(`- Average Score: ${metrics.averageScore.toFixed(3)}`);
      
      // Check if re-embedding is needed
      const needsReembed = 
        metrics.lowScoreQueries >= this.MIN_ISSUES_FOR_REEMBED ||
        metrics.hallucinations > 0;
      
      if (needsReembed) {
        console.log('⚠️ Performance issues detected - scheduling re-embed job');
        
        let reason = '';
        if (metrics.lowScoreQueries >= this.MIN_ISSUES_FOR_REEMBED) {
          reason = 'low_score';
        }
        if (metrics.hallucinations > 0) {
          reason = reason ? 'low_score_and_hallucinations' : 'hallucinations';
        }
        
        await this.scheduleReembedJob(reason, metrics);
        await this.notifyMaintainer(metrics);
        
      } else {
        console.log('✅ Performance within acceptable limits');
      }
      
    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      throw error;
    }
  }
}

// Export for programmatic use
export { EvaluationLoop };

// CLI interface
async function main() {
  const evaluator = new EvaluationLoop();
  await evaluator.runEvaluation();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}