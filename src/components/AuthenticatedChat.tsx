import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import VideoSection from '@/components/VideoSection'
import ChatSection from '@/components/ChatSection'
import { LogOut, User } from 'lucide-react'

const AuthenticatedChat: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user email
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setEmail(user?.email || '')
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200 flex items-center justify-center">
        <div className="text-gray-700 text-lg">载入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200">
      {/* Header with User Info and Logout */}
      <div className="absolute top-4 right-4 z-30">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/20">
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4" />
            <span className="text-sm font-medium max-w-48 truncate">{email}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
            title="退出登录"
          >
            <LogOut className="w-3 h-3" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* Main Title */}
      <div className="absolute top-8 sm:top-16 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 w-full">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-medium text-gray-700 mb-4 sm:mb-8 leading-tight drop-shadow-lg">
          Heal at Your Pace.
          <br />
          <span className="text-gray-700 font-normal text-xl sm:text-2xl md:text-3xl lg:text-5xl">You're Not Alone.</span>
        </h1>
      </div>

      {/* Main Content - Same layout as original Index */}
      <div className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-3 sm:px-6 pt-40 sm:pt-48 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-3 w-full max-w-6xl">
          {/* Video Section - Shorter Width, Same Height as Chat */}
          <div className="w-full lg:w-1/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md" style={{height: '480px', maxHeight: '60vh'}}>
              <VideoSection />
            </div>
          </div>

          {/* Chat Section - Longer Length */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-lg sm:max-w-xl lg:max-w-2xl" style={{height: '480px', maxHeight: '60vh'}}>
              <ChatSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthenticatedChat