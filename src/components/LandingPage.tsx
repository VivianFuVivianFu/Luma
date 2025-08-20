import React, { useState } from 'react';
import { Play, Shield } from 'lucide-react';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="relative z-30 flex items-center justify-between p-6 lg:px-12">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
            Luma
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 pt-12 pb-20">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-800 mb-6 leading-tight">
            Meet Luma — Your Empowering{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Companion
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Thoughtfully designed with empathy and psychology, Luma listens, supports, and helps you heal—walking beside you as a trusted friend on your journey of growth and transformation.
          </p>
        </div>

        {/* Video Section */}
        <div className="mb-12">
          <div className="relative max-w-3xl mx-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              {!isVideoPlaying ? (
                <div 
                  className="relative aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center cursor-pointer group"
                  onClick={() => setIsVideoPlaying(true)}
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
                  <div className="absolute inset-0">
                    <div className="absolute top-8 left-8 w-24 h-24 bg-blue-200/30 rounded-full blur-xl"></div>
                    <div className="absolute bottom-12 right-12 w-32 h-32 bg-indigo-200/30 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-cyan-200/30 rounded-full blur-lg"></div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border-4 border-blue-100">
                      <Play className="w-8 h-8 text-blue-600 ml-1" />
                    </div>
                    <p className="text-gray-700 font-medium mt-4">Watch Luma Introduction</p>
                    <p className="text-sm text-gray-500 mt-2">Discover how Luma can support your journey</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video relative">
                  {/* Actual video implementation */}
                  <iframe
                    className="w-full h-full rounded-2xl"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                    title="Luma AI Companion Introduction"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  {/* Close video button */}
                  <button
                    onClick={() => setIsVideoPlaying(false)}
                    className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Authentication Buttons */}
        <div className="text-center mb-16">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <button
              onClick={() => handleAuth('signup')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Get Started Free
            </button>
            <button
              onClick={() => handleAuth('login')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Sign In
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Voice & text chat
          </p>
        </div>

        {/* Disclaimer Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Important Disclaimer</h3>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  <strong>Luma is an AI companion designed for emotional support and conversation.</strong> 
                  While our advanced AI can provide helpful insights and a listening ear, please remember:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Luma is not a substitute for professional medical, psychiatric, or psychological care</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>If you're experiencing a mental health crisis, please contact emergency services or a crisis hotline immediately</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>For serious mental health concerns, please consult with qualified healthcare professionals</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                    <span>All conversations are securely stored with bank-level encryption and strict privacy controls</span>
                  </li>
                </ul>
                <p className="pt-2">
                  By using Luma, you acknowledge that this is an AI-powered support tool intended for 
                  emotional companionship and general wellness conversations.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={onAuthSuccess}
        />
      )}
    </div>
  );
};

export default LandingPage;