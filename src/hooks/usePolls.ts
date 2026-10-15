import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Poll, PollOption, PollVote } from '@/types';

interface PollData {
  poll: Poll;
  options: PollOption[];
  votes: PollVote[];
}

export function usePolls(roomId: string | null, participantId: string | null) {
  const [polls, setPolls] = useState<PollData[]>([]);
  const participantIdRef = useRef<string | null>(null);

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  const loadPolls = useCallback(async () => {
    if (!roomId) return;

    const { data: pollRows, error: pollErr } = await supabase
      .from('polls')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (pollErr) {
      console.error('loadPolls error:', pollErr.message);
      return;
    }

    if (!pollRows || pollRows.length === 0) {
      setPolls([]);
      return;
    }

    const pollIds = pollRows.map((p) => p.id);

    const [{ data: optionRows, error: optErr }, { data: voteRows, error: voteErr }] = await Promise.all([
      supabase.from('poll_options').select('*').in('poll_id', pollIds),
      supabase.from('poll_votes').select('*').in('poll_id', pollIds),
    ]);

    if (optErr) console.error('loadPolls options error:', optErr.message);
    if (voteErr) console.error('loadPolls votes error:', voteErr.message);

    const data: PollData[] = pollRows.map((poll) => ({
      poll: poll as Poll,
      options: ((optionRows || []) as PollOption[]).filter((o) => o.poll_id === poll.id),
      votes: ((voteRows || []) as PollVote[]).filter((v) => v.poll_id === poll.id),
    }));

    setPolls(data);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    // Load initial data immediately
    loadPolls();

    // Subscribe to changes on polls (filtered by room_id)
    // and to poll_options/poll_votes (unfilterable by room_id, so we reload
    // but only process polls belonging to this room via loadPolls which queries by room_id)
    const channel = supabase
      .channel(`polls:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `room_id=eq.${roomId}` },
        () => loadPolls(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_options' },
        () => loadPolls(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes' },
        () => loadPolls(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, loadPolls]);

  async function createPoll(question: string, options: string[]) {
    if (!roomId || !question.trim() || options.length < 2) return;

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        room_id: roomId,
        question: question.trim(),
        created_by: participantIdRef.current,
      })
      .select()
      .single();

    if (error || !poll) {
      console.error('createPoll error:', error?.message);
      return;
    }

    const inserts = options.filter((o) => o.trim()).map((text) => ({
      poll_id: poll.id,
      text: text.trim(),
    }));

    const { error: optErr } = await supabase.from('poll_options').insert(inserts);
    if (optErr) console.error('createPoll options error:', optErr.message);

    // Reload to show the new poll with its options
    await loadPolls();
  }

  async function vote(pollId: string, optionId: string) {
    if (!participantIdRef.current) return;

    // The poll_votes table has UNIQUE(poll_id, participant_id).
    // Try to update the existing vote first; if no row exists, insert.
    const { data: existing, error: findErr } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('participant_id', participantIdRef.current)
      .maybeSingle();

    if (findErr) {
      console.error('vote find error:', findErr.message);
      return;
    }

    if (existing) {
      // Update existing vote to the new option
      const { error: updErr } = await supabase
        .from('poll_votes')
        .update({ option_id: optionId })
        .eq('id', existing.id);
      if (updErr) console.error('vote update error:', updErr.message);
    } else {
      // Insert new vote
      const { error: insErr } = await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
        participant_id: participantIdRef.current,
      });
      if (insErr) console.error('vote insert error:', insErr.message);
    }

    // Reload to reflect the change
    await loadPolls();
  }

  return { polls, createPoll, vote };
}
