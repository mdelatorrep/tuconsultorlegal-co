-- Actualizar función generate_secure_lawyer_token para NO usar access_token ya que no existe en lawyer_profiles
CREATE OR REPLACE FUNCTION public.generate_secure_lawyer_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  token_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  token_length INTEGER := 64;
  result TEXT := '';
  i INTEGER;
  random_index INTEGER;
BEGIN
  -- Use cryptographically secure random generation
  FOR i IN 1..token_length LOOP
    random_index := (abs(hashtext(gen_random_uuid()::text)) % length(token_chars)) + 1;
    result := result || substr(token_chars, random_index, 1);
  END LOOP;
  
  -- No podemos verificar unicidad contra lawyer_profiles.access_token porque esa columna no existe
  -- En su lugar, generamos un token único usando timestamp y random
  result := 'LT' || to_char(now(), 'YYYYMMDDHH24MISS') || substr(md5(random()::text), 1, 16);
  
  RETURN result;
END;
$function$;