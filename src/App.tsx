import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { WatchRoom } from '@/components/WatchRoom';
import { JoinModal } from '@/components/JoinModal';
import { ToastProvider } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';

function getRoomFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/room=([a-z0-9]+)/);
  return match ? match[1] : null;
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomFromHash);
  const [joinState, setJoinState] = useState<'idle' | 'checking' | 'prompt' | 'ready'>('idle');
  const [roomName, setRoomName] = useState('Watch Party');
  const [roomPassword, setRoomPassword] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [participantColor, setParticipantColor] = useState('');
  const [enteredPassword, setEnteredPassword] = useState<string | undefined>(undefined);

  useEffect(() => {
    const onHashChange = () => setRoomId(getRoomFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!roomId) {
      setJoinState('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      setJoinState('checking');
      const { data, error } = await supabase
        .from('rooms')
        .select('name, password')
        .eq('id', roomId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setJoinState('ready');
        return;
      }

      setRoomName(data.name || 'Watch Party');
      const hasPassword = !!data.password;
      setRequiresPassword(hasPassword);
      setRoomPassword(data.password || null);
      setJoinState('prompt');
    })();

    return () => { cancelled = true; };
  }, [roomId]);

  function enterRoom(id: string) {
    window.location.hash = `room=${id}`;
    setRoomId(id);
    setJoinState('ready');
  }

  function handleJoin(name: string, color: string, password?: string) {
    if (requiresPassword && password !== undefined && roomPassword !== null) {
      if (password !== roomPassword) {
        // Wrong password — don't proceed
        return;
      }
    }
    setParticipantName(name);
    setParticipantColor(color);
    setEnteredPassword(password);
    setJoinState('ready');
  }

  function leaveRoom() {
    window.location.hash = '';
    setRoomId(null);
    setJoinState('idle');
    setParticipantName('');
    setParticipantColor('');
    setEnteredPassword(undefined);
    setRequiresPassword(false);
    setRoomPassword(null);
  }

  return (
    <ToastProvider>
      {!roomId && <LandingPage onEnterRoom={enterRoom} />}

      {roomId && joinState === 'checking' && (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        </div>
      )}

      {roomId && joinState === 'prompt' && (
        <JoinModal
          roomName={roomName}
          requiresPassword={requiresPassword}
          onJoin={handleJoin}
          onBack={leaveRoom}
        />
      )}

      {roomId && joinState === 'ready' && (
        <WatchRoom
          roomId={roomId}
          onLeave={leaveRoom}
          initialName={participantName}
          initialColor={participantColor}
        />
      )}
    </ToastProvider>
  );
}

export default App;
