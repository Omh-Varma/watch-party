import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

export function useChat(roomId: string | null, participantId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const participantIdRef = useRef<string | null>(null);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  useEffect(() => {
    if (!roomId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function loadMessages() {
      if (cancelled || !roomId) return;
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (cancelled) return;
      if (error) {
        console.error('loadMessages error:', error.message);
        return;
      }
      setMessages((data as Message[]) || []);
    }

    // Load existing messages immediately
    loadMessages();

    // Set up realtime subscription for new messages
    channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  async function sendMessage(content: string, nickname: string, color: string) {
    if (!roomId || !content.trim()) return;
    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      participant_id: participantIdRef.current,
      nickname,
      color,
      content: content.trim(),
    });
    if (error) console.error('sendMessage error:', error.message);
  }

  return { messages, sendMessage };
}
