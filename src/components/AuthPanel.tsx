import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthPanelProps {
  onAuthed: (session: any) => void
}

const AuthPanel: React.FC<AuthPanelProps> = ({ onAuthed }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg('注册成功，请登录。')
        setMode('login')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuthed(data.session)
      }
    } catch (err: any) {
      setMsg(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function loginWithMagicLink() {
    setLoading(true)
    setMsg('')
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setMsg('魔法链接已发送到邮箱，请查收。')
    } catch (err: any) {
      setMsg(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200 flex items-center justify-center">
      {/* Header Text */}
      <div className="absolute top-8 sm:top-16 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 w-full">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-medium text-gray-700 mb-4 sm:mb-8 leading-tight drop-shadow-lg">
          Heal at Your Pace.
          <br />
          <span className="text-gray-700 font-normal text-xl sm:text-2xl md:text-3xl lg:text-5xl">You're Not Alone.</span>
        </h1>
      </div>

      {/* Auth Form */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            {mode === 'signup' ? '注册' : '登录'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {loading ? '请稍候...' : (mode === 'signup' ? '注册' : '登录')}
            </button>
          </form>

          <div className="mt-4">
            <button
              onClick={loginWithMagicLink}
              disabled={!email || loading}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              用邮箱魔法链接登录
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'signup' ? '已有账号？' : '还没有账号？'}{' '}
            <button
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {mode === 'signup' ? '去登录' : '去注册'}
            </button>
          </div>

          {msg && (
            <div className={`mt-4 text-sm text-center p-3 rounded-lg ${
              msg.includes('成功') || msg.includes('发送') 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPanel