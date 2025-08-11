import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AuthPanel from '@/components/AuthPanel'
import AuthenticatedChat from '@/components/AuthenticatedChat'

function App() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current auth state
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setAuthed(!!session)
      } catch (error) {
        console.error('Error checking auth state:', error)
        setAuthed(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200 flex items-center justify-center">
        <div className="text-gray-700 text-lg">载入中...</div>
      </div>
    )
  }

  return authed ? (
    <AuthenticatedChat />
  ) : (
    <AuthPanel onAuthed={() => setAuthed(true)} />
  )
}

export default App
