/*
# Room Security, Video Queue, and Voice Signaling

1. Modified Tables
- `rooms`: Add `password` column (text, nullable) for optional room PIN protection.
- `participants`: Add `kicked` column (boolean, default false) to track removed participants.

2. New Tables
- `video_queue`: Playlist/queue of videos for a room.
- `voice_signals`: WebRTC signaling messages for peer-to-peer voice chat.

3. Security
- RLS enabled on all new tables with anon+authenticated CRUD policies.
*/

-- Add password column to rooms
DO $$ BEGIN
  ALTER TABLE rooms ADD COLUMN password text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add kicked column to participants
DO $$ BEGIN
  ALTER TABLE participants ADD COLUMN kicked boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ========================
-- VIDEO QUEUE
-- ========================
CREATE TABLE IF NOT EXISTS video_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL DEFAULT 'Video',
  media_type text NOT NULL DEFAULT 'youtube',
  position integer NOT NULL DEFAULT 0,
  added_by uuid REFERENCES participants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_queue_select_all" ON video_queue;
CREATE POLICY "video_queue_select_all" ON video_queue FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "video_queue_insert_all" ON video_queue;
CREATE POLICY "video_queue_insert_all" ON video_queue FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "video_queue_update_all" ON video_queue;
CREATE POLICY "video_queue_update_all" ON video_queue FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "video_queue_delete_all" ON video_queue;
CREATE POLICY "video_queue_delete_all" ON video_queue FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_video_queue_room ON video_queue(room_id, position);

-- ========================
-- VOICE SIGNALS
-- ========================
CREATE TABLE IF NOT EXISTS voice_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_participant uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  to_participant uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  payload text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE voice_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_signals_select_all" ON voice_signals;
CREATE POLICY "voice_signals_select_all" ON voice_signals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "voice_signals_insert_all" ON voice_signals;
CREATE POLICY "voice_signals_insert_all" ON voice_signals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "voice_signals_delete_all" ON voice_signals;
CREATE POLICY "voice_signals_delete_all" ON voice_signals FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_voice_signals_room ON voice_signals(room_id, created_at);

-- Add realtime publication for new tables (use DO block since IF EXISTS is not supported on ALTER PUBLICATION)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'video_queue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_queue;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'voice_signals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voice_signals;
  END IF;
END $$;
