-- Add onboarding tracking fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Drop the policy if it exists and recreate it
DROP POLICY IF EXISTS "Users can update their own onboarding status" ON public.user_profiles;

CREATE POLICY "Users can update their own onboarding status"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);