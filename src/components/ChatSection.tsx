import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Maximize, Minimize } from 'lucide-react';
import { useConversation } from '@11labs/react';
import { claudeAI } from '@/lib/claudeAI';
import { supabase } from '@/lib/supabase';
import lumaAvatar from '@/assets/luma-avatar.png';
import MembershipPrompt from './MembershipPrompt';
import { mobileViewport, type ViewportState } from '@/utils/mobileViewport';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'luma';
  timestamp: Date;
}

const ChatSection = () => {
  // Generate stable component ID for hydration consistency
  const componentId = useId();
  const messageIdPrefix = useRef(`msg-${componentId}`);
  const messageCounter = useRef(0);
  
  // Generate or retrieve persistent anonymous user ID (stored but not used in component)
  useState(() => {
    let id = localStorage.getItem('luma_user_id');
    if (!id) {
      // Use componentId for consistent ID generation instead of Date.now() and Math.random()
      id = `anon-${componentId.replace(/:/g, '-')}-${Date.now()}`;
      localStorage.setItem('luma_user_id', id);
    }
    return id;
  });

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: `welcome-${componentId}`,
      content: "Hi, I'm Luma — your AI emotional companion. Thoughtfully designed with empathy, psychology, and neuroscience, I'm here to support your self-reflection and transformation. Wherever you are on your journey, let's take the next step together.",
      sender: 'luma',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isFirstUserMessage, setIsFirstUserMessage] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isUserChatting, setIsUserChatting] = useState(false);
  const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);
  const [viewportState, setViewportState] = useState<ViewportState>(mobileViewport.getState());
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Membership notification system states
  const [showMembershipPrompt, setShowMembershipPrompt] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInteractionCount, setUserInteractionCount] = useState(0);
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null);
  const [membershipPromptDismissed, setMembershipPromptDismissed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Consistent ID generator to prevent hydration mismatches
  const generateMessageId = useCallback(() => {
    messageCounter.current += 1;
    return `${messageIdPrefix.current}-${messageCounter.current}`;
  }, []);

  const conversation = useConversation({
    apiKey: 'sk_415684fdf9ebc8dc4aaeca3706625ab0b496276d0a69f74e',
    onConnect: () => {
      console.log('Voice conversation connected');
      setIsVoiceConnected(true);
      addMessage("Voice conversation connected! You can now speak with me.", "luma");
    },
    onDisconnect: () => {
      console.log('Voice conversation disconnected');
      setIsVoiceConnected(false);
      addMessage("Voice conversation ended.", "luma");
    },
    onMessage: (message) => {
      if (message.message) {
        addMessage(message.message, 'luma');
      }
    },
    onError: (error) => {
      console.error('Voice conversation error:', error);
      setIsVoiceConnected(false);
      addMessage("Sorry, there was an error with the voice conversation. Please check your microphone settings and try again.", "luma");
    },
  });

  // Enhanced scroll to bottom for chat messages only with mobile optimization
  const scrollToBottomChat = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Use requestAnimationFrame for smoother scrolling on mobile
      requestAnimationFrame(() => {
        const scrollOptions: ScrollToOptions = {
          top: container.scrollHeight,
          behavior: mobileViewport.isMobileDevice ? 'auto' : 'smooth' // Auto on mobile for better performance
        };
        container.scrollTo(scrollOptions);
      });
    }
  }, []);



  useEffect(() => {
    // Only auto-scroll within the chat messages container, never the page
    scrollToBottomChat();
  }, [messages, scrollToBottomChat]);

  // Setup mobile viewport management
  useEffect(() => {
    // Configure viewport callbacks
    mobileViewport.setCallbacks({
      onKeyboardShow: (height) => {
        console.log('[MobileViewport] Keyboard shown, height:', height);
        setIsKeyboardVisible(true);
        setIsUserChatting(true);
        
        // Scroll to show input above keyboard
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            });
          }
        }, 100);
      },
      onKeyboardHide: () => {
        console.log('[MobileViewport] Keyboard hidden');
        setIsKeyboardVisible(false);
        
        // Delay state reset to prevent flashing
        setTimeout(() => {
          if (!shouldMaintainFocus) {
            setIsUserChatting(false);
          }
        }, 200);
      },
      onViewportChange: (state) => {
        setViewportState(state);
      }
    });

    // Optimize chat container for mobile
    if (chatContainerRef.current) {
      mobileViewport.optimizeElement(chatContainerRef.current, {
        preventZoom: true,
        touchOptimized: true,
        keyboardAdjusted: true,
        useModernViewport: true
      });
    }

    return () => {
      mobileViewport.destroy();
    };
  }, [shouldMaintainFocus]);

  // Handle input focus for mobile keyboard
  const handleInputFocus = useCallback(() => {
    setIsUserChatting(true);
    setShouldMaintainFocus(true);

    if (mobileViewport.isMobileDevice) {
      // Use modern viewport manager for mobile focus
      if (inputRef.current) {
        mobileViewport.focusInput(inputRef.current, {
          scrollIntoView: true,
          preventZoom: true,
          delay: 50
        });
      }
      
      // Scroll to bottom after a brief delay
      setTimeout(scrollToBottomChat, 300);
    } else {
      // Desktop behavior - just scroll chat to bottom
      setTimeout(scrollToBottomChat, 100);
    }
  }, [scrollToBottomChat]);

  // Handle input blur with improved mobile handling
  const handleInputBlur = useCallback(() => {
    // Don't immediately close on blur - wait a moment to see if user clicks elsewhere in chat
    setTimeout(() => {
      if (!shouldMaintainFocus) {
        setIsUserChatting(false);
        
        // The mobile viewport manager handles body style restoration automatically
        // through CSS custom properties and classes
      }
    }, 150);
  }, [shouldMaintainFocus]);

  // Prevent unwanted page scrolling on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    // Allow normal touch behavior within chat
    e.stopPropagation();
  };

  // Mobile viewport state is now handled by the MobileViewportManager
  // No need for manual resize handling

  // Authentication status check
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    checkAuthStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const wasAuthenticated = isAuthenticated;
      setIsAuthenticated(!!session?.user);
      // If user logs in, dismiss the membership prompt and scroll to top
      if (session?.user) {
        setShowMembershipPrompt(false);
        setMembershipPromptDismissed(false);
        // Scroll to top after successful sign in
        if (!wasAuthenticated) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // 2-minute notification timer management
  useEffect(() => {
    // Only start timer for anonymous users who haven't dismissed the prompt
    if (!isAuthenticated && !membershipPromptDismissed && userInteractionCount > 0) {
      // Start timer on first user interaction
      if (userInteractionCount === 1 && !conversationStartTime) {
        setConversationStartTime(new Date());

        // Set 2-minute timer
        notificationTimerRef.current = setTimeout(() => {
          setShowMembershipPrompt(true);
        }, 2 * 60 * 1000); // 2 minutes
      }
    }

    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, [isAuthenticated, membershipPromptDismissed, userInteractionCount, conversationStartTime]);

  const addMessage = useCallback((content: string, sender: 'user' | 'luma') => {
    const newMessage: Message = {
      id: generateMessageId(),
      content,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, [generateMessageId]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage(userMessage, 'user');
    setIsLoading(true);
    setIsUserChatting(true);
    setShouldMaintainFocus(true);

    // Scroll to show new message within chat container only
    setTimeout(() => {
      scrollToBottomChat();
    }, 100);

    // Track user interactions for notification system
    if (!isAuthenticated) {
      setUserInteractionCount(prev => prev + 1);
    }

    try {
      console.log('[ChatSection] Sending message via Claude AI service...');
      // Use Claude via proxy server
      const reply = await claudeAI.sendMessage(userMessage);
      console.log('[ChatSection] Received reply:', reply.substring(0, 100));

      addMessage(reply, 'luma');
      setIsLoading(false);

      // Remove first message flag since we're using Claude for all responses
      if (isFirstUserMessage) {
        setIsFirstUserMessage(false);
      }
      
      // Gradually release focus maintenance after conversation
      setTimeout(() => {
        setIsUserChatting(false);
        setTimeout(() => {
          setShouldMaintainFocus(false);
        }, 2000); // Keep focus for 2 more seconds after conversation ends
      }, 1000);
    } catch (error) {
      console.error('[ChatSection] Error sending message:', error);
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again.", 'luma');
      setIsLoading(false);
      
      // Gradually release focus maintenance after error
      setTimeout(() => {
        setIsUserChatting(false);
        setTimeout(() => {
          setShouldMaintainFocus(false);
        }, 2000);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceConversation = async () => {
    try {
      setIsLoading(true);

      // Start conversation with the agent ID
      await conversation.startSession({
        agentId: 'agent_6901k1fgqzszfq89cxndsfs69z7m',
      });

    } catch (error) {
      console.error('Error starting voice conversation:', error);
      addMessage("Sorry, I couldn't start the voice conversation. Please check your microphone settings and try again.", "luma");
    } finally {
      setIsLoading(false);
    }
  };

  const endVoiceConversation = () => {
    conversation.endSession();
  };

  // clearConversation function removed as it was unused

  // Membership prompt handlers
  const handleJoinCommunity = () => {
    setShowMembershipPrompt(false);
    // Redirect to signup or trigger auth modal
    window.scrollTo(0, 0); // Scroll to top where auth buttons are
  };

  const handleDismissMembershipPrompt = () => {
    setShowMembershipPrompt(false);
    setMembershipPromptDismissed(true);
    // Clear the timer
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
  };

  const handleContinueAsGuest = () => {
    setShowMembershipPrompt(false);
    setMembershipPromptDismissed(true);
    // Clear the timer
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
  };

  // Simple maximize/minimize functionality
  const handleMaximizeToggle = useCallback(() => {
    setIsMaximized(!isMaximized);
    // No automatic scrolling - let user control their view
  }, [isMaximized]);

  // Handle double tap to maximize on mobile
  const handleHeaderDoubleTap = useCallback(() => {
    const currentTime = performance.now();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected
      handleMaximizeToggle();
    }

    setLastTapTime(currentTime);
  }, [lastTapTime, handleMaximizeToggle]);

  const chatContent = (
    <>
      {/* Backdrop overlay for maximized state */}
      {isMaximized && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
          onClick={() => setIsMaximized(false)}
        />
      )}

      <div
        ref={chatContainerRef}
        className={`flex flex-col bg-slate-50/80 border overflow-hidden transition-all duration-300 ${
          isMaximized
            ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none bg-white border-gray-200'
            : isUserChatting || shouldMaintainFocus
              ? 'fixed top-0 left-0 right-0 z-[100] bg-white border-b-2 border-blue-300 shadow-2xl keyboard-adjusted'
              : 'h-full rounded-2xl border-indigo-100'
        } ${mobileViewport.isMobileDevice ? 'touch-optimized' : ''}`}
        onTouchStart={handleTouchStart}
        style={{
          // Use CSS custom properties for dynamic height
          minHeight: isMaximized ? '100vh' : (isUserChatting || shouldMaintainFocus) 
            ? `var(--available-height, ${viewportState.height - viewportState.keyboardHeight}px)` 
            : 'auto',
          maxHeight: isMaximized ? '100vh' : (isUserChatting || shouldMaintainFocus) 
            ? `var(--available-height, ${viewportState.height - viewportState.keyboardHeight}px)` 
            : '500px',
          overflowY: 'hidden', // Container doesn't scroll - only messages area does
          // Enhanced mobile positioning with viewport awareness
          ...(isUserChatting || shouldMaintainFocus) && !isMaximized && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: viewportState.dynamicViewportSupported 
              ? '100dvh' 
              : `var(--available-height, ${viewportState.height}px)`,
            zIndex: 100
          }
        }}
      >
      {/* Header - Fixed at top of chat window */}
      <div
        className="flex items-center justify-between p-4 border-b border-indigo-100/50 bg-white/90 select-none sticky top-0 z-10"
        onClick={handleHeaderDoubleTap}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={lumaAvatar}
            alt="Luma Avatar"
            className="w-8 h-8 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-gray-800">
              Luma
              {isMaximized && (
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  • Full Screen
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-600">
              {isVoiceConnected ? 'Voice Active' : 'Your AI Companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile close button when chatting */}
          {(isUserChatting || shouldMaintainFocus) && !isMaximized && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsUserChatting(false);
                setShouldMaintainFocus(false);
                // Viewport restoration is handled automatically by MobileViewportManager
                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }}
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors touch-optimized"
              title="Close Chat"
            >
              ✕
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMaximizeToggle}
            className={`transition-all duration-200 hover:scale-105 ${
              isMaximized
                ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
                : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
            title={isMaximized ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {/* Messages Area - Scrollable container separate from page scroll */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar"
        style={{
          // Independent scrolling container with modern viewport support
          scrollBehavior: mobileViewport.isMobileDevice ? 'auto' : 'smooth', // Better performance on mobile
          minHeight: 0, // Allow flex shrinking
          height: 'auto',
          maxHeight: isMaximized 
            ? viewportState.dynamicViewportSupported ? 'calc(100dvh - 140px)' : 'calc(100vh - 140px)'
            : (isUserChatting || shouldMaintainFocus) 
              ? `calc(var(--available-height, ${viewportState.height - viewportState.keyboardHeight}px) - 140px)`
              : 'calc(500px - 140px)',
          // Ensure this scroll is independent from page scroll
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // CSS containment for better performance
          contain: 'layout style paint'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white ml-4'
                  : 'bg-white/90 text-gray-900 mr-4 border border-blue-100/50 shadow-sm'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/90 text-gray-900 p-3 rounded-2xl mr-4 border border-blue-100/50 shadow-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom of chat window */}
      <div className={`input-container p-4 border-t border-indigo-100/50 bg-white/90 transition-all duration-300 keyboard-transition ${
        isMaximized 
          ? 'sticky bottom-0 z-10' 
          : isKeyboardVisible 
            ? 'fixed bottom-0 left-0 right-0 z-[10000] bg-white border-t border-slate-200 shadow-lg'
            : 'focus-within:fixed focus-within:bottom-0 focus-within:left-0 focus-within:right-0 focus-within:z-[10000] focus-within:bg-white focus-within:border-t focus-within:border-slate-200 focus-within:shadow-lg'
      } ${mobileViewport.isMobileDevice ? 'touch-optimized' : ''}`}
      style={{
        backdropFilter: 'blur(8px)',
        // Position input above keyboard using CSS custom property
        bottom: isKeyboardVisible ? `var(--keyboard-height, 0px)` : 0,
        transform: isKeyboardVisible && mobileViewport.isIOSDevice 
          ? `translateY(calc(-1 * var(--keyboard-height, 0px)))` 
          : 'none'
      }}>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={isVoiceConnected ? "Voice chat active - speak or type..." : "Share what's on your mind..."}
            className={`flex-1 bg-white border-blue-200 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder:text-gray-500 ${
              mobileViewport.isMobileDevice ? 'no-zoom-input touch-optimized' : ''
            }`}
            disabled={isLoading}
            style={{ 
              fontSize: '16px', // Prevents zoom on iOS
              // Additional iOS Safari fixes
              ...(mobileViewport.isIOSDevice && {
                WebkitAppearance: 'none',
                borderRadius: '8px'
              })
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`bg-blue-500 hover:bg-blue-600 text-white keyboard-transition ${
              mobileViewport.isMobileDevice ? 'touch-optimized' : ''
            }`}
            type="submit"
          >
            <Send className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={isVoiceConnected ? endVoiceConversation : startVoiceConversation}
              disabled={isLoading}
              className={`transition-colors keyboard-transition ${
                isVoiceConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${mobileViewport.isMobileDevice ? 'touch-optimized' : ''}`}
              title={isVoiceConnected ? 'End Voice Chat' : 'Start Voice Chat'}
            >
              {isVoiceConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <span className="text-sm text-gray-600 whitespace-nowrap">Call Luma</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );

  // Return portal for maximized state, normal render for minimized
  if (isMaximized) {
    return (
      <>
        {createPortal(chatContent, document.body)}
        {/* Membership prompt (rendered after chat content for proper z-index) */}
        {showMembershipPrompt && (
          <MembershipPrompt
            onJoin={handleJoinCommunity}
            onDismiss={handleDismissMembershipPrompt}
            onContinueAsGuest={handleContinueAsGuest}
          />
        )}
      </>
    );
  }

  return (
    <>
      {chatContent}
      {/* Membership prompt */}
      {showMembershipPrompt && (
        <MembershipPrompt
          onJoin={handleJoinCommunity}
          onDismiss={handleDismissMembershipPrompt}
          onContinueAsGuest={handleContinueAsGuest}
        />
      )}
    </>
  );
};

export default ChatSection;
