import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlaybackEvent } from '@/types';

export function usePlaybackEvents(roomId: string | null) {
  const [events, setEvents] = useState<PlaybackEvent[]>([]);
  const latestEventRef = useRef<PlaybackEvent | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from('playback_events')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        latestEventRef.current = data[0] as PlaybackEvent;
      }

      channel = supabase
        .channel(`playback_events:${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'playback_events', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const evt = payload.new as PlaybackEvent;
            latestEventRef.current = evt;
            setEvents((prev) => [...prev.slice(-50), evt]);
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function emitEvent(eventType: string, position: number, participantId: string | null) {
    if (!roomId) return;
    const { error } = await supabase.from('playback_events').insert({
      room_id: roomId,
      participant_id: participantId,
      event_type: eventType,
      event_position: position,
    });
    if (error) console.error('emitEvent error:', error.message);
  }

  return { events, latestEvent: latestEventRef.current, emitEvent };
}
