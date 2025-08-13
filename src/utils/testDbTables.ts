// Database Tables Test Utility
import { sbAdmin } from '../lib/supabase';

export interface TableCheckResult {
  tableName: string;
  exists: boolean;
  accessible: boolean;
  error?: string;
}

export async function checkDatabaseTables(): Promise<TableCheckResult[]> {
  const requiredTables = ['sessions', 'messages', 'session_summaries', 'user_memories'];
  const results: TableCheckResult[] = [];
  
  for (const tableName of requiredTables) {
    try {
      // Try to query the table with a simple select
      const { data, error } = await sbAdmin
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        results.push({
          tableName,
          exists: false,
          accessible: false,
          error: error.message
        });
      } else {
        results.push({
          tableName,
          exists: true,
          accessible: true,
          error: `Found ${data ? data.length : 0} rows (table ready)`
        });
      }
    } catch (err) {
      results.push({
        tableName,
        exists: false,
        accessible: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  
  return results;
}

export async function testMemorySystemReadiness(): Promise<{
  tablesReady: boolean;
  missingTables: string[];
  errors: string[];
  summary: string;
}> {
  try {
    const tableResults = await checkDatabaseTables();
    const missingTables = tableResults
      .filter(result => !result.exists)
      .map(result => result.tableName);
    
    const errors = tableResults
      .filter(result => result.error)
      .map(result => `${result.tableName}: ${result.error}`);
    
    const tablesReady = missingTables.length === 0;
    
    let summary = '';
    if (tablesReady) {
      summary = '✅ All required database tables are ready!';
    } else {
      summary = `❌ Missing tables: ${missingTables.join(', ')}. Please run the SQL schema in Supabase.`;
    }
    
    return {
      tablesReady,
      missingTables,
      errors,
      summary
    };
  } catch (error) {
    return {
      tablesReady: false,
      missingTables: [],
      errors: [error instanceof Error ? error.message : String(error)],
      summary: '❌ Failed to check database readiness'
    };
  }
}

// Console testing function
export function logMemorySystemStatus() {
  console.log('🔍 Checking Memory System Database Status...');
  
  testMemorySystemReadiness().then(result => {
    console.log('\n📊 Database Status Report:');
    console.log('==========================');
    console.log(result.summary);
    
    if (result.missingTables.length > 0) {
      console.log('\n❌ Missing Tables:', result.missingTables);
      console.log('\n📋 Next Steps:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Open the SQL Editor');
      console.log('3. Run the contents of supabase_schema.sql file');
      console.log('4. Refresh this page and test again');
    }
    
    if (result.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      result.errors.forEach(err => console.log(`   • ${err}`));
    }
    
    if (result.tablesReady) {
      console.log('\n🎉 Memory system is ready to use!');
      console.log('💡 Log in to enable full memory functionality');
    }
  }).catch(error => {
    console.error('❌ Database status check failed:', error);
  });
}