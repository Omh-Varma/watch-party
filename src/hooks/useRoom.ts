import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Room } from '@/types';

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomDeleted, setRoomDeleted] = useState(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      if (data) {
        setRoom(data as Room);
      }
      setLoading(false);

      channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              setRoom(payload.new as Room);
            } else if (payload.eventType === 'DELETE') {
              setRoom(null);
              setRoomDeleted(true);
            }
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function updateRoom(updates: Partial<Room>) {
    if (!roomId) return;
    const { error: err } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId);
    if (err) console.error('updateRoom error:', err.message);
  }

  async function setMedia(url: string, title: string, type: 'youtube' | 'mp4') {
    if (!roomId) return;
    await updateRoom({
      media_url: url,
      media_title: title,
      media_type: type,
      is_playing: false,
      playback_position: 0,
      last_sync_at: new Date().toISOString(),
    });
  }

  async function setPlaybackState(playing: boolean, position: number) {
    if (!roomId) return;
    await updateRoom({
      is_playing: playing,
      playback_position: position,
      last_sync_at: new Date().toISOString(),
    });
  }

  async function disbandRoom() {
    if (!roomId) return;
    // Delete all participants first (so peers get notified via realtime),
    // then delete the room row (cascade cleans up messages, polls, etc.)
    await supabase.from('participants').delete().eq('room_id', roomId);
    const { error: delErr } = await supabase.from('rooms').delete().eq('id', roomId);
    if (delErr) console.error('disbandRoom error:', delErr.message);
  }

  return { room, loading, error, roomDeleted, updateRoom, setMedia, setPlaybackState, disbandRoom };
}
