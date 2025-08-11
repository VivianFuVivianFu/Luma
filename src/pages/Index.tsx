import VideoSection from '@/components/VideoSection';
import ChatSection from '../components/ChatSection';

const Index = () => {

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200">
      {/* Header Text */}
      <div className="absolute top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-20 text-center px-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl text-gray-700 mb-2" style={{fontFamily: 'Delius Swash Caps, cursive', fontWeight: '400'}}>You're Not Alone</h1>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-8 py-32 sm:py-40">
        <div className="flex flex-col xl:flex-row items-center justify-center gap-4 w-full max-w-6xl">
          {/* Video Section */}
          <div className="flex flex-col space-y-6">
            <div className="rounded-3xl overflow-hidden shadow-2xl" style={{height: '400px', width: '65%', margin: '0 auto'}}>
              <VideoSection />
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex flex-col space-y-6">
            <div className="rounded-3xl overflow-hidden shadow-2xl" style={{height: '450px', width: '100%', margin: '0 auto'}}>
              <ChatSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
