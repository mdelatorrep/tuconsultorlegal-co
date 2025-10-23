-- Fix security warning: Set search_path for the sync function
DROP FUNCTION IF EXISTS sync_document_user_ids() CASCADE;

CREATE OR REPLACE FUNCTION sync_document_user_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any existing document_tokens that have this user's email but no user_id
  UPDATE document_tokens
  SET user_id = NEW.id,
      updated_at = now()
  WHERE user_email = NEW.email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = public;

-- Recreate trigger after function update
DROP TRIGGER IF EXISTS sync_user_documents_on_profile_creation ON user_profiles;
CREATE TRIGGER sync_user_documents_on_profile_creation
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_document_user_ids();

COMMENT ON FUNCTION sync_document_user_ids() IS 
'Automatically syncs user_id for document_tokens when a user profile is created, maintaining data consistency for documents created before user registration. Security: search_path is set to public to prevent search_path attacks.';