import Index from '@/pages/Index'
import DiagnosticsPage from '@/components/DiagnosticsPage'
import ErrorBoundary from '@/components/ErrorBoundary'

function App() {
  // Simple URL-based routing
  const currentPath = window.location.pathname;
  
  return (
    <ErrorBoundary>
      {currentPath === '/diagnostics' ? <DiagnosticsPage /> : <Index />}
    </ErrorBoundary>
  );
}

export default App
