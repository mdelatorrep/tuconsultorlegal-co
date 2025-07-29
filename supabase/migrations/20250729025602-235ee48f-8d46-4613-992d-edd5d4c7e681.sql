-- Prueba temporal para verificar la actualización directa
DO $$
BEGIN
    -- Actualizar directamente para probar
    UPDATE public.lawyer_profiles 
    SET can_create_agents = true, can_use_ai_tools = true, updated_at = now()
    WHERE id = '376d8c50-0941-404c-9f1d-04c92c6328de';
    
    -- Verificar el resultado
    RAISE NOTICE 'Updated lawyer permissions successfully';
END $$;