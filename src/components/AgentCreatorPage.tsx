import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// --- CONSTANTES Y CONFIGURACIÓN ---

// Headers para manejar CORS y seguridad.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SECURITY_HEADERS = {
  ...CORS_HEADERS,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// --- FUNCIONES AUXILIARES ---

/**
 * Obtiene un valor de configuración desde la base de datos de Supabase.
 * @param supabaseClient - El cliente de Supabase.
 * @param configKey - La clave de configuración a buscar.
 * @param defaultValue - Un valor por defecto si la clave no se encuentra.
 * @returns El valor de la configuración o el valor por defecto.
 */
async function getSystemConfig(supabaseClient, configKey, defaultValue) {
  try {
    console.log(`🔧 Buscando configuración: ${configKey}`);
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error) {
      console.error(`❌ Error al buscar config '${configKey}':`, error.message);
      return defaultValue || '';
    }

    const value = data?.config_value || defaultValue || '';
    console.log(`✅ Configuración '${configKey}' cargada.`);
    return value;
  } catch (error) {
    console.error(`💥 Excepción al buscar config '${configKey}':`, error);
    return defaultValue || '';
  }
}

/**
 * Extrae placeholders (ej: {{nombre_cliente}}) de una plantilla de texto.
 * @param docTemplate - El texto de la plantilla.
 * @returns Un array de objetos representando cada placeholder único.
 */
function extractPlaceholders(docTemplate) {
  console.log('🔍 Extrayendo placeholders...');
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = [];
  const found = new Set(); // Evita duplicados
  let match;

  while ((match = placeholderRegex.exec(docTemplate)) !== null) {
    const fieldName = match[1].trim();
    if (!found.has(fieldName)) {
      found.add(fieldName);
      placeholders.push({
        field: fieldName,
        label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type: 'text',
        required: true,
        description: `Ingrese ${fieldName.toLowerCase().replace(/_/g, ' ')}`
      });
    }
  }
  console.log(`✅ Encontrados ${placeholders.length} placeholders únicos.`);
  return placeholders;
}

/**
 * Llama a la API de OpenAI para completar una tarea de chat.
 * @param apiKey - La clave de la API de OpenAI.
 * @param model - El modelo a utilizar.
 * @param messages - El array de mensajes para la conversación.
 * @param temperature - La "creatividad" de la respuesta.
 * @param maxTokens - El máximo de tokens en la respuesta.
 * @returns El contenido del mensaje de respuesta de la IA.
 */
async function callOpenAI(apiKey, model, messages, temperature = 0.7, maxTokens = 1000) {
    console.log(`🤖 Llamando a la API de OpenAI con el modelo: ${model}`);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error en la API de OpenAI (${response.status}):`, errorText);
        throw new Error(`Error de OpenAI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Verificación robusta de la respuesta
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        console.warn('⚠️ La API de OpenAI devolvió una respuesta válida pero sin contenido.');
        return null; // Devolvemos null para que la lógica de fallback se active
    }
    
    console.log(`✅ Respuesta de OpenAI recibida.`);
    return content;
}


// --- SERVIDOR PRINCIPAL ---

