-- Migración para usar tokens existentes como contraseñas
DO $$
DECLARE
    lawyer_record RECORD;
    temp_password TEXT;
BEGIN
    -- Iterar sobre todos los abogados activos con tokens
    FOR lawyer_record IN 
        SELECT id, email, full_name, access_token, can_create_agents, can_create_blogs, phone_number
        FROM lawyer_tokens 
        WHERE active = true
    LOOP
        -- Usar el token como contraseña temporal
        temp_password := lawyer_record.access_token;
        
        -- Crear usuario en auth.users usando el email y token como contraseña
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            lawyer_record.id,
            'authenticated',
            'authenticated', 
            lawyer_record.email,
            crypt(temp_password, gen_salt('bf')),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object(
                'full_name', lawyer_record.full_name,
                'is_lawyer', true,
                'can_create_agents', lawyer_record.can_create_agents,
                'can_create_blogs', lawyer_record.can_create_blogs
            ),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            encrypted_password = EXCLUDED.encrypted_password,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();
            
        -- Crear identidad en auth.identities
        INSERT INTO auth.identities (
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at,
            id
        ) VALUES (
            lawyer_record.id::text,
            lawyer_record.id,
            jsonb_build_object(
                'sub', lawyer_record.id::text,
                'email', lawyer_record.email,
                'email_verified', true,
                'phone_verified', false
            ),
            'email',
            NOW(),
            NOW(),
            NOW(),
            gen_random_uuid()
        ) ON CONFLICT (provider, provider_id) DO UPDATE SET
            identity_data = EXCLUDED.identity_data,
            updated_at = NOW();
        
        RAISE LOG 'Migrated lawyer: % with email: %', lawyer_record.full_name, lawyer_record.email;
    END LOOP;
    
    RAISE LOG 'Migration completed for existing lawyer tokens';
END $$;