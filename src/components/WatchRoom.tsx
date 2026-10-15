import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Share2, Search, MessageCircle, Users, BarChart3,
  Play, Pause, SkipBack, SkipForward, Heart, Flame, ThumbsUp,
  Laugh, PartyPopper, Check, Link as LinkIcon, X, LogOut, Wifi,
  Crown, Radio, Loader2, Hash, ListVideo, Trash2, Plus, RefreshCw,
} from 'lucide-react';
import { useRoom } from '@/hooks/useRoom';
import { useParticipants } from '@/hooks/useParticipants';
import { useChat } from '@/hooks/useChat';
import { usePolls } from '@/hooks/usePolls';
import { useReactions } from '@/hooks/useReactions';
import { usePlaybackEvents } from '@/hooks/usePlaybackEvents';
import { useVideoQueue } from '@/hooks/useVideoQueue';
import { useToast } from '@/components/ToastProvider';
import { useReconnectionBanner } from '@/components/ReconnectionBanner';
import { getOrCreateIdentity, generateNickname, randomColor } from '@/lib/identity';
import { VideoPlayer } from '@/components/VideoPlayer';
import { EmojiReactions } from '@/components/EmojiReactions';
import { DiscoverTab } from '@/components/DiscoverTab';
import { ChatTab } from '@/components/ChatTab';
import { PeopleTab } from '@/components/PeopleTab';
import { PollsTab } from '@/components/PollsTab';
import { getYouTubeVideoId, getYouTubeThumbnail, parseVideoUrl } from '@/lib/youtube';
import { supabase } from '@/lib/supabase';
import { FilmStripArt, ProjectorArt, FilmReelArt, StarburstArt, ClapperboardArt, PopcornBucketArt } from '@/components/CinemaArt';

interface WatchRoomProps {
  roomId: string;
  onLeave: () => void;
  initialName?: string;
  initialColor?: string;
}

type Tab = 'discover' | 'chat' | 'people' | 'polls' | 'queue';

const REACTION_EMOJIS = [
  { emoji: '❤️', icon: Heart },
  { emoji: '🔥', icon: Flame },
  { emoji: '👍', icon: ThumbsUp },
  { emoji: '😂', icon: Laugh },
  { emoji: '🎉', icon: PartyPopper },
];

