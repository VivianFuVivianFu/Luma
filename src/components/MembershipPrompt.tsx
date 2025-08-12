import React from 'react'
import { Crown, Users, Heart, Sparkles, X } from 'lucide-react'

interface MembershipPromptProps {
  onJoin: () => void
  onDismiss: () => void
  onContinueAsGuest: () => void
}

const MembershipPrompt: React.FC<MembershipPromptProps> = ({ onJoin, onDismiss, onContinueAsGuest }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden">
        {/* Close button */}
        <button 
          onClick={onDismiss}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 p-8 text-center">
          <div className="bg-white/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">加入 Luma 社区</h2>
          <p className="text-white/90 text-sm">解锁更多心理健康支持功能</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">个性化聊天记录</h3>
                <p className="text-sm text-gray-600">保存你的对话历史，Luma 会更了解你</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-100 rounded-full p-2">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">社区支持</h3>
                <p className="text-sm text-gray-600">加入关爱社群，与他人分享和支持</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-pink-100 rounded-full p-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">高级功能</h3>
                <p className="text-sm text-gray-600">访问专业心理健康工具和资源</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onJoin}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-medium transition-all hover:scale-105 shadow-lg"
            >
              立即加入社区
            </button>
            
            <button
              onClick={onContinueAsGuest}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-all"
            >
              继续作为访客使用
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            免费注册，随时可以取消
          </p>
        </div>
      </div>
    </div>
  )
}

export default MembershipPrompt