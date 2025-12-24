-- =====================================================
-- GAMIFICATION TASKS FOR TRAINING SYSTEM
-- =====================================================

-- Insert training-related gamification tasks
INSERT INTO gamification_tasks (task_key, name, description, credit_reward, task_type, max_completions, icon, badge_name, is_active, display_order, completion_criteria)
VALUES
  -- One-time training achievements
  ('start_training', 'Primer Paso', 'Inicia tu primera sesión de formación', 5, 'onetime', 1, 'play', 'Iniciador', true, 10, '{"action": "start_training"}'::jsonb),
  ('complete_first_module', 'Aprendiz IA', 'Completa tu primer módulo de formación', 15, 'onetime', 1, 'book-open', 'Aprendiz', true, 11, '{"action": "complete_module", "count": 1}'::jsonb),
  ('complete_3_modules', 'Estudiante Dedicado', 'Completa 3 módulos de formación', 30, 'onetime', 1, 'graduation-cap', 'Estudioso', true, 12, '{"action": "complete_module", "count": 3}'::jsonb),
  ('complete_certification', 'IA Lawyer Certificado', 'Completa todos los módulos y obtén tu certificación', 100, 'achievement', 1, 'award', 'Certificado IA', true, 13, '{"action": "complete_certification"}'::jsonb),
  ('perfect_module_score', 'Perfeccionista', 'Obtén 100% en un módulo', 20, 'onetime', 1, 'star', 'Perfecto', true, 14, '{"action": "perfect_score"}'::jsonb),
  
  -- Training streaks
  ('training_streak_3', 'Racha de 3 Días', 'Estudia 3 días consecutivos', 10, 'onetime', 1, 'flame', 'En Racha', true, 15, '{"action": "training_streak", "days": 3}'::jsonb),
  ('training_streak_7', 'Racha Semanal', 'Estudia 7 días consecutivos', 25, 'onetime', 1, 'flame', 'Constante', true, 16, '{"action": "training_streak", "days": 7}'::jsonb),
  
  -- AI Assistant usage in training
  ('ask_ai_assistant_5', 'Curioso', 'Haz 5 preguntas al asistente IA durante la formación', 10, 'onetime', 1, 'message-square', 'Preguntón', true, 17, '{"action": "ai_questions", "count": 5}'::jsonb),
  ('ask_ai_assistant_20', 'Investigador', 'Haz 20 preguntas al asistente IA durante la formación', 25, 'onetime', 1, 'search', 'Investigador', true, 18, '{"action": "ai_questions", "count": 20}'::jsonb),
  
  -- Daily training tasks
  ('daily_training_session', 'Sesión Diaria', 'Completa una sesión de estudio hoy', 3, 'daily', null, 'calendar', null, true, 50, '{"action": "daily_session"}'::jsonb)
ON CONFLICT (task_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  credit_reward = EXCLUDED.credit_reward,
  task_type = EXCLUDED.task_type,
  max_completions = EXCLUDED.max_completions,
  icon = EXCLUDED.icon,
  badge_name = EXCLUDED.badge_name,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  completion_criteria = EXCLUDED.completion_criteria;

-- Add training interaction tracking columns to lawyer_training_progress if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lawyer_training_progress' 
                 AND column_name = 'ai_questions_count') THEN
    ALTER TABLE lawyer_training_progress ADD COLUMN ai_questions_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lawyer_training_progress' 
                 AND column_name = 'training_streak') THEN
    ALTER TABLE lawyer_training_progress ADD COLUMN training_streak INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lawyer_training_progress' 
                 AND column_name = 'last_training_date') THEN
    ALTER TABLE lawyer_training_progress ADD COLUMN last_training_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lawyer_training_progress' 
                 AND column_name = 'best_score') THEN
    ALTER TABLE lawyer_training_progress ADD COLUMN best_score INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'lawyer_training_progress' 
                 AND column_name = 'total_xp_earned') THEN
    ALTER TABLE lawyer_training_progress ADD COLUMN total_xp_earned INTEGER DEFAULT 0;
  END IF;
END $$;