export function WatchRoom({ roomId, onLeave, initialName, initialColor }: WatchRoomProps) {
  const [identity, setIdentity] = useState(() => {
    if (initialName) {
      const stored = localStorage.getItem('syncstream_participant');
      let id = crypto.randomUUID();
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id) id = parsed.id;
        } catch { /* use new id */ }
      }
      const newIdentity = {
        id,
        nickname: initialName,
        color: initialColor || randomColor(),
      };
      localStorage.setItem('syncstream_participant', JSON.stringify(newIdentity));
      return newIdentity;
    }
    return getOrCreateIdentity();
  });
  const [tab, setTab] = useState<Tab>('discover');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [synced, setSynced] = useState(true);
  const [drift, setDrift] = useState(0);
  const [showQueueAdd, setShowQueueAdd] = useState(false);
  const [queueUrlInput, setQueueUrlInput] = useState('');
  const [forceResyncTrigger, setForceResyncTrigger] = useState(0);
  const [seekTrigger, setSeekTrigger] = useState(0);
  const [seekTargetTime, setSeekTargetTime] = useState(0);
  const [resyncPulse, setResyncPulse] = useState(false);
  const resyncPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const meIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  const reconnectionBanner = useReconnectionBanner();

  const { room, loading, error, roomDeleted, setMedia, setPlaybackState, disbandRoom } = useRoom(roomId);
  const { participants, me } = useParticipants(roomId, identity);
  const { messages, sendMessage } = useChat(roomId, me?.id ?? null);
  const { polls, createPoll, vote } = usePolls(roomId, me?.id ?? null);
  const { reactions, sendReaction } = useReactions(roomId, me?.id ?? null);
  const { emitEvent } = usePlaybackEvents(roomId);
  const { queue, addToQueue, removeFromQueue, playNext } = useVideoQueue(roomId, me?.id ?? null);

  useEffect(() => { meIdRef.current = me?.id ?? null; }, [me?.id]);

  const currentTimeRef = useRef(0);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Track previous participant count for join/leave toasts
  const prevParticipantIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(participants.map((p) => p.id));
    const prevIds = prevParticipantIdsRef.current;

    if (prevIds.size > 0) {
      for (const p of participants) {
        if (!prevIds.has(p.id) && p.id !== me?.id) {
          toastRef.current(`${p.nickname} joined the room`, 'info');
        }
      }
      for (const p of participants) {
        if (prevIds.has(p.id) && !currentIds.has(p.id)) {
          toastRef.current(`${p.nickname} left the room`, 'info');
        }
      }
    }
    prevParticipantIdsRef.current = currentIds;
  }, [participants, me?.id]);

  // Toast when video changes
  const prevMediaUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (room && prevMediaUrlRef.current !== null && prevMediaUrlRef.current !== room.media_url && room.media_url) {
      toastRef.current(`Now playing: ${room.media_title || 'New video'}`, 'success');
    }
    prevMediaUrlRef.current = room?.media_url ?? null;
  }, [room?.media_url, room?.media_title]);

  // Toast when new poll created
  const prevPollCountRef = useRef(0);
  useEffect(() => {
    if (polls.length > prevPollCountRef.current && prevPollCountRef.current >= 0) {
      const latest = polls[0];
      if (latest && latest.poll.created_by !== me?.id) {
        toastRef.current('New poll created', 'info');
      }
    }
    prevPollCountRef.current = polls.length;
  }, [polls, me?.id]);

  // Subscribe to playback_events for sync trigger
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`sync_trigger:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'playback_events', filter: `room_id=eq.${roomId}` },
        () => setSyncTrigger((prev) => prev + 1),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => setSyncTrigger((prev) => prev + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Dedicated video-seek broadcast channel — instant seek delivery, bypasses DB round-trip
  useEffect(() => {
    if (!roomId) return;
    const seekChannel = supabase
      .channel(`video-seek:${roomId}`)
      .on('broadcast', { event: 'video-seek' }, (payload: { payload?: { position?: number; senderId?: string } }) => {
        const position = payload?.payload?.position;
        const senderId = payload?.payload?.senderId;
        if (position === undefined) return;
        if (senderId === meIdRef.current) return; // ignore our own broadcast
        setSeekTargetTime(position);
        setSeekTrigger((prev) => prev + 1);
      })
      .subscribe();
    seekChannelRef.current = seekChannel;

    return () => {
      supabase.removeChannel(seekChannel);
      seekChannelRef.current = null;
    };
  }, [roomId]);

  const lastRoomStateRef = useRef('');
  useEffect(() => {
    if (!room) return;
    const stateKey = `${room.is_playing}:${room.playback_position}:${room.last_sync_at}:${room.media_url}`;
    if (stateKey === lastRoomStateRef.current) return;
    lastRoomStateRef.current = stateKey;
    setIsPlaying(room.is_playing);
    setSyncTrigger((prev) => prev + 1);
  }, [room?.is_playing, room?.playback_position, room?.last_sync_at, room?.media_url]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    if (room) {
      const expected = room.playback_position +
        (room.is_playing ? (Date.now() - new Date(room.last_sync_at).getTime()) / 1000 : 0);
      const d = Math.abs(time - expected);
      setDrift(d);
      setSynced(d < 0.75);
    }
  }, [room]);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    if (me?.is_host) {
      setPlaybackState(playing, currentTimeRef.current);
      emitEvent(playing ? 'play' : 'pause', currentTimeRef.current, me.id);
    }
  }, [me, setPlaybackState, emitEvent]);

  const handleDurationKnown = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  const handleBroadcastState = useCallback((playing: boolean, position: number) => {
    if (me?.is_host) {
      setPlaybackState(playing, position);
      emitEvent(playing ? 'play' : 'pause', position, me.id);
    }
  }, [setPlaybackState, emitEvent, me]);

  // Auto-play next video in queue when current video ends
  const handleVideoEnded = useCallback(async () => {
    if (me?.is_host && queue.length > 0) {
      const next = await playNext();
      if (next) {
        setMedia(next.url, next.title, next.media_type as 'youtube' | 'mp4');
        if (me) emitEvent('load', 0, me.id);
        setSyncTrigger((prev) => prev + 1);
        toastRef.current(`Playing next: ${next.title}`, 'success');
      }
    }
  }, [me, queue, playNext, setMedia, emitEvent]);

  function handlePlayVideo(videoId: string, title: string) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    setMedia(url, title, 'youtube');
    if (me) emitEvent('load', 0, me.id);
    setSyncTrigger((prev) => prev + 1);
  }

  async function handleLoadUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const videoId = getYouTubeVideoId(urlInput);
    if (videoId) {
      setMedia(`https://www.youtube.com/watch?v=${videoId}`, 'YouTube video', 'youtube');
    } else {
      setMedia(urlInput.trim(), 'Direct video', 'mp4');
    }
    if (me) emitEvent('load', 0, me.id);
    setUrlInput('');
    setShowUrlInput(false);
    setSyncTrigger((prev) => prev + 1);
  }

  async function handleAddToQueue(e: React.FormEvent) {
    e.preventDefault();
    if (!queueUrlInput.trim()) return;
    const parsed = parseVideoUrl(queueUrlInput);
    const title = parsed.videoId ? 'YouTube video' : 'Direct video';
    await addToQueue(
      parsed.videoId ? `https://www.youtube.com/watch?v=${parsed.videoId}` : parsed.directUrl || queueUrlInput.trim(),
      title,
      parsed.type,
    );
    setQueueUrlInput('');
    setShowQueueAdd(false);
    toast('Added to queue', 'success');
  }

  function handleSeek(delta: number) {
    const newTime = Math.max(0, currentTimeRef.current + delta);
    if (me?.is_host) {
      setPlaybackState(isPlaying, newTime);
      emitEvent('seek', newTime, me.id);
      // Instant broadcast to all viewers via realtime channel
      seekChannelRef.current?.send({
        type: 'broadcast',
        event: 'video-seek',
        payload: { position: newTime, senderId: me.id },
      });
    }
    setSyncTrigger((prev) => prev + 1);
  }

  const handleSeekBroadcast = useCallback((position: number) => {
    if (!me?.is_host) return;
    setPlaybackState(isPlaying, position);
    emitEvent('seek', position, me.id);
    seekChannelRef.current?.send({
      type: 'broadcast',
      event: 'video-seek',
      payload: { position, senderId: me.id },
    });
  }, [me, isPlaying, setPlaybackState, emitEvent]);

  // Host management actions
  async function handleTransferHost(participantId: string) {
    if (!me?.is_host) return;
    await supabase.from('participants').update({ is_host: true }).eq('id', participantId);
    await supabase.from('participants').update({ is_host: false }).eq('id', me.id);
    const target = participants.find((p) => p.id === participantId);
    if (target) toast(`Transferred host to ${target.nickname}`, 'success');
  }

  async function handleKick(participantId: string) {
    if (!me?.is_host) return;
    await supabase.from('participants').update({ kicked: true }).eq('id', participantId);
    const target = participants.find((p) => p.id === participantId);
    if (target) toast(`Removed ${target.nickname} from the room`, 'info');
  }

  // Check if we've been kicked
  useEffect(() => {
    if (me?.kicked) {
      toast('You were removed from the room', 'error');
      setTimeout(() => onLeave(), 2000);
    }
  }, [me?.kicked, onLeave, toast]);

  // Detect room disband (host left and deleted the room)
  useEffect(() => {
    if (roomDeleted) {
      toast('The host disbanded the room', 'error');
      const timer = setTimeout(() => onLeave(), 2500);
      return () => clearTimeout(timer);
    }
  }, [roomDeleted, onLeave, toast]);

  async function handleLeave() {
    if (me?.is_host) {
      await disbandRoom();
    }
    onLeave();
  }

  function copyRoomLink() {
    const url = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyRoomCode() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }

  function regenerateIdentity() {
    const newId = {
      id: crypto.randomUUID(),
      nickname: generateNickname(),
      color: randomColor(),
    };
    localStorage.setItem('syncstream_participant', JSON.stringify(newId));
    setIdentity(newId);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-violet-600 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-lg mb-2">Room not found</p>
          <p className="text-zinc-500 text-sm mb-6">{error || 'This room may have been deleted.'}</p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Search; count?: number }[] = [
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'queue', label: 'Queue', icon: ListVideo, count: queue.length },
    { id: 'chat', label: 'Chat', icon: MessageCircle, count: messages.length },
    { id: 'people', label: 'People', icon: Users, count: participants.length },
    { id: 'polls', label: 'Polls', icon: BarChart3, count: polls.length },
  ];

  const currentVideoThumb = room.media_type === 'youtube' && room.media_url
    ? getYouTubeThumbnail(getYouTubeVideoId(room.media_url) || '')
    : null;

  return (
    <div className="watch-shell h-screen bg-black text-white flex flex-col overflow-hidden">
      {reconnectionBanner}

      {/* Top bar */}
      <header className="watch-header flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl z-30 relative">
        <FilmReelArt className="hidden lg:block absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 opacity-30 pointer-events-none" />
        <ProjectorArt className="hidden xl:block absolute right-40 top-1/2 -translate-y-1/2 w-16 h-12 opacity-20 pointer-events-none" />
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleLeave}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-900 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{room.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{participants.length} watching</span>
              {me?.is_host && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                  Host
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomCode}
            title="Copy room code"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Hash className="w-3.5 h-3.5" />}
            <span className="uppercase tracking-wider">{copiedCode ? 'Copied!' : roomId}</span>
          </button>
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Invite'}
          </button>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-950/80 hover:bg-red-900/80 text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-900 transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4 text-zinc-400" /> : <MessageCircle className="w-4 h-4 text-zinc-400" />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Player container */}
          <div className="video-stage relative flex-1 flex items-center justify-center p-3 lg:p-6 bg-black">
            <FilmStripArt className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-10 h-48 opacity-30 pointer-events-none z-10" />
            <FilmStripArt className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-10 h-48 opacity-30 pointer-events-none z-10" />
            <ProjectorArt className="hidden lg:block absolute left-2 top-2 w-24 opacity-25 pointer-events-none" />
            <FilmReelArt className="hidden lg:block absolute right-2 bottom-2 w-20 h-20 opacity-25 pointer-events-none" />
            <StarburstArt className="hidden xl:block absolute left-6 top-6 w-14 h-14 opacity-35 pointer-events-none -rotate-12" />
            <ClapperboardArt className="hidden lg:block absolute right-6 top-2 w-20 h-16 opacity-20 pointer-events-none rotate-6" />
            <PopcornBucketArt className="hidden lg:block absolute left-4 bottom-4 w-16 h-20 opacity-20 pointer-events-none" />
            <div className="video-frame relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <VideoPlayer
                room={room}
                participantId={me?.id ?? null}
                isHost={!!me?.is_host}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                onDurationKnown={handleDurationKnown}
                onBroadcastState={handleBroadcastState}
                onSeekBroadcast={handleSeekBroadcast}
                onVideoEnded={handleVideoEnded}
                syncTrigger={syncTrigger}
                forceResyncTrigger={forceResyncTrigger}
                seekTrigger={seekTrigger}
                seekTargetTime={seekTargetTime}
              />
              <EmojiReactions reactions={reactions} />

              {/* Reaction bar */}
              {room.media_url && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10">
                  {REACTION_EMOJIS.map(({ emoji, icon: Icon }) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all hover:scale-125 active:scale-95 group"
                    >
                      <span className="text-lg group-hover:hidden">{emoji}</span>
                      <Icon className="w-4 h-4 text-white hidden group-hover:block" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls bar */}
          <div className="controls-bar border-t border-zinc-900 bg-zinc-950 px-4 py-3">
            <div className="max-w-5xl mx-auto">
              {/* Sync status badge */}
              {room.media_url && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-3 bg-zinc-900/60 rounded-lg w-fit">
                  <div className="flex items-center gap-1.5">
                    {isPlaying ? (
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    ) : (
                      <Pause className="w-3 h-3 text-zinc-400" />
                    )}
                    <span className="text-[11px] font-mono text-white tabular-nums">
                      {formatTimecode(currentTime)} / {formatTimecode(duration)}
                    </span>
                  </div>
                  <div className="w-px h-3 bg-white/15" />
                  <div className="flex items-center gap-1">
                    {synced ? (
                      <Wifi className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                    )}
                    <span className="text-[10px] text-zinc-300">
                      {synced ? 'Synced' : `±${drift.toFixed(1)}s`}
                    </span>
                  </div>
                  {queue.length > 0 && (
                    <>
                      <div className="w-px h-3 bg-white/15" />
                      <div className="flex items-center gap-1">
                        <ListVideo className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] text-violet-300">{queue.length} in queue</span>
                      </div>
                    </>
                  )}
                  {me?.is_host && (
                    <>
                      <div className="w-px h-3 bg-white/15" />
                      <div className="flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-amber-300 font-medium">Host</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSeek(-10)}
                    disabled={!me?.is_host}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SkipBack className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => handlePlayStateChange(!isPlaying)}
                    disabled={!me?.is_host}
                    className="w-11 h-11 flex items-center justify-center bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSeek(10)}
                    disabled={!me?.is_host}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SkipForward className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>

                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                  {currentVideoThumb && (
                    <img src={currentVideoThumb} alt="" className="w-8 h-5 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="text-sm text-zinc-400 truncate">
                    {room.media_title || (room.media_url ? 'Now playing' : 'No video loaded')}
                  </span>
                  {!me?.is_host && room.media_url && (
                    <span className="text-[10px] text-zinc-600 hidden sm:inline flex-shrink-0">
                      Host controls playback
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!me?.is_host && room.media_url && (
                    <button
                      onClick={() => {
                        setForceResyncTrigger((prev) => prev + 1);
                        setResyncPulse(true);
                        if (resyncPulseTimerRef.current) clearTimeout(resyncPulseTimerRef.current);
                        resyncPulseTimerRef.current = setTimeout(() => setResyncPulse(false), 1200);
                        toast('Resyncing to host...', 'info');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 rounded-lg transition-colors ${
                        resyncPulse ? 'resync-pulse' : ''
                      }`}
                      title="Force sync to host's exact position"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resyncPulse ? 'animate-spin' : ''}`} />
                      <span>Resync</span>
                    </button>
                  )}
                  <button
                    onClick={() => setTab('queue')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors"
                  >
                    <ListVideo className="w-3.5 h-3.5" />
                    Queue
                    {queue.length > 0 && (
                      <span className="text-[9px] bg-violet-600 text-white rounded-full px-1.5">{queue.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    disabled={!me?.is_host}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Load URL
                  </button>
                </div>
              </div>

              {/* URL input bar */}
              {showUrlInput && (
                <form onSubmit={handleLoadUrl} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube or direct video URL..."
                    className="flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Load
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={`watch-sidebar ${
            sidebarOpen ? 'w-full lg:w-[360px]' : 'hidden lg:w-[360px] lg:block'
          } flex-shrink-0 border-l border-zinc-900 bg-zinc-950 flex flex-col`}
        >
          {/* Tab header */}
          <div className="flex border-b border-zinc-900">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                  tab === id ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {count !== undefined && count > 0 && (
                    <span className="absolute -top-1.5 -right-2 text-[8px] font-bold bg-violet-600 text-white rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
                {tab === id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {tab === 'discover' && <DiscoverTab onPlayVideo={handlePlayVideo} />}
            {tab === 'queue' && (
              <QueueTab
                queue={queue}
                onAdd={() => setShowQueueAdd(!showQueueAdd)}
                showAdd={showQueueAdd}
                queueUrlInput={queueUrlInput}
                setQueueUrlInput={setQueueUrlInput}
                onAddSubmit={handleAddToQueue}
                onRemove={removeFromQueue}
                isHost={!!me?.is_host}
              />
            )}
            {tab === 'chat' && (
              <ChatTab
                messages={messages}
                onSend={sendMessage}
                nickname={identity.nickname}
                color={identity.color}
                myId={me?.id ?? null}
              />
            )}
            {tab === 'people' && (
              <PeopleTab
                participants={participants}
                myId={me?.id ?? null}
                isHost={!!me?.is_host}
                onTransferHost={handleTransferHost}
                onKick={handleKick}
              />
            )}
            {tab === 'polls' && (
              <PollsTab
                polls={polls}
                onCreatePoll={createPoll}
                onVote={vote}
                myId={me?.id ?? null}
              />
            )}
          </div>

          {/* Identity footer */}
          <div className="border-t border-zinc-900 p-3 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: identity.color }}
            >
              {identity.nickname.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{identity.nickname}</p>
              <button
                onClick={regenerateIdentity}
                className="text-[10px] text-zinc-600 hover:text-violet-400 transition-colors"
              >
                Change name
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatTimecode(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface QueueTabProps {
  queue: { id: string; title: string; url: string; media_type: string; added_by: string | null; position: number }[];
  onAdd: () => void;
  showAdd: boolean;
  queueUrlInput: string;
  setQueueUrlInput: (v: string) => void;
  onAddSubmit: (e: React.FormEvent) => void;
  onRemove: (id: string) => void;
  isHost: boolean;
}

function QueueTab({ queue, onAdd, showAdd, queueUrlInput, setQueueUrlInput, onAddSubmit, onRemove, isHost }: QueueTabProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm text-zinc-400">{queue.length} in queue</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? 'Cancel' : 'Add Video'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={onAddSubmit} className="p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={queueUrlInput}
              onChange={(e) => setQueueUrlInput(e.target.value)}
              placeholder="Paste YouTube or video URL..."
              className="flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
        {queue.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListVideo className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">Queue is empty</p>
            <p className="text-zinc-600 text-xs mt-1">Add videos to play them in sequence</p>
          </div>
        )}
        {queue.map((item, index) => {
          const thumb = item.media_type === 'youtube'
            ? getYouTubeThumbnail(getYouTubeVideoId(item.url) || '')
            : null;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-xs font-mono text-zinc-500 w-5 text-center flex-shrink-0">
                {index + 1}
              </span>
              {thumb && (
                <img src={thumb} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.title}</p>
                <p className="text-[10px] text-zinc-600 truncate">{item.url}</p>
              </div>
              {(isHost || true) && (
                <button
                  onClick={() => onRemove(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
