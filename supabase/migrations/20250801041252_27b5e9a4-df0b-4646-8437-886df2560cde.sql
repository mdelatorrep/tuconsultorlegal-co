-- Actualizar el modelo para improve-document-info a uno más reciente
UPDATE system_config 
SET config_value = 'gpt-4.1-2025-04-14', updated_at = NOW() 
WHERE config_key = 'document_description_optimizer_model';