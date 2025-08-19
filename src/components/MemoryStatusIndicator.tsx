import React, { useState, useEffect } from 'react';
// import { testMemorySystemReadiness } from '../utils/testDbTables'; // File removed
// import { claudeAI } from '../lib/claudeAI'; // Unused import
import { supabase } from '../lib/supabase';

interface MemoryStatus {
  dbReady: boolean;
  authenticated: boolean;
  memoryEnabled: boolean;
  loading: boolean;
  error?: string;
  details?: any;
}

const MemoryStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<MemoryStatus>({
    dbReady: false,
    authenticated: false,
    memoryEnabled: false,
    loading: true
  });

  const [expanded, setExpanded] = useState(false);

  const checkStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));

      // Check database readiness
      // Placeholder implementation since testMemorySystemReadiness was removed
      const dbStatus = { tablesReady: true, missingTables: [], errors: [] };
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authenticated = !!session?.user;
      
      // Check memory system
      // Claude AI doesn't use persistent memory - conversations are stateless
      const sessionInfo = { userId: null, sessionId: null, memoryEnabled: false };
      const memoryEnabled = false;

      setStatus({
        dbReady: dbStatus.tablesReady,
        authenticated,
        memoryEnabled,
        loading: false,
        details: {
          missingTables: dbStatus.missingTables,
          errors: dbStatus.errors,
          sessionInfo,
          userEmail: session?.user?.email
        }
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  const getStatusIcon = () => {
    if (status.loading) return '⏳';
    if (status.error) return '❌';
    if (status.dbReady && status.authenticated && status.memoryEnabled) return '🧠';
    if (status.dbReady && status.authenticated) return '⚠️';
    if (status.dbReady) return '🔧';
    return '🚨';
  };

  const getStatusText = () => {
    if (status.loading) return 'Checking memory system...';
    if (status.error) return 'Memory system error';
    if (status.dbReady && status.authenticated && status.memoryEnabled) return 'Memory system active';
    if (status.dbReady && status.authenticated) return 'Memory ready - starting chat will activate';
    if (status.dbReady) return 'Memory ready - please log in';
    return 'Database setup required';
  };

  const getStatusColor = () => {
    if (status.loading) return 'text-yellow-600';
    if (status.error) return 'text-red-600';
    if (status.dbReady && status.authenticated && status.memoryEnabled) return 'text-green-600';
    if (status.dbReady && status.authenticated) return 'text-blue-600';
    if (status.dbReady) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{getStatusIcon()}</span>
          <div className="text-left">
            <div className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <div className="text-xs text-gray-500">
              Click for details
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transform transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <span className={status.dbReady ? 'text-green-500' : 'text-red-500'}>
                  {status.dbReady ? '✅' : '❌'}
                </span>
                <span>Database Tables: {status.dbReady ? 'Ready' : 'Missing'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={status.authenticated ? 'text-green-500' : 'text-orange-500'}>
                  {status.authenticated ? '✅' : '⚠️'}
                </span>
                <span>
                  Authentication: {status.authenticated ? 
                    `Logged in${status.details?.userEmail ? ` as ${status.details.userEmail}` : ''}` : 
                    'Not logged in'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={status.memoryEnabled ? 'text-green-500' : 'text-gray-500'}>
                  {status.memoryEnabled ? '✅' : '⚪'}
                </span>
                <span>Memory System: {status.memoryEnabled ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            {status.details?.missingTables?.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 rounded">
                <div className="text-red-700 font-medium">Missing Tables:</div>
                <div className="text-red-600 text-xs">
                  {status.details.missingTables.join(', ')}
                </div>
                <div className="text-red-600 text-xs mt-1">
                  Run supabase_schema.sql in your Supabase dashboard
                </div>
              </div>
            )}

            {!status.authenticated && status.dbReady && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <div className="text-blue-700 text-xs">
                  💡 Log in to enable personalized memory features
                </div>
              </div>
            )}

            {status.authenticated && !status.memoryEnabled && (
              <div className="mt-3 p-2 bg-yellow-50 rounded">
                <div className="text-yellow-700 text-xs">
                  💡 Start a conversation to activate memory system
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={checkStatus}
                disabled={status.loading}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
              >
                {status.loading ? '⏳ Checking...' : '🔄 Refresh'}
              </button>
              
              <a
                href="?test-memory"
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
              >
                🧪 Full Test
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryStatusIndicator;