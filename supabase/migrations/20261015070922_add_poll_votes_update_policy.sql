-- Add UPDATE policy for poll_votes so upsert (delete+insert or direct update) works
DROP POLICY IF EXISTS "poll_votes_update_all" ON poll_votes;
CREATE POLICY "poll_votes_update_all" ON poll_votes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
