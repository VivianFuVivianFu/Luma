import React, { useState, useRef, useEffect } from 'react';
import { Send, Heart, LogOut, MessageSquare, Maximize, Minimize, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { claudeAI } from '../lib/claudeAI';
import VoiceCallWidget from './VoiceCallWidget';
import CommunitySection from './CommunitySection';

interface DashboardProps {
  userEmail: string;
  onLogout: () => void | Promise<void>;
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
  const [isUserChatting, setIsUserChatting] = useState(false);
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced scroll within chat container only - no page scrolling
  const scrollToChatWindow = () => {
    // Only scroll within the chat messages container, never scroll the page
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  // Check if chat window is in focus
  const isChatWindowInFocus = () => {
    if (!chatContainerRef.current) return false;
    
    const rect = chatContainerRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const chatCenterY = rect.top + rect.height / 2;
    
    // Consider chat "in focus" if its center is in the top 70% of viewport
    return chatCenterY >= 0 && chatCenterY <= windowHeight * 0.7;
  };

  // Handle chat maximize/minimize functionality
  const handleChatMaximizeToggle = () => {
    setIsChatMaximized(!isChatMaximized);
  };

  // Prevent body scroll when chat is maximized or mobile chat is active
  useEffect(() => {
    const shouldPreventScroll = isChatMaximized || ((isUserChatting || shouldMaintainFocus) && isMobile);
    
    if (shouldPreventScroll) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isChatMaximized, isUserChatting, shouldMaintainFocus, isMobile]);

  // Enhanced message watching with chat window focus
  useEffect(() => {
    if (messages.length > 0) {
      // On mobile, ensure chat window is always visible when messages change
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile: scroll to chat window to keep it in view
        setTimeout(() => {
          scrollToChatWindow();
        }, 100);
      } else {
        // For desktop: just scroll messages to bottom
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    }
  }, [messages]);

  // Detect mobile device, initialize Claude AI, and scroll page to top when component loads
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initialize Claude AI system
    const initializeAI = async () => {
      try {
        console.log('[Dashboard] Initializing Claude AI system...');
        const success = await claudeAI.initialize();
        console.log(`[Dashboard] Claude AI initialization: ${success ? 'Success' : 'Failed'}`);
        
        // Log status for debugging
        const status = claudeAI.getStatus();
        console.log('[Dashboard] Claude AI status:', status);
      } catch (error) {
        console.error('[Dashboard] Failed to initialize Claude AI:', error);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    initializeAI();
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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

  // Handle window resize (for mobile keyboard show/hide)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Check if keyboard is likely open (viewport height reduced significantly)
        const isKeyboardOpen = window.innerHeight < window.screen.height * 0.75;
        
        if (isKeyboardOpen) {
          // Keyboard is open - ensure fixed input positioning is active
          if (chatContainerRef.current) {
            const inputContainer = chatContainerRef.current.querySelector('.input-container-dashboard');
            if (inputContainer && document.activeElement?.tagName === 'TEXTAREA') {
              inputContainer.classList.add('mobile-input-focused');
            }
          }
        } else {
          // Keyboard is closed - remove fixed positioning
          if (chatContainerRef.current) {
            const inputContainer = chatContainerRef.current.querySelector('.input-container-dashboard');
            if (inputContainer) {
              inputContainer.classList.remove('mobile-input-focused');
            }
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Monitor scroll to maintain chat focus when user is actively chatting
  useEffect(() => {
    const handleScroll = () => {
      if (isUserChatting || shouldMaintainFocus) {
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set timeout to check and maintain focus
        scrollTimeoutRef.current = setTimeout(() => {
          if (!isChatWindowInFocus() && (isUserChatting || shouldMaintainFocus)) {
            scrollToChatWindow();
          }
        }, 500);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isUserChatting, shouldMaintainFocus]);

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
    setIsUserChatting(true);
    setShouldMaintainFocus(true);

    // Ensure chat window is visible and scroll to show new message
    setTimeout(() => {
      scrollToChatWindow();
    }, 100);

    try {
      console.log('[Dashboard] Sending message to Claude AI:', inputMessage.trim());
      const response = await claudeAI.sendMessage(inputMessage.trim());
      console.log('[Dashboard] Received response:', response.substring(0, 100) + '...');

      setIsTyping(false);

      const lumaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'luma',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, lumaMessage]);

      // Ensure chat window stays visible and scroll to show AI response
      setTimeout(() => {
        scrollToChatWindow();
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

      // Ensure chat window stays visible and scroll to show error message
      setTimeout(() => {
        scrollToChatWindow();
      }, 100);
    } finally {
      setIsLoading(false);
      // Gradually release focus maintenance after conversation
      setTimeout(() => {
        setIsUserChatting(false);
        setTimeout(() => {
          setShouldMaintainFocus(false);
        }, 2000); // Keep focus for 2 more seconds after conversation ends
      }, 1000);
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
          />

          {/* Backdrop overlay for maximized chat or mobile chat */}
          {(isChatMaximized || ((isUserChatting || shouldMaintainFocus) && isMobile)) && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99]"
              onClick={() => {
                if (isChatMaximized) {
                  setIsChatMaximized(false);
                } else if (isMobile) {
                  setIsUserChatting(false);
                  setShouldMaintainFocus(false);
                }
              }}
              style={{ touchAction: 'none' }}
            />
          )}

          <div 
            ref={chatContainerRef} 
            className={`bg-white shadow-xl border transition-all duration-300 flex flex-col ${
              isChatMaximized
                ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none border-gray-200'
                : (isUserChatting || shouldMaintainFocus) && isMobile
                  ? 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] w-[95vw] h-[80vh] rounded-2xl border-blue-300 shadow-2xl ring-2 ring-blue-100'
                  : `rounded-2xl h-[500px] sm:h-[600px] ${
                      isUserChatting || shouldMaintainFocus 
                        ? 'border-blue-300 shadow-2xl ring-2 ring-blue-100' 
                        : 'border-gray-200'
                    }`
            }`}
            style={{
              minHeight: isChatMaximized ? '100vh' : 'auto',
              maxHeight: isChatMaximized ? '100vh' : '600px',
              ...(isChatMaximized && {
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                height: '100vh'
              })
            }}
          >
            {/* Chat Header */}
            <div className="p-3 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <img
                  src="/luma_photo.jpg"
                  alt="Luma"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-200"
                />
                <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
                  Chat with Luma
                  {isChatMaximized && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      • Full Screen
                    </span>
                  )}
                  <span className="ml-2 text-xs text-green-600 font-normal">v2.2</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Close button for mobile fixed chat */}
                {((isUserChatting || shouldMaintainFocus) && isMobile && !isChatMaximized) && (
                  <button
                    onClick={() => {
                      setIsUserChatting(false);
                      setShouldMaintainFocus(false);
                    }}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-105 text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100"
                    title="Close Chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleChatMaximizeToggle}
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    isChatMaximized
                      ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
                      : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                  }`}
                  title={isChatMaximized ? 'Exit Full Screen' : 'Enter Full Screen'}
                >
                  {isChatMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 chat-scrollbar">

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
            <div 
              className={`input-container-dashboard border-t border-gray-200 transition-all duration-300 ${
                isChatMaximized 
                  ? `flex-shrink-0 bg-white border-slate-200 shadow-lg ${isMobile ? 'p-4 pb-8 safe-area-inset-bottom' : 'p-4'}` 
                  : isMobile && (isUserChatting || shouldMaintainFocus)
                    ? 'flex-shrink-0 bg-white border-slate-200 p-3'
                    : 'p-3 sm:p-6 focus-within:fixed focus-within:bottom-0 focus-within:left-0 focus-within:right-0 focus-within:z-[10000] focus-within:bg-white focus-within:border-t focus-within:border-slate-200 focus-within:shadow-lg'
              }`}
              style={{
                ...(isChatMaximized && isMobile && {
                  paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 20px))',
                  minHeight: '80px'
                })
              }}
              onClick={() => {
                // Only scroll messages within chat container, never scroll the page
                setTimeout(() => {
                  scrollToBottom();
                }, 100);
              }}
            >
              <div className="flex space-x-2 sm:space-x-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    
                    // Activate chatting state when user starts typing
                    if (e.target.value.length > 0) {
                      setIsUserChatting(true);
                      setShouldMaintainFocus(true);
                      
                      // Keep screen focused on chat window while typing
                      setTimeout(() => {
                        if (!isChatWindowInFocus()) {
                          scrollToChatWindow();
                        }
                      }, 100);
                    } else {
                      // User cleared input, reduce focus priority
                      setTimeout(() => {
                        setIsUserChatting(false);
                        setTimeout(() => setShouldMaintainFocus(false), 1000);
                      }, 500);
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 bg-white placeholder-gray-500 text-xs sm:text-sm"
                  rows={1}
                  style={{ 
                    minHeight: '36px', 
                    fontSize: '16px',
                    ...(isChatMaximized && isMobile && { marginBottom: 'env(safe-area-inset-bottom)' })
                  }}
                  onFocus={(e) => {
                    // Set font size to 16px to prevent zoom on iOS
                    e.target.style.fontSize = '16px';
                    
                    setIsUserChatting(true);
                    setShouldMaintainFocus(true);
                    
                    // Scroll messages within chat container only
                    setTimeout(() => {
                      scrollToBottom();
                    }, 100);
                  }}
                  onBlur={(e) => {
                    // Reset font size for desktop
                    if (window.innerWidth > 640) {
                      e.target.style.fontSize = '';
                    }
                    
                    // Gradually release focus maintenance only if input is empty
                    if (!inputMessage.trim()) {
                      setTimeout(() => {
                        setIsUserChatting(false);
                        setTimeout(() => {
                          setShouldMaintainFocus(false);
                        }, 1000);
                      }, 500);
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
