
-- 1. Update auth metadata to is_lawyer=true
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"is_lawyer": true}'::jsonb,
    updated_at = now()
WHERE id = '84b39cc1-7ea9-43f1-8653-1df9cf52b8ff';

-- 2. Create lawyer profile
INSERT INTO public.lawyer_profiles (id, full_name, email, can_create_agents, can_create_blogs, can_use_ai_tools, is_active)
VALUES ('84b39cc1-7ea9-43f1-8653-1df9cf52b8ff', 'Andres Murcia', 'andres@brainz.llc', false, false, false, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Remove user profile
DELETE FROM public.user_profiles WHERE id = '84b39cc1-7ea9-43f1-8653-1df9cf52b8ff';

-- 4. Update user_type_registry
UPDATE public.user_type_registry 
SET user_type = 'lawyer', updated_at = now()
WHERE user_id = '84b39cc1-7ea9-43f1-8653-1df9cf52b8ff';
