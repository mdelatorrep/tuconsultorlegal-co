-- Add gamification_progress table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE gamification_progress;

-- Ensure lawyers can see updates to their own gamification progress via realtime
-- The existing SELECT policy should work, but let's verify it allows realtime subscription
-- by creating a more explicit policy for realtime if needed

-- No additional RLS policy needed - existing "Lawyers can view their own progress" covers it