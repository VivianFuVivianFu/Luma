import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, Heart, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { claudeAI } from '../lib/claudeAI';
import VoiceCallWidget from './VoiceCallWidget';
import FeedbackSection from './FeedbackSection';
import CommunitySection from './CommunitySection';

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'luma';
  timestamp: Date;
}

const Dashboard: React.FC<DashboardProps> = ({ userEmail, onLogout }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);
    setIsLoading(true);

    try {
      const response = await claudeAI.sendMessage(inputMessage.trim());
      
      setIsTyping(false);
      
      const lumaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'luma',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, lumaMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'luma',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Luma</h1>
              <p className="text-sm text-gray-600">Your AI Companion</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              Welcome, {userEmail.split('@')[0]}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Privacy Policy Bar */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button 
            onClick={() => window.open('/privacy-policy', '_blank')}
            className="w-full text-center hover:bg-blue-700 transition-colors rounded-lg px-4 py-2"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-semibold">🔒 Data Privacy & Safety Terms</span>
              <span className="text-sm opacity-90">- Click to view our comprehensive privacy policy</span>
            </div>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src="/luma_photo.jpg" 
                  alt="Luma"
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-200"
                />
                <div>
                  <h2 className="font-semibold text-gray-800">Chat with Luma</h2>
                </div>
              </div>
              
              <button
                onClick={() => setShowVoiceCall(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Phone className="w-5 h-5" />
                <span>Call Luma Now</span>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'luma' && (
                    <img 
                      src="/luma_photo.jpg" 
                      alt="Luma"
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-2 mt-1 flex-shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className={`text-sm leading-relaxed ${
                      message.sender === 'user' ? 'text-white' : 'text-gray-700'
                    }`}>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <img 
                    src="/luma_photo.jpg" 
                    alt="Luma"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-2 mt-1 flex-shrink-0"
                  />
                  <div className="max-w-xs px-4 py-3 bg-gray-100 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 bg-white placeholder-gray-500"
                  rows={1}
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Feedback Link */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <h3 className="font-semibold text-gray-800 mb-2">Share Your Feedback</h3>
              <p className="text-sm text-gray-600 mb-4">Help us improve your experience with Luma</p>
              <button
                onClick={() => setFeedbackForm(!feedbackForm)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Give Feedback
              </button>
            </div>
          </div>

          {/* Feedback Form */}
          {feedbackForm && <FeedbackSection />}

          {/* Community Section */}
          <CommunitySection />
        </div>
      </div>

      {/* Voice Call Widget */}
      {showVoiceCall && (
        <VoiceCallWidget onClose={() => setShowVoiceCall(false)} />
      )}
    </div>
  );
};

export default Dashboard;