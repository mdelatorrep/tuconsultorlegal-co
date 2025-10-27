-- Limpieza forzada de perfiles duplicados
-- Eliminar TODOS los user_profiles donde existe un lawyer_profile

DO $$
DECLARE
  duplicates_cursor CURSOR FOR 
    SELECT up.id, u.email
    FROM public.user_profiles up
    INNER JOIN public.lawyer_profiles lp ON up.id = lp.id
    INNER JOIN auth.users u ON u.id = up.id;
  
  record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Iterar sobre cada perfil duplicado
  FOR record IN duplicates_cursor LOOP
    DELETE FROM public.user_profiles WHERE id = record.id;
    deleted_count := deleted_count + 1;
    RAISE LOG '[AUTH CLEANUP] Deleted user_profile for lawyer: % (email: %)', record.id, record.email;
  END LOOP;
  
  RAISE LOG '[AUTH CLEANUP] ✅ Total duplicates cleaned: %', deleted_count;
END $$;

-- Verificar que no queden duplicados
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM public.user_profiles up
  INNER JOIN public.lawyer_profiles lp ON up.id = lp.id;
  
  IF remaining_duplicates > 0 THEN
    RAISE WARNING '[AUTH CLEANUP] ⚠️ Still found % duplicate profiles!', remaining_duplicates;
  ELSE
    RAISE LOG '[AUTH CLEANUP] ✅ No duplicate profiles remaining';
  END IF;
END $$;