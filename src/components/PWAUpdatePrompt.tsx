import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'

interface PWAUpdatePromptProps {
  className?: string
}

export function PWAUpdatePrompt({ className = '' }: PWAUpdatePromptProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Listen for PWA update events
    const handleUpdateFound = () => {
      console.log('PWA update found')
      setUpdateAvailable(true)
      setShowUpdatePrompt(true)
    }

    const handleUpdateReady = () => {
      console.log('PWA update ready')
      setUpdateAvailable(true)
      setShowUpdatePrompt(true)
    }

    // Listen for service worker events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          handleUpdateReady()
        }
      })

      // Check for updates periodically
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update()
        }, 60000)

        registration.addEventListener('updatefound', handleUpdateFound)
      })
    }

    // For vite-plugin-pwa
    window.addEventListener('sw:update', handleUpdateReady)

    return () => {
      window.removeEventListener('sw:update', handleUpdateReady)
    }
  }, [])

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Tell the service worker to skip waiting
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    
    // Reload the page to get the new version
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt || !updateAvailable) {
    return null
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                App Update Available
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                A new version of Luma AI Companion is ready
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleUpdate}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for programmatic usage
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handleUpdateReady = () => {
      setUpdateAvailable(true)
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          handleUpdateReady()
        }
      })
    }

    window.addEventListener('sw:update', handleUpdateReady)

    return () => {
      window.removeEventListener('sw:update', handleUpdateReady)
    }
  }, [])

  const applyUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    window.location.reload()
  }

  return {
    updateAvailable,
    applyUpdate
  }
}