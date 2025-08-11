import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Volume2 } from 'lucide-react';

interface VoiceChatProps {
  onClose?: () => void;
}

export default function VoiceChat({ onClose }: VoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendVoiceMessage(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll use a simple text input since we need speech-to-text
      // In a full implementation, you'd use Web Speech API or another STT service
      const userText = prompt('Please type what you said (Speech-to-text integration needed):');
      
      if (!userText?.trim()) {
        setIsLoading(false);
        return;
      }

      // Send to our backend voice chat endpoint
      const response = await fetch('http://localhost:5001/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userText.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`Voice chat failed: ${response.status} ${response.statusText}`);
      }

      // Response should be audio data
      const audioBuffer = await response.arrayBuffer();
      const responseBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      
      setAudioBlob(responseBlob);
      
      // Auto-play the response
      const audioUrl = URL.createObjectURL(responseBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err instanceof Error ? err.message : 'Voice chat failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const playAudio = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioBlob, isPlaying]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return (
    <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl p-6 border border-white/20 shadow-lg">
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Recording Section */}
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Processing voice message...</span>
          </div>
        )}

        {/* Audio Playback */}
        {audioBlob && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600 flex-1">Luma's Response:</span>
            <button
              onClick={isPlaying ? stopAudio : playAudio}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all duration-200 hover:scale-105"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to use Voice Chat:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Start Recording" and speak your message</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Type what you said (speech-to-text coming soon)</li>
            <li>Listen to Luma's voice response</li>
          </ol>
        </div>
      </div>
    </div>
  );
}