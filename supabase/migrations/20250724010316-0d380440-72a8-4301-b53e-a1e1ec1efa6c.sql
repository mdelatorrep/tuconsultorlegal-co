-- Fix the auto_create_openai_agent function to run with SECURITY DEFINER
-- This allows it to bypass RLS policies and insert into openai_agent_jobs

CREATE OR REPLACE FUNCTION public.auto_create_openai_agent()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- This is the key fix - runs with function owner privileges
SET search_path = public  -- Set search path for security
AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Insert a job to create the OpenAI agent asynchronously
    INSERT INTO public.openai_agent_jobs (
      legal_agent_id,
      status,
      created_at
    ) VALUES (
      NEW.id,
      'pending',
      NOW()
    );
    
    RAISE LOG 'Queued OpenAI agent creation for legal agent: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;