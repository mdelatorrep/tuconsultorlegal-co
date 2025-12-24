-- Add RLS policy to allow admins to view all lawyer credits
CREATE POLICY "Admins can view all lawyer credits"
ON public.lawyer_credits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Add RLS policy to allow admins to update lawyer credits
CREATE POLICY "Admins can update lawyer credits"
ON public.lawyer_credits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Add RLS policy to allow admins to insert lawyer credits
CREATE POLICY "Admins can insert lawyer credits"
ON public.lawyer_credits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);

-- Also allow admins to view credit transactions
CREATE POLICY "Admins can view all credit transactions"
ON public.credit_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE admin_profiles.user_id = auth.uid()
    AND admin_profiles.active = true
  )
);