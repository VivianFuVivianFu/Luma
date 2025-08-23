import React, { useState } from 'react';
import { Users, ArrowRight, X } from 'lucide-react';
import CommunityHome from './community/CommunityHome';

const CommunitySection: React.FC = () => {
  const [showCommunityModal, setShowCommunityModal] = useState(false);

  const handleJoinCommunity = () => {
    setShowCommunityModal(true);
  };

  return (
    <>
      {/* Community Preview Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-purple-200">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Join Our Community</h3>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
          Connect with others on your wellness journey. Share experiences, support one another, and grow together in a safe, thriving environment.
        </p>

        {/* Preview Features */}
        <div className="space-y-2 sm:space-y-3 mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">Share your wellness stories</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">Get support from peers</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">Discover helpful resources</span>
          </div>
        </div>

        {/* Join Community Button */}
        <button
          onClick={handleJoinCommunity}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Users className="w-4 h-4" />
          <span>Explore Community</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Community Modal */}
      {showCommunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Luma Community</h2>
              <button
                onClick={() => setShowCommunityModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Community Content */}
            <div className="flex-1 overflow-hidden">
              <CommunityHome onClose={() => setShowCommunityModal(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommunitySection;