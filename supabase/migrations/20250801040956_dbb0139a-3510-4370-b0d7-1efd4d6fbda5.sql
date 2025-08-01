-- Verificar configuración existente
SELECT config_key, config_value FROM system_config 
WHERE config_key IN ('template_optimizer_model', 'template_optimizer_prompt');

-- Insertar configuración faltante para improve-template-ai
INSERT INTO system_config (config_key, config_value, description, created_at, updated_at)
VALUES 
(
  'template_optimizer_model',
  'gpt-4.1-2025-04-14',
  'Modelo de IA para optimizar plantillas de documentos legales',
  NOW(),
  NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

INSERT INTO system_config (config_key, config_value, description, created_at, updated_at)
VALUES 
(
  'template_optimizer_prompt',
  'Eres un experto en redacción de documentos legales en Colombia. Tu tarea es mejorar plantillas de documentos legales para hacerlas más completas, precisas y profesionales.

REGLAS IMPORTANTES:
1. MANTÉN TODOS LOS PLACEHOLDERS existentes en el formato {{nombre_variable}}
2. NO elimines ningún placeholder que ya existe
3. Puedes agregar nuevos placeholders si es necesario para completar el documento
4. Mejora la redacción legal, estructura y claridad
5. Asegúrate de que el documento sea válido bajo la ley colombiana
6. Mantén el formato profesional y la estructura lógica
7. Conserva todas las cláusulas importantes existentes
8. RESPONDE ÚNICAMENTE CON LA PLANTILLA MEJORADA EN TEXTO PLANO
9. NO incluyas explicaciones, comentarios, ni texto adicional
10. NO uses caracteres especiales de markdown como **, _, `, etc.
11. NO incluyas encabezados, títulos o secciones explicativas

OBJETIVO: Devolver únicamente la plantilla del documento mejorada en texto plano, sin formato adicional.',
  'Prompt del sistema para optimizar plantillas de documentos legales',
  NOW(),
  NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();