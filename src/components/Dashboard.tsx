import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Send, Heart, LogOut, MessageSquare, Maximize, Minimize, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import VoiceCallWidget from './VoiceCallWidget';
import CommunitySection from './CommunitySection';
import UserIdDisplay from './UserIdDisplay';
import EnhancedJournalingWidget from './EnhancedJournalingWidget';

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
  intent?: string;
  responseTime?: number;
  qualityScore?: number;
}

interface SystemStatus {
  cacheHitRate: number;
  avgResponseTime: number;
  memorySystemActive: boolean;
  engagementLevel: string;
  lastProcessingPipeline?: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ userEmail, onLogout, onBackToHome }) => {
  // Generate stable IDs for hydration consistency
  const componentId = useId();
  const messageIdPrefix = useRef(`msg-${componentId}`);
  const messageCounter = useRef(0);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(''); // Current authenticated user ID
  const [isMemoryLoaded, setIsMemoryLoaded] = useState(false);
  const [showJournaling, setShowJournaling] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cacheHitRate: 0,
    avgResponseTime: 0,
    memorySystemActive: false,
    engagementLevel: 'medium'
  });
  const [showSystemStats, setShowSystemStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // Consistent ID generator to prevent hydration mismatches
  const generateMessageId = useCallback(() => {
    messageCounter.current += 1;
    return `${messageIdPrefix.current}-${messageCounter.current}`;
  }, []);

  // 🔧 IMPROVED: Enhanced scroll function for better mobile UX
  const scrollToBottom = (force = false) => {
    // 🎯 FIX: More reliable scroll to bottom
    if (messagesEndRef.current) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: force ? 'auto' : 'smooth',
        block: 'end',
        inline: 'nearest'
      };
      
      // Use requestAnimationFrame for better performance on mobile
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView(scrollOptions);
      });
    }
  };


  // Handle chat maximize/minimize functionality
  const handleChatMaximizeToggle = () => {
    setIsChatMaximized(!isChatMaximized);
  };

  // Prevent body scroll when chat is maximized
  useEffect(() => {
    if (isChatMaximized) {
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
  }, [isChatMaximized]);

  // 🔧 IMPROVED: Better auto-scroll with immediate scroll for new conversations
  useEffect(() => {
    if (messages.length > 0) {
      // 🎯 FIX: Force immediate scroll for first message, smooth for subsequent
      const isFirstMessage = messages.length === 1;
      const delay = isFirstMessage ? 0 : 100;
      const forceScroll = isFirstMessage;
      
      setTimeout(() => {
        scrollToBottom(forceScroll);
      }, delay);
    }
  }, [messages]);

  // Initialize user session and load conversation history
  useEffect(() => {
    const initializeUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
          setIsMemoryLoaded(true);
          console.log('[Dashboard] User session initialized for user:', session.user.email);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to initialize user session:', error);
        setIsMemoryLoaded(true); // Allow chat to work without memory
      }
    };

    initializeUserSession();
  }, []);


  // Detect mobile device and scroll page to top when component loads
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Prevent viewport scaling and enable visual viewport on mobile when input is focused
  useEffect(() => {
    const handleInputFocus = () => {
      // Set viewport for better keyboard handling on mobile
      if (window.innerWidth <= 768) {
        document.querySelector('meta[name=viewport]')?.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-visual'
        );
      }
    };

    const handleInputBlur = () => {
      // Re-enable zoom when input loses focus
      if (window.innerWidth <= 768) {
        document.querySelector('meta[name=viewport]')?.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, viewport-fit=cover'
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

  // 🔧 IMPROVED: Simplified mobile keyboard handling
  useEffect(() => {
    let initialViewportHeight = window.innerHeight;
    
    const handleViewportChange = () => {
      if (!isMobile || !isChatMaximized) return;
      
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const keyboardOpen = currentHeight < initialViewportHeight * 0.75;
      setIsKeyboardOpen(keyboardOpen);
      
      if (chatContainerRef.current) {
        const chatContainer = chatContainerRef.current;
        
        if (keyboardOpen) {
          // 🎯 FIX: Use CSS env() for better keyboard handling
          chatContainer.style.height = `${currentHeight}px`;
          chatContainer.style.paddingBottom = 'env(keyboard-inset-height, 0px)';
        } else {
          chatContainer.style.height = '100vh';
          chatContainer.style.paddingBottom = '';
        }
      }
      
      // 🎯 FIX: Ensure input stays visible above keyboard
      if (inputContainerRef.current && isInputFocused && keyboardOpen) {
        const inputContainer = inputContainerRef.current;
        inputContainer.style.position = 'fixed';
        inputContainer.style.bottom = '0px';
        inputContainer.style.left = '0px';
        inputContainer.style.right = '0px';
        inputContainer.style.zIndex = '1000';
        inputContainer.style.backgroundColor = 'white';
        inputContainer.style.borderTop = '1px solid #e5e7eb';
        inputContainer.style.boxShadow = '0 -4px 12px rgba(0, 0, 0, 0.1)';
      } else if (inputContainerRef.current && !keyboardOpen) {
        // Reset input positioning when keyboard closes
        const inputContainer = inputContainerRef.current;
        inputContainer.style.position = '';
        inputContainer.style.bottom = '';
        inputContainer.style.left = '';
        inputContainer.style.right = '';
        inputContainer.style.zIndex = '';
        inputContainer.style.backgroundColor = '';
        inputContainer.style.borderTop = '';
        inputContainer.style.boxShadow = '';
      }
    };
    
    // Store initial height
    initialViewportHeight = window.innerHeight;
    
    // Listen to viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isMobile, isChatMaximized, isInputFocused]);


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessageContent = inputMessage.trim();
    const newMessage: Message = {
      id: generateMessageId(),
      content: userMessageContent,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);
    setIsLoading(true);

    // 🎯 FIX: Improved scroll timing for new messages
    setTimeout(() => {
      textareaRef.current?.focus();
      scrollToBottom(true); // Force immediate scroll for user messages
    }, 50);

    try {
      console.log('[Dashboard] Sending message to chat API...');
      const startTime = performance.now();
      
      // Use the API route instead of direct orchestrator call
      const apiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUserId && { 'Authorization': `Bearer ${currentUserId}` })
        },
        body: JSON.stringify({
          message: userMessageContent,
          history: messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          userId: currentUserId
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API request failed: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      const response = data.reply || data.response || 'I apologize, but I encountered an issue. Please try again.';
      const responseTime = performance.now() - startTime;
      console.log('[Dashboard] Received response:', response.substring(0, 100) + '...');

      setIsTyping(false);

      const lumaMessage: Message = {
        id: generateMessageId(),
        content: response,
        sender: 'luma',
        timestamp: new Date(),
        responseTime: responseTime
      };

      setMessages(prev => [...prev, lumaMessage]);

      // 🎯 FIX: Smooth scroll for AI responses
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom(); // Smooth scroll for AI responses
      }, 100); // Slightly longer delay for AI responses
      
      // Update system status after successful response
      setSystemStatus(prev => ({
        ...prev,
        avgResponseTime: responseTime,
        memorySystemActive: true,
        engagementLevel: 'high'
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);

      const errorMessage: Message = {
        id: generateMessageId(),
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'luma',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      // Keep input focused and scroll to show error message
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 50);
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

  const handleNewSession = async () => {
    try {
      setIsLoading(true);
      
      // Clear current messages to start fresh
      setMessages([]);
      
      console.log('[Dashboard] Started new conversation session');
    } catch (error) {
      console.error('[Dashboard] Error starting new session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 🔧 MOBILE FIX: Add CSS for better keyboard handling */}
      <style>{`
        /* Mobile keyboard handling improvements */
        @media (max-width: 768px) {
          .input-container-dashboard {
            /* Use CSS environment variables for keyboard handling */
            padding-bottom: max(1rem, env(safe-area-inset-bottom), env(keyboard-inset-height, 0px)) !important;
          }
          
          /* Improve chat scrolling on mobile */
          .chat-scrollbar {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
          
          /* Ensure proper viewport sizing */
          .mobile-chat-container {
            height: 100vh;
            height: 100dvh; /* Dynamic viewport height for modern browsers */
          }
          
          /* Fix for iOS Safari keyboard */
          @supports (-webkit-appearance: none) {
            .mobile-chat-container {
              height: -webkit-fill-available;
            }
          }
        }
        
        /* Smooth scrolling for all scroll containers */
        .chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
        }
      `}</style>
      
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
                <source src="/Video.mp4" type="video/mp4" />
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
              onClick={handleNewSession}
              disabled={isLoading}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-green-600 hover:text-green-800 transition-colors font-medium text-xs sm:text-sm disabled:opacity-50"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-8 sm:pb-12 grid lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Main Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Voice Chat Widget */}
          <VoiceCallWidget
            agentId={import.meta.env.VITE_ELEVENLABS_AGENT_ID}
          />

          {/* Backdrop overlay for maximized chat */}
          {isChatMaximized && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99]"
              onClick={() => setIsChatMaximized(false)}
              style={{ touchAction: 'none' }}
            />
          )}

          <div 
            ref={chatContainerRef} 
            className={`bg-white shadow-xl border transition-all duration-300 flex flex-col ${
              isChatMaximized
                ? `fixed inset-0 z-[9999] w-screen rounded-none border-gray-200 ${isMobile ? 'mobile-chat-container' : ''}`
                : 'rounded-2xl h-[500px] sm:h-[600px] border-gray-200'
            }`}
            style={{
              ...(isChatMaximized && {
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                height: '100vh',
                maxHeight: '100vh'
              }),
              ...(!isChatMaximized && {
                minHeight: 'auto',
                maxHeight: '600px'
              })
            }}
          >
            {/* Chat Header */}
            <div 
              className="chat-header p-3 sm:p-6 border-b border-gray-200 flex items-center justify-between"
              style={{
                ...(isChatMaximized && {
                  position: 'fixed',
                  top: '0px',
                  left: '0px',
                  right: '0px',
                  zIndex: 1001,
                  backgroundColor: 'white',
                  borderBottom: '1px solid #e5e7eb'
                })
              }}
            >
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
                  {isMemoryLoaded && (
                    <span className="ml-2 text-xs text-purple-600 font-normal">
                      • Memory Active
                    </span>
                  )}
                  <span className="ml-2 text-xs text-green-600 font-normal">v2.3</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSystemStats(!showSystemStats)}
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    showSystemStats
                      ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100'
                      : 'text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100'
                  }`}
                  title="System Statistics"
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                    <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setShowJournaling(!showJournaling)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2 ${
                    showJournaling
                      ? 'text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100'
                      : 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                  title="AI Journal - Self-Authoring Guide"
                >
                  <BookOpen className="w-6 h-6" />
                  <span className="font-medium text-sm">Journal</span>
                </button>
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

            {/* System Statistics Panel */}
            {showSystemStats && (
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="text-center">
                    <div className="text-gray-500 mb-1">Cache Hit Rate</div>
                    <div className="font-semibold text-green-600">
                      {(systemStatus.cacheHitRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-1">Avg Response</div>
                    <div className="font-semibold text-blue-600">
                      {systemStatus.avgResponseTime.toFixed(0)}ms
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-1">Memory System</div>
                    <div className={`font-semibold ${
                      systemStatus.memorySystemActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemStatus.memorySystemActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 mb-1">Engagement</div>
                    <div className="font-semibold text-purple-600 capitalize">
                      {systemStatus.engagementLevel}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🔧 IMPROVED: Messages Area with better mobile handling */}
            <div 
              className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 chat-scrollbar"
              style={{
                // 🎯 SIMPLIFIED: Better mobile viewport handling
                minHeight: '0',
                flex: '1 1 auto',
                paddingBottom: isChatMaximized && isMobile ? '20px' : '0px',
                // Add extra bottom padding when keyboard might be open
                marginBottom: isKeyboardOpen && isMobile ? 'env(keyboard-inset-height, 0px)' : '0px',
              }}
            >

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

            {/* 🔧 IMPROVED: Mobile-optimized Input Area */}
            <div 
              ref={inputContainerRef}
              className={`input-container-dashboard border-t border-gray-200 bg-white ${
                isChatMaximized 
                  ? `flex-shrink-0 shadow-lg ${isMobile ? 'p-3' : 'p-4'}` 
                  : 'p-3 sm:p-6'
              }`}
              style={{
                // 🎯 SIMPLIFIED: Better mobile input positioning
                position: isChatMaximized && isMobile ? 'sticky' : 'static',
                bottom: isChatMaximized && isMobile ? 0 : 'auto',
                zIndex: isChatMaximized && isMobile ? 1000 : 'auto',
                paddingBottom: isChatMaximized && isMobile ? 'max(1rem, env(safe-area-inset-bottom))' : undefined,
                minHeight: isChatMaximized && isMobile ? '70px' : 'auto',
                // Add safe area support for modern mobile devices
                paddingLeft: isMobile ? 'max(1rem, env(safe-area-inset-left))' : undefined,
                paddingRight: isMobile ? 'max(1rem, env(safe-area-inset-right))' : undefined,
              }}
              onClick={() => {
                // 🎯 FIX: Scroll to bottom when input area is clicked
                if (isMobile) {
                  setTimeout(() => {
                    scrollToBottom();
                  }, 50);
                }
              }}
            >
              <div className="flex space-x-2 sm:space-x-3">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    
                    // Maximize chat when user starts typing (only if not already maximized)
                    if (e.target.value.length > 0 && !isChatMaximized) {
                      setIsChatMaximized(true);
                      // Wait for layout to stabilize before scrolling
                      setTimeout(() => {
                        scrollToBottom();
                      }, 150);
                    } else if (e.target.value.length > 0) {
                      // Already maximized, gentle scroll
                      setTimeout(() => {
                        scrollToBottom();
                      }, 50);
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 bg-white placeholder-gray-500 text-xs sm:text-sm"
                  rows={1}
                  style={{ 
                    minHeight: isChatMaximized && isMobile ? '44px' : '36px', 
                    fontSize: '16px',
                    maxHeight: isChatMaximized && isMobile ? '120px' : 'none'
                  }}
                  onFocus={(e) => {
                    // 🎯 FIX: Prevent iOS zoom and set focus state
                    e.target.style.fontSize = '16px';
                    setIsInputFocused(true);
                    
                    // 🎯 FIX: Maximize chat and scroll for better mobile UX
                    if (!isChatMaximized) {
                      setIsChatMaximized(true);
                      // Wait for layout changes, then scroll to bottom
                      setTimeout(() => {
                        scrollToBottom(true); // Force immediate scroll
                        e.target.focus();
                      }, 150);
                    } else {
                      // Already maximized, gentle scroll after a short delay
                      setTimeout(() => {
                        scrollToBottom();
                      }, 100);
                    }
                  }}
                  onBlur={(e) => {
                    // Reset font size for desktop
                    if (window.innerWidth > 640) {
                      e.target.style.fontSize = '';
                    }
                    
                    // Only clear input focused state if not actively sending message
                    // Add a small delay to prevent flash during send button interactions
                    setTimeout(() => {
                      if (document.activeElement !== e.target) {
                        setIsInputFocused(false);
                      }
                    }, 100);
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  onMouseDown={(e) => {
                    // Prevent button from taking focus away from textarea
                    e.preventDefault();
                  }}
                  onTouchStart={(e) => {
                    // Prevent button from taking focus on mobile touch
                    e.preventDefault();
                  }}
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
        <div className="space-y-4 sm:space-y-6 mt-4 lg:mt-0 pb-16 sm:pb-8 lg:pb-0">
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

      {/* User ID Display - Fixed position overlay */}
      <UserIdDisplay />
      
      {/* Enhanced Journaling Widget - Controlled by header button */}
      {showJournaling && <EnhancedJournalingWidget onClose={() => setShowJournaling(false)} />}
      </div>
    </>
  );
};

export default Dashboard;
