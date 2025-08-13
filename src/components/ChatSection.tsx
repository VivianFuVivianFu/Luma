import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Send, Phone, Maximize2, Minimize2 } from 'lucide-react';
import { lumaAI } from '../lib/lumaAI';
import VoiceCallWidget from './VoiceCallWidget';

type Sender = 'user' | 'luma';
type Message = { id: string; content: string; sender: Sender; timestamp: Date };

type ChatSectionProps = {
  isAuthenticated?: boolean;
  onMembershipPrompt?: () => void;
};

function ChatSection({ isAuthenticated = false, onMembershipPrompt }: ChatSectionProps = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      content:
        "Hi, I'm Luma your AI emotional companion, thoughtfully designed with empathy, psychology, and neuroscience. I'm here to support your journey of reflection, healing, and transformation. Wherever you are on your journey, let's take the next step together.",
      sender: 'luma',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownMembershipPrompt, setHasShownMembershipPrompt] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check for membership prompt after 2 minutes of chatting
  useEffect(() => {
    if (!isAuthenticated && !hasShownMembershipPrompt && onMembershipPrompt) {
      const timer = setTimeout(() => {
        // Only show if user has sent at least one message
        const userMessages = messages.filter(m => m.sender === 'user');
        if (userMessages.length > 0) {
          setHasShownMembershipPrompt(true);
          onMembershipPrompt();
        }
      }, 2 * 60 * 1000); // 2 minutes

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasShownMembershipPrompt, onMembershipPrompt, messages]);

  const addMessage = (content: string, sender: Sender) => {
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [...prev, { id, content, sender, timestamp: new Date() }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    addMessage(text, 'user');
    setInput('');
    setIsLoading(true);

    try {
      // Use LumaAI to get natural conversation responses
      const response = await lumaAI.sendMessage(text);
      addMessage(response, 'luma');
    } catch (error) {
      console.error('Error getting response from Luma:', error);
      // Fallback response if API fails
      addMessage('I apologize, but I\'m having trouble connecting right now. Please try again in a moment.', 'luma');
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && canSend) sendMessage();
  };

  const startVoiceCall = () => {
    setShowVoiceChat(true);
  };

  return (
    <div className={`relative flex flex-col bg-white/95 backdrop-blur-sm text-gray-800 border border-white/20 overflow-hidden shadow-lg ${isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-full rounded-2xl'}`}>
      {/* Header - Fixed - Reduced Height */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200/50 bg-gradient-to-r from-blue-50/80 to-purple-50/80 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/luma_photo.jpg" 
            alt="Luma" 
            className="w-10 h-10 rounded-full object-cover shadow-md"
          />
          <h3 className="text-base font-semibold text-gray-700" style={{fontFamily: 'Gowun Dodum, sans-serif'}}>Chat with Luma</h3>
        </div>
        <button
          type="button"
          onClick={handleFullscreenToggle}
          className="inline-flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 transition-all duration-200 hover:scale-105"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start items-end'}`}>
            {m.sender === 'luma' && (
              <img 
                src="/luma_photo.jpg" 
                alt="Luma" 
                className="w-8 h-8 rounded-full object-cover shadow-sm mr-3 mb-1 flex-shrink-0"
              />
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start items-end">
            <img 
              src="/luma_photo.jpg" 
              alt="Luma" 
              className="w-8 h-8 rounded-full object-cover shadow-sm mr-3 mb-1 flex-shrink-0"
            />
            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-600 border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span>Luma is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="p-3 sm:p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-blue-50/80">
        <div className="flex items-center gap-2 sm:gap-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Share what's on your mind..."
            className="flex-1 bg-white border border-gray-300 rounded-full px-4 sm:px-6 py-2 sm:py-3 text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent shadow-sm placeholder-gray-500 text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSend}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 sm:p-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-200 hover:scale-105 flex-shrink-0"
            title="Send message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={startVoiceCall}
            className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md transition-all duration-200 hover:scale-105 p-2 sm:p-3 flex-shrink-0"
            title="Start voice call"
          >
            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs font-medium hidden sm:inline" style={{fontFamily: 'Gowun Dodum, sans-serif'}}>Voice</span>
            <span className="text-xs font-medium sm:hidden">📞</span>
          </button>
        </div>
      </div>

      {/* Customer Feedback Section */}
      <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            Your opinions matter — please help us make Luma serve you better.
          </p>
          <button
            onClick={() => window.open('https://tally.so/r/3y5yNp', '_blank')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Share Feedback
          </button>
        </div>
      </div>

      {/* Voice Chat Modal */}
      {showVoiceChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="relative">
            <button 
              onClick={() => setShowVoiceChat(false)}
              className="absolute -top-2 -right-2 z-10 text-white bg-gray-800/70 hover:bg-gray-700 rounded-full p-2 text-xl font-bold"
            >
              ×
            </button>
            <VoiceCallWidget agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_6901k1fgqzszfq89cxndsfs69z7m'} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatSection;
