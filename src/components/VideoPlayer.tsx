import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeAPI } from '@/lib/youtube-api';
import type { Room } from '@/types';

interface VideoPlayerProps {
  room: Room;
  participantId: string | null;
  isHost: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onDurationKnown: (duration: number) => void;
  onBroadcastState: (playing: boolean, position: number) => void;
  onSeekBroadcast?: (position: number) => void;
  onVideoEnded?: () => void;
  syncTrigger: number;
  forceResyncTrigger?: number;
  seekTrigger?: number;
  seekTargetTime?: number;
}

const DRIFT_THRESHOLD = 0.75;
const SYNC_INTERVAL = 1000;
const MIN_SEEK_GAP = 800;
const SEEK_SETTLE_TIME = 600;

export function VideoPlayer({
  room,
  participantId,
  isHost,
  onTimeUpdate,
  onPlayStateChange,
  onDurationKnown,
  onBroadcastState,
  onSeekBroadcast,
  onVideoEnded,
  syncTrigger,
  forceResyncTrigger,
  seekTrigger,
  seekTargetTime,
}: VideoPlayerProps) {
  const ytPlayerRef = useRef<unknown>(null);
  const ytDivRef = useRef<HTMLDivElement>(null);
  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false);
  const syncReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef(0);
  const lastSeekRef = useRef(0);
  const lastPlayStateRef = useRef<boolean | null>(null);
  const roomRef = useRef(room);
  const isHostRef = useRef(isHost);
  const readyRef = useRef(false);
  const onVideoEndedRef = useRef<(() => void) | undefined>(onVideoEnded);
  const onSeekBroadcastRef = useRef(onSeekBroadcast);
  const hostScrubbingRef = useRef(false);
  const hostScrubTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    onVideoEndedRef.current = onVideoEnded;
  }, [onVideoEnded]);

  useEffect(() => {
    onSeekBroadcastRef.current = onSeekBroadcast;
  }, [onSeekBroadcast]);

  const getCurrentTime = useCallback((): number => {
    if (room.media_type === 'youtube' && ytPlayerRef.current) {
      const p = ytPlayerRef.current as { getCurrentTime?: () => number };
      return p.getCurrentTime?.() ?? 0;
    }
    if (room.media_type === 'mp4' && htmlVideoRef.current) {
      return htmlVideoRef.current.currentTime;
    }
    return 0;
  }, [room.media_type]);

  const seekTo = useCallback((time: number) => {
    isSyncingRef.current = true;
    lastSeekRef.current = Date.now();
    if (room.media_type === 'youtube' && ytPlayerRef.current) {
      const p = ytPlayerRef.current as { seekTo?: (t: number, allow: boolean) => void };
      p.seekTo?.(time, true);
    }
    if (room.media_type === 'mp4' && htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = time;
    }
    if (syncReleaseTimeoutRef.current) {
      clearTimeout(syncReleaseTimeoutRef.current);
    }
    syncReleaseTimeoutRef.current = setTimeout(() => {
      isSyncingRef.current = false;
      syncReleaseTimeoutRef.current = null;
    }, SEEK_SETTLE_TIME);
  }, [room.media_type]);

  const setPlaying = useCallback((playing: boolean) => {
    if (lastPlayStateRef.current === playing) return;
    lastPlayStateRef.current = playing;

    if (room.media_type === 'youtube' && ytPlayerRef.current) {
      const p = ytPlayerRef.current as {
        playVideo?: () => void;
        pauseVideo?: () => void;
      };
      if (playing) p.playVideo?.();
      else p.pauseVideo?.();
    }
    if (room.media_type === 'mp4' && htmlVideoRef.current) {
      if (playing) htmlVideoRef.current.play().catch(() => {});
      else htmlVideoRef.current.pause();
    }
  }, [room.media_type]);

  // Play/pause + drift correction — fires on every room state change and sync trigger
  useEffect(() => {
    if (!room.media_url || !readyRef.current) return;

    // Seek correction — viewers only, skipped while host is actively scrubbing
    if (!isHostRef.current && !hostScrubbingRef.current) {
      const expectedTime =
        room.playback_position +
        (room.is_playing
          ? (Date.now() - new Date(room.last_sync_at).getTime()) / 1000
          : 0);

      const actualTime = getCurrentTime();
      const drift = Math.abs(actualTime - expectedTime);

      const now = Date.now();
      if (drift > DRIFT_THRESHOLD && !isSyncingRef.current && (now - lastSeekRef.current > MIN_SEEK_GAP)) {
        seekTo(expectedTime);
      }
    }

    // Play/pause sync — everyone including the host, applied instantly
    setPlaying(room.is_playing);
  }, [syncTrigger, room.last_sync_at, room.is_playing, room.playback_position, room.media_url, getCurrentTime, seekTo, setPlaying]);

  // Periodic time update + drift check
  useEffect(() => {
    if (!room.media_url) return;

    const interval = setInterval(() => {
      if (isSyncingRef.current || !readyRef.current) return;
      if (hostScrubbingRef.current) return;

      const actualTime = getCurrentTime();
      onTimeUpdate(actualTime);

      if (isHostRef.current) return;

      const expectedTime =
        roomRef.current.playback_position +
        (roomRef.current.is_playing
          ? (Date.now() - new Date(roomRef.current.last_sync_at).getTime()) / 1000
          : 0);

      const drift = Math.abs(actualTime - expectedTime);
      const now = Date.now();

      if (drift > DRIFT_THRESHOLD && (now - lastSeekRef.current > MIN_SEEK_GAP)) {
        seekTo(expectedTime);
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [room.media_url, getCurrentTime, seekTo, onTimeUpdate]);

  // Force resync — triggered by the Resync button, bypasses all debounce/threshold guards
  useEffect(() => {
    if (!forceResyncTrigger || !room.media_url || !readyRef.current) return;
    if (isHostRef.current) return;

    // Cancel any in-flight sync lock so the forced seek applies immediately
    if (syncReleaseTimeoutRef.current) {
      clearTimeout(syncReleaseTimeoutRef.current);
      syncReleaseTimeoutRef.current = null;
    }
    isSyncingRef.current = false;

    const expectedTime =
      roomRef.current.playback_position +
      (roomRef.current.is_playing
        ? (Date.now() - new Date(roomRef.current.last_sync_at).getTime()) / 1000
        : 0);

    // Force seek with no debounce — reset lastPlayState so play/pause mirrors host exactly
    lastPlayStateRef.current = null;
    lastSeekRef.current = 0;
    seekTo(expectedTime);
    setPlaying(roomRef.current.is_playing);
  }, [forceResyncTrigger, room.media_url, seekTo, setPlaying]);

  // Dedicated seek trigger — received from the video-seek broadcast, bypasses all guards
  useEffect(() => {
    if (!seekTrigger || !room.media_url || !readyRef.current) return;
    if (isHostRef.current) return;
    if (seekTargetTime === undefined) return;

    // Cancel any in-flight sync lock so the forced seek applies immediately
    if (syncReleaseTimeoutRef.current) {
      clearTimeout(syncReleaseTimeoutRef.current);
      syncReleaseTimeoutRef.current = null;
    }
    isSyncingRef.current = false;
    lastSeekRef.current = 0;
    lastPlayStateRef.current = null;

    seekTo(seekTargetTime);
    setPlaying(roomRef.current.is_playing);
  }, [seekTrigger, seekTargetTime, room.media_url, seekTo, setPlaying]);

  // YouTube player setup — recreates when media URL or host status changes
  useEffect(() => {
    if (room.media_type !== 'youtube' || !room.media_url) return;
    const videoId = extractYouTubeId(room.media_url);
    if (!videoId) return;

    let destroyed = false;
    readyRef.current = false;
    lastPlayStateRef.current = null;

    (async () => {
      await loadYouTubeAPI();
      if (destroyed || !ytDivRef.current) return;

      if (ytPlayerRef.current) {
        const p = ytPlayerRef.current as { destroy?: () => void };
        p.destroy?.();
        ytPlayerRef.current = null;
      }

      const YT = (window as unknown as {
        YT: {
          Player: new (el: HTMLElement, config: unknown) => unknown;
          PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number };
        };
      }).YT;

      ytPlayerRef.current = new YT.Player(ytDivRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: isHost ? 0 : 1,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            const p = ytPlayerRef.current as {
              getDuration?: () => number;
              getCurrentTime?: () => number;
              seekTo?: (t: number, a: boolean) => void;
              playVideo?: () => void;
              pauseVideo?: () => void;
            };
            const duration = p.getDuration?.() ?? 0;
            onDurationKnown(duration);
            readyRef.current = true;

            const expectedTime =
              roomRef.current.playback_position +
              (roomRef.current.is_playing
                ? (Date.now() - new Date(roomRef.current.last_sync_at).getTime()) / 1000
                : 0);

            if (expectedTime > 1) {
              isSyncingRef.current = true;
              lastSeekRef.current = Date.now();
              p.seekTo?.(expectedTime, true);
              setTimeout(() => { isSyncingRef.current = false; }, SEEK_SETTLE_TIME);
            }
            if (roomRef.current.is_playing) {
              lastPlayStateRef.current = true;
              p.playVideo?.();
            } else {
              lastPlayStateRef.current = false;
              p.pauseVideo?.();
            }
          },
          onStateChange: (event: { data: number }) => {
            const YTStates = (window as unknown as {
              YT: { PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number } };
            }).YT.PlayerState;

            if (event.data === YTStates.PLAYING) {
              lastPlayStateRef.current = true;
            } else if (event.data === YTStates.PAUSED) {
              lastPlayStateRef.current = false;
            }

            // Host scrubbing detection: BUFFERING state while host is active means a seek/scrub
            if (isHostRef.current && event.data === YTStates.BUFFERING && !isSyncingRef.current) {
              hostScrubbingRef.current = true;
              if (hostScrubTimeoutRef.current) clearTimeout(hostScrubTimeoutRef.current);
              const seekTime = getCurrentTime();
              hostScrubTimeoutRef.current = setTimeout(() => {
                hostScrubbingRef.current = false;
                // Broadcast the seeked position to all viewers
                onSeekBroadcastRef.current?.(seekTime);
              }, 300);
            }

            if (isSyncingRef.current) return;
            if (!isHostRef.current) return;

            if (event.data === YTStates.PLAYING) {
              onPlayStateChange(true);
              broadcastIfStale(true);
            } else if (event.data === YTStates.PAUSED) {
              onPlayStateChange(false);
              broadcastIfStale(false);
            } else if (event.data === YTStates.ENDED) {
              onPlayStateChange(false);
              broadcastIfStale(false);
              onVideoEndedRef.current?.();
            }
          },
        },
      });
    })();

    function broadcastIfStale(playing: boolean) {
      const now = Date.now();
      if (now - lastBroadcastRef.current > 1000) {
        lastBroadcastRef.current = now;
        onBroadcastState(playing, getCurrentTime());
      }
    }

    return () => {
      destroyed = true;
      readyRef.current = false;
      if (ytPlayerRef.current) {
        const p = ytPlayerRef.current as { destroy?: () => void };
        p.destroy?.();
        ytPlayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.media_type, room.media_url, isHost]);

  // HTML5 video player setup
  useEffect(() => {
    if (room.media_type !== 'mp4' || !room.media_url) return;
    const video = htmlVideoRef.current;
    if (!video) return;
    readyRef.current = false;
    lastPlayStateRef.current = null;

    video.src = room.media_url;
    video.load();

    const onLoaded = () => {
      onDurationKnown(video.duration || 0);
      readyRef.current = true;

      const expectedTime =
        roomRef.current.playback_position +
        (roomRef.current.is_playing
          ? (Date.now() - new Date(roomRef.current.last_sync_at).getTime()) / 1000
          : 0);

      if (expectedTime > 1) {
        isSyncingRef.current = true;
        lastSeekRef.current = Date.now();
        video.currentTime = expectedTime;
        setTimeout(() => { isSyncingRef.current = false; }, SEEK_SETTLE_TIME);
      }
      if (roomRef.current.is_playing) {
        lastPlayStateRef.current = true;
        video.play().catch(() => {});
      } else {
        lastPlayStateRef.current = false;
        video.pause();
      }
    };

    const onPlay = () => {
      lastPlayStateRef.current = true;
      if (isSyncingRef.current) return;
      onPlayStateChange(true);
      if (isHostRef.current) {
        const now = Date.now();
        if (now - lastBroadcastRef.current > 1000) {
          lastBroadcastRef.current = now;
          onBroadcastState(true, video.currentTime);
        }
      }
    };

    const onPause = () => {
      lastPlayStateRef.current = false;
      if (isSyncingRef.current) return;
      onPlayStateChange(false);
      if (isHostRef.current) {
        const now = Date.now();
        if (now - lastBroadcastRef.current > 1000) {
          lastBroadcastRef.current = now;
          onBroadcastState(false, video.currentTime);
        }
      }
    };

    const onTimeUpdateHandler = () => {
      onTimeUpdate(video.currentTime);
    };

    const onSeeking = () => {
      if (isHostRef.current) {
        // Host scrubbed — broadcast the new position to all viewers
        hostScrubbingRef.current = true;
        if (hostScrubTimeoutRef.current) clearTimeout(hostScrubTimeoutRef.current);
        const seekTime = video.currentTime;
        hostScrubTimeoutRef.current = setTimeout(() => {
          hostScrubbingRef.current = false;
          onSeekBroadcastRef.current?.(seekTime);
        }, 200);
      } else if (!isSyncingRef.current) {
        // Viewer local seek — correct back to host position
        const expectedTime =
          roomRef.current.playback_position +
          (roomRef.current.is_playing
            ? (Date.now() - new Date(roomRef.current.last_sync_at).getTime()) / 1000
            : 0);
        isSyncingRef.current = true;
        video.currentTime = expectedTime;
        setTimeout(() => { isSyncingRef.current = false; }, SEEK_SETTLE_TIME);
      }
    };

    const onEnded = () => {
      onVideoEndedRef.current?.();
    };

    const onRateChange = () => {
      if (!isHostRef.current && video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdateHandler);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('ended', onEnded);
    video.addEventListener('ratechange', onRateChange);

    return () => {
      readyRef.current = false;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdateHandler);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('ratechange', onRateChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.media_type, room.media_url]);

  if (!room.media_url) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black rounded-2xl">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4 opacity-20">🎬</div>
          <p className="text-zinc-500 text-lg">No video loaded yet</p>
          <p className="text-zinc-600 text-sm mt-2">
            Search for a video in the Discover tab or paste a URL to start watching together
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
      {room.media_type === 'youtube' ? (
        <div className="w-full h-full">
          <div ref={ytDivRef} className="w-full h-full" />
        </div>
      ) : (
        <video
          ref={htmlVideoRef}
          className="w-full h-full"
          controls={isHost}
          playsInline
        />
      )}

      {!isHost && room.media_url && (
        <div className="absolute inset-0 z-20 pointer-events-auto flex items-end justify-center pb-3">
          <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 pointer-events-none">
            <span className="text-[11px] text-zinc-300 font-medium">Host controls playback</span>
          </div>
        </div>
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : url;
}
