-- =====================================================
-- Security Fixes Migration - Addressing WARN Level Issues
-- =====================================================

-- 1. FIX: Overly permissive RLS policies (WITH CHECK (true))

-- 1a. lawyer_profiles - "Allow profile creation via trigger"
DROP POLICY IF EXISTS "Allow profile creation via trigger" ON lawyer_profiles;
CREATE POLICY "Allow profile creation via trigger"
  ON lawyer_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = id
  );

-- 1b. legal_consultations - "Users can create consultations"
DROP POLICY IF EXISTS "Users can create consultations" ON legal_consultations;
CREATE POLICY "Users can create consultations"
  ON legal_consultations
  FOR INSERT
  WITH CHECK (
    user_session_id IS NOT NULL AND length(user_session_id) > 10
  );

-- 1c. user_profiles - "Allow profile creation via trigger"
DROP POLICY IF EXISTS "Allow profile creation via trigger" ON user_profiles;
CREATE POLICY "Allow profile creation for authenticated users"
  ON user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = id
  );

-- 1d. pricing_analytics - Add basic validation
DROP POLICY IF EXISTS "insert_pricing_analytics" ON pricing_analytics;
CREATE POLICY "insert_pricing_analytics"
  ON pricing_analytics
  FOR INSERT
  WITH CHECK (
    plan_id IS NOT NULL AND plan_name IS NOT NULL
  );

-- 2. FIX: Function search_path mutable
ALTER FUNCTION public.jsonb_merge SET search_path = public;

-- 3. ADD: Database constraints for contact_messages to prevent abuse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cm_name_length' AND conrelid = 'contact_messages'::regclass) THEN
    ALTER TABLE contact_messages ADD CONSTRAINT check_cm_name_length CHECK (length(name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cm_email_length' AND conrelid = 'contact_messages'::regclass) THEN
    ALTER TABLE contact_messages ADD CONSTRAINT check_cm_email_length CHECK (length(email) <= 255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cm_message_length' AND conrelid = 'contact_messages'::regclass) THEN
    ALTER TABLE contact_messages ADD CONSTRAINT check_cm_message_length CHECK (length(message) <= 5000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cm_phone_length' AND conrelid = 'contact_messages'::regclass) THEN
    ALTER TABLE contact_messages ADD CONSTRAINT check_cm_phone_length CHECK (phone IS NULL OR length(phone) <= 20);
  END IF;
END $$;

-- 4. ADD: Database constraints for crm_leads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cl_name_length' AND conrelid = 'crm_leads'::regclass) THEN
    ALTER TABLE crm_leads ADD CONSTRAINT check_cl_name_length CHECK (length(name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cl_email_length' AND conrelid = 'crm_leads'::regclass) THEN
    ALTER TABLE crm_leads ADD CONSTRAINT check_cl_email_length CHECK (length(email) <= 255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_cl_message_length' AND conrelid = 'crm_leads'::regclass) THEN
    ALTER TABLE crm_leads ADD CONSTRAINT check_cl_message_length CHECK (length(message) <= 5000);
  END IF;
END $$;

-- 5. ADD: Audit logging for financial data access (crm_case_profitability)
CREATE TABLE IF NOT EXISTS crm_financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  lawyer_id uuid NOT NULL,
  accessed_by uuid,
  access_time timestamptz DEFAULT now(),
  record_id uuid,
  data_summary jsonb
);

-- Enable RLS on audit log
ALTER TABLE crm_financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert into audit log (from triggers)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON crm_financial_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON crm_financial_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow lawyers to view their own audit logs
DROP POLICY IF EXISTS "Lawyers can view own audit logs" ON crm_financial_audit_log;
CREATE POLICY "Lawyers can view own audit logs"
  ON crm_financial_audit_log
  FOR SELECT
  USING (lawyer_id = auth.uid() OR accessed_by = auth.uid());

-- Create trigger function for auditing financial data access
CREATE OR REPLACE FUNCTION log_financial_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_financial_audit_log (
    table_name,
    operation,
    lawyer_id,
    accessed_by,
    record_id,
    data_summary
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.lawyer_id, OLD.lawyer_id),
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'case_id', COALESCE(NEW.case_id, OLD.case_id),
      'timestamp', now()
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for auditing (UPDATE and DELETE only)
DROP TRIGGER IF EXISTS audit_profitability_update ON crm_case_profitability;
CREATE TRIGGER audit_profitability_update
  AFTER UPDATE ON crm_case_profitability
  FOR EACH ROW EXECUTE FUNCTION log_financial_data_access();

DROP TRIGGER IF EXISTS audit_profitability_delete ON crm_case_profitability;
CREATE TRIGGER audit_profitability_delete
  AFTER DELETE ON crm_case_profitability
  FOR EACH ROW EXECUTE FUNCTION log_financial_data_access();