
-- Add streak columns to lawyer_credits
ALTER TABLE lawyer_credits 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Clean inactive tasks with no reward
DELETE FROM gamification_tasks 
WHERE is_active = false AND credit_reward = 0;
