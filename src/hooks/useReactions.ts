import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Reaction } from '@/types';

export function useReactions(roomId: string | null, participantId: string | null) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const participantIdRef = useRef<string | null>(null);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`reactions:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const reaction = payload.new as Reaction;
          setReactions((prev) => [...prev.slice(-30), reaction]);

          // Auto-remove after animation
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 4000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function sendReaction(emoji: string) {
    if (!roomId) return;
    const { error } = await supabase.from('reactions').insert({
      room_id: roomId,
      participant_id: participantIdRef.current,
      emoji,
    });
    if (error) console.error('sendReaction error:', error.message);
  }

  return { reactions, sendReaction };
}
