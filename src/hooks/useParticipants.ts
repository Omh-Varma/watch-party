import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Participant } from '@/types';

export interface Identity {
  id: string;
  nickname: string;
  color: string;
}

const HEARTBEAT_INTERVAL = 8000;
const REFRESH_INTERVAL = 6000;

export function useParticipants(roomId: string | null, identity: Identity) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [me, setMe] = useState<Participant | null>(null);
  const meRef = useRef<Participant | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  useEffect(() => {
    if (!roomId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    joinedRef.current = false;

    async function loadParticipants() {
      if (cancelled || !roomId) return;
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('loadParticipants error:', error.message);
        return;
      }
      const list = (data as Participant[]) ?? [];
      setParticipants(list);
      const self = list.find((p) => p.id === identity.id);
      if (self) {
        setMe(self);
        meRef.current = self;
      }
    }

    async function joinRoom() {
      if (cancelled || joinedRef.current) return;
      joinedRef.current = true;

      // Check if we already have a row
      const { data: existing, error: findErr } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId!)
        .eq('id', identity.id)
        .maybeSingle();

      if (cancelled) return;

      if (findErr) {
        console.error('joinRoom find error:', findErr.message);
      }

      if (existing) {
        // Update our existing row
        const { data: updated, error: updErr } = await supabase
          .from('participants')
          .update({
            nickname: identity.nickname,
            color: identity.color,
            last_seen: new Date().toISOString(),
          })
          .eq('id', identity.id)
          .select()
          .single();

        if (updErr) {
          console.error('joinRoom update error:', updErr.message);
        } else {
          setMe(updated as Participant);
          meRef.current = updated as Participant;
        }
      } else {
        // Check if this is the first participant → host
        const { count, error: countErr } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId!);

        if (cancelled) return;

        const isHost = count === 0 && !countErr;

        const { data: created, error: insErr } = await supabase
          .from('participants')
          .insert({
            id: identity.id,
            room_id: roomId!,
            nickname: identity.nickname,
            color: identity.color,
            is_host: isHost,
            last_seen: new Date().toISOString(),
          })
          .select()
          .single();

        if (insErr) {
          // Row might have been created concurrently — try update
          const { data: fallback, error: fbErr } = await supabase
            .from('participants')
            .update({
              nickname: identity.nickname,
              color: identity.color,
              last_seen: new Date().toISOString(),
            })
            .eq('id', identity.id)
            .select()
            .single();

          if (fbErr) {
            console.error('joinRoom fallback error:', fbErr.message);
          } else {
            setMe(fallback as Participant);
            meRef.current = fallback as Participant;
          }
        } else {
          setMe(created as Participant);
          meRef.current = created as Participant;
        }
      }

      // Load all participants after joining
      await loadParticipants();
    }

    // Load existing participants immediately (don't wait for subscription)
    loadParticipants();

    // Set up realtime subscription
    channel = supabase
      .channel(`participants:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p = payload.new as Participant;
            setParticipants((prev) => {
              if (prev.some((x) => x.id === p.id)) return prev;
              return [...prev, p].sort((a, b) =>
                a.created_at.localeCompare(b.created_at),
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const p = payload.new as Participant;
            setParticipants((prev) => {
              const exists = prev.some((x) => x.id === p.id);
              const next = exists
                ? prev.map((x) => (x.id === p.id ? p : x))
                : [...prev, p];
              return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
            });
            if (p.id === identity.id) {
              setMe(p);
              meRef.current = p;
            }
          } else if (payload.eventType === 'DELETE') {
            const p = payload.old as Participant;
            setParticipants((prev) => prev.filter((x) => x.id !== p.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          joinRoom();
        }
      });

    // Fallback: if SUBSCRIBED callback doesn't fire within 3s, join anyway
    const fallbackTimer = setTimeout(() => {
      if (!joinedRef.current) {
        joinRoom();
      }
    }, 3000);

    // Heartbeat — keep our last_seen fresh
    heartbeatRef.current = setInterval(async () => {
      if (!joinedRef.current) return;
      await supabase
        .from('participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', identity.id);
    }, HEARTBEAT_INTERVAL);

    // Periodic full refresh
    refreshRef.current = setInterval(() => {
      loadParticipants();
    }, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      if (channel) supabase.removeChannel(channel);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [roomId, identity.id, identity.nickname, identity.color]);

  return { participants, me };
}
