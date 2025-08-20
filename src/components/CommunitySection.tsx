import React from 'react';
import { Users, Clock, Bell, ArrowRight } from 'lucide-react';

const CommunitySection: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Join Our Community</h3>
      </div>
      
      {/* Coming Soon Badge */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mb-4">
        <Clock className="w-3 h-3" />
        <span>Coming Soon</span>
      </div>

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Connect with others on their mental health journey. Share experiences, support each other, and grow together in a safe, moderated environment.
      </p>

      {/* Preview Features */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <Users className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-700">Peer support groups</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <Bell className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-700">Wellness challenges</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <ArrowRight className="w-3 h-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-700">Expert-led sessions</span>
        </div>
      </div>

      {/* Notify Button */}
      <button
        disabled
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-200 text-purple-700 rounded-lg font-medium cursor-not-allowed opacity-75"
      >
        <Bell className="w-4 h-4" />
        <span>Notify Me When Available</span>
      </button>

      {/* Beta Info */}
      <div className="mt-4 p-3 bg-white/60 rounded-lg border border-purple-200">
        <p className="text-xs text-purple-600 text-center">
          Be among the first to experience our community features when they launch in early 2025.
        </p>
      </div>
    </div>
  );
};

export default CommunitySection;