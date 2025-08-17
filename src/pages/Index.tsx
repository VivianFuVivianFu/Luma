import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSection';
import { Button } from '@/components/ui/button';
import { Heart, Shield, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-rose-200/30 to-pink-200/30 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-20 w-20 h-20 bg-gradient-to-br from-purple-200/30 to-rose-200/30 rounded-full blur-lg"></div>
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-gradient-to-br from-pink-300/20 to-purple-300/20 rounded-full blur-md"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-30 flex items-center justify-between p-6 lg:px-12">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-purple-500 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">Luma</span>
        </div>
        
        {/* Auth Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            className="text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-full px-6"
          >
            Log In
          </Button>
          <Button 
            className="bg-gradient-to-r from-rose-400 to-purple-500 hover:from-rose-500 hover:to-purple-600 text-white rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Sign Up
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-8 lg:pt-16">
        {/* Main Headline */}
        <div className="text-center mb-12 lg:mb-20">
          <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-6 py-2 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">AI Emotional Companion</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">You're Not</span>
            <br />
            <span className="bg-gradient-to-r from-rose-400 to-purple-500 bg-clip-text text-transparent">Alone.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Meet Luma, your compassionate AI companion designed with empathy, psychology, and neuroscience. 
            <span className="text-purple-600 font-medium"> A safe space for healing, growth, and transformation.</span>
          </p>
        </div>

        {/* Interactive Demo Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Video/Avatar Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Meet Luma</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20">
              <div className="h-[350px] lg:h-[450px] rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-purple-100">
                <VideoSection />
              </div>
              
              {/* Features */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-700">Safe Space</span>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-700">Empathetic</span>
                </div>
                <div className="text-center p-3 bg-white/50 rounded-xl">
                  <Sparkles className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-700">Always Here</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-rose-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Start Your Journey</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="h-[350px] lg:h-[450px]">
                <ChatSection />
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Private & Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>24/7 Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                <span>Science-Based</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Footer Section */}
      <div className="relative z-10 mt-20 lg:mt-32">
        {/* Feedback Section */}
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-xl border border-white/20">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-rose-100 to-purple-100 rounded-full px-6 py-2 mb-6">
              <Heart className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Help Us Improve</span>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4">
              Your Voice Matters
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Help us make Luma even better at supporting you on your healing journey
            </p>
            
            <a 
              href="https://tally.so/r/3y5yNp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-rose-400 to-purple-500 hover:from-rose-500 hover:to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              <span>Share Your Feedback</span>
            </a>
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm border-t border-white/30">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
            {/* Disclaimer */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-amber-100 rounded-full px-4 py-2 mb-6">
                <Shield className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Important Information</span>
              </div>
              
              <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-6">Professional Support Disclaimer</h3>
              
              <div className="bg-white/80 rounded-2xl p-6 lg:p-8 shadow-lg border border-white/30 text-left max-w-4xl mx-auto">
                <p className="text-gray-700 leading-relaxed mb-4">
                  <span className="font-semibold text-gray-800">Luma is not a therapist, psychologist, or healthcare provider.</span> She cannot diagnose, treat, or replace the care of a licensed professional. What she offers is science-informed companionship—grounded in psychology, neuroscience, and human understanding—woven with warmth and compassion.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Her role is to support self-reflection, personal growth, and transformation, never to replace professional mental health care.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-800 font-medium">
                    <strong>Crisis Support:</strong> If you are experiencing a mental health crisis or need clinical support, please reach out to a qualified therapist, doctor, or emergency service in your area immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg border border-white/30">
                <Shield className="w-8 h-8 text-purple-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Privacy First</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Your conversations are encrypted and never shared. We prioritize your privacy above all else.
                </p>
              </div>
              
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg border border-white/30">
                <Heart className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Safe Space</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Judgment-free environment designed for healing, growth, and authentic self-expression.
                </p>
              </div>
              
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg border border-white/30">
                <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Science-Based</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Grounded in psychology, neuroscience, and evidence-based therapeutic approaches.
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="text-center mt-12 pt-8 border-t border-white/30">
              <a 
                href="/privacy-policy" 
                className="text-purple-600 hover:text-purple-700 underline font-medium transition-colors"
              >
                Data and Privacy Conditions & Terms
              </a>
              <p className="text-gray-500 text-sm mt-4">
                © 2024 Luma. Your compassionate AI companion for emotional support and growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
