import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Loader2, Lock } from 'lucide-react';
import { generateNickname, randomColor } from '@/lib/identity';

interface JoinModalProps {
  roomName: string;
  requiresPassword: boolean;
  onJoin: (nickname: string, color: string, password?: string) => void;
  onBack: () => void;
}

export function JoinModal({ roomName, requiresPassword, onJoin, onBack }: JoinModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(randomColor());
  const [roomPin, setRoomPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('syncstream_participant');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.nickname) setName(parsed.nickname);
        if (parsed.color) setColor(parsed.color);
      } catch {
        // fall through to default
      }
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (requiresPassword && !roomPin.trim()) {
      setPinError(true);
      return;
    }
    setSubmitting(true);
    setPinError(false);
    onJoin(trimmed, color, roomPin.trim() || undefined);
  }

  return (
    <div className="retro-paper min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="retro-panel bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              {requiresPassword ? (
                <Lock className="w-5 h-5 text-white" />
              ) : (
                <Users className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">{roomName}</h1>
              <p className="text-xs text-zinc-500">
                {requiresPassword ? 'Password-protected watch party' : 'Joining watch party'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {requiresPassword && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Room password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={roomPin}
                    onChange={(e) => {
                      setRoomPin(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Enter room password..."
                    maxLength={32}
                    autoFocus
                    className={`retro-input w-full pl-10 pr-4 py-3 bg-zinc-800 border rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      pinError ? 'border-red-600 focus:border-red-600' : 'border-zinc-700 focus:border-violet-500'
                    }`}
                  />
                </div>
                {pinError && (
                  <p className="text-[11px] text-red-400 mt-1.5">Password is required to join this room</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Your display name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={24}
                autoFocus={!requiresPassword}
                className="retro-input w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setName(generateNickname())}
                className="text-[11px] text-zinc-600 hover:text-violet-400 transition-colors mt-1.5"
              >
                Generate random name
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Pick your color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="retro-button w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Room'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const COLOR_OPTIONS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316',
];
