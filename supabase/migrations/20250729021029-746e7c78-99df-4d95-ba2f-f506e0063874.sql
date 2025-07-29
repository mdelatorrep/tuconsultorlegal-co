-- Create sample admin user for testing (replace with actual admin details)
-- This creates an admin profile linked to a Supabase Auth user

-- Note: This requires the admin user to first sign up through Supabase Auth
-- Then link their profile to admin_profiles table

-- Example insert (replace with actual admin details after Auth user creation):
-- INSERT INTO public.admin_profiles (user_id, full_name, email, is_super_admin, active)
-- VALUES ('your-auth-user-id-here', 'Admin Name', 'admin@example.com', true, true);

-- For now, we'll create a placeholder that can be updated
INSERT INTO public.admin_profiles (id, user_id, full_name, email, is_super_admin, active)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder - replace with actual auth user ID
  'System Administrator',
  'admin@placeholder.com',
  true,
  false -- Set to false until linked to real auth user
)
ON CONFLICT (email) DO NOTHING;