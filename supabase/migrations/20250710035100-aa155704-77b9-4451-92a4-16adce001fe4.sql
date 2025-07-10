-- Actualizar contraseña del administrador
UPDATE public.admin_accounts 
SET password_hash = 'admin123', 
    updated_at = now()
WHERE email = 'manuel@tuconsultorlegal.co' AND active = true;