serve(async (req) => {
  console.log(`🎯 INICIO DEL PROCESO - ${new Date().toISOString()}`);

  // Manejo de la solicitud pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    console.log('✅ Petición CORS Preflight aceptada.');
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    console.warn(`❌ Método no permitido: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: SECURITY_HEADERS });
  }

  try {
    // 1. OBTENER VARIABLES DE ENTORNO Y VALIDAR
    console.log('⚙️ === PASO 1: VALIDANDO ENTORNO ===');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!openAIApiKey || !supabaseServiceKey || !supabaseUrl) {
      console.error('❌ Faltan variables de entorno críticas.');
      return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta.' }), { status: 500, headers: SECURITY_HEADERS });
    }
    console.log('✅ Entorno validado.');

    // 2. INICIALIZAR CLIENTE DE SUPABASE Y PARSEAR BODY
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { docName, docDesc, category, docTemplate, initialPrompt, targetAudience } = body;
    
    if (!docName || !docTemplate) {
      console.warn('❌ Faltan campos requeridos en la petición.');
      return new Response(JSON.stringify({ error: 'Faltan los campos requeridos: docName y docTemplate' }), { status: 400, headers: SECURITY_HEADERS });
    }
    console.log(`📥 Petición recibida para el documento: "${docName}"`);

    // 3. OBTENER CONFIGURACIÓN DEL SISTEMA Y EXTRAER PLACEHOLDERS
    console.log('⚙️ === PASO 2: CONFIGURACIÓN Y ANÁLISIS DE PLANTILLA ===');
    const model = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4-turbo');
    const systemPrompt = await getSystemConfig(supabase, 'agent_creation_system_prompt', 'Eres un asistente legal experto en Colombia...');
    const placeholders = extractPlaceholders(docTemplate);

    // 4. MEJORAR EL PROMPT INICIAL CON IA (CON FALLBACK)
    console.log('⚙️ === PASO 3: MEJORANDO PROMPT CON IA ===');
    let enhancedPrompt = '';
    try {
      const promptMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Mejora este prompt para un agente conversacional que generará un documento legal. INFORMACIÓN: Nombre: ${docName}, Categoría: ${category}, Audiencia: ${targetAudience}. PROMPT INICIAL: "${initialPrompt || 'No definido'}". CAMPOS A RECOPILAR: ${placeholders.map(p => p.label).join(', ')}. INSTRUCCIONES: Sé claro, profesional y sigue las normas colombianas. Devuelve solo el prompt mejorado.` }
      ];
      enhancedPrompt = await callOpenAI(openAIApiKey, model, promptMessages, 0.7, 1500);
    } catch (error) {
      console.error('⚠️ Error al mejorar el prompt con IA:', error.message);
    }

    // Lógica de Fallback si la IA falla o no devuelve contenido
    if (!enhancedPrompt) {
      console.log('🔄 Activando prompt de respaldo...');
      enhancedPrompt = `Eres Lexi, un asistente legal para crear documentos de ${category} en Colombia. Tu objetivo es generar: "${docName}". Recopilaré la siguiente información: ${placeholders.map(p => p.label).join(', ')}. Por favor, proporciona los datos de forma clara.`;
    }
    console.log(`✅ Prompt final generado (${enhancedPrompt.length} caracteres).`);

    // 5. ANÁLISIS DE PRECIO CON IA (CON FALLBACK)
    console.log('⚙️ === PASO 4: ANÁLISIS DE PRECIO ===');
    let suggestedPrice = 35000;
    let priceJustification = 'Precio base estimado.';
    try {
        const priceMessages = [
            { role: 'system', content: 'Eres un experto en precios de servicios legales en Colombia. Sugiere un precio justo en COP. Responde solo con el número (ej: 45000).' },
            { role: 'user', content: `Documento: ${docName}, Categoría: ${category}, Complejidad: ${placeholders.length} campos. Audiencia: ${targetAudience}.` }
        ];
        const priceText = await callOpenAI(openAIApiKey, model, priceMessages, 0.3, 50);
        const extractedPrice = priceText ? parseInt(priceText.replace(/\D/g, '')) : 0;

        if (extractedPrice >= 15000 && extractedPrice <= 500000) {
            suggestedPrice = extractedPrice;
            priceJustification = `Precio sugerido por IA basado en la complejidad (${placeholders.length} campos), categoría y audiencia.`;
            console.log(`✅ Precio sugerido por IA: ${suggestedPrice}`);
        } else {
            throw new Error('Precio de la IA fuera de rango o inválido.');
        }
    } catch (error) {
        console.error('⚠️ Error en análisis de precio con IA:', error.message);
        console.log('🔄 Usando algoritmo de precios de respaldo...');
        const basePrice = 25000;
        const pricePerField = 1500;
        suggestedPrice = basePrice + (placeholders.length * pricePerField);
        // Asegurarse que el precio esté dentro de un mínimo y máximo
        suggestedPrice = Math.max(15000, Math.min(suggestedPrice, 500000));
        priceJustification = `Precio calculado por algoritmo estándar basado en ${placeholders.length} campos.`;
    }
    console.log(`✅ Análisis de precio completado: $${suggestedPrice.toLocaleString('es-CO')} COP`);


    // 6. CONSTRUIR Y DEVOLVER LA RESPUESTA FINAL
    console.log('⚙️ === PASO 5: CONSTRUYENDO RESPUESTA FINAL ===');
    const responsePayload = {
      success: true,
      enhancedPrompt,
      placeholders,
      suggestedPrice: `$${suggestedPrice.toLocaleString('es-CO')} COP`,
      priceJustification,
      processingDetails: {
        modelUsed: model,
        placeholdersFound: placeholders.length,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('✅ === PROCESO COMPLETADO EXITOSAMENTE ===');
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 === ERROR FATAL EN EL SERVIDOR ===', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor.',
      details: error.message
    }), {
      status: 500,
      headers: SECURITY_HEADERS
    });
  }
});
