-- Crear función para buscar suscripciones por external_id
CREATE OR REPLACE FUNCTION find_subscription_by_external_id(search_external_id text)
RETURNS TABLE (
  subscription_id uuid,
  lawyer_id uuid,
  lawyer_email text,
  lawyer_name text,
  subscription_status text,
  dlocal_subscription_id text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id as subscription_id,
    ls.lawyer_id,
    lp.email as lawyer_email,
    lp.full_name as lawyer_name,
    ls.status as subscription_status,
    ls.dlocal_subscription_id,
    ls.created_at,
    ls.updated_at
  FROM lawyer_subscriptions ls
  JOIN lawyer_profiles lp ON ls.lawyer_id = lp.id
  WHERE lp.id::text = search_external_id 
     OR ls.dlocal_subscription_id = search_external_id
     OR lp.email = search_external_id;
END;
$$;