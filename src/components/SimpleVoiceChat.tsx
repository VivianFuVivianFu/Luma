import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, VolumeX } from 'lucide-react';
import { claudeAI } from '../lib/claudeAI';

interface SimpleVoiceChatProps {
  onClose?: () => void;
}

export default function SimpleVoiceChat({ onClose }: SimpleVoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setLastTranscript(transcript);
        setIsListening(false);
        
        // Send to Luma AI
        await handleVoiceMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start speech recognition. Please check your microphone permissions.');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleVoiceMessage = useCallback(async (transcript: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get response from Luma AI
      const response = await claudeAI.sendMessage(transcript);
      
      // Convert response to speech
      await speakResponse(response);
      
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err instanceof Error ? err.message : 'Voice chat failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }

    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      synthRef.current = utterance;
      
      // Configure voice settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Try to use a female voice if available
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen')
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        // Fallback to any English voice
        const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        setError(`Speech synthesis error: ${event.error}`);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
      
    } catch (err) {
      setError('Failed to speak response');
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return (
    <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl p-6 border border-white/20 shadow-lg min-w-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800" style={{fontFamily: 'Gowun Dodum, sans-serif'}}>
          Voice Chat with Luma
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>

      {/* Status Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            isListening ? 'bg-red-500 animate-pulse' :
            isLoading ? 'bg-yellow-500 animate-pulse' :
            isSpeaking ? 'bg-green-500 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="font-medium">
            {isListening ? 'Listening...' :
             isLoading ? 'Thinking...' :
             isSpeaking ? 'Luma is speaking...' :
             'Ready to chat'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Last Transcript */}
      {lastTranscript && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">You said:</p>
          <p className="text-sm font-medium">"{lastTranscript}"</p>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || isSpeaking}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isListening ? 'Stop Listening' : 'Start Talking'}
          </button>

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all duration-200 hover:scale-105"
            >
              <VolumeX className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Processing your message...</span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to use Voice Chat:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Start Talking" and speak your message clearly</li>
            <li>The system will automatically detect when you stop speaking</li>
            <li>Luma will process your message and respond with voice</li>
            <li>You can stop Luma's speech anytime by clicking "Stop"</li>
          </ol>
          <p className="mt-2 text-xs text-gray-500">
            Note: This feature uses your browser's built-in speech recognition and text-to-speech. 
            Works best in Chrome or Edge.
          </p>
        </div>
      </div>
    </div>
  );
}