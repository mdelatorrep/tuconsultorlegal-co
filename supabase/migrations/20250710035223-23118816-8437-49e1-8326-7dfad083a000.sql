-- Desbloquear cuenta y actualizar contraseña correctamente hasheada
UPDATE public.admin_accounts 
SET password_hash = public.hash_password('admin123'),
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
WHERE email = 'manuel@tuconsultorlegal.co' AND active = true;