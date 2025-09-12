import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Send, Heart, LogOut, MessageSquare, Maximize, Minimize, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import VoiceCallWidget from './VoiceCallWidget';
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
  lastProcessingPipeline?: unknown[];
}

// Memoized message component for performance
const MessageBubble = React.memo<{
  message: Message;
}>(({ message }) => (
  <div
    role="listitem"
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
      {/* Visually hidden speaker label for screen readers */}
      <span className="sr-only">
        {message.sender === 'user' ? 'You:' : 'Luma:'}
      </span>
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
));

MessageBubble.displayName = 'MessageBubble';

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
  const [greetingAdded, setGreetingAdded] = useState(false);
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

  // Fallback response function for when API is not available
  const getFallbackResponse = useCallback((userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check for greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hi! I'm here to support you. How are you feeling today?";
    }
    
    // Check for emotional content
    if (message.includes('sad') || message.includes('upset') || message.includes('hurt')) {
      return "I hear that you're going through something difficult. Your feelings are valid, and I'm here to listen.";
    }
    
    // Check for anxiety/worry
    if (message.includes('anxious') || message.includes('worried') || message.includes('stress')) {
      return "I can sense you're feeling anxious. That's completely understandable. What's been weighing on your mind?";
    }
    
    // General supportive responses with variety
    const supportiveResponses = [
      "I'm here with you. Whatever you're going through, you don't have to face it alone. What's on your mind today?",
      "Your thoughts and feelings are important to me. I'm here to listen and support you. How can I help right now?",
      "I want you to know that I'm fully present with you in this moment. What would be most helpful to talk about?",
      "You've taken a brave step by reaching out. I'm here to support you through whatever you're experiencing. What's weighing on your heart?",
      "I'm committed to being here with you. Your wellbeing matters deeply to me. What's going through your mind right now?"
    ];
    
    const randomIndex = Math.floor(Math.random() * supportiveResponses.length);
    return supportiveResponses[randomIndex];
  }, []);

  // Personalized greeting function for new and returning users
  const addPersonalizedGreeting = useCallback(async (user: { id?: string; user_metadata?: { full_name?: string }; email?: string } | null) => {
    try {
      let greetingContent = "";
      
      if (user?.id) {
        // Check if this is a returning user with previous conversations
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('display_name, created_at')
          .eq('id', user.id)
          .single();
          
        // Check for recent memories to personalize greeting
        const { data: recentMemories } = await supabase
          .from('user_memories')
          .select('content, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
          
        const displayName = existingProfile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
        const isReturningUser = existingProfile && recentMemories && recentMemories.length > 0;
        
        if (isReturningUser) {
          // Returning user greeting with memory context
          greetingContent = `Welcome back, ${displayName}! I'm Luma, your AI emotional companion. I remember our previous conversations, and I'm here to continue supporting you on your journey. Whether you'd like to explore something new or follow up on what we've discussed before, I'm ready to listen with care and understanding. How are you feeling today?`;
        } else {
          // New user greeting
          greetingContent = `Hi ${displayName}! I'm Luma, your AI emotional companion. I'm here to provide warm, personalized support as you navigate through whatever you're experiencing. Whether you want to talk through your feelings, work through a challenge, or just have someone listen, I'm here for you with empathy and understanding. What's on your mind today?`;
        }
      } else {
        // Anonymous/guest user greeting
        greetingContent = "Hi there! I'm Luma, your AI emotional companion. I'm here to provide warm, personalized support and help you navigate through whatever you're experiencing. Whether you want to talk through your feelings, work through a challenge, or just have someone listen, I'm here for you. What's on your mind today?";
      }
      
      const greetingMessage: Message = {
        id: generateMessageId(),
        content: greetingContent,
        sender: 'luma',
        timestamp: new Date()
      };
      
      setMessages([greetingMessage]);
      setGreetingAdded(true);
      console.log('[Dashboard] Added personalized greeting message');
      
    } catch (error) {
      console.error('[Dashboard] Error creating personalized greeting:', error);
      
      // Fallback to basic greeting
      const fallbackGreeting: Message = {
        id: generateMessageId(),
        content: "Hi there! I'm Luma, your AI emotional companion. I'm here to provide warm, personalized support and help you navigate through whatever you're experiencing. What's on your mind today?",
        sender: 'luma',
        timestamp: new Date()
      };
      setMessages([fallbackGreeting]);
      setGreetingAdded(true);
    }
  }, [generateMessageId]);

  // Enhanced scroll function with double requestAnimationFrame
  const scrollToBottom = useCallback((force = false) => {
    const scrollContainer = chatContainerRef.current?.querySelector('.messages-container');
    if (scrollContainer) {
      const scrollToBottomFn = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      };
      
      if (force) {
        // Double requestAnimationFrame ensures scroll happens after layout
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollToBottomFn);
        });
      } else {
        requestAnimationFrame(scrollToBottomFn);
      }
    }
  }, []);


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

  // Auto-scroll for new messages
  useEffect(() => {
    if (messages.length > 0) {
      const isFirstMessage = messages.length === 1;
      const delay = isFirstMessage ? 0 : 200;
      
      setTimeout(() => {
        scrollToBottom(isFirstMessage);
      }, delay);
    }
  }, [messages, scrollToBottom]);

  // Initialize user session and load conversation history
  useEffect(() => {
    const initializeUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
          setIsMemoryLoaded(true);
          console.log('[Dashboard] User session initialized for user:', session.user.email);
          
          // Add personalized greeting message if no messages exist and not already added
          if (messages.length === 0 && !greetingAdded) {
            await addPersonalizedGreeting(session.user);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to initialize user session:', error);
        setIsMemoryLoaded(true); // Allow chat to work without memory
        
        // Still add greeting even if session fails
        if (messages.length === 0 && !greetingAdded) {
          await addPersonalizedGreeting(null);
        }
      }
    };

    if (messages.length === 0 && !greetingAdded) {
      initializeUserSession();
    }
  }, [messages.length, greetingAdded, addPersonalizedGreeting]);


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

  // Mobile viewport handling simplified
  useEffect(() => {
    // Simple mobile detection and basic setup
    if (window.innerWidth <= 768) {
      console.log('Mobile device detected');
    }
  }, []);

  // Set up CSS custom properties with proper cleanup
  useEffect(() => {
    const setCSSCustomProperties = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setCSSCustomProperties();

    const handleResize = () => {
      setCSSCustomProperties();
    };

    const handleOrientationChange = () => {
      setTimeout(setCSSCustomProperties, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Enhanced VisualViewport API handling with complete cleanup
  useEffect(() => {
    if (!isMobile) return;
    
    let initialViewportHeight = window.innerHeight;
    let rafId: number | null = null;
    
    const handleViewportChange = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        const keyboardOpen = heightDifference > 150;
        
        setIsKeyboardOpen(keyboardOpen);
        
        const keyboardOffset = keyboardOpen ? `${heightDifference}px` : '0px';
        document.documentElement.style.setProperty('--keyboard-offset', keyboardOffset);
        
        if (keyboardOpen && isInputFocused) {
          // Use double requestAnimationFrame for reliable scroll
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollToBottom(true);
            });
          });
        }
        
        rafId = null; // Reset after execution
      });
    };
    
    initialViewportHeight = window.innerHeight;
    
    // Set up event listeners
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
    }
    
    window.addEventListener('resize', handleViewportChange);
    
    // Complete cleanup function
    return () => {
      // Cancel pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      // Remove all event listeners
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      
      window.removeEventListener('resize', handleViewportChange);
      
      // Reset CSS variables
      document.documentElement.style.removeProperty('--keyboard-offset');
    };
  }, [isMobile, isInputFocused, scrollToBottom]);


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

    // Double requestAnimationFrame for reliable scroll after layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom(true);
        if (!isMobile) {
          textareaRef.current?.focus();
        }
      });
    });

    try {
      console.log('[Dashboard] Sending message to chat API...');
      const startTime = performance.now();
      
      // Try proxy server first, fallback to local response
      let apiResponse;
      try {
        apiResponse = await fetch('http://localhost:3001/api/chat', {
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
      } catch (proxyError) {
        console.log('[Dashboard] Proxy server not available, using fallback response');
        // Create a mock successful response for development
        apiResponse = {
          ok: true,
          json: async () => ({
            reply: getFallbackResponse(userMessageContent)
          })
        };
      }

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

      // Double requestAnimationFrame for AI responses
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
          if (!isMobile && !isKeyboardOpen) {
            textareaRef.current?.focus();
          }
        });
      });
      
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

      // Scroll to show error message
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
          if (!isMobile) {
            textareaRef.current?.focus();
          }
        });
      });
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
      {/* Optimized Mobile CSS */}
      <style>{`
        /* CSS Custom Properties for dynamic viewport */
        :root {
          --vh: 1vh;
          --keyboard-offset: 0px;
          --safe-area-bottom: env(safe-area-inset-bottom, 0px);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .mobile-chat-container {
            height: calc(var(--vh, 1vh) * 100);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            overflow: hidden;
          }
          
          .messages-container {
            flex: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
            padding-bottom: 20px;
            margin-bottom: var(--keyboard-offset, 0px);
            overscroll-behavior: contain;
          }
          
          .mobile-input-container {
            position: fixed;
            bottom: var(--keyboard-offset, 0px);
            left: 0;
            right: 0;
            width: 100%;
            background: white;
            border-top: 1px solid #e5e7eb;
            padding: 12px;
            /* Combine safe-area with keyboard offset */
            padding-bottom: calc(12px + var(--safe-area-bottom) + var(--keyboard-offset, 0px));
            z-index: 1000;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
            transition: bottom 0.3s ease-out, transform 0.3s ease-out;
            transform: translateY(0);
          }
          
          .mobile-input-container.keyboard-open {
            box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.15);
          }
          
          /* Remove global font-size hack - handle per component */
        }
        
        /* Desktop scrollbar styling */
        @media (min-width: 769px) {
          .messages-container::-webkit-scrollbar {
            width: 6px;
          }
          
          .messages-container::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .messages-container::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.5);
            border-radius: 3px;
          }
          
          .messages-container::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.8);
          }
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
                ? `fixed inset-0 z-[9999] w-screen rounded-none border-gray-200 ${
                    isMobile ? `mobile-chat-container ${isKeyboardOpen ? 'keyboard-open' : ''}` : ''
                  }`
                : 'rounded-2xl h-[500px] sm:h-[600px] border-gray-200'
            }`}
          >
            {/* Chat Header */}
            <div 
              className={`p-3 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-white ${
                isChatMaximized && isMobile ? 'flex-shrink-0' : ''
              }`}
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

            {/* Messages Area with Accessibility */}
            <div 
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label="Chat conversation"
              className={`flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 ${
                isMobile && isChatMaximized ? 'messages-container' : 'chat-scrollbar'
              }`}
            >
              {/* 
                TODO: Consider virtualization (react-virtuoso/react-window) 
                if messages.length > 100 for performance optimization 
              */}
              <div role="list">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>

              {isTyping && (
                <div className="flex justify-start" role="status" aria-label="Luma is typing">
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

            {/* Input Area with Accessibility */}
            <div 
              ref={inputContainerRef}
              className={`border-t border-gray-200 bg-white ${
                isMobile && isChatMaximized 
                  ? `mobile-input-container ${isKeyboardOpen ? 'keyboard-open' : ''}` 
                  : isChatMaximized 
                    ? 'flex-shrink-0 shadow-lg p-4' 
                    : 'p-3 sm:p-6'
              }`}
            >
              <div className="flex space-x-2 sm:space-x-3">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    
                    if (e.target.value.length > 0 && !isChatMaximized && isMobile) {
                      setIsChatMaximized(true);
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          scrollToBottom(true);
                        });
                      });
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  onFocus={(e) => {
                    setIsInputFocused(true);
                    
                    if (!isChatMaximized && isMobile) {
                      setIsChatMaximized(true);
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          scrollToBottom(true);
                        });
                      });
                    } else if (isChatMaximized) {
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          scrollToBottom(true);
                        });
                      });
                    }
                  }}
                  onBlur={(e) => {
                    setTimeout(() => {
                      if (document.activeElement !== e.target && document.activeElement?.tagName !== 'BUTTON') {
                        setIsInputFocused(false);
                      }
                    }, 150);
                  }}
                  placeholder="Type your message here..."
                  aria-label="Type your message to Luma"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 bg-white placeholder-gray-500 text-xs sm:text-sm"
                  rows={1}
                  style={{ 
                    minHeight: '44px', // Ensure 44px minimum tap target
                    fontSize: 16, // Prevent zoom on iOS - component-specific only
                    maxHeight: '120px'
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send message"
                  className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
                  style={{ minHeight: '44px', minWidth: '44px' }} // Ensure 44px tap target
                  type="button"
                >
                  <Send className="w-4 h-4" />
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

          {/* Community Section - Hidden for now */}
          {/* <CommunitySection /> */}
        </div>
      </div>

      
      {/* Enhanced Journaling Widget - Controlled by header button */}
      {showJournaling && <EnhancedJournalingWidget onClose={() => setShowJournaling(false)} />}
      </div>
    </>
  );
};

export default Dashboard;
