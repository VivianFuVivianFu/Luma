import React, { useState } from 'react';
import { supabase, sbAdmin } from '../lib/supabase';
import { memoryService } from '../lib/memoryService';

const MemoryDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: any = {};

    try {
      // Check authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      results.auth = {
        isAuthenticated: !!session?.user,
        userId: session?.user?.id || 'Not authenticated',
        userEmail: session?.user?.email || 'Not authenticated',
        error: authError?.message
      };

      if (session?.user) {
        // Check if user profile exists (using profiles table)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        results.userProfile = {
          exists: !!profile,
          data: profile,
          error: profileError?.message
        };

        // Check if memory tables exist
        try {
          const { error: sessionsError } = await sbAdmin
            .from('sessions')
            .select('count')
            .limit(1);
          
          results.memoryTables = {
            sessions: { exists: !sessionsError, error: sessionsError?.message },
          };

          // Test other tables
          const tables = ['messages', 'session_summaries', 'user_memories'];
          for (const table of tables) {
            try {
              const { error } = await sbAdmin.from(table).select('count').limit(1);
              results.memoryTables[table] = { exists: !error, error: error?.message };
            } catch (e) {
              results.memoryTables[table] = { exists: false, error: (e as Error).message };
            }
          }
        } catch (e) {
          results.memoryTables = { error: (e as Error).message };
        }

        // Test memory service
        try {
          const sessionId = await memoryService.getActiveSession(session.user.id);
          results.memoryService = {
            canCreateSession: !!sessionId,
            sessionId,
            error: null
          };

          // Test saving a message
          await memoryService.saveMessage(sessionId, session.user.id, 'user', 'Test message');
          results.memoryService.canSaveMessage = true;

          // Test loading context
          const context = await memoryService.getConversationContext(session.user.id, sessionId);
          results.memoryService.canLoadContext = true;
          results.memoryService.contextLength = context.length;

        } catch (e) {
          results.memoryService = {
            error: (e as Error).message,
            canCreateSession: false
          };
        }
      }

      // Check environment variables
      results.environment = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        supabaseServiceKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
        claudeApiKey: import.meta.env.VITE_CLAUDE_API_KEY ? 'Set' : 'Missing',
      };

    } catch (error) {
      results.generalError = (error as Error).message;
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const setupDatabase = async () => {
    setIsRunning(true);
    try {
      // This would need to be run manually in Supabase SQL editor
      alert('Please run the memory-system-schema.sql file in your Supabase SQL editor to create the required tables.');
    } catch (error) {
      console.error('Setup error:', error);
    }
    setIsRunning(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 m-4">
      <h2 className="text-xl font-bold mb-4">Memory System Diagnostics</h2>
      
      <div className="space-y-4">
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>

        <button
          onClick={setupDatabase}
          disabled={isRunning}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 ml-2"
        >
          Setup Database
        </button>

        {diagnostics && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Diagnostic Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryDiagnostics;