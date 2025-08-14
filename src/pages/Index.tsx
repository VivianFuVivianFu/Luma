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
      <div className="relative z-10 bg-red-900 bg-opacity-80 backdrop-blur-sm border-t border-red-500 border-opacity-30 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-800 bg-opacity-50 rounded-lg p-4 border border-red-500 border-opacity-40">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-200 mb-2">Important Disclaimer</h3>
                <p className="text-red-100 text-sm leading-relaxed">
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
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Data Privacy & Safety</h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-white">
            {/* Data Collection Notice */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-300">Information We Collect</h3>
              <div className="text-sm space-y-2 text-gray-200">
                <p>We collect only the information necessary to provide our AI companion services:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Chat conversations and interactions with Luma</li>
                  <li>Usage patterns to improve service quality</li>
                  <li>Technical data for system functionality</li>
                  <li>Account information when you register</li>
                </ul>
              </div>
            </div>

            {/* Privacy Rights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-300">Your Privacy Rights</h3>
              <div className="text-sm space-y-2 text-gray-200">
                <p>In compliance with NZ Privacy Act 2020 & AU Privacy Act 1988:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Access and correct your personal information</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of data collection where possible</li>
                  <li>Use our service anonymously when available</li>
                </ul>
              </div>
            </div>

            {/* Data Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-300">Data Security</h3>
              <div className="text-sm space-y-2 text-gray-200">
                <p>We protect your information through:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure storage with limited access</li>
                  <li>Regular security audits and updates</li>
                  <li>No sharing without explicit consent</li>
                </ul>
              </div>
            </div>

            {/* Contact & Compliance */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-300">Questions & Concerns</h3>
              <div className="text-sm space-y-2 text-gray-200">
                <p>For privacy inquiries or to exercise your rights:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email: privacy@luma.ai</li>
                  <li>Response time: Within 20 working days</li>
                  <li>Complaints: Contact NZ Privacy Commissioner or OAIC (AU)</li>
                  <li>Data retention: Minimum period required by law</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Legal Compliance Statement */}
          <div className="mt-8 pt-6 border-t border-white border-opacity-20">
            <p className="text-center text-sm text-gray-300">
              By using Luma, you acknowledge that we collect and process personal information in accordance with the 
              <span className="text-blue-300"> New Zealand Privacy Act 2020</span> and 
              <span className="text-blue-300"> Australian Privacy Act 1988</span>. 
              Collection is limited to what is reasonably necessary for our AI companion services.
            </p>
            <div className="flex justify-center space-x-6 mt-4">
              <button className="text-blue-300 hover:text-blue-200 text-sm underline">
                Full Privacy Policy
              </button>
              <button className="text-blue-300 hover:text-blue-200 text-sm underline">
                Terms of Service
              </button>
              <button className="text-blue-300 hover:text-blue-200 text-sm underline">
                Data Subject Rights
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
