-- Desbloquear cuenta de administrador
UPDATE admin_accounts 
SET locked_until = NULL, 
    failed_login_attempts = 0 
WHERE email = 'manuel@tuconsultorlegal.co';