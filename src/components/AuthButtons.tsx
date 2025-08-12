import React, { useState } from 'react'
import { User, LogIn } from 'lucide-react'
import AuthPanel from './AuthPanel'

interface AuthButtonsProps {
  isAuthenticated: boolean
  userEmail?: string
  onLogout: () => void
}

const AuthButtons: React.FC<AuthButtonsProps> = ({ isAuthenticated, userEmail, onLogout }) => {
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/20">
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium max-w-48 truncate">{userEmail}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
          title="退出登录"
        >
          <span>退出</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 shadow-lg border border-white/20"
        >
          <LogIn className="w-4 h-4" />
          <span>登录</span>
        </button>
        
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 shadow-lg"
        >
          <User className="w-4 h-4" />
          <span>注册</span>
        </button>
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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
              <AuthPanel onAuthed={() => setShowAuthModal(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuthButtons