import React, { useState } from 'react';
import { Play, Shield } from 'lucide-react';
import AuthModal from './AuthModal';
import ChatSection from './ChatSection';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [videoHasPlayed, setVideoHasPlayed] = useState(false);

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
      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-20">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight">
            Meet Luma — Your Empowering{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Companion
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
            Thoughtfully designed with empathy and psychology, Luma listens, supports, and helps you heal—walking beside you as a trusted friend on your journey of growth and transformation.
          </p>
        </div>

        {/* Video Section */}
        <div className="mb-12">
          <div className="relative max-w-xs mx-auto">
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Vertical aspect ratio (9:16 portrait format) */}
              <div className="aspect-[9/16] relative">
                <video
                  playsInline
                  controls
                  preload="metadata"
                  poster=""
                  className="w-full h-full object-fill rounded-2xl"
                  onEnded={() => setVideoHasPlayed(true)}
                  onError={(e) => console.error('Video failed to load:', e)}
                >
                  <source src="/Video.mp4" type="video/mp4" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-100 mb-4 mx-auto">
                        <Play className="w-6 h-6 text-blue-600 ml-1" />
                      </div>
                      <p className="text-gray-700 font-medium text-sm">Video not available</p>
                      <p className="text-xs text-gray-500 mt-2">Please check if Video.mp4 exists in the public folder</p>
                    </div>
                  </div>
                </video>
                
                
                {/* Replay button (only shows after video ends) */}
                {videoHasPlayed && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <button
                      onClick={() => {
                        const video = document.querySelector('video');
                        if (video) {
                          video.currentTime = 0;
                          video.play();
                          setVideoHasPlayed(false);
                        }
                      }}
                      className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-300 hover:scale-110"
                    >
                      <Play className="w-6 h-6 text-blue-600 ml-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Optional caption below video */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Watch Luma introduce herself and discover how she can support your journey
              </p>
            </div>
          </div>
        </div>

        {/* Try Luma Now Section */}
        <div className="mb-8 sm:mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              Try Luma Now
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto px-4">
              Experience Luma's supportive conversation instantly — no registration required.
            </p>
          </div>
          
          {/* Chat Interface for Anonymous Users */}
          <div className="max-w-2xl mx-auto px-4">
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-200" style={{height: '500px'}}>
              <ChatSection />
            </div>
          </div>
        </div>

        {/* Authentication Buttons */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm sm:text-base">
              Want to save your conversations and unlock more features?
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-sm sm:max-w-md mx-auto px-4">
            <button
              onClick={() => handleAuth('signup')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-sm sm:text-base"
            >
              Get Started Free
            </button>
            <button
              onClick={() => handleAuth('login')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-sm sm:text-base"
            >
              Sign In
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 px-4">
            No credit card required • Save conversations • Advanced features
          </p>
        </div>

        {/* Disclaimer Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-200">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Important Disclaimer</h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
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

        {/* Privacy Policy Bar */}
        <div className="mt-8 bg-blue-600 text-white shadow-lg rounded-2xl overflow-hidden">
          <button 
            onClick={() => window.open('/privacy-policy.html', '_blank')}
            className="w-full text-center hover:bg-blue-700 transition-colors px-6 py-4"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-semibold">🔒 Data Privacy & Safety Terms</span>
              <span className="text-sm opacity-90">- Click to view our comprehensive privacy policy</span>
            </div>
          </button>
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