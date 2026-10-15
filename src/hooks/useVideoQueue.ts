import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { VideoQueueItem } from '@/types';

export function useVideoQueue(roomId: string | null, participantId: string | null) {
  const [queue, setQueue] = useState<VideoQueueItem[]>([]);
  const participantIdRef = useRef<string | null>(null);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  const loadQueue = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('video_queue')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true });

    if (error) {
      console.error('loadQueue error:', error.message);
      return;
    }
    setQueue((data as VideoQueueItem[]) ?? []);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    loadQueue();

    const channel = supabase
      .channel(`video_queue:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_queue', filter: `room_id=eq.${roomId}` },
        () => loadQueue(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, loadQueue]);

  const addToQueue = useCallback(async (url: string, title: string, mediaType: 'youtube' | 'mp4') => {
    if (!roomId) return;
    const nextPosition = queue.length > 0 ? Math.max(...queue.map((q) => q.position)) + 1 : 0;
    const { error } = await supabase.from('video_queue').insert({
      room_id: roomId,
      url,
      title,
      media_type: mediaType,
      position: nextPosition,
      added_by: participantIdRef.current,
    });
    if (error) console.error('addToQueue error:', error.message);
  }, [roomId, queue.length]);

  const removeFromQueue = useCallback(async (itemId: string) => {
    const { error } = await supabase.from('video_queue').delete().eq('id', itemId);
    if (error) console.error('removeFromQueue error:', error.message);
  }, []);

  const playNext = useCallback(async (): Promise<VideoQueueItem | null> => {
    if (!roomId || queue.length === 0) return null;
    const next = queue[0];
    await supabase.from('video_queue').delete().eq('id', next.id);
    return next;
  }, [roomId, queue]);

  return { queue, addToQueue, removeFromQueue, playNext };
}
