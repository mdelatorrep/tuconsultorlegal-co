-- Eliminar administradores duplicados de la tabla lawyer_accounts
DELETE FROM lawyer_accounts 
WHERE email IN (
    SELECT email FROM admin_accounts 
    WHERE active = true
);