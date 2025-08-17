import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSection';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200">
      {/* Navigation Bar */}
      <div className="absolute top-0 right-0 p-6 z-30">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            Log In
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
          >
            Sign Up
          </Button>
        </div>
      </div>

      {/* Header Text - moved to 10vh (15vh - 5vh) */}
      <div className="absolute top-[10vh] left-1/2 transform -translate-x-1/2 z-20 text-center">
        <h1 className="text-4xl font-bold text-white">You're Not Alone.</h1>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-start justify-center p-12 pt-48">
        <div className="flex gap-8 w-full max-w-6xl">
          {/* Video Section */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Meet Luma</h3>
            <div className="h-[500px]">
              <VideoSection />
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Talk to Luma</h3>
            <div className="h-[500px]">
              <ChatSection />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback and Privacy Section */}
      <div className="relative z-10 bg-white/10 backdrop-blur-sm border-t border-white/20 py-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Feedback Section */}
          <div className="text-center mb-12">
            <p className="text-blue-100 text-lg mb-6">
              Your opinions matter, please help us make Luma serve you better
            </p>
            <div className="flex justify-center items-center">
              <a 
                href="https://tally.so/r/3y5yNp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 hover:bg-white/30 shadow-lg"
              >
                Share Your Feedback
              </a>
            </div>
          </div>

          {/* Disclaimer Section */}
          <div className="text-center border-t border-white/20 pt-8 mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Disclaimer</h3>
            <p className="text-blue-100 text-sm mb-6 max-w-4xl mx-auto leading-relaxed">
              Luma is not a therapist, psychologist, or healthcare provider. She cannot diagnose, treat, or replace the care of a licensed professional. What she offers is science-informed companionship—grounded in psychology, neuroscience, and human understanding—woven with warmth and compassion. Her role is to support self-reflection, personal growth, and transformation, never to replace professional mental health care.
            </p>
            <p className="text-blue-200 text-sm mb-6 max-w-3xl mx-auto font-medium">
              If you are experiencing a mental health crisis or need clinical support, please reach out to a qualified therapist, doctor, or emergency service in your area.
            </p>
          </div>

          {/* Privacy and Data Safety Section */}
          <div className="text-center border-t border-white/20 pt-8">
            <h3 className="text-xl font-semibold text-white mb-4">Privacy & Data Safety</h3>
            <p className="text-blue-100 text-sm mb-4 max-w-2xl mx-auto">
              Your privacy and data security are our top priorities. We implement industry-standard encryption and never share your personal conversations.
            </p>
            <a 
              href="/privacy-policy" 
              className="text-blue-300 hover:text-blue-200 underline text-sm transition-colors"
            >
              Data and privacy conditions and terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
