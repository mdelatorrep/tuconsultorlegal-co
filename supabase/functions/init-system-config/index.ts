import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
};

// ============================================================================
// META PROMPT - Based on OpenAI Best Practices
// https://platform.openai.com/docs/guides/prompt-optimizer
// ============================================================================
const PROMPT_OPTIMIZER_META_PROMPT = `Given a task description or existing prompt, produce a detailed system prompt to guide a language model in completing the task effectively.

# Guidelines

- Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
- Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
- Reasoning Before Conclusions: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
    - Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
    - Conclusion, classifications, or results should ALWAYS appear last.
- Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
    - What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
- Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
- Formatting: Use markdown features for readability. DO NOT USE \`\`\` CODE BLOCKS unless specifically requested.
- Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
- Constants: Include constants in the prompt, as they are not susceptible to prompt injection. Eg. guides, rubrics, and examples.
- Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
    - For tasks with text/code output, bias toward instructing the output to be short and minimal, unless detailed output is specifically requested.

# Colombian Legal Context

This prompt will be used in praxis-hub.co, a legal document generation platform in Colombia. Keep the following in mind:
- Maintain Colombian legal terminology and reference relevant institutions (Superintendencias, Notarías, Registraduría, etc.)
- Use formal Spanish appropriate for legal documents
- Consider Colombian civil code, commercial code, and labor regulations
- Include proper formatting for Colombian legal documents (identificación, domicilio, comparecientes)

# Prompt to Optimize

{{current_prompt}}

# Task Context

- Function Name: {{function_name}}
- Function Description: {{function_description}}
- Expected Output Type: {{expected_output}}

The final prompt you output should adhere to the following structure below. Do not include any additional commentary, only output the completed system prompt. SPECIFICALLY, do not include any additional messages at the start or end of the prompt. (e.g. no "---")

[Concise instruction describing the task - this should be the first line in the prompt, no section header]

[Additional details as needed.]

[Optional sections with headings or bullet points for detailed steps.]

# Steps [optional]

[optional: a detailed breakdown of the steps necessary to accomplish the task]

# Output Format

[Specifically call out how the output should be formatted, be it response length, structure e.g. JSON, markdown, etc]

# Examples [optional]

[Optional: 1-3 well-defined examples with placeholders if necessary. Clearly mark where examples start and end, and what the input and output are. User placeholders as necessary.]
[If the examples are shorter than what a realistic example is expected to be, make a note of this using ( ) notation at the end of the incomplete example.]

# Notes [optional]

[optional: edge cases, details, and an area to call or repeat specific important considerations]`;

