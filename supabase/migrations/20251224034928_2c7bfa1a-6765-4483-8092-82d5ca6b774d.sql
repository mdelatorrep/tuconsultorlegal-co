-- Fix function search_path for new function
CREATE OR REPLACE FUNCTION update_agent_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE specialized_agents_catalog
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;