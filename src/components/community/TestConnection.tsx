import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const TestConnection: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing Supabase connection...');
      
      // Test 1: Check if we can connect to Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Auth test:', user?.email || 'Not authenticated');
      
      // Test 2: Check if community_categories table exists
      const { data, error, count } = await supabase
        .from('community_categories')
        .select('*', { count: 'exact' });
      
      console.log('📊 Database test:', { data, error, count });
      
      // Test 3: Try to insert a test category (will fail if table doesn't exist)
      const { error: insertError } = await supabase
        .from('community_categories')
        .insert({
          name: 'TEST_CONNECTION',
          slug: 'test-connection',
          description: 'Test category - will be deleted'
        });
      
      if (!insertError) {
        // Delete the test category
        await supabase
          .from('community_categories')
          .delete()
          .eq('slug', 'test-connection');
      }
      
      setResults({
        user: user?.email || 'Not authenticated',
        authError: authError?.message || 'None',
        categoryCount: count || 0,
        categories: data || [],
        dbError: error?.message || 'None',
        insertTest: insertError?.message || 'Success (table exists)',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured' : 'Not configured'
      });
      
    } catch (err: any) {
      console.error('❌ Connection test failed:', err);
      setResults({
        error: err.message,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured' : 'Not configured'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 m-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 Supabase Connection Test</h3>
      
      <button
        onClick={testConnection}
        disabled={testing}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 mb-4"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      
      {results && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestConnection;