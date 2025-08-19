import React, { useState, useEffect } from 'react';
import { memoryService } from '../lib/memoryService';
import { claudeAI } from '../lib/claudeAI';
import { supabase, sbAdmin } from '../lib/supabase';
// import { testMemorySystemReadiness } from '../utils/testDbTables'; // File removed

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

const MemoryTestPanel: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>('checking...');

  const addTestResult = (name: string, status: 'success' | 'error', message: string, data?: any) => {
    setTests(prev => [...prev, { name, status, message, data }]);
  };

  // Test 1: Check environment variables
  const testEnvironmentVars = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const togetherApiKey = import.meta.env.VITE_TOGETHER_API_KEY;

      const missingVars = [];
      if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
      if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
      if (!supabaseServiceKey) missingVars.push('VITE_SUPABASE_SERVICE_ROLE_KEY');
      if (!togetherApiKey) missingVars.push('VITE_TOGETHER_API_KEY');

      if (missingVars.length > 0) {
        addTestResult('Environment Variables', 'error', `Missing: ${missingVars.join(', ')}`);
      } else {
        addTestResult('Environment Variables', 'success', 'All required environment variables present', {
          supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
          hasAnonKey: !!supabaseAnonKey,
          hasServiceKey: !!supabaseServiceKey,
          hasTogetherKey: !!togetherApiKey
        });
      }
    } catch (error) {
      addTestResult('Environment Variables', 'error', `Error: ${error}`);
    }
  };

  // Test 2: Check authentication status
  const testAuthentication = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addTestResult('Authentication', 'error', `Auth error: ${error.message}`);
        setAuthStatus('error');
      } else if (session?.user) {
        addTestResult('Authentication', 'success', `Authenticated as: ${session.user.email}`, {
          userId: session.user.id,
          email: session.user.email
        });
        setAuthStatus('authenticated');
      } else {
        addTestResult('Authentication', 'error', 'Not authenticated - memory features require login');
        setAuthStatus('not authenticated');
      }
    } catch (error) {
      addTestResult('Authentication', 'error', `Auth check failed: ${error}`);
      setAuthStatus('error');
    }
  };

  // Test 3: Test database connection
  const testDatabaseConnection = async () => {
    try {
      // Test with a simple query that should work regardless of data
      const { data, error } = await sbAdmin
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        addTestResult('Database Connection', 'error', `DB connection failed: ${error.message}`);
      } else {
        addTestResult('Database Connection', 'success', 'Database connection successful', {
          tablesFound: data ? data.length : 0
        });
      }
    } catch (error) {
      addTestResult('Database Connection', 'error', `DB test failed: ${error}`);
    }
  };

  // Test 4: Test memory service initialization
  const testMemoryServiceInit = async () => {
    try {
      // Test basic memory service methods
      const testUserId = 'test-user-' + Date.now();
      const sessionId = memoryService.generateSessionId(testUserId);
      
      if (sessionId && sessionId.includes(testUserId)) {
        addTestResult('Memory Service Init', 'success', 'Memory service methods working', {
          testUserId,
          sessionId
        });
      } else {
        addTestResult('Memory Service Init', 'error', 'Session ID generation failed');
      }
    } catch (error) {
      addTestResult('Memory Service Init', 'error', `Memory service error: ${error}`);
    }
  };

  // Test 5: Test Claude AI memory integration
  const testClaudeAIMemory = async () => {
    try {
      const status = claudeAI.getStatus();
      
      addTestResult('Claude AI Memory Integration', 'success', 'Claude AI methods working', {
        connected: status.connected,
        model: status.model,
        historyLength: status.historyLength
      });

      // Try to enable memory (will fail if not authenticated)
      try {
        const enableResult = await claudeAI.initialize();
        if (enableResult) {
          addTestResult('Memory Enablement', 'success', 'Memory successfully enabled');
        } else {
          addTestResult('Memory Enablement', 'error', 'Memory enable returned false (likely proxy server not running)');
        }
      } catch (enableError) {
        addTestResult('Memory Enablement', 'error', `Memory enable failed: ${enableError}`);
      }
    } catch (error) {
      addTestResult('Claude AI Memory Integration', 'error', `Claude AI memory test failed: ${error}`);
    }
  };

  // Test 6: Test database tables existence (placeholder)
  const testDatabaseTables = async () => {
    try {
      // Placeholder implementation since testMemorySystemReadiness was removed
      const { data, error } = await sbAdmin
        .from('information_schema.tables')
        .select('table_name')
        .in('table_name', ['sessions', 'messages', 'session_summaries', 'user_memories']);
      
      if (error) {
        addTestResult('Database Tables', 'error', `Database check failed: ${error.message}`);
      } else {
        addTestResult('Database Tables', 'success', `Found ${data?.length || 0} memory-related tables`, {
          tablesFound: data?.map(t => t.table_name) || [],
          totalTables: data?.length || 0
        });
      }
    } catch (error) {
      addTestResult('Database Tables', 'error', `Database check failed: ${error}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    await testEnvironmentVars();
    await testDatabaseConnection();
    await testDatabaseTables();
    await testAuthentication();
    await testMemoryServiceInit();
    await testClaudeAIMemory();

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run basic tests on component mount
    testAuthentication();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🧠 Memory System Test Panel</h2>
        <p className="text-gray-600">Testing Luma's long-term and short-term memory functionality</p>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm"><strong>Auth Status:</strong> {authStatus}</p>
          {authStatus === 'not authenticated' && (
            <p className="text-sm text-orange-600 mt-2">
              ⚠️ Please log in to test full memory functionality
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium ${
            isRunning 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getStatusIcon(test.status)}</span>
                <h3 className="font-semibold text-gray-800">{test.name}</h3>
              </div>
              <span className={`text-sm font-medium ${getStatusColor(test.status)}`}>
                {test.status.toUpperCase()}
              </span>
            </div>
            
            <p className={`text-sm ${getStatusColor(test.status)} mb-2`}>
              {test.message}
            </p>
            
            {test.data && (
              <details className="mt-2">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Show details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(test.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {tests.length === 0 && !isRunning && (
        <div className="text-center py-8 text-gray-500">
          Click "Run All Tests" to start testing the memory system
        </div>
      )}
    </div>
  );
};

export default MemoryTestPanel;