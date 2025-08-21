import React, { useState, useRef, useEffect } from 'react';
import { Send, Heart, LogOut, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { claudeAI } from '../lib/claudeAI';
import VoiceCallWidget from './VoiceCallWidget';
import CommunitySection from './CommunitySection';

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
  onBackToHome: () => void;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'luma';
  timestamp: Date;
}

const Dashboard: React.FC<DashboardProps> = ({ userEmail, onLogout, onBackToHome }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prevent viewport scaling on mobile when input is focused
  useEffect(() => {
    const handleInputFocus = () => {
      // Prevent zoom on mobile when focusing input
      if (window.innerWidth <= 768) {
        document.querySelector('meta[name=viewport]')?.setAttribute(
          'content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
    };

    const handleInputBlur = () => {
      // Re-enable zoom when input loses focus
      if (window.innerWidth <= 768) {
        document.querySelector('meta[name=viewport]')?.setAttribute(
          'content', 
          'width=device-width, initial-scale=1.0'
        );
      }
    };

    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.addEventListener('focus', handleInputFocus);
      textarea.addEventListener('blur', handleInputBlur);
    });

    return () => {
      textareas.forEach(textarea => {
        textarea.removeEventListener('focus', handleInputFocus);
        textarea.removeEventListener('blur', handleInputBlur);
      });
    };
  }, []);

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

    // Force scroll to bottom after sending message
    setTimeout(() => {
      scrollToBottom();
    }, 100);

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
      
      // Force scroll to bottom after AI response
      setTimeout(() => {
        scrollToBottom();
      }, 100);
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
      
      // Force scroll to bottom after error message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden relative">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/Photho background.mp4" type="video/mp4" />
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </video>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/icons/Logo.png" 
                alt="Logo"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover"
              />
              <p className="text-base sm:text-xl font-bold text-gray-800">You're not Alone</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 hidden md:inline">
              Welcome, {userEmail.split('@')[0]}
            </span>
            <button
              onClick={onBackToHome}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors font-medium text-xs sm:text-sm"
            >
              <span>Home</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 grid lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Main Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Voice Chat Widget */}
          <VoiceCallWidget 
            agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}
            onClose={() => {}} 
          />
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[500px] sm:h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-3 sm:p-6 border-b border-gray-200 flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/luma_photo.jpg" 
                alt="Luma"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-200"
              />
              <h2 className="font-semibold text-gray-800 text-sm sm:text-base">Chat with Luma</h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'luma' && (
                    <img 
                      src="/luma_photo.jpg" 
                      alt="Luma"
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-200 mr-2 mt-1 flex-shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className={`text-xs sm:text-sm leading-relaxed ${
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
            <div className="p-3 sm:p-6 border-t border-gray-200">
              <div className="flex space-x-2 sm:space-x-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 bg-white placeholder-gray-500 text-xs sm:text-sm"
                  rows={1}
                  style={{ minHeight: '36px', fontSize: '16px' }}
                  onFocus={(e) => {
                    // Set font size to 16px to prevent zoom on iOS
                    e.target.style.fontSize = '16px';
                    // Scroll to bottom when input is focused on mobile
                    if (window.innerWidth <= 768) {
                      setTimeout(() => {
                        scrollToBottom();
                      }, 300);
                    }
                  }}
                  onBlur={(e) => {
                    // Reset font size for desktop
                    if (window.innerWidth > 640) {
                      e.target.style.fontSize = '';
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6 mt-4 lg:mt-0">
          {/* Customer Feedback Section */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-purple-200">
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
              How has your experience been so far? We value your opinion and would love your help in making Luma even better.
            </p>

            {/* Feedback Button */}
            <button
              onClick={() => window.open('https://tally.so/r/3y5yNp', '_blank')}
              className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Customer Feedback</span>
            </button>
          </div>

          {/* Community Section */}
          <CommunitySection />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;