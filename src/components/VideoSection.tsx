import { useState, useEffect } from 'react';

const VideoSection = () => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    // Preload the video
    setTimeout(() => setIsVideoLoaded(true), 1000);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative overflow-hidden rounded-2xl bg-slate-50/80 border border-blue-100">
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/90">
            <div className="animate-pulse">
              <div className="w-24 h-24 bg-blue-100/60 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-400 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        )}

        <video
          src="/Video.mp4"
          className={`w-full h-full object-contain transition-opacity duration-500 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          controls
          onLoadedData={() => setIsVideoLoaded(true)}
        />
      </div>
    </div>
  );
};

export default VideoSection;
