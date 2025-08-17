import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { useConversation } from '@11labs/react';
import { lumaAI } from '@/lib/lumaAI';
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
      content: "Hi, I'm Luma — your AI emotional companion. I'm here to support your self-reflection and transformation with understanding and care. Wherever you are on your journey, I'll walk alongside you. What would you like to talk about today?",
      sender: 'luma',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Use LLaMA 3 70B via Together AI
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
      addMessage("Sorry, I couldn't start the voice conversation. Please try again later.", "luma");
    } finally {
      setIsLoading(false);
    }
  };

  const endVoiceConversation = () => {
    conversation.endSession();
  };

  // clearConversation function removed as it was unused

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-3">
          <img
            src={lumaAvatar}
            alt="Luma Avatar"
            className="w-8 h-8 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-card-foreground">Luma</h3>
            <p className="text-xs text-muted-foreground">
              {isVoiceConnected ? 'Voice Active' : 'Your AI Companion'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-luma-blue hover:text-luma-blue-dark"
            title="Voice Settings"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-luma-blue text-luma-blue-foreground ml-4'
                  : 'bg-secondary text-secondary-foreground mr-4'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-2xl mr-4">
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
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isVoiceConnected ? "Voice chat active - speak or type..." : "Share what's on your mind..."}
            className="flex-1 bg-input border-border focus:ring-luma-blue focus:border-luma-blue"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-luma-blue hover:bg-luma-blue-dark text-luma-blue-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={isVoiceConnected ? endVoiceConversation : startVoiceConversation}
              disabled={isLoading}
              className={`transition-colors ${
                isVoiceConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title={isVoiceConnected ? 'End Voice Chat' : 'Start Voice Chat'}
            >
              {isVoiceConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <span className="text-sm text-muted-foreground whitespace-nowrap">Call Luma</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
