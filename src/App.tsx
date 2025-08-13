import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import VideoSection from '@/components/VideoSection'
import ChatSection from '@/components/ChatSection'
import AuthButtons from '@/components/AuthButtons'
import AuthPanel from '@/components/AuthPanel'
import MembershipPrompt from '@/components/MembershipPrompt'

function App() {
  const [authed, setAuthed] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMembershipPrompt, setShowMembershipPrompt] = useState(false)

  useEffect(() => {
    // Check current auth state
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setAuthed(!!session)
        if (session?.user?.email) {
          setUserEmail(session.user.email)
        }
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
      setUserEmail(session?.user?.email || '')
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setAuthed(false)
      setUserEmail('')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleMembershipPrompt = () => {
    setShowMembershipPrompt(true)
  }

  const handleJoinCommunity = () => {
    setShowMembershipPrompt(false)
    setShowAuthModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200 flex items-center justify-center">
        <div className="text-gray-700 text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200">
      {/* Auth Buttons - Desktop: Top Right, Mobile: Below Header */}
      <div className="hidden sm:block absolute top-4 right-4 z-30">
        <AuthButtons 
          isAuthenticated={authed}
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      </div>

      {/* Header Text */}
      <div className="absolute top-8 sm:top-16 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 w-full">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-medium text-gray-700 mb-4 sm:mb-8 leading-tight drop-shadow-lg">
          Heal at Your Pace.
          <br />
          <span className="text-gray-700 font-normal text-xl sm:text-2xl md:text-3xl lg:text-5xl">You're Not Alone.</span>
        </h1>
        
        {/* Auth Buttons - Mobile: Below Header Text */}
        <div className="sm:hidden mt-4">
          <AuthButtons 
            isAuthenticated={authed}
            userEmail={userEmail}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main Content - Video and Chat */}
      <div className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-3 sm:px-6 pt-48 sm:pt-48 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-3 w-full max-w-6xl">
          {/* Video Section */}
          <div className="w-full lg:w-1/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md" style={{height: '480px', maxHeight: '60vh'}}>
              <VideoSection />
            </div>
          </div>

          {/* Chat Section */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-lg sm:max-w-xl lg:max-w-2xl" style={{height: '480px', maxHeight: '60vh'}}>
              <ChatSection 
                isAuthenticated={authed}
                onMembershipPrompt={handleMembershipPrompt}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-2 -right-2 z-10 text-white bg-gray-800/70 hover:bg-gray-700 rounded-full p-2 text-xl font-bold"
            >
              ×
            </button>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
              <AuthPanel onAuthed={() => {
                setShowAuthModal(false)
                setAuthed(true)
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Membership Prompt */}
      {showMembershipPrompt && (
        <MembershipPrompt
          onJoin={handleJoinCommunity}
          onDismiss={() => setShowMembershipPrompt(false)}
          onContinueAsGuest={() => setShowMembershipPrompt(false)}
        />
      )}

      {/* Customer Feedback Section - Bottom of Landing Page */}
      <div className="relative z-10 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border-t border-white/30">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">
            Help Us Improve Luma
          </h2>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
            Your opinions matter — please help us make Luma serve you better.
          </p>
          <button
            onClick={() => window.open('https://tally.so/r/3y5yNp', '_blank')}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Share Your Feedback
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
