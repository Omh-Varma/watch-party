/*
# SyncStream Watch Party Schema

1. New Tables
- `rooms`: Watch party rooms with playback state (media URL, type, playing status, position, sync timestamp)
- `participants`: Users currently in each room (nickname, color, host flag, last-seen heartbeat)
- `messages`: Chat messages in each room
- `polls`: Group polls created in each room
- `poll_options`: Answer choices for each poll
- `poll_votes`: Votes cast by participants (one per participant per poll)
- `reactions`: Floating emoji reactions in each room
- `playback_events`: Event log for synchronization (play/pause/seek with timestamp)

2. Security
- No auth / sign-in screen — app is single-tenant, intentionally shared/public.
- RLS enabled on all tables with `TO anon, authenticated` CRUD policies.

3. Important Notes
- Room IDs are short slugs generated client-side for shareable URLs.
- Playback state stored on rooms table; playback_events provides precise sync channel.
- Realtime enabled on all tables.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================
-- ROOMS
-- ========================
CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Watch Party',
  media_url text,
  media_title text,
  media_type text DEFAULT 'youtube',
  is_playing boolean NOT NULL DEFAULT false,
  playback_position double precision NOT NULL DEFAULT 0,
  playback_rate real NOT NULL DEFAULT 1.0,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_all" ON rooms;
CREATE POLICY "rooms_select_all" ON rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rooms_insert_all" ON rooms;
CREATE POLICY "rooms_insert_all" ON rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rooms_update_all" ON rooms;
CREATE POLICY "rooms_update_all" ON rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rooms_delete_all" ON rooms;
CREATE POLICY "rooms_delete_all" ON rooms FOR DELETE
  TO anon, authenticated USING (true);

-- ========================
-- PARTICIPANTS
-- ========================
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  color text NOT NULL DEFAULT '#8b5cf6',
  is_host boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_select_all" ON participants;
CREATE POLICY "participants_select_all" ON participants FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "participants_insert_all" ON participants;
CREATE POLICY "participants_insert_all" ON participants FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "participants_update_all" ON participants;
CREATE POLICY "participants_update_all" ON participants FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "participants_delete_all" ON participants;
CREATE POLICY "participants_delete_all" ON participants FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_last_seen ON participants(last_seen);

-- ========================
-- MESSAGES
-- ========================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  nickname text NOT NULL,
  color text NOT NULL DEFAULT '#8b5cf6',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_all" ON messages;
CREATE POLICY "messages_select_all" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "messages_insert_all" ON messages;
CREATE POLICY "messages_insert_all" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "messages_delete_all" ON messages;
CREATE POLICY "messages_delete_all" ON messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);

-- ========================
-- POLLS
-- ========================
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question text NOT NULL,
  created_by uuid REFERENCES participants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_select_all" ON polls;
CREATE POLICY "polls_select_all" ON polls FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "polls_insert_all" ON polls;
CREATE POLICY "polls_insert_all" ON polls FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "polls_delete_all" ON polls;
CREATE POLICY "polls_delete_all" ON polls FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_polls_room ON polls(room_id);

-- ========================
-- POLL OPTIONS
-- ========================
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text text NOT NULL
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_options_select_all" ON poll_options;
CREATE POLICY "poll_options_select_all" ON poll_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "poll_options_insert_all" ON poll_options;
CREATE POLICY "poll_options_insert_all" ON poll_options FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "poll_options_delete_all" ON poll_options;
CREATE POLICY "poll_options_delete_all" ON poll_options FOR DELETE
  TO anon, authenticated USING (true);

-- ========================
-- POLL VOTES
-- ========================
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, participant_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_votes_select_all" ON poll_votes;
CREATE POLICY "poll_votes_select_all" ON poll_votes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "poll_votes_insert_all" ON poll_votes;
CREATE POLICY "poll_votes_insert_all" ON poll_votes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "poll_votes_delete_all" ON poll_votes;
CREATE POLICY "poll_votes_delete_all" ON poll_votes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- ========================
-- REACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  emoji text NOT NULL DEFAULT '🔥',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select_all" ON reactions;
CREATE POLICY "reactions_select_all" ON reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reactions_insert_all" ON reactions;
CREATE POLICY "reactions_insert_all" ON reactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reactions_delete_all" ON reactions;
CREATE POLICY "reactions_delete_all" ON reactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reactions_room ON reactions(room_id, created_at);

-- ========================
-- PLAYBACK EVENTS
-- ========================
CREATE TABLE IF NOT EXISTS playback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playback_events_select_all" ON playback_events;
CREATE POLICY "playback_events_select_all" ON playback_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "playback_events_insert_all" ON playback_events;
CREATE POLICY "playback_events_insert_all" ON playback_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "playback_events_delete_all" ON playback_events;
CREATE POLICY "playback_events_delete_all" ON playback_events FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_playback_events_room ON playback_events(room_id, created_at);

-- ========================
-- REALTIME
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE playback_events;
