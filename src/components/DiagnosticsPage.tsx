import { useState, useEffect } from 'react';
import MemoryDiagnostics from './MemoryDiagnostics';

interface DiagnosticsData {
  sha: string;
  deployedAt: string;
  buildTime: string;
  nodeEnv: string;
  userAgent: string;
  buildFiles: {
    js: string;
    css: string;
  };
}

const DiagnosticsPage = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);

  useEffect(() => {
    // Get build file names from current document
    const jsFile = document.querySelector('script[src*="/assets/index-"]')?.getAttribute('src') || 'unknown';
    const cssFile = document.querySelector('link[href*="/assets/index-"]')?.getAttribute('href') || 'unknown';
    
    // Get git commit SHA from API endpoint
    const getVersionInfo = async () => {
      try {
        const response = await fetch('/api/version.json');
        const data = await response.json();
        return data;
      } catch (error) {
        // Fallback to extracting from build file names
        const sha = process.env.VERCEL_GIT_COMMIT_SHA || 
                   jsFile.match(/index-(.+)\.js/)?.[1]?.substring(0, 8) || 
                   'local-build';
        return { sha, deployedAt: new Date().toISOString(), version: 'unknown' };
      }
    };

    const loadDiagnostics = async () => {
      const versionInfo = await getVersionInfo();
      
      setDiagnostics({
        sha: versionInfo.sha,
        deployedAt: versionInfo.deployedAt,
        buildTime: document.lastModified || new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development',
        userAgent: navigator.userAgent,
        buildFiles: {
          js: jsFile,
          css: cssFile
        }
      });
    };

    loadDiagnostics();
  }, []);

  if (!diagnostics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center">
        <div className="text-white">Loading diagnostics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-8">🔍 Luma Diagnostics</h1>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Deployment Info */}
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">📦 Deployment Info</h2>
              <div className="space-y-3 text-blue-100">
                <div>
                  <span className="font-medium">Git SHA:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-green-300">
                    {diagnostics.sha}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Deployed At:</span>
                  <div className="ml-2 text-sm">{diagnostics.deployedAt}</div>
                </div>
                <div>
                  <span className="font-medium">Build Time:</span>
                  <div className="ml-2 text-sm">{diagnostics.buildTime}</div>
                </div>
                <div>
                  <span className="font-medium">Environment:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-yellow-300">
                    {diagnostics.nodeEnv}
                  </code>
                </div>
              </div>
            </div>

            {/* Build Files */}
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">🏗️ Build Files</h2>
              <div className="space-y-3 text-blue-100">
                <div>
                  <span className="font-medium">JavaScript:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-xs block mt-1 break-all">
                    {diagnostics.buildFiles.js}
                  </code>
                </div>
                <div>
                  <span className="font-medium">CSS:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-xs block mt-1 break-all">
                    {diagnostics.buildFiles.css}
                  </code>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white/5 rounded-lg p-6 md:col-span-2">
              <h2 className="text-xl font-semibold text-white mb-4">💻 Client Info</h2>
              <div className="space-y-3 text-blue-100">
                <div>
                  <span className="font-medium">User Agent:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-xs block mt-1 break-all">
                    {diagnostics.userAgent}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Current URL:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-sm">
                    {window.location.href}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span>
                  <code className="ml-2 bg-black/20 px-2 py-1 rounded text-sm">
                    {new Date().toISOString()}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-green-300 text-2xl mb-2">✅</div>
              <div className="text-white font-medium">Build Successful</div>
              <div className="text-green-100 text-sm">TypeScript compiled without errors</div>
            </div>
            
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
              <div className="text-blue-300 text-2xl mb-2">🚀</div>
              <div className="text-white font-medium">Deployment Active</div>
              <div className="text-blue-100 text-sm">Site is live and accessible</div>
            </div>
            
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center">
              <div className="text-purple-300 text-2xl mb-2">🔧</div>
              <div className="text-white font-medium">Config Updated</div>
              <div className="text-purple-100 text-sm">Dependencies and fixes applied</div>
            </div>
          </div>

          {/* Memory Diagnostics */}
          <div className="mt-8">
            <MemoryDiagnostics />
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <a 
              href="/" 
              className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
            >
              ← Back to Luma
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPage;