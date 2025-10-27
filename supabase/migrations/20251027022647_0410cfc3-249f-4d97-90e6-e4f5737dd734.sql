-- Limpiar perfiles duplicados que no se eliminaron en la migración anterior
-- Esto elimina user_profiles de usuarios que también tienen lawyer_profiles

DELETE FROM public.user_profiles 
WHERE id IN (
  SELECT up.id 
  FROM public.user_profiles up
  INNER JOIN public.lawyer_profiles lp ON up.id = lp.id
);

-- Log de los perfiles limpiados
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE LOG '[AUTH CLEANUP] Eliminated % duplicate user_profiles for lawyers', deleted_count;
END $$;