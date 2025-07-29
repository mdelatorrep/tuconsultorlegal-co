-- Revertir los permisos de prueba para hacer un test real
UPDATE public.lawyer_profiles 
SET can_create_agents = false, can_use_ai_tools = false, updated_at = now()
WHERE id = '376d8c50-0941-404c-9f1d-04c92c6328de';