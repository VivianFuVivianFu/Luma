import { useCallback, useMemo, useState } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
// import { supabase } from '@/lib/supabase';

type Props = {
  agentId?: string;
  onClose?: () => void;
};

export default function VoiceCallWidget({ agentId = 'default' }: Props) {
  const conversation = useConversation({
    onError: (e) => console.error('ElevenLabs error:', e),
  });

  const { status, isSpeaking } = conversation;
  const [volume, setVolume] = useState(0.8);

  const canStart = useMemo(() => status !== 'connected', [status]);
  const canEnd = useMemo(() => status === 'connected', [status]);

  const start = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check if we have a proper agent ID
      if (!agentId || agentId.trim() === '') {
        throw new Error('ElevenLabs Agent ID is not configured. Please set VITE_ELEVENLABS_AGENT_ID in your environment variables.');
      }

      // Get API key from environment
      const elevenlabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!elevenlabsApiKey) {
        throw new Error('ElevenLabs API key not found. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
      }

      // Get signed URL for ElevenLabs WebSocket connection
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': elevenlabsApiKey,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get signed URL: ${response.status} ${response.statusText}. ${errorData.detail || ''}`);
      }

      const data = await response.json();
      const signedUrl = data.signed_url;

      if (!signedUrl) {
        throw new Error('No signed URL received from ElevenLabs API');
      }

      // Start the conversation with ElevenLabs
      await conversation.startSession({ signedUrl });
      await conversation.setVolume({ volume });
      
    } catch (err) {
      console.error('Voice call error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to start voice chat: ${errorMessage}\n\nPlease check:\n1. VITE_ELEVENLABS_AGENT_ID is set correctly\n2. VITE_ELEVENLABS_API_KEY is valid\n3. Your microphone is accessible`);
    }
  }, [agentId, conversation, volume]);

  const end = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (e) {
      console.error(e);
    }
  }, [conversation]);

  const onVolumeChange = async (v: number[]) => {
    const next = (v[0] ?? 80) / 100;
    setVolume(next);
    try {
      await conversation.setVolume({ volume: next });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl p-6 border border-white/20 shadow-lg">
      <header className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800" style={{fontFamily: 'Gowun Dodum, sans-serif'}}>Voice Chat with Luma</h3>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {status === 'connected' 
              ? (isSpeaking ? 'Luma speaking…' : 'Listening…') 
              : 'Disconnected'}
          </span>
        </div>
      </header>

      <div className="flex items-center gap-4 mb-6">
        <Button 
          onClick={start} 
          disabled={!canStart}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Start voice
        </Button>
        <Button 
          variant="secondary" 
          onClick={end} 
          disabled={!canEnd}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-full shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          End
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Volume</p>
        <Slider 
          value={[Math.round(volume * 100)]} 
          onValueChange={onVolumeChange} 
          max={100} 
          step={1}
          className="w-full"
        />
      </div>
    </section>
  );
}