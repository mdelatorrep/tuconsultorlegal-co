-- Actualizar función issue_certificate_on_completion para usar lawyer_profiles
CREATE OR REPLACE FUNCTION public.issue_certificate_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    lawyer_info RECORD;
    cert_code TEXT;
BEGIN
    -- Only trigger when completion percentage reaches 100% and is_certified becomes true
    IF NEW.completion_percentage >= 100.00 AND NEW.is_certified = true AND (OLD.is_certified IS NULL OR OLD.is_certified = false) THEN
        -- Get lawyer information from lawyer_profiles
        SELECT lp.full_name, lp.email 
        INTO lawyer_info
        FROM lawyer_profiles lp 
        WHERE lp.id = NEW.lawyer_id;
        
        -- Generate unique certificate code
        cert_code := 'IALC-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 8);
        
        -- Set certificate_id in training progress
        NEW.certificate_id := cert_code;
        
        -- Insert certificate record
        INSERT INTO public.lawyer_certificates (
            lawyer_id,
            certificate_type,
            certificate_name,
            certificate_code,
            verification_url,
            linkedin_share_url
        ) VALUES (
            NEW.lawyer_id,
            'ai_lawyer_fundamentals',
            'Certificación IA Lawyer Fundamentals - tuconsultorlegal.co',
            cert_code,
            'https://tuconsultorlegal.co/certificacion/' || cert_code,
            'https://www.linkedin.com/sharing/share-offsite/?url=https://tuconsultorlegal.co/certificacion/' || cert_code
        );
        
        RAISE LOG 'Certificate issued for lawyer: % with code: %', lawyer_info.full_name, cert_code;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Actualizar función generate_secure_lawyer_token para usar lawyer_profiles
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
  
  -- Ensure uniqueness by checking against existing tokens in lawyer_profiles
  WHILE EXISTS (SELECT 1 FROM public.lawyer_profiles WHERE access_token = result) LOOP
    result := '';
    FOR i IN 1..token_length LOOP
      random_index := (abs(hashtext(gen_random_uuid()::text)) % length(token_chars)) + 1;
      result := result || substr(token_chars, random_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$function$;