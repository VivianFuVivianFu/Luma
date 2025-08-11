import VideoSection from '@/components/VideoSection';
import ChatSection from '../components/ChatSection';

const Index = () => {

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-300 via-purple-300 to-blue-200">
      {/* Header Text - Mobile Optimized */}
      <div className="absolute top-8 sm:top-16 left-1/2 transform -translate-x-1/2 z-20 text-center px-4 w-full">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-medium text-gray-700 mb-4 sm:mb-8 leading-tight drop-shadow-lg">
          Heal at Your Pace.
          <br />
          <span className="text-gray-700 font-normal text-xl sm:text-2xl md:text-3xl lg:text-5xl">You're Not Alone.</span>
        </h1>
      </div>

      {/* Main Content - Mobile First Layout with More Spacing */}
      <div className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-3 sm:px-6 pt-40 sm:pt-48 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-3 w-full max-w-6xl">
          {/* Video Section - Shorter Width, Same Height as Chat */}
          <div className="w-full lg:w-1/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md" style={{height: '480px', maxHeight: '60vh'}}>
              <VideoSection />
            </div>
          </div>

          {/* Chat Section - Longer Length */}
          <div className="w-full lg:w-2/3 flex flex-col">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl mx-auto w-full max-w-lg sm:max-w-xl lg:max-w-2xl" style={{height: '480px', maxHeight: '60vh'}}>
              <ChatSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
