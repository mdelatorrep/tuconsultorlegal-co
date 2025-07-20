-- Remove N8N service status data from service_status table
DELETE FROM service_status WHERE service_name = 'n8n';

-- Add a comment to indicate N8N integration was removed
COMMENT ON TABLE service_status IS 'Monitors external service status. N8N integration removed as functionality migrated to OpenAI.';