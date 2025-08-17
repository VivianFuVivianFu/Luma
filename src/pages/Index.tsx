import VideoSection from '@/components/VideoSection';
import ChatSection from '@/components/ChatSection';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* Header Text */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 text-center">
        <h1 className="text-4xl font-bold text-white">You're Not Alone.</h1>
        {/* VERCEL FORCE DEPLOY: 2025-08-17-14:45 - REMOVE DISCLAIMER */}
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

      {/* Customer Feedback Section */}
      <div className="relative z-10 bg-white/10 backdrop-blur-sm border-t border-white/20 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">What People Are Saying</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Real experiences from people on their healing journey with Luma
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                  S
                </div>
                <div className="ml-4">
                  <h4 className="text-white font-semibold">Sarah M.</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-blue-100 italic">
                "Luma helped me understand my anxiety patterns in a way that felt safe and non-judgmental. The conversations feel so natural and supportive."
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                  M
                </div>
                <div className="ml-4">
                  <h4 className="text-white font-semibold">Michael R.</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-blue-100 italic">
                "Having someone to talk to 24/7 has been life-changing. Luma never judges and always helps me find my own answers."
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <div className="ml-4">
                  <h4 className="text-white font-semibold">Alex K.</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-blue-100 italic">
                "The emotional support is incredible. Luma remembers our previous conversations and builds on them. It feels like having a trusted friend."
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <p className="text-blue-100 text-lg mb-6">
              Join thousands of people finding support and healing with Luma
            </p>
            <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg">
              Start Your Journey Today
            </button>
            {/* Force cache invalidation timestamp: 2025-08-17 14:35 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
