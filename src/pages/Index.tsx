import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSectionFixed';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* Header Text */}
      <div className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-20 text-center px-4">
        <h1 className="text-2xl sm:text-4xl font-bold text-white">You're Not Alone.</h1>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-start justify-center p-4 sm:p-8 lg:p-12 pt-20 sm:pt-32 lg:pt-48">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 w-full max-w-6xl">
          {/* Video Section */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">Meet Luma</h3>
            <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
              <VideoSection />
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">Talk to Luma</h3>
            <div className="h-[400px] sm:h-[450px] lg:h-[500px]">
              <ChatSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
