// Función helper para obtener configuraciones del sistema
export async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();
    
    if (error) {
      console.warn(`Error fetching system config for key '${configKey}':`, error);
      return defaultValue || '';
    }
    
    return data?.config_value || defaultValue || '';
  } catch (error) {
    console.warn(`Exception fetching system config for key '${configKey}':`, error);
    return defaultValue || '';
  }
}

// Configuraciones específicas con sus valores por defecto
export const DEFAULT_CONFIGS = {
  // Legal Tools
  research_ai_model: 'gpt-4.1-2025-04-14',
  research_system_prompt: 'Eres un asistente especializado en investigación jurídica. Proporciona análisis detallados y citas precisas de legislación relevante.',
  analysis_ai_model: 'gpt-4.1-2025-04-14', 
  analysis_system_prompt: 'Eres un experto en análisis jurídico. Evalúa documentos legales con precisión y proporciona recomendaciones estratégicas.',
  drafting_ai_model: 'gpt-4.1-2025-04-14',
  drafting_system_prompt: 'Eres un redactor jurídico experto. Crea documentos legales precisos, claros y conformes a la legislación vigente.',
  strategy_ai_model: 'o3-2025-04-16',
  strategy_system_prompt: 'Eres un estratega jurídico senior. Desarrolla estrategias legales comprehensivas considerando todos los aspectos del caso.',
  
  // AI Management
  agent_creation_ai_model: 'gpt-4.1-2025-04-14',
  agent_creation_system_prompt: 'Eres un experto en creación de agentes legales especializados. Genera prompts, plantillas y configuraciones optimizadas.',
  document_description_optimizer_model: 'gpt-4.1-2025-04-14',
  document_description_optimizer_prompt: 'Optimiza la descripción del documento legal para que sea clara, precisa y atractiva para el usuario final.',
  template_optimizer_model: 'gpt-4.1-2025-04-14',
  template_optimizer_prompt: 'Optimiza la plantilla del documento legal para que sea completa, precisa y fácil de completar.',
  content_optimization_model: 'gpt-4.1-2025-04-14',
  
  // System General
  system_timeout_seconds: '30',
  max_retry_attempts: '3',
  document_sla_hours: '4',
  api_rate_limit_requests: '100',
  openai_api_timeout: '30'
};

// Función para obtener múltiples configuraciones de una vez
export async function getMultipleSystemConfigs(supabaseClient: any, configKeys: string[]): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', configKeys);
    
    if (error) {
      console.warn('Error fetching multiple system configs:', error);
      // Retornar valores por defecto
      const result: Record<string, string> = {};
      configKeys.forEach(key => {
        result[key] = DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS] || '';
      });
      return result;
    }
    
    // Combinar datos obtenidos con valores por defecto
    const result: Record<string, string> = {};
    configKeys.forEach(key => {
      const foundConfig = data?.find(config => config.config_key === key);
      result[key] = foundConfig?.config_value || DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS] || '';
    });
    
    return result;
  } catch (error) {
    console.warn('Exception fetching multiple system configs:', error);
    // Retornar valores por defecto
    const result: Record<string, string> = {};
    configKeys.forEach(key => {
      result[key] = DEFAULT_CONFIGS[key as keyof typeof DEFAULT_CONFIGS] || '';
    });
    return result;
  }
}