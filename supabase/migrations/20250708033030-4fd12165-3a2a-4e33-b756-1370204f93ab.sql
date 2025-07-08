-- Create super admin account for manuel@tuconsultorlegal.co
INSERT INTO public.lawyer_accounts (
  email, 
  password_hash, 
  full_name, 
  phone_number,
  is_admin, 
  can_create_agents, 
  active,
  access_token
) 
VALUES (
  'manuel@tuconsultorlegal.co', 
  public.hash_password('SuperAdmin2025!'), 
  'Manuel - Super Administrador', 
  '+573045454935',
  true, 
  true, 
  true,
  'SUPERADMIN2025'
);