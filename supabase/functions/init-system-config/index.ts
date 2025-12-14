import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Configuraciones predeterminadas del sistema
const DEFAULT_CONFIGS = [
  // Legal Tools
  {
    config_key: 'research_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de investigación legal'
  },
  {
    config_key: 'research_system_prompt',
    config_value: 'Eres un asistente especializado en investigación jurídica. Proporciona análisis detallados y citas precisas de legislación relevante.',
    description: 'Prompt base para el sistema de investigación legal'
  },
  {
    config_key: 'analysis_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de análisis legal'
  },
  {
    config_key: 'analysis_system_prompt',
    config_value: 'Eres un experto en análisis jurídico. Evalúa documentos legales con precisión y proporciona recomendaciones estratégicas.',
    description: 'Prompt base para el sistema de análisis legal'
  },
  {
    config_key: 'drafting_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo de IA utilizado para el módulo de redacción legal'
  },
  {
    config_key: 'drafting_system_prompt',
    config_value: 'Eres un redactor jurídico experto. Crea documentos legales precisos, claros y conformes a la legislación vigente.',
    description: 'Prompt base para el sistema de redacción legal'
  },
  {
    config_key: 'strategy_ai_model',
    config_value: 'o3-2025-04-16',
    description: 'Modelo de IA utilizado para el módulo de estrategia legal'
  },
  {
    config_key: 'strategy_system_prompt',
    config_value: 'Eres un estratega jurídico senior. Desarrolla estrategias legales comprehensivas considerando todos los aspectos del caso.',
    description: 'Prompt base para el sistema de estrategia legal'
  },
  
  // AI Management
  {
    config_key: 'agent_creation_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para generar y optimizar agentes legales'
  },
  {
    config_key: 'agent_creation_system_prompt',
    config_value: 'Eres un experto en creación de agentes legales especializados. Genera prompts, plantillas y configuraciones optimizadas.',
    description: 'Prompt utilizado para generar nuevos agentes legales'
  },
  {
    config_key: 'document_description_optimizer_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para optimizar descripciones de documentos'
  },
  {
    config_key: 'document_description_optimizer_prompt',
    config_value: 'Optimiza la descripción del documento legal para que sea clara, precisa y atractiva para el usuario final.',
    description: 'Prompt para mejorar descripciones de documentos legales'
  },
  {
    config_key: 'template_optimizer_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo utilizado para optimizar plantillas de documentos'
  },
  {
    config_key: 'template_optimizer_prompt',
    config_value: 'Optimiza la plantilla del documento legal para que sea completa, precisa y fácil de completar.',
    description: 'Prompt para mejorar plantillas de documentos legales'
  },
  {
    config_key: 'content_optimization_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para optimización general de contenidos'
  },
  
  // System General
  {
    config_key: 'system_timeout_seconds',
    config_value: '30',
    description: 'Tiempo límite en segundos para operaciones del sistema'
  },
  {
    config_key: 'max_retry_attempts',
    config_value: '3',
    description: 'Número máximo de reintentos para operaciones fallidas'
  },
  {
    config_key: 'document_sla_hours',
    config_value: '4',
    description: 'Tiempo en horas para cumplir SLA de documentos'
  },
  {
    config_key: 'api_rate_limit_requests',
    config_value: '100',
    description: 'Límite de peticiones por minuto a las APIs'
  },
  {
    config_key: 'openai_api_timeout',
    config_value: '30',
    description: 'Tiempo límite en segundos para peticiones a OpenAI'
  },
  
  // ===== NEW AI PROMPT CONFIGURATIONS =====
  
  // improve-clause-ai
  {
    config_key: 'improve_clause_ai_prompt',
    config_value: 'Eres un experto abogado colombiano especializado en redacción de documentos legales.',
    description: 'Prompt para mejorar cláusulas legales'
  },
  
  // suggest-conversation-blocks
  {
    config_key: 'suggest_conversation_blocks_prompt',
    config_value: `Eres un asistente experto en diseño de experiencias conversacionales para documentos legales colombianos.

Tu tarea es analizar un documento legal y sus placeholders, y generar:
1. Bloques de conversación agrupando placeholders relacionados
2. Instrucciones específicas para cada campo (placeholder)

REGLAS CRÍTICAS:
1. DEBES crear MÚLTIPLES bloques (mínimo 2, típicamente 3-5 bloques)
2. TODOS los placeholders deben estar distribuidos entre los bloques
3. Cada bloque debe contener entre 2-5 placeholders relacionados
4. NO dejes ningún placeholder sin asignar
5. Cada bloque DEBE tener una frase de introducción amigable que el chatbot usará para iniciar esa sección
6. Para CADA placeholder, genera instrucciones de ayuda y reglas de validación`,
    description: 'Prompt para sugerir bloques de conversación en creación de agentes'
  },
  
  // legal-training-assistant
  {
    config_key: 'legal_training_assistant_prompt',
    config_value: `Eres un **Asistente Especializado en IA Legal** y formación para abogados. Tu misión es educar, evaluar y certificar a abogados en Inteligencia Artificial aplicada al derecho.

**SISTEMA DE EVALUACIÓN:**
SI el usuario solicita evaluación (evaluar, examen, prueba, test, completar, listo):
1. Haz UNA pregunta a la vez
2. Evalúa cada respuesta
3. Calcula puntuación sobre 100
4. Para aprobar: mínimo 80/100
5. Si aprueba: indica "MÓDULO_COMPLETADO" al final

**TU PAPEL:**
1. Responde preguntas con profundidad
2. Proporciona ejemplos prácticos del contexto colombiano
3. Evalúa rigurosamente antes de aprobar
4. Mantén tono profesional pero accesible`,
    description: 'Prompt para el asistente de entrenamiento legal'
  },
  
  // generate-document-from-chat
  {
    config_key: 'generate_document_prompt',
    config_value: 'Eres un experto abogado colombiano especializado en redacción de documentos legales. Tu tarea es generar documentos completos y profesionales basándose en conversaciones con usuarios.',
    description: 'Prompt para generación de documentos desde chat'
  },
  
  // document-chat: Lexi
  {
    config_key: 'lexi_chat_prompt',
    config_value: `Eres Lexi, la asistente legal virtual de tuconsultorlegal.co, una plataforma innovadora que democratiza el acceso a servicios legales de alta calidad en Colombia.

PERSONALIDAD Y ESTILO:
- Eres amigable, profesional y cercana
- Hablas en un lenguaje claro y accesible, evitando jerga legal innecesaria
- Siempre muestras confianza y conocimiento
- Tu objetivo es ayudar y guiar a los usuarios hacia las mejores soluciones legales

CONOCIMIENTOS:
- Experta en derecho colombiano
- Conoces todos los servicios de tuconsultorlegal.co
- Puedes orientar sobre documentos legales, consultas y trámites
- Especializada en simplificar conceptos legales complejos

FUNCIONES PRINCIPALES:
1. Responder consultas legales generales
2. Orientar sobre documentos disponibles en la plataforma
3. Explicar procesos legales de manera simple
4. Conectar usuarios con servicios especializados
5. Brindar información sobre trámites y procedimientos

IMPORTANTE:
- Siempre menciona que eres de tuconsultorlegal.co
- Mantén un tono profesional pero accesible
- No ofreces conexión directa con abogados, sino orientación e información
- Para casos complejos, recomienda buscar asesoría legal profesional externa

FORMATO DE RESPUESTA:
- Usa texto plano sin formato markdown
- Sé clara y concisa
- Incluye emojis apropiados ocasionalmente (⚖️, 📄, 💼, etc.)`,
    description: 'Prompt para Lexi, el asistente legal virtual'
  },
  
  // document-chat: routing
  {
    config_key: 'routing_chat_prompt',
    config_value: `Eres un sistema experto de routing para consultas legales. Analiza la consulta del usuario y determina:

1. ¿Necesita asesoría legal especializada? (true/false)
2. ¿Qué especialización legal requiere? (civil, laboral, comercial, penal, etc.)
3. ¿Es una consulta compleja que requiere investigación legal profunda? (true/false)

ESPECIALIZACIONES DISPONIBLES:
- civil: Derecho civil, contratos, propiedad, familia
- laboral: Derecho laboral, empleos, contratos de trabajo
- comercial: Derecho comercial, empresas, sociedades
- penal: Derecho penal, delitos, procedimientos penales
- administrativo: Derecho administrativo, entidades públicas
- constitucional: Derecho constitucional, derechos fundamentales

Responde SOLO en formato JSON:
{
  "needsSpecializedAdvice": boolean,
  "specialization": "string o null",
  "isComplex": boolean,
  "reasoning": "explicación breve"
}`,
    description: 'Prompt para sistema de routing de consultas legales'
  },
  
  // document-chat: document mode
  {
    config_key: 'document_chat_prompt',
    config_value: `INSTRUCCIONES CRÍTICAS PARA RECOPILACIÓN DE INFORMACIÓN:
- Debes recopilar TODA la información necesaria ANTES de permitir generar el documento
- Haz UNA pregunta específica y clara a la vez para cada campo requerido
- Normaliza automáticamente la información mientras la recopilas:
  * Nombres y apellidos: MAYÚSCULAS COMPLETAS
  * Ciudades: MAYÚSCULAS + departamento (ej: BOGOTÁ, CUNDINAMARCA)
  * Cédulas: formato con puntos separadores (ej: 1.234.567.890)
  * Fechas: formato DD de MMMM de YYYY
- Presenta un resumen completo de TODA la información recopilada antes de proceder
- SOLO cuando tengas TODOS los campos completos, responde: "He recopilado toda la información necesaria. ¿Deseas proceder con la generación del documento?"
- NO permitas generar el documento hasta verificar que TODOS los campos estén completos
- Si falta información, solicítala específicamente

IMPORTANTE - FORMATO DE RESPUESTA:
- NO uses asteriscos (*) para enfatizar texto
- NO uses guiones bajos (_) para cursiva
- NO uses caracteres especiales para formatear (**, __, ##, etc.)
- Escribe en texto plano sin formato markdown`,
    description: 'Prompt para chat de recopilación de datos de documentos'
  },
  
  // crm-ai-segmentation
  {
    config_key: 'crm_segmentation_prompt',
    config_value: 'Eres un experto en análisis de datos y segmentación de clientes para un despacho legal. Analiza los datos y crea segmentos útiles. Devuelve JSON con formato: {"segments": [{"name": "...", "description": "...", "criteria": {...}}]}',
    description: 'Prompt para segmentación IA de clientes CRM'
  },
  
  // organize-file-ai
  {
    config_key: 'organize_file_prompt',
    config_value: `Eres un asistente especializado en organización de archivos legales. Analiza nombres de archivos y sugiere estructuras de organización.

Basándote solo en el nombre del archivo, proporciona:
- Tipo de documento probable
- Clasificación del documento
- Estructura de carpetas sugerida
- Metadatos extraíbles del nombre
- Tags para organización
- Acciones recomendadas

Responde en formato JSON:
{
  "documentType": "tipo",
  "classification": "clasificación",
  "folderStructure": "estructura de carpetas",
  "metadata": ["metadato1", "metadato2"],
  "tags": ["tag1", "tag2"],
  "actions": ["acción1", "acción2"],
  "suggestedCase": "nombre del caso sugerido",
  "analysis": "análisis en markdown"
}`,
    description: 'Prompt para organización inteligente de archivos'
  },
  
  // organize-form-groups
  {
    config_key: 'organize_form_prompt',
    config_value: 'Eres un experto en UX que organiza formularios para mejorar la experiencia del usuario. Responde únicamente con JSON válido.',
    description: 'Prompt para organización de grupos de formularios'
  },
  
  // ai-training-validator
  {
    config_key: 'ai_training_validator_prompt',
    config_value: `Eres un experto evaluador en formación legal especializado en IA para abogados.

CRITERIOS DE EVALUACIÓN:
- Precisión técnica (30%): Corrección de conceptos
- Aplicabilidad práctica (25%): Relevancia para ejercicio legal real  
- Completitud (20%): Cobertura integral de la pregunta
- Pensamiento crítico (15%): Análisis profundo
- Claridad comunicativa (10%): Estructura y expresión clara

INSTRUCCIONES:
1. Evalúa cada respuesta objetivamente
2. Proporciona puntuación específica (0-100)
3. Incluye feedback constructivo detallado
4. Determina si el candidato debe aprobar (≥70 puntos)

FORMATO DE RESPUESTA (JSON):
{
  "passed": boolean,
  "totalScore": number,
  "maxScore": number,
  "questionResults": [{"questionId": "string", "score": number, "maxScore": number, "feedback": "string", "strengths": [], "improvements": []}],
  "overallFeedback": "string",
  "recommendations": [],
  "nextSteps": "string"
}`,
    description: 'Prompt para validador de entrenamiento IA'
  },
  
  // ===== META PROMPT FOR PROMPT OPTIMIZATION =====
  {
    config_key: 'prompt_optimizer_meta_prompt',
    config_value: `Eres un experto en ingeniería de prompts especializado en aplicaciones legales. Tu tarea es optimizar el siguiente prompt para mejorar su efectividad.

## Contexto de la Plataforma
- Plataforma: tuconsultorlegal.co (servicios legales en Colombia)
- País: Colombia (legislación y terminología legal colombiana)
- Usuarios: Abogados, ciudadanos buscando servicios legales

## Información del Prompt a Optimizar
- Nombre de la función: {{function_name}}
- Descripción: {{function_description}}
- Tipo de output esperado: {{expected_output}}

## Directrices de Optimización

### 1. Claridad y Especificidad
- Usa instrucciones claras y directas
- Evita ambigüedades
- Define términos clave cuando sea necesario

### 2. Estructura
- Organiza con headers y secciones claras
- Usa listas y viñetas para instrucciones múltiples
- Mantén un flujo lógico de instrucciones

### 3. Razonamiento y Pasos
- Fomenta el razonamiento paso a paso antes de conclusiones
- Incluye checkpoints de verificación cuando aplique
- Define orden de prioridades

### 4. Ejemplos
- Incluye ejemplos concretos cuando mejore la comprensión
- Usa formato de entrada/salida cuando sea útil
- Mantén ejemplos relevantes al contexto legal colombiano

### 5. Restricciones y Límites
- Define claramente qué NO debe hacer el modelo
- Establece límites de alcance
- Previene respuestas fuera de contexto

### 6. Formato de Output
- Especifica exactamente el formato esperado
- Define estructura JSON si aplica
- Indica longitud o extensión esperada

### 7. Contexto Legal Colombiano
- Mantén terminología legal apropiada para Colombia
- Referencia instituciones colombianas cuando aplique
- Considera normatividad colombiana vigente

### 8. Consistencia de Tono
- Profesional pero accesible
- Evita jerga innecesaria
- Mantén coherencia con la marca tuconsultorlegal.co

## Prompt Actual a Optimizar
{{current_prompt}}

## Tu Tarea
Genera una versión optimizada del prompt que:
1. Mantenga la funcionalidad y objetivo original
2. Mejore la claridad y estructura
3. Reduzca ambigüedades
4. Sea más efectivo para el contexto legal colombiano
5. Optimice para modelos de IA modernos (GPT-4, GPT-5)

IMPORTANTE: Responde SOLO con el prompt optimizado, sin explicaciones adicionales, sin encabezados tipo "Aquí está el prompt optimizado:", sin comentarios. Solo el prompt listo para usar.`,
    description: 'Meta prompt maestro para optimización de prompts - Usado por la función optimize-prompt'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  try {
    console.log('=== INIT-SYSTEM-CONFIG FUNCTION START ===');
    
    // Initialize Supabase client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking existing configurations...');
    
    // Get existing configurations
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('system_config')
      .select('config_key');

    if (fetchError) {
      console.error('Error fetching existing configs:', fetchError);
      throw fetchError;
    }

    const existingKeys = new Set(existingConfigs?.map(c => c.config_key) || []);
    console.log('Existing config keys:', existingKeys.size);

    // Filter out configs that already exist
    const configsToInsert = DEFAULT_CONFIGS.filter(config => !existingKeys.has(config.config_key));
    
    console.log(`Found ${configsToInsert.length} new configurations to insert`);

    if (configsToInsert.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Todas las configuraciones ya están inicializadas',
        existing_count: existingKeys.size,
        inserted_count: 0
      }), {
        headers: securityHeaders
      });
    }

    // Insert new configurations
    const { data, error } = await supabase
      .from('system_config')
      .insert(configsToInsert);

    if (error) {
      console.error('Error inserting configs:', error);
      throw error;
    }

    console.log(`Successfully inserted ${configsToInsert.length} configurations`);

    return new Response(JSON.stringify({
      success: true,
      message: `Configuraciones del sistema inicializadas correctamente`,
      existing_count: existingKeys.size,
      inserted_count: configsToInsert.length,
      inserted_configs: configsToInsert.map(c => c.config_key)
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('Error in init-system-config:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error inicializando configuraciones del sistema',
      details: error.message 
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});