import Index from '@/pages/Index'
import DiagnosticsPage from '@/components/DiagnosticsPage'

function App() {
  // Simple URL-based routing for diagnostics
  const currentPath = window.location.pathname;
  
  if (currentPath === '/diagnostics') {
    return <DiagnosticsPage />;
  }
  
  return <Index />
}

export default App
