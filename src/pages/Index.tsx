import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSection';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* Header Text */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 text-center">
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

      {/* Disclaimer Section */}
      <div className="relative z-10 bg-black bg-opacity-50 backdrop-blur-sm border-t border-white border-opacity-20 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-secondary bg-opacity-50 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Important Disclaimer</h3>
                <p className="text-gray-200 text-sm leading-relaxed">
                  This AI is for informational and supportive use only. It is not a substitute for professional 
                  mental health care. If you feel unsafe or in crisis, contact a qualified professional or a 
                  crisis helpline immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Privacy and Safety Notice */}
      <div className="relative z-10 bg-black bg-opacity-50 backdrop-blur-sm border-t border-white border-opacity-20 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Data Privacy & Safety</h2>
          
          <p className="text-gray-200 text-sm mb-6 leading-relaxed">
            We are committed to protecting your privacy and ensuring the security of your personal information. 
            Our data collection is limited to what is necessary for providing AI companion services, and we comply 
            with the New Zealand Privacy Act 2020 and Australian Privacy Act 1988.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              View Full Privacy Policy & Terms
            </button>
            <p className="text-gray-400 text-xs">
              Learn about your data rights, security measures, and contact information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
