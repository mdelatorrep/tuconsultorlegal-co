
-- Insert feature flags for all lawyer sidebar modules
INSERT INTO system_config (config_key, config_value, description) VALUES
('feature_flags_sidebar', '{
  "dashboard": true,
  "research": true,
  "suin-juriscol": true,
  "process-query": true,
  "process-monitor": true,
  "analyze": true,
  "draft": true,
  "voice-assistant": true,
  "crm": true,
  "client-portal": true,
  "legal-calendar": true,
  "specialized-agents": true,
  "strategize": true,
  "case-predictor": true,
  "agent-creator": true,
  "agent-manager": true,
  "stats": true,
  "request-agent-access": true,
  "training": true,
  "blog-manager": true,
  "request-blog-access": true,
  "credits": true,
  "gamification": true,
  "public-profile": true,
  "account-settings": true
}'::jsonb, 'Feature flags para las funcionalidades del sidebar del portal de abogados. true = habilitado, false = deshabilitado.')
ON CONFLICT (config_key) DO NOTHING;