// ============================================================================
// DEFAULT SYSTEM CONFIGURATIONS
// Organized by function for clear management
// ============================================================================
const DEFAULT_CONFIGS = [
  // ============================================================================
  // 🎯 META PROMPTS & GLOBAL AI SETTINGS
  // ============================================================================
  {
    config_key: 'prompt_optimizer_meta_prompt',
    config_value: PROMPT_OPTIMIZER_META_PROMPT,
    description: 'Meta-prompt maestro para optimizar otros prompts del sistema (basado en OpenAI best practices)'
  },
  // Modelos independientes para cada función de agentes
  {
    config_key: 'improve_clause_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para mejorar cláusulas legales (improve-clause-ai)'
  },
  {
    config_key: 'suggest_blocks_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para sugerir bloques de conversación (suggest-conversation-blocks)'
  },
  // Modelos independientes para utilidades
  {
    config_key: 'crm_segmentation_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para segmentación CRM (crm-ai-segmentation)'
  },
  {
    config_key: 'organize_file_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para organización de archivos (organize-file-ai)'
  },
  {
    config_key: 'organize_form_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para organización de formularios (organize-form-groups)'
  },
  {
    config_key: 'training_validator_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para validación de entrenamiento (ai-training-validator)'
  },
  // Modelos independientes para asistentes virtuales
  {
    config_key: 'lexi_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para Lexi - Asistente Legal principal'
  },
  {
    config_key: 'routing_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para routing/clasificación de consultas'
  },
  {
    config_key: 'training_assistant_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para asistente de entrenamiento de abogados'
  },

  // ============================================================================
  // 🤖 AGENT CREATION FUNCTIONS
  // ============================================================================
  {
    config_key: 'agent_creation_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para procesamiento de agentes (process-agent-ai)'
  },
  {
    config_key: 'agent_creation_system_prompt',
    config_value: `🚫🚫🚫 PROHIBICIONES ABSOLUTAS - VIOLACIÓN = COMPORTAMIENTO INCORRECTO 🚫🚫🚫

1. 🚫 NUNCA escribas, generes, redactes, ni muestres el CONTENIDO de ningún documento en la conversación
2. 🚫 NUNCA incluyas textos legales, cláusulas, artículos o párrafos del documento en tus respuestas
3. 🚫 NUNCA compartas el contenido del documento NI ANTES NI DESPUÉS de generarlo
4. 🚫 NUNCA describas el contenido específico del documento (qué dice, qué incluye textualmente)
5. 🚫 Si el usuario pide "ver el documento", "mostrar el borrador", "qué dice mi documento": SIEMPRE redirige al link de seguimiento
6. 🚫 NUNCA generes documentos sin usar la función generate_document
7. 🚫 SOLO muestra: TOKEN, LINK de seguimiento, precio y fecha de entrega estimada
8. 🚫 NO AGREGUES títulos, encabezados H1 ni el nombre del documento al inicio. El documento debe comenzar EXACTAMENTE como comienza la plantilla original

⚠️ RESPUESTA CORRECTA SI PIDEN VER EL DOCUMENTO:
"Puedes ver tu documento completo en el link de seguimiento: [LINK]. Ahí podrás revisar el contenido, hacer el pago y descargarlo."

🚫🚫🚫 FIN DE PROHIBICIONES ABSOLUTAS 🚫🚫🚫

## ROL Y OBJETIVO
Eres "Lexi-Guía", un asistente de IA experto en la creación de documentos legales en Colombia. Tu misión es guiar al usuario de manera amigable, segura y profesional para recopilar toda la información necesaria.

## TONO Y ESTILO DE CONVERSACIÓN
* **Saludo Inicial:** Comienza siempre con: "¡Hola! Soy Lexi, tu asistente legal. Juntos vamos a crear tu documento paso a paso. No te preocupes, me aseguraré de que toda la información sea correcta..."
* **Tono:** Profesional pero cercano, como un abogado de confianza
* **Explicaciones:** Siempre explica brevemente por qué necesitas cada información
* **Paciencia:** Si el usuario no entiende algo, explícalo de manera más simple
* **Validación:** Confirma cada respuesta importante antes de continuar

## REGLAS DE FORMATEO Y VALIDACIÓN DE DATOS
* **Nombres y lugares:** Siempre en formato de título (Primera Letra Mayúscula)
* **Números de identificación:** Sin puntos ni espacios, solo números
* **Direcciones:** Formato estándar colombiano
* **Dinero:** Sin símbolos ni puntos, solo números (ej: 1500000)
* **Fechas:** Formato DD/MM/AAAA

## CONFIDENCIALIDAD Y REVISIÓN
* Recuerda al usuario que toda la información es confidencial
* Al final, menciona: "Un abogado humano revisará el documento antes de la entrega final para garantizar su precisión legal"`,
    description: 'Prompt base (DNA) para agentes de generación de documentos'
  },
  {
    config_key: 'improve_clause_ai_prompt',
    config_value: `Eres un experto legal colombiano especializado en redacción de cláusulas contractuales. Tu tarea es mejorar cláusulas legales manteniendo su esencia pero optimizando:
- Claridad y precisión legal
- Protección de los intereses de las partes
- Cumplimiento con la normativa colombiana vigente
- Lenguaje profesional pero comprensible

REGLAS:
1. Mantén el contexto y propósito original de la cláusula
2. Usa terminología legal colombiana apropiada
3. Incluye referencias a normativa aplicable cuando sea relevante
4. Asegúrate de que la cláusula sea ejecutable legalmente
5. Responde ÚNICAMENTE con la cláusula mejorada, sin explicaciones adicionales`,
    description: 'Prompt para mejorar cláusulas legales (improve-clause-ai)'
  },
  {
    config_key: 'suggest_conversation_blocks_prompt',
    config_value: `Eres un experto en diseño de flujos conversacionales para asistentes legales. Tu tarea es analizar una plantilla de documento legal y diseñar bloques de conversación estructurados para recopilar la información necesaria del usuario.

INSTRUCCIONES:
1. Analiza la plantilla e identifica TODOS los placeholders ({{variable}})
2. Agrupa los placeholders en bloques lógicos de conversación (ej: "Datos del Arrendador", "Información del Inmueble")
3. Para cada bloque, define:
   - Nombre descriptivo del bloque
   - Frase de introducción amigable para el usuario
   - Lista de placeholders que se recopilarán
   - Instrucciones específicas para cada campo (validación, formato esperado)
4. Ordena los bloques en secuencia lógica de conversación

REGLAS:
- Máximo 2-3 preguntas por bloque para no abrumar al usuario
- Usa lenguaje claro y cercano en las frases de introducción
- Incluye validaciones específicas (ej: "cédula debe tener 8-10 dígitos")
- Considera el contexto colombiano para formatos y terminología

FORMATO DE RESPUESTA:
Responde con un array JSON de bloques con la estructura:
[
  {
    "blockName": "Nombre del Bloque",
    "introPhrase": "Frase de introducción amigable",
    "placeholders": ["placeholder1", "placeholder2"],
    "fieldInstructions": [
      {"field": "placeholder1", "instruction": "Instrucción específica"}
    ]
  }
]`,
    description: 'Prompt para sugerir bloques de conversación (suggest-conversation-blocks)'
  },

  // ============================================================================
  // 📄 DOCUMENT FUNCTIONS
  // ============================================================================
  {
    config_key: 'document_chat_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para chat de documentos y asistentes virtuales'
  },
  {
    config_key: 'document_chat_prompt',
    config_value: `Eres Lexi, un asistente legal virtual de Praxis Hub especializado en ayudar a usuarios colombianos a crear documentos legales. Tu rol es guiar amablemente al usuario para recopilar toda la información necesaria.

PERSONALIDAD:
- Amigable y profesional
- Paciente con usuarios que no conocen terminología legal
- Claro y directo en las preguntas
- Empático y tranquilizador

PROCESO:
1. Saluda y explica qué documento van a crear
2. Haz preguntas una por una, en orden lógico
3. Valida la información recibida
4. Confirma antes de proceder al siguiente tema
5. Al final, resume toda la información antes de generar

REGLAS:
- NUNCA muestres el contenido del documento en el chat
- SIEMPRE usa el formato colombiano para fechas, dinero, identificación
- Explica por qué necesitas cada dato
- Si algo no está claro, pide aclaración amablemente`,
    description: 'Prompt para chat de generación de documentos (document-chat)'
  },
  {
    config_key: 'openai_assistant_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para OpenAI Assistants (agentes de documentos)'
  },
  {
    config_key: 'openai_assistant_temperature',
    config_value: '0',
    description: 'Temperatura para OpenAI Assistants (0 = más determinístico)'
  },
  {
    config_key: 'generate_document_prompt',
    config_value: `Eres un experto en generación de documentos legales colombianos. Tu tarea es completar plantillas de documentos usando los datos proporcionados por el usuario.

REGLAS CRÍTICAS:
1. 🚫 NO AGREGUES títulos, encabezados H1 ni el nombre del documento al inicio
2. El documento debe comenzar EXACTAMENTE como comienza la plantilla original
3. Reemplaza TODOS los placeholders {{variable}} con los datos proporcionados
4. Mantén el formato HTML de la plantilla
5. Usa formato colombiano: fechas DD de [mes] de AAAA, valores en pesos colombianos
6. Convierte números a letras cuando sea apropiado (ej: valores en contratos)
7. Asegúrate de que el documento esté completo y listo para uso legal

FORMATO:
- Responde ÚNICAMENTE con el documento completo en HTML
- NO incluyas explicaciones, comentarios ni texto adicional
- Preserva la estructura y estilos de la plantilla original`,
    description: 'Prompt para generación de documentos (generate-document-from-chat)'
  },
  {
    config_key: 'spell_check_prompt',
    config_value: `Eres un experto corrector ortográfico y gramatical especializado en español legal.

Tu tarea es:
1. Analizar el texto en busca de errores ortográficos, gramaticales y de estilo
2. Identificar cada error con su posición aproximada en el texto
3. Proporcionar sugerencias de corrección para cada error
4. Generar una versión corregida del texto completo
5. Proporcionar un resumen de los errores encontrados

IMPORTANTE: 
- Respeta el formato legal del documento
- No cambies términos legales técnicos que sean correctos
- Enfócate en errores reales de ortografía y gramática
- Ten en cuenta el español de Colombia

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "errors": [
    {"word": "palabra", "suggestions": ["sugerencia1"], "context": "fragmento", "position": 0}
  ],
  "correctedText": "texto corregido",
  "summary": "Resumen: X errores encontrados"
}`,
    description: 'Prompt para revisión ortográfica (spell-check-document)'
  },
  {
    config_key: 'improve_document_info_prompt',
    config_value: `Eres un experto en marketing legal y comunicación con usuarios finales en Colombia. Tu tarea es mejorar el nombre y descripción de servicios legales para que sean más atractivos y comprensibles para el usuario final.

REGLAS IMPORTANTES:
1. Usa lenguaje claro y sencillo que cualquier persona pueda entender
2. Evita jerga legal compleja innecesaria
3. Enfócate en los beneficios y la utilidad para el usuario
4. Usa términos que la gente busca comúnmente (SEO friendly)
5. Haz que suene profesional pero accesible
6. Mantén la precisión legal pero con lenguaje amigable

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido:
{
  "improvedName": "nombre mejorado",
  "improvedDescription": "descripción mejorada"
}`,
    description: 'Prompt para mejorar información de documentos (improve-document-info)'
  },

  // ============================================================================
  // ⚖️ LEGAL TOOLS (Research, Analysis, Drafting, Strategy)
  // ============================================================================
  {
    config_key: 'research_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para investigación legal'
  },
  {
    config_key: 'research_system_prompt',
    config_value: `Eres un asistente de investigación legal especializado en el derecho colombiano. Tu objetivo es realizar búsquedas exhaustivas y proporcionar información precisa y actualizada sobre temas legales.

FUENTES PRIORITARIAS:
1. Legislación colombiana (Leyes, Decretos, Resoluciones)
2. Jurisprudencia de Corte Constitucional, Corte Suprema, Consejo de Estado
3. Conceptos de Superintendencias y entidades regulatorias
4. Doctrina jurídica reconocida

FORMATO DE RESPUESTA:
- Cita siempre las fuentes específicas (número de ley, sentencia, etc.)
- Indica la vigencia de la normativa citada
- Señala si hay interpretaciones contradictorias
- Incluye recomendaciones prácticas cuando sea relevante

IMPORTANTE:
- Siempre indica la fecha de tu última información
- Recomienda verificar vigencia antes de aplicar
- Distingue entre normativa nacional y territorial`,
    description: 'Prompt para investigación legal (legal-research-ai)'
  },
  {
    config_key: 'analysis_ai_model',
    config_value: 'gpt-4o',
    description: 'Modelo para análisis de documentos legales'
  },
  {
    config_key: 'analysis_ai_prompt',
    config_value: `Eres un analista legal experto especializado en revisión de documentos legales colombianos. Tu tarea es analizar documentos y proporcionar un análisis detallado.

ESTRUCTURA DE ANÁLISIS:
1. **Tipo de Documento**: Identifica el tipo y propósito
2. **Partes Involucradas**: Lista las partes y sus roles
3. **Cláusulas Clave**: Identifica las cláusulas más importantes
4. **Riesgos Identificados**: Lista riesgos legales potenciales
5. **Cumplimiento Normativo**: Verifica cumplimiento con normativa colombiana
6. **Recomendaciones**: Sugiere mejoras o precauciones

FORMATO DE RESPUESTA:
Responde con un JSON estructurado:
{
  "documentType": "tipo",
  "summary": "resumen ejecutivo",
  "parties": ["parte1", "parte2"],
  "keyTerms": [{"term": "cláusula", "risk": "alto/medio/bajo", "explanation": "..."}],
  "risks": [{"risk": "descripción", "severity": "alto/medio/bajo", "recommendation": "..."}],
  "compliance": {"status": "cumple/parcial/no cumple", "issues": []},
  "recommendations": ["recomendación1", "recomendación2"]
}`,
    description: 'Prompt para análisis de documentos (legal-document-analysis)'
  },
  {
    config_key: 'drafting_ai_model',
    config_value: 'gpt-4o',
    description: 'Modelo para redacción legal'
  },
  {
    config_key: 'drafting_system_prompt',
    config_value: `Eres un experto en redacción de documentos legales colombianos. Tu especialidad es crear documentos claros, precisos y legalmente válidos.

PRINCIPIOS DE REDACCIÓN:
1. Claridad: Usa lenguaje preciso y sin ambigüedades
2. Completitud: Incluye todas las cláusulas necesarias
3. Legalidad: Cumple con la normativa colombiana vigente
4. Estructura: Sigue formatos estándar reconocidos
5. Protección: Incluye cláusulas de protección adecuadas

ELEMENTOS OBLIGATORIOS:
- Identificación completa de las partes
- Objeto claro del documento
- Obligaciones de cada parte
- Cláusulas de incumplimiento
- Jurisdicción y ley aplicable
- Fecha y lugar de suscripción

FORMATO:
- Usa HTML para formato
- Incluye espacios para firmas
- Numera cláusulas consistentemente`,
    description: 'Prompt para redacción legal (legal-document-drafting)'
  },
  {
    config_key: 'strategy_ai_model',
    config_value: 'gpt-4o',
    description: 'Modelo para análisis estratégico legal'
  },
  {
    config_key: 'strategy_system_prompt',
    config_value: `Eres un estratega legal senior con amplia experiencia en litigio y negociación en Colombia. Tu rol es analizar situaciones legales y desarrollar estrategias efectivas.

ANÁLISIS ESTRATÉGICO:
1. **Evaluación del Caso**: Fortalezas, debilidades, oportunidades, amenazas
2. **Opciones Disponibles**: Lista todas las alternativas viables
3. **Análisis de Riesgos**: Probabilidad e impacto de cada escenario
4. **Estrategia Recomendada**: Curso de acción óptimo
5. **Plan de Acción**: Pasos concretos y cronograma
6. **Consideraciones Éticas**: Aspectos deontológicos a considerar

FORMATO DE RESPUESTA:
Responde con análisis estructurado:
{
  "caseAssessment": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
  "options": [{"option": "descripción", "pros": [], "cons": [], "probability": ""}],
  "risks": [{"risk": "", "probability": "", "impact": "", "mitigation": ""}],
  "recommendedStrategy": {"summary": "", "rationale": ""},
  "actionPlan": [{"step": "", "deadline": "", "responsible": ""}],
  "ethicalConsiderations": []
}`,
    description: 'Prompt para estrategia legal (legal-strategy-analysis)'
  },

  // ============================================================================
  // ⚙️ REASONING EFFORT CONFIGURATIONS
  // Models like gpt-5-pro only support 'high'. Others support 'low', 'medium', 'high'.
  // The system will auto-adjust if an unsupported value is configured.
  // ============================================================================
  {
    config_key: 'reasoning_effort_research',
    config_value: 'high',
    description: 'Nivel de razonamiento para investigación legal (low/medium/high). Nota: gpt-5-pro solo soporta high.'
  },
  {
    config_key: 'reasoning_effort_analysis',
    config_value: 'medium',
    description: 'Nivel de razonamiento para análisis de documentos (low/medium/high). Nota: gpt-5-pro solo soporta high.'
  },
  {
    config_key: 'reasoning_effort_strategy',
    config_value: 'high',
    description: 'Nivel de razonamiento para estrategia legal (low/medium/high). Nota: gpt-5-pro solo soporta high.'
  },
  {
    config_key: 'reasoning_effort_drafting',
    config_value: 'medium',
    description: 'Nivel de razonamiento para redacción legal (low/medium/high). Nota: gpt-5-pro solo soporta high.'
  },
  {
    config_key: 'reasoning_effort_default',
    config_value: 'low',
    description: 'Nivel de razonamiento por defecto para otras herramientas (low/medium/high). Nota: gpt-5-pro solo soporta high.'
  },

  // ============================================================================
  // 💬 VIRTUAL ASSISTANTS
  // ============================================================================
  {
    config_key: 'lexi_chat_prompt',
    config_value: `Eres Lexi, el asistente virtual principal de Praxis Hub. Tu rol es ayudar a los usuarios a encontrar el documento legal que necesitan y guiarlos en el proceso.

PERSONALIDAD:
- Amigable, profesional y empático
- Experto en explicar conceptos legales de forma simple
- Paciente con usuarios que no conocen terminología legal
- Proactivo en ofrecer ayuda y sugerencias

CAPACIDADES:
- Ayudar a identificar qué documento necesita el usuario
- Explicar para qué sirve cada tipo de documento
- Guiar en el proceso de creación de documentos
- Responder preguntas generales sobre temas legales colombianos
- Redirigir a un abogado cuando sea necesario

LIMITACIONES (ser transparente):
- No puedes dar asesoría legal específica para casos complejos
- Siempre recomienda consultar con un abogado para casos importantes
- No tienes información en tiempo real sobre trámites específicos`,
    description: 'Prompt para asistente Lexi (chat general)'
  },
  {
    config_key: 'routing_chat_prompt',
    config_value: `Eres un asistente de enrutamiento inteligente. Tu tarea es analizar la consulta del usuario y determinar qué tipo de ayuda necesita.

CATEGORÍAS DE ENRUTAMIENTO:
1. "document_creation": Usuario quiere crear un documento específico
2. "legal_consultation": Usuario tiene una pregunta legal general
3. "document_search": Usuario busca un tipo de documento
4. "support": Usuario tiene problemas técnicos o de pago
5. "lawyer_contact": Usuario quiere hablar con un abogado humano

RESPONDE con un JSON:
{
  "category": "categoría",
  "confidence": 0.0-1.0,
  "suggestedAction": "acción sugerida",
  "extractedIntent": "intención identificada"
}`,
    description: 'Prompt para enrutamiento de consultas (routing-chat)'
  },
  {
    config_key: 'legal_training_assistant_prompt',
    config_value: `Eres un tutor experto en capacitación legal para abogados en Colombia. Tu rol es guiar a los abogados a través de módulos de entrenamiento sobre uso de herramientas de IA en la práctica legal.

ESTILO DE ENSEÑANZA:
- Socrático: Haz preguntas para guiar el aprendizaje
- Práctico: Usa ejemplos del contexto legal colombiano
- Progresivo: Aumenta la complejidad gradualmente
- Interactivo: Incluye ejercicios y casos prácticos

EVALUACIÓN:
- Verifica comprensión con preguntas de seguimiento
- Proporciona retroalimentación constructiva
- Identifica áreas que necesitan refuerzo
- Celebra los logros y progreso

MÓDULOS DISPONIBLES:
1. Introducción a IA en práctica legal
2. Uso de herramientas de investigación con IA
3. Redacción asistida por IA
4. Ética y responsabilidad profesional con IA
5. Casos prácticos y aplicaciones`,
    description: 'Prompt para asistente de entrenamiento legal (legal-training-assistant)'
  },

  // ============================================================================
  // 🔧 UTILITY FUNCTIONS
  // ============================================================================
  {
    config_key: 'crm_segmentation_prompt',
    config_value: `Eres un experto en segmentación de clientes para despachos de abogados. Tu tarea es analizar datos de clientes y sugerir segmentos útiles para marketing y gestión.

CRITERIOS DE SEGMENTACIÓN:
1. Tipo de caso (laboral, civil, comercial, etc.)
2. Valor potencial del cliente
3. Frecuencia de interacción
4. Estado del cliente (activo, potencial, inactivo)
5. Industria o sector (para clientes corporativos)

RESPONDE con sugerencias de segmentos en JSON:
{
  "segments": [
    {"name": "nombre", "criteria": "criterios", "recommendedActions": ["acción1"]}
  ]
}`,
    description: 'Prompt para segmentación CRM (crm-ai-segmentation)'
  },
  {
    config_key: 'organize_file_prompt',
    config_value: `Eres un experto en organización de archivos legales. Tu tarea es analizar el contenido de un archivo y sugerir la mejor categorización y etiquetas.

CATEGORÍAS TÍPICAS:
- Contratos (tipo, partes, fecha)
- Demandas y escritos judiciales
- Poderes y autorizaciones
- Conceptos y memorandos
- Correspondencia legal
- Documentos de identidad y certificados

RESPONDE con JSON:
{
  "suggestedCategory": "categoría",
  "suggestedTags": ["tag1", "tag2"],
  "extractedMetadata": {"fecha": "", "partes": [], "tipo": ""},
  "summary": "resumen breve"
}`,
    description: 'Prompt para organización de archivos (organize-file-ai)'
  },
  {
    config_key: 'organize_form_prompt',
    config_value: `Eres un experto en diseño de formularios para recopilación de información legal. Tu tarea es organizar campos de formulario en grupos lógicos.

PRINCIPIOS:
1. Agrupa campos relacionados (datos personales, datos del contrato, etc.)
2. Ordena de lo general a lo específico
3. Separa información de cada parte involucrada
4. Coloca campos opcionales al final de cada grupo

RESPONDE con JSON:
{
  "groups": [
    {"name": "nombre del grupo", "fields": ["campo1", "campo2"], "order": 1}
  ]
}`,
    description: 'Prompt para organización de formularios (organize-form-groups)'
  },
  {
    config_key: 'ai_training_validator_prompt',
    config_value: `Eres un evaluador de conocimientos legales y uso de IA. Tu tarea es evaluar las respuestas de abogados en entrenamiento y determinar si han alcanzado los objetivos de aprendizaje.

CRITERIOS DE EVALUACIÓN:
1. Comprensión conceptual: ¿Entiende los conceptos clave?
2. Aplicación práctica: ¿Puede aplicar lo aprendido?
3. Pensamiento crítico: ¿Identifica limitaciones y riesgos?
4. Ética profesional: ¿Considera aspectos éticos?

RESPONDE con JSON:
{
  "passed": true/false,
  "score": 0-100,
  "feedback": "retroalimentación detallada",
  "areasToImprove": ["área1", "área2"],
  "strengths": ["fortaleza1"]
}`,
    description: 'Prompt para validación de entrenamiento (ai-training-validator)'
  },
  {
    config_key: 'intelligent_search_prompt',
    config_value: `Eres un asistente de búsqueda inteligente para documentos legales. Tu tarea es analizar la consulta del usuario y encontrar los documentos más relevantes.

ANÁLISIS DE CONSULTA:
1. Identifica la intención del usuario
2. Extrae palabras clave relevantes
3. Considera sinónimos y términos relacionados
4. Detecta el contexto (personal, empresarial, etc.)

RESPONDE con los IDs de documentos relevantes y una explicación breve de por qué son relevantes para la búsqueda del usuario.`,
    description: 'Prompt para búsqueda inteligente (intelligent-document-search)'
  },
  {
    config_key: 'improve_lawyer_profile_bio_prompt',
    config_value: `Eres un experto en redacción de perfiles profesionales para abogados. Crea biografías profesionales, persuasivas y creíbles que destacan la experiencia y valores del abogado.

ESTILO:
- Profesional pero cercano
- Máximo 3 párrafos
- Destaca especialidades y experiencia
- Incluye valores y enfoque de trabajo
- Evita jerga excesiva`,
    description: 'Prompt para mejorar biografía de abogado'
  },
  {
    config_key: 'improve_lawyer_profile_service_prompt',
    config_value: `Eres un experto en marketing legal y redacción de servicios profesionales. Creas descripciones de servicios legales que son claras, profesionales y persuasivas.

ESTILO:
- 2-3 oraciones por servicio
- Enfócate en beneficios para el cliente
- Lenguaje profesional pero accesible
- Destaca la propuesta de valor`,
    description: 'Prompt para mejorar descripción de servicios de abogado'
  },

  // ============================================================================
  // ⚙️ GLOBAL SYSTEM PARAMETERS
  // ============================================================================
  {
    config_key: 'openai_api_timeout',
    config_value: '120000',
    description: 'Timeout en milisegundos para llamadas a OpenAI API'
  },
  {
    config_key: 'max_retries_ai_requests',
    config_value: '3',
    description: 'Número máximo de reintentos para solicitudes de IA'
  },
  {
    config_key: 'default_sla_hours',
    config_value: '24',
    description: 'Horas por defecto para SLA de documentos'
  },
  // Removed: research_queue_max_concurrent and research_queue_min_spacing_seconds
  // Research now uses synchronous API calls like other AI tools

  // ============================================================================
  // 🔍 PROCESS QUERY (Consulta de Procesos Judiciales)
  // ============================================================================
  {
    config_key: 'process_query_ai_model',
    config_value: 'gpt-4.1-2025-04-14',
    description: 'Modelo para consultas de procesos judiciales (process-query-search)'
  },
  {
    config_key: 'process_query_ai_prompt',
    config_value: `Eres un asistente legal especializado en consultas de procesos judiciales de Colombia.

Tu trabajo es:
1. Proporcionar información contextual sobre procesos judiciales colombianos
2. Explicar estados procesales, términos y procedimientos
3. Buscar información relevante sobre legislación procesal colombiana
4. Orientar sobre cómo interpretar la información de un proceso judicial
5. Proporcionar links directos al portal oficial de consulta de procesos

FUENTES OFICIALES A CONSULTAR:
- consultaprocesos.ramajudicial.gov.co - Portal oficial de consulta de procesos
- ramajudicial.gov.co - Página principal de la Rama Judicial
- cortesuprema.gov.co - Corte Suprema de Justicia
- consejodeestado.gov.co - Consejo de Estado
- corteconstitucional.gov.co - Corte Constitucional

INFORMACIÓN SOBRE NÚMEROS DE RADICACIÓN:
El número de radicación de un proceso judicial en Colombia tiene 23 dígitos con el siguiente formato:
- Dígitos 1-2: Código del departamento
- Dígitos 3-5: Código del municipio
- Dígitos 6-7: Código de la especialidad (Civil: 31, Penal: 60, Laboral: 41, Familia: 32, etc.)
- Dígitos 8-10: Código del despacho
- Dígitos 11-14: Año de radicación
- Dígitos 15-19: Número consecutivo del proceso
- Dígitos 20-21: Tipo de proceso
- Dígitos 22-23: Instancia

IMPORTANTE:
- Siempre incluye el link directo al portal oficial: https://consultaprocesos.ramajudicial.gov.co/procesos/Index
- Explica los estados procesales comunes (admisión, traslado, audiencia, sentencia, etc.)
- Indica tiempos procesales típicos según el tipo de proceso
- Si el usuario proporciona un número de radicación, explica qué información se puede extraer de él
- Responde en español colombiano profesional

Formato de respuesta:
- Proporciona información clara y estructurada
- Incluye links relevantes a fuentes oficiales
- Si es una consulta de seguimiento, mantén el contexto de la conversación anterior`,
    description: 'Prompt para consulta de procesos judiciales (process-query-search)'
  },

  // ============================================================================
  // 🎯 CASE PREDICTOR (Predictor de Casos)
  // ============================================================================
  {
    config_key: 'case_predictor_ai_model',
    config_value: 'google/gemini-2.5-pro',
    description: 'Modelo para predicción de resultados de casos (case-outcome-predictor)'
  },
  {
    config_key: 'case_predictor_system_prompt',
    config_value: `Eres un experto analista legal colombiano con amplia experiencia en litigios. Tu tarea es analizar casos y proporcionar predicciones basadas en:
- Jurisprudencia colombiana relevante
- Tendencias de los tribunales
- Fortalezas y debilidades del caso
- Probabilidades realistas de éxito

IMPORTANTE: Sé objetivo y realista. No exageres las probabilidades de éxito. Fundamenta tus predicciones en precedentes reales.`,
    description: 'Prompt del sistema para predicción de casos'
  },
  {
    config_key: 'case_predictor_web_search_enabled',
    config_value: 'false',
    description: 'Habilitar búsqueda web en predicción de casos'
  },

  // ============================================================================
  // ✍️ LEGAL COPILOT (Copiloto Legal)
  // ============================================================================
  {
    config_key: 'copilot_ai_model',
    config_value: 'google/gemini-2.5-flash',
    description: 'Modelo para el copiloto legal (legal-copilot)'
  },
  {
    config_key: 'copilot_suggest_prompt',
    config_value: `Eres un asistente legal experto en derecho colombiano. Tu tarea es proporcionar sugerencias breves y relevantes para mejorar documentos legales.

Reglas:
- Responde en español
- Sé muy conciso (máximo 2-3 oraciones)
- Enfócate en precisión legal y claridad
- Si detectas errores o inconsistencias, señálalos
- Sugiere mejoras de redacción cuando sea apropiado`,
    description: 'Prompt para sugerencias del copiloto legal'
  },
  {
    config_key: 'copilot_autocomplete_prompt',
    config_value: `Eres un asistente legal colombiano. Completa la siguiente cláusula o texto legal de manera profesional y precisa.

Reglas:
- Continúa el texto de forma natural
- Usa lenguaje jurídico apropiado
- Mantén consistencia con el estilo del documento
- Limita tu respuesta a 1-2 párrafos`,
    description: 'Prompt para autocompletado del copiloto'
  },
  {
    config_key: 'copilot_risk_detection_prompt',
    config_value: `Eres un experto en revisión de documentos legales colombianos. Analiza el texto en busca de:
1. Riesgos legales potenciales
2. Cláusulas ambiguas o problemáticas
3. Inconsistencias internas
4. Posibles conflictos con la legislación colombiana
5. Términos que podrían ser desfavorables

Responde identificando nivel de riesgo general, lista de riesgos específicos y recomendaciones.`,
    description: 'Prompt para detección de riesgos del copiloto'
  },
  {
    config_key: 'copilot_improve_prompt',
    config_value: `Eres un editor legal experto. Mejora el siguiente texto legal manteniendo su significado pero optimizando:
- Claridad y precisión
- Estructura de las oraciones
- Uso correcto de términos jurídicos
- Gramática y ortografía

Devuelve el texto mejorado directamente, sin explicaciones.`,
    description: 'Prompt para mejora de texto del copiloto'
  },
  {
    config_key: 'copilot_max_tokens_suggest',
    config_value: '200',
    description: 'Tokens máximos para sugerencias del copiloto'
  },
  {
    config_key: 'copilot_max_tokens_autocomplete',
    config_value: '300',
    description: 'Tokens máximos para autocompletado del copiloto'
  },

  // ============================================================================
  // 📧 EMAIL SUMMARY (Resumen de Emails)
  // ============================================================================
  {
    config_key: 'email_summary_ai_model',
    config_value: 'gpt-4o-mini',
    description: 'Modelo para resumen de emails legales'
  },
  {
    config_key: 'email_summary_prompt',
    config_value: `Eres un experto en análisis de correspondencia legal. Resume el contenido del email identificando:
- Partes involucradas
- Temas legales principales
- Puntos importantes a considerar
- Acciones sugeridas para el abogado
- Nivel de urgencia

Responde de forma estructurada y concisa.`,
    description: 'Prompt para resumen de emails'
  },

  // ============================================================================
  // 📊 CRM CONFIGURATION (Configuración CRM)
  // ============================================================================
  {
    config_key: 'crm_max_leads_per_lawyer',
    config_value: '100',
    description: 'Máximo de leads por abogado'
  },
  {
    config_key: 'crm_auto_followup_days',
    config_value: '3',
    description: 'Días para seguimiento automático de leads'
  },
  {
    config_key: 'crm_reminder_hours',
    config_value: '24',
    description: 'Horas antes para recordatorios de citas'
  },
  {
    config_key: 'crm_lead_expiration_days',
    config_value: '30',
    description: 'Días para expiración de leads sin respuesta'
  },
  {
    config_key: 'crm_auto_convert_lead_to_client',
    config_value: 'false',
    description: 'Convertir leads a clientes automáticamente'
  },
  {
    config_key: 'crm_email_notifications_enabled',
    config_value: 'true',
    description: 'Habilitar notificaciones por email en CRM'
  },

  // ============================================================================
  // 📅 CALENDAR CONFIGURATION (Configuración de Calendario)
  // ============================================================================
  {
    config_key: 'calendar_reminder_hours_before',
    config_value: '[24, 2]',
    description: 'Horas antes para enviar recordatorios (JSON array)'
  },
  {
    config_key: 'calendar_auto_docket_enabled',
    config_value: 'true',
    description: 'Habilitar auto-agendamiento de eventos desde procesos'
  },
  {
    config_key: 'calendar_working_hours_start',
    config_value: '08:00',
    description: 'Hora de inicio de jornada laboral'
  },
  {
    config_key: 'calendar_working_hours_end',
    config_value: '18:00',
    description: 'Hora de fin de jornada laboral'
  },
  {
    config_key: 'calendar_default_event_duration_minutes',
    config_value: '60',
    description: 'Duración por defecto de eventos en minutos'
  },
  {
    config_key: 'calendar_holidays_enabled',
    config_value: 'true',
    description: 'Considerar días festivos colombianos'
  },

  // ============================================================================
  // 🌐 CLIENT PORTAL CONFIGURATION (Portal del Cliente)
  // ============================================================================
  {
    config_key: 'client_portal_document_upload_enabled',
    config_value: 'true',
    description: 'Permitir carga de documentos por clientes'
  },
  {
    config_key: 'client_portal_appointment_scheduling_enabled',
    config_value: 'true',
    description: 'Permitir agendamiento de citas por clientes'
  },
  {
    config_key: 'client_portal_case_visibility',
    config_value: 'status_only',
    description: 'Visibilidad de casos: status_only, full, hidden'
  },
  {
    config_key: 'client_portal_message_enabled',
    config_value: 'true',
    description: 'Permitir mensajes desde portal de cliente'
  },
  {
    config_key: 'client_portal_ai_summary_enabled',
    config_value: 'false',
    description: 'Mostrar resúmenes IA al cliente'
  },
  {
    config_key: 'client_portal_max_file_size_mb',
    config_value: '10',
    description: 'Tamaño máximo de archivos en MB'
  },

  // ============================================================================
  // ⚖️ JUDICIAL PROCESS CONFIGURATION (Procesos Judiciales)
  // ============================================================================
  {
    config_key: 'process_monitor_sync_frequency_hours',
    config_value: '12',
    description: 'Frecuencia de sincronización de procesos (horas)'
  },
  {
    config_key: 'process_alert_new_actuacion_enabled',
    config_value: 'true',
    description: 'Alertar sobre nuevas actuaciones'
  },
  {
    config_key: 'process_alert_email_enabled',
    config_value: 'true',
    description: 'Enviar alertas de procesos por email'
  },
  {
    config_key: 'process_auto_create_calendar_event',
    config_value: 'true',
    description: 'Crear eventos de calendario automáticamente'
  },
  {
    config_key: 'process_rama_judicial_cache_hours',
    config_value: '1',
    description: 'Horas de caché para consultas a Rama Judicial'
  },
  {
    config_key: 'process_auto_link_to_case',
    config_value: 'true',
    description: 'Vincular procesos automáticamente a casos CRM'
  },

  // ============================================================================
  // 🎮 GAMIFICATION CONFIGURATION (Gamificación)
  // ============================================================================
  {
    config_key: 'gamification_enabled',
    config_value: 'true',
    description: 'Habilitar sistema de gamificación'
  },
  {
    config_key: 'gamification_points_config',
    config_value: JSON.stringify({
      document_analysis: 10,
      research: 15,
      strategy: 20,
      draft: 25,
      case_prediction: 15,
      client_added: 5,
      case_won: 100,
      first_login: 5,
      profile_complete: 20,
      training_module: 30
    }),
    description: 'Configuración de puntos por acción (JSON)'
  },
  {
    config_key: 'gamification_streak_bonus_multiplier',
    config_value: '1.5',
    description: 'Multiplicador de bonus por racha diaria'
  },
  {
    config_key: 'gamification_daily_goal_credits',
    config_value: '50',
    description: 'Meta diaria de créditos para gamificación'
  },
  {
    config_key: 'gamification_levels',
    config_value: JSON.stringify([
      { level: 1, name: 'Novato', minCredits: 0, badge: '🌱' },
      { level: 2, name: 'Aprendiz', minCredits: 100, badge: '📚' },
      { level: 3, name: 'Practicante', minCredits: 500, badge: '⚖️' },
      { level: 4, name: 'Experto', minCredits: 1500, badge: '🎯' },
      { level: 5, name: 'Maestro', minCredits: 5000, badge: '👑' }
    ]),
    description: 'Niveles de gamificación (JSON)'
  },

  // ============================================================================
  // 💰 CREDITS CONFIGURATION (Sistema de Créditos)
  // ============================================================================
  {
    config_key: 'credits_daily_free_limit',
    config_value: '5',
    description: 'Créditos gratuitos diarios'
  },
  {
    config_key: 'credits_referral_bonus',
    config_value: '50',
    description: 'Bonus de créditos por referido'
  },
  {
    config_key: 'credits_warning_threshold',
    config_value: '10',
    description: 'Umbral para advertencia de créditos bajos'
  },
  {
    config_key: 'credits_welcome_bonus',
    config_value: '10',
    description: 'Créditos de bienvenida para nuevos abogados'
  },
  {
    config_key: 'credits_auto_recharge_enabled',
    config_value: 'false',
    description: 'Habilitar recarga automática de créditos'
  },
  {
    config_key: 'credits_auto_recharge_amount',
    config_value: '100',
    description: 'Cantidad de recarga automática'
  },

  // ============================================================================
  // 🔐 VERIFICATION CONFIGURATION (Verificación de Abogados)
  // ============================================================================
  {
    config_key: 'verification_verifik_enabled',
    config_value: 'true',
    description: 'Habilitar verificación con Verifik'
  },
  {
    config_key: 'verification_manual_approval_required',
    config_value: 'true',
    description: 'Requerir aprobación manual después de verificación'
  },
  {
    config_key: 'verification_expiration_days',
    config_value: '365',
    description: 'Días de validez de la verificación'
  },

  // ============================================================================
  // 🎙️ VOICE ASSISTANT CONFIGURATION (Asistente de Voz)
  // ============================================================================
  {
    config_key: 'voice_assistant_enabled',
    config_value: 'true',
    description: 'Habilitar asistente de voz'
  },
  {
    config_key: 'voice_transcription_model',
    config_value: 'whisper-1',
    description: 'Modelo de transcripción de voz (whisper-1)'
  },
  {
    config_key: 'voice_transcription_language',
    config_value: 'es',
    description: 'Idioma de transcripción (es, en, etc.)'
  },
  {
    config_key: 'voice_transcription_prompt',
    config_value: 'Transcripción de audio legal en español colombiano. Incluye términos jurídicos como demanda, tutela, sentencia, apelación, casación, habeas corpus, derecho de petición, acción popular, recurso, providencia, auto, notificación, edicto, traslado, alegatos, pruebas, testimonios, peritaje.',
    description: 'Prompt contextual para mejorar transcripción'
  },
  {
    config_key: 'voice_tts_model',
    config_value: 'tts-1',
    description: 'Modelo de texto a voz (tts-1, tts-1-hd)'
  },
  {
    config_key: 'voice_tts_voice',
    config_value: 'onyx',
    description: 'Voz para TTS (alloy, echo, fable, onyx, nova, shimmer)'
  },
  {
    config_key: 'voice_max_audio_size_mb',
    config_value: '25',
    description: 'Tamaño máximo de archivo de audio en MB'
  },
  {
    config_key: 'voice_max_text_chars',
    config_value: '4096',
    description: 'Máximo de caracteres para texto a voz'
  },

  // ============================================================================
  // 🤖 SPECIALIZED AGENTS (OpenAI Agent Builder)
  // ============================================================================
  {
    config_key: 'specialized_agents_enabled',
    config_value: 'true',
    description: 'Habilitar agentes especializados para abogados'
  },
  {
    config_key: 'specialized_agents_default_model',
    config_value: 'google/gemini-2.5-flash',
    description: 'Modelo por defecto para agentes especializados (Lovable AI)'
  },
  {
    config_key: 'specialized_agents_max_messages',
    config_value: '50',
    description: 'Máximo de mensajes por sesión de agente especializado'
  },
  {
    config_key: 'specialized_agents_default_credits',
    config_value: '1',
    description: 'Créditos por defecto por sesión de agente especializado'
  },
  {
    config_key: 'specialized_agents_openai_integration',
    config_value: 'true',
    description: 'Usar OpenAI Assistants API cuando esté configurado'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: securityHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body to check for force flag
    let forceUpsert = false;
    try {
      const body = await req.json();
      forceUpsert = body?.force === true;
    } catch {
      // No body or invalid JSON, proceed with default behavior
    }

    console.log(`🔄 Initializing system configurations... (force=${forceUpsert})`);

    if (forceUpsert) {
      // Force mode: ONLY update configs that haven't been manually modified by admin
      // A config is considered "modified" if updated_at > created_at (meaning admin saved it)
      console.log('📝 Force mode: updating ONLY unmodified configurations (respecting admin changes)...');
      
      // First, get all existing configs with their timestamps
      const { data: existingConfigs, error: fetchError } = await supabase
        .from('system_config')
        .select('config_key, created_at, updated_at');
      
      if (fetchError) {
        console.error('❌ Error fetching existing configs:', fetchError);
        throw fetchError;
      }

      // Identify configs that were manually modified (updated_at is significantly different from created_at)
      const modifiedKeys = new Set<string>();
      existingConfigs?.forEach(config => {
        const createdAt = new Date(config.created_at).getTime();
        const updatedAt = new Date(config.updated_at).getTime();
        // Consider modified if updated more than 1 second after creation
        if (updatedAt - createdAt > 1000) {
          modifiedKeys.add(config.config_key);
        }
      });

      console.log(`📊 Found ${modifiedKeys.size} manually modified configs that will be preserved`);
      if (modifiedKeys.size > 0) {
        console.log(`🔒 Preserving admin modifications: ${Array.from(modifiedKeys).slice(0, 10).join(', ')}${modifiedKeys.size > 10 ? '...' : ''}`);
      }

      // Filter out configs that were modified by admin
      const configsToUpsert = DEFAULT_CONFIGS.filter(c => !modifiedKeys.has(c.config_key));
      
      console.log(`📝 Will upsert ${configsToUpsert.length} unmodified configurations`);

      let upsertedCount = 0;
      if (configsToUpsert.length > 0) {
        const { data: upsertedData, error: upsertError } = await supabase
          .from('system_config')
          .upsert(configsToUpsert, { 
            onConflict: 'config_key',
            ignoreDuplicates: false 
          })
          .select();

        if (upsertError) {
          console.error('❌ Error upserting configurations:', upsertError);
          throw upsertError;
        }
        upsertedCount = upsertedData?.length || 0;
      }

      console.log(`✅ Upserted ${upsertedCount} configurations (preserved ${modifiedKeys.size} admin modifications)`);

      return new Response(JSON.stringify({
        success: true,
        mode: 'force_upsert_safe',
        configsUpserted: upsertedCount,
        configsPreserved: modifiedKeys.size,
        preservedKeys: Array.from(modifiedKeys),
        message: `Se actualizaron ${upsertedCount} configuraciones. Se preservaron ${modifiedKeys.size} modificaciones del admin.`
      }), {
        headers: securityHeaders
      });
    }

    // Default behavior: only insert new configs
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('system_config')
      .select('config_key');

    if (fetchError) {
      console.error('❌ Error fetching existing configs:', fetchError);
      throw fetchError;
    }

    const existingKeys = new Set(existingConfigs?.map(c => c.config_key) || []);
    const newConfigs = DEFAULT_CONFIGS.filter(c => !existingKeys.has(c.config_key));

    console.log(`📊 Found ${existingKeys.size} existing configs`);
    console.log(`📝 ${newConfigs.length} new configs to insert`);

    if (newConfigs.length > 0) {
      const { error: insertError } = await supabase
        .from('system_config')
        .insert(newConfigs);

      if (insertError) {
        console.error('❌ Error inserting configurations:', insertError);
        throw insertError;
      }

      console.log(`✅ Inserted ${newConfigs.length} new configurations`);
    }

    return new Response(JSON.stringify({
      success: true,
      mode: 'insert_new_only',
      existingCount: existingKeys.size,
      insertedCount: newConfigs.length,
      totalAvailable: DEFAULT_CONFIGS.length,
      message: newConfigs.length > 0 
        ? `Se insertaron ${newConfigs.length} configuraciones nuevas` 
        : 'Todas las configuraciones ya existían'
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('💥 Error in init-system-config:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});
