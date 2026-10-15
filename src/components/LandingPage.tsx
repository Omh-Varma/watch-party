import { useState, useEffect } from 'react';
import {
  Plus, Link as LinkIcon, Youtube, Film, Loader2, ArrowRight,
  Users, MessageCircle, BarChart3, Sparkles, LogIn, Hash, Lock,
} from 'lucide-react';
import { generateRoomId, getOrCreateIdentity, randomColor } from '@/lib/identity';
import { supabase } from '@/lib/supabase';
import { parseVideoUrl, getYouTubeThumbnail } from '@/lib/youtube';
import {
  FilmReelArt, ClapperboardArt, PopcornBucketArt, FilmStripArt,
  TicketStubArt, VintageCameraArt, MegaphoneArt, StarburstArt,
  ProjectorArt,
} from '@/components/CinemaArt';

interface LandingPageProps {
  onEnterRoom: (roomId: string) => void;
}

type ModalType = 'create' | 'join' | null;

export function LandingPage({ onEnterRoom }: LandingPageProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [displayName, setDisplayName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [roomPin, setRoomPin] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ nickname: string; color: string } | null>(null);
  const [preview, setPreview] = useState<{ thumbnail: string; title: string } | null>(null);

  useEffect(() => {
    const id = getOrCreateIdentity();
    setIdentity({ nickname: id.nickname, color: id.color });
    setDisplayName(id.nickname);
  }, []);

  useEffect(() => {
    if (!videoUrl.trim()) {
      setPreview(null);
      return;
    }
    const parsed = parseVideoUrl(videoUrl);
    if (parsed.type === 'youtube' && parsed.videoId) {
      setPreview({
        thumbnail: getYouTubeThumbnail(parsed.videoId),
        title: 'YouTube video ready to play',
      });
    } else if (parsed.type === 'mp4' && parsed.directUrl) {
      setPreview({ thumbnail: '', title: 'Direct video file ready to play' });
    } else {
      setPreview(null);
    }
  }, [videoUrl]);

  function saveDisplayName(): string {
    const name = displayName.trim() || identity?.nickname || 'Guest';
    const stored = getOrCreateIdentity();
    stored.nickname = name;
    if (!stored.color) stored.color = randomColor();
    localStorage.setItem('syncstream_participant', JSON.stringify(stored));
    return name;
  }

  function closeModal() {
    setModal(null);
    setError(null);
    setVideoUrl('');
    setJoinInput('');
    setRoomPin('');
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    saveDisplayName();

    try {
      const roomId = generateRoomId();
      const parsed = parseVideoUrl(videoUrl);

      const { error: insertError } = await supabase.from('rooms').insert({
        id: roomId,
        name: `${displayName.trim() || 'Guest'}'s Watch Party`,
        media_url: parsed.videoId
          ? `https://www.youtube.com/watch?v=${parsed.videoId}`
          : parsed.directUrl || null,
        media_title: parsed.videoId ? 'YouTube video' : parsed.directUrl ? 'Direct video' : null,
        media_type: parsed.type,
        is_playing: false,
        playback_position: 0,
        password: roomPin.trim() || null,
      });

      if (insertError) throw insertError;
      onEnterRoom(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setCreating(false);
    }
  }

  function extractRoomCode(input: string): string {
    const trimmed = input.trim();
    // If it's a URL with #room=xxx, extract the code
    const hashMatch = trimmed.match(/room=([a-z0-9]+)/i);
    if (hashMatch) return hashMatch[1].toLowerCase();
    // If it's a full URL, try to extract from hash
    const urlMatch = trimmed.match(/#room=([a-z0-9]+)/i);
    if (urlMatch) return urlMatch[1].toLowerCase();
    // Otherwise treat as a raw room code
    return trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = extractRoomCode(joinInput);
    if (!code) {
      setError('Please enter a valid room code or link');
      return;
    }

    setJoining(true);
    setError(null);
    saveDisplayName();

    try {
      const { data, error: queryError } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', code)
        .maybeSingle();

      if (queryError) throw queryError;
      if (!data) {
        setError('Room not found. Check the code or link and try again.');
        setJoining(false);
        return;
      }

      onEnterRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setJoining(false);
    }
  }

  return (
    <div className="landing-shell min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[80px]" />
      </div>

      {/* Floating cinema collage art — prominent illustrated poster background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <FilmStripArt className="absolute left-0 top-10 w-16 h-80 opacity-40 -rotate-3" />
        <FilmStripArt className="absolute right-0 top-16 w-16 h-96 opacity-35 rotate-2" />
        <FilmReelArt className="absolute -left-8 bottom-0 w-40 h-40 opacity-25" />
        <FilmReelArt className="absolute -right-6 top-0 w-28 h-28 opacity-20" />
        <PopcornBucketArt className="absolute right-12 bottom-6 w-24 h-28 opacity-25" />
        <TicketStubArt className="absolute left-10 top-1/2 w-28 h-14 opacity-20 -rotate-12" />
        <ClapperboardArt className="absolute left-1/4 -bottom-2 w-36 h-28 opacity-15 rotate-6" />
        <StarburstArt className="absolute right-1/4 top-4 w-16 h-16 opacity-30 -rotate-12" />
        <ProjectorArt className="absolute left-1/3 top-2 w-28 h-20 opacity-10" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-2.5">
          <div className="landing-mark w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="landing-logo text-lg font-bold tracking-tight">SyncStream</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: identity?.color || '#8b5cf6' }}
          >
            {identity?.nickname.charAt(0).toUpperCase() || '?'}
          </div>
          <span>{identity?.nickname || 'Guest'}</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-16 lg:py-24 max-w-4xl mx-auto text-center">
        <StarburstArt className="hidden lg:block absolute -left-16 top-0 w-20 h-20 opacity-80 -rotate-12" />
        <StarburstArt className="hidden lg:block absolute -right-16 top-0 w-18 h-18 opacity-75 rotate-12" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-violet-600/10 border border-violet-600/20">
          <Users className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">Watch together in real-time</span>
        </div>

        <h1 className="landing-hero-title text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
          Watch anything,
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            together.
          </span>
        </h1>

        <p className="landing-subtitle text-lg text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          Create a room, paste a video link, and watch in perfect sync with friends.
          Chat, react with emojis, and vote on polls — all in one place.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => { setModal('create'); setError(null); }}
            className="retro-button group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-base font-semibold rounded-2xl shadow-xl shadow-violet-600/25 transition-all hover:scale-[1.02] hover:shadow-violet-600/40"
          >
            <Plus className="w-5 h-5" />
            Create Room
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => { setModal('join'); setError(null); }}
            className="retro-button inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white text-base font-semibold rounded-2xl border border-zinc-700 transition-all hover:scale-[1.02]"
          >
            <LogIn className="w-5 h-5 text-violet-400" />
            Join Room
          </button>
        </div>

        {/* Feature pills with retro cinema illustrations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16 w-full max-w-2xl">
          {[
            { art: <VintageCameraArt className="w-16 h-12" />, label: 'YouTube search' },
            { art: <MegaphoneArt className="w-16 h-12" />, label: 'Live chat' },
            { art: <TicketStubArt className="w-20 h-10" />, label: 'Group polls' },
            { art: <ClapperboardArt className="w-16 h-12" />, label: 'Emoji reactions' },
          ].map(({ art, label }) => (
            <div
              key={label}
              className="landing-feature flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm hover:border-zinc-700 transition-colors"
            >
              {art}
              <span className="text-xs text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Create Room Modal */}
      {modal === 'create' && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !creating && closeModal()}
        >
          <div
            className="retro-panel w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create a Room</h2>
                  <p className="text-xs text-zinc-500">Enter your name to start watching together</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Your display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name..."
                  maxLength={30}
                  autoFocus
                  className="retro-input w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                />
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  A unique room code is generated automatically — no setup needed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Video URL <span className="text-zinc-600">(optional — you can add later)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or .mp4 link"
                    className="retro-input w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube
                  </span>
                  <span className="flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-blue-400" /> Direct video
                  </span>
                </div>
              </div>

              {preview && preview.thumbnail && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <img
                    src={preview.thumbnail}
                    alt="Video preview"
                    className="w-20 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{preview.title}</p>
                    <p className="text-xs text-violet-400 mt-0.5">Ready to play</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Room password <span className="text-zinc-600">(optional — leave blank for open access)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={roomPin}
                    onChange={(e) => setRoomPin(e.target.value)}
                    placeholder="Set a password to restrict access..."
                    maxLength={32}
                    className="retro-input w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  Viewers will need this password to join your watch party.
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-950/50 border border-red-900/50 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="retro-button w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating room...
                  </>
                ) : (
                  <>
                    Start watching
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {modal === 'join' && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !joining && closeModal()}
        >
          <div
            className="retro-panel w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <LogIn className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Join a Room</h2>
                  <p className="text-xs text-zinc-500">Enter your name and the room code to join</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Your display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name..."
                  maxLength={30}
                  autoFocus
                  className="retro-input w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Room code or link
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="e.g. abc12345 or paste invite link"
                    maxLength={200}
                    className="retro-input w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  Ask the host for the room code or paste the full invite link.
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-950/50 border border-red-900/50 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={joining}
                className="retro-button w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining room...
                  </>
                ) : (
                  <>
                    Join watch party
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
