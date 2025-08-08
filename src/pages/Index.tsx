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
    </div>
  );
};

export default Index;
