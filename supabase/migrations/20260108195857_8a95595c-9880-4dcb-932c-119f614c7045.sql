
-- Agregar configuraciones individuales de gamificación para puntos por acción
-- Estas reemplazan el JSON gamification_points_config

-- Puntos por uso de herramientas
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_document_analysis', '10', 'Puntos por análisis de documento')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_research', '15', 'Puntos por investigación legal')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_strategy', '20', 'Puntos por análisis de estrategia')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_draft', '25', 'Puntos por redacción de documento')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_case_prediction', '15', 'Puntos por predicción de caso')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_client_added', '5', 'Puntos por agregar cliente')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_case_won', '100', 'Puntos por caso ganado')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_first_login', '5', 'Puntos por primer login')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_profile_complete', '20', 'Puntos por completar perfil')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_training_module', '30', 'Puntos por módulo de entrenamiento')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_daily_login', '1', 'Puntos por login diario')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_daily_tool_use', '2', 'Puntos por uso diario de herramientas')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_referral', '50', 'Puntos por referido exitoso')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_first_purchase', '10', 'Puntos por primera compra')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_process_query', '5', 'Puntos por consulta de proceso judicial')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_copilot_use', '3', 'Puntos por uso del copiloto')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

INSERT INTO system_config (config_key, config_value, description) VALUES
  ('gamification_points_crm_ai', '10', 'Puntos por uso de IA en CRM')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
