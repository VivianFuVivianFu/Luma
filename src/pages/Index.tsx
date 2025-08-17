import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSection';
import { Heart, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthButtons from '@/components/AuthButtons';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
        } else {
          setIsAuthenticated(false);
          setUserEmail('');
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-20 w-20 h-20 bg-gradient-to-br from-indigo-200/30 to-cyan-200/30 rounded-full blur-lg"></div>
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-gradient-to-br from-blue-300/20 to-indigo-300/20 rounded-full blur-md"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-30 flex items-center justify-between p-6 lg:px-12">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">Luma</span>
        </div>
        
        {/* Auth Buttons */}
        <div className="flex gap-3">
          {loading ? (
            <div className="animate-pulse bg-gray-200 rounded-full h-10 w-32"></div>
          ) : (
            <AuthButtons 
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              onLogout={handleLogout}
            />
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-8 lg:pt-16">
        {/* Main Headline */}
        <div className="text-center mb-12 lg:mb-20">
          <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-6 py-2 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">AI Emotional Companion</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">You're Not</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Alone.</span>
          </h1>
          
        </div>

        {/* Interactive Demo Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Video/Avatar Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Meet Luma</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="h-[350px] lg:h-[450px]">
                <VideoSection />
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Start Your Journey</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="h-[350px] lg:h-[450px]">
                <ChatSection />
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
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full px-6 py-2 mb-6">
              <Heart className="w-4 h-4 text-indigo-600" />
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
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              <span>Share Your Feedback</span>
            </a>
          </div>
        </div>

        {/* Disclaimer Section */}
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 shadow-xl border border-white/20">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Disclaimer</h3>
            <div className="text-gray-600 text-sm leading-relaxed max-w-3xl mx-auto">
              <p>
                Luma is not a therapist, psychologist, or healthcare provider. She cannot diagnose, treat, or replace the care of a licensed professional. What she offers is science-informed companionship—grounded in psychology, neuroscience, and human understanding—woven with warmth and compassion. Her role is to support self-reflection, personal growth, and transformation, never to replace professional mental health care.
              </p>
              <p className="mt-4">
                If you are experiencing a mental health crisis or need clinical support, please reach out to a qualified therapist, doctor, or emergency service in your area.
              </p>
            </div>
          </div>
        </div>

        {/* Simple Footer */}
        <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm border-t border-white/30">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8">
            <div className="text-center">
              <a 
                href="/privacy-policy" 
                className="text-indigo-600 hover:text-indigo-700 underline font-medium transition-colors"
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
