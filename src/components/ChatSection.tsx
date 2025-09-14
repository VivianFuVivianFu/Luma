import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { useConversation } from '@11labs/react';
import { lumaAI } from '@/lib/claudeAI';
import { useMobile } from '@/hooks/useMobile';
import lumaAvatar from '@/assets/luma-avatar.png';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'luma';
  timestamp: Date;
}

const ChatSection = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        "Hi, I'm Luma — your gentle companion powered by LLaMA 3 70B. I'm here to support you in self-reflection and transformation with advanced AI understanding. Wherever you are on your journey, I'm here to hold space with care and empathy. What would you like to talk about today?",
      sender: 'luma',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isMobile, isKeyboardOpen } = useMobile();

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
      addMessage("Sorry, there was an error with the voice conversation. Please try again.", "luma");
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isMobile ? 'auto' : 'smooth',
      block: 'end'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isMobile]);

  // Handle mobile keyboard adjustments — strictly mobile
  useEffect(() => {
    if (isMobile && isKeyboardOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardOpen, isMobile]);

  const addMessage = (content: string, sender: 'user' | 'luma') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage(userMessage, 'user');
    setIsLoading(true);

    try {
      const lumaResponse = await lumaAI.sendMessage(userMessage);
      addMessage(lumaResponse, 'luma');
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again.", 'luma');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      if (isMobile && inputRef.current) inputRef.current.blur();
    }
  };

  const startVoiceConversation = async () => {
    try {
      setIsLoading(true);
      await conversation.startSession({ agentId: 'agent_6901k1fgqzszfq89cxndsfs69z7m' });
    } catch (error) {
      console.error('Error starting voice conversation:', error);
      addMessage("Sorry, I couldn't start the voice conversation. Please try again later.", "luma");
    } finally {
      setIsLoading(false);
    }
  };

  const endVoiceConversation = () => {
    conversation.endSession();
  };

  return (
    <div className={`flex flex-col h-full bg-card rounded-lg sm:rounded-2xl border border-border overflow-hidden ${
      isMobile && isKeyboardOpen ? 'keyboard-open' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={lumaAvatar} alt="Luma Avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
          <div>
            <h3 className="font-semibold text-card-foreground text-sm sm:text-base">Luma</h3>
            <p className="text-xs text-muted-foreground">{isVoiceConnected ? 'Voice Active' : 'Your AI Companion'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isVoiceConnected ? endVoiceConversation : startVoiceConversation}
            disabled={isLoading}
            className={`transition-colors p-2 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] ${
              isVoiceConnected ? 'text-red-500 hover:text-red-600 bg-red-50' : 'text-luma-blue hover:text-luma-blue-dark'
            }`}
            title={isVoiceConnected ? 'End Voice Chat' : 'Start Voice Chat'}
          >
            {isVoiceConnected ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
          <Button variant="ghost" size="sm" className="text-luma-blue hover:text-luma-blue-dark p-2 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px]" title="Voice Settings">
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 overscroll-contain">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-2xl break-words ${
              message.sender === 'user' ? 'bg-luma-blue text-luma-blue-foreground ml-2 sm:ml-4' : 'bg-secondary text-secondary-foreground mr-2 sm:mr-4'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-2xl mr-2 sm:mr-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-luma-blue rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-luma-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-luma-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-border bg-secondary/30">
        <div className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isVoiceConnected ? "Voice chat active - speak or type..." : "Share what's on your mind..."}
              className="w-full bg-input border-border focus:ring-luma-blue focus:border-luma-blue text-sm resize-none min-h-[44px] px-4 py-3"
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck="true"
            />
          </div>
          <Button onClick={sendMessage} disabled={!inputValue.trim() || isLoading} className="bg-luma-blue hover:bg-luma-blue-dark text-luma-blue-foreground min-w-[44px] min-h-[44px] p-3 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;

