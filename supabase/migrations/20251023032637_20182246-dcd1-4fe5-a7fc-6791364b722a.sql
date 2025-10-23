-- Sync user_id for legacy document_tokens that only have user_email
-- This helps maintain data consistency for documents created before user registration

UPDATE document_tokens dt
SET user_id = up.id,
    updated_at = now()
FROM user_profiles up
WHERE dt.user_email = up.email
  AND dt.user_id IS NULL
  AND up.email IS NOT NULL;

-- Create a function to automatically sync user_id when a new user profile is created
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the sync function when a new user profile is created
DROP TRIGGER IF EXISTS sync_user_documents_on_profile_creation ON user_profiles;
CREATE TRIGGER sync_user_documents_on_profile_creation
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_document_user_ids();

-- Add comment explaining the purpose
COMMENT ON FUNCTION sync_document_user_ids() IS 
'Automatically syncs user_id for document_tokens when a user profile is created, maintaining data consistency for documents created before user registration';