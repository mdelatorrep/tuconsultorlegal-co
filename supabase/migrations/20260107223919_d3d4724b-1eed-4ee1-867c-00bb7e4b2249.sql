
-- Enable the http extension which provides http_post function
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Also enable pg_net as a backup (async HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to authenticated and service_role
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated, service_role, anon;
