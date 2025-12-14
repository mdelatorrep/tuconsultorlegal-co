import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error || !data) {
      return defaultValue || '';
    }

    return data.config_value;
  } catch (error) {
    console.error(`Error fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

// Helper function to extract placeholders from template
function extractPlaceholders(docTemplate: string) {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders = [];
  const found = new Set();
  let match;
  
  while ((match = placeholderRegex.exec(docTemplate)) !== null) {
    const fieldName = match[1].trim();
    if (!found.has(fieldName)) {
      found.add(fieldName);
      placeholders.push({
        field: fieldName,
        label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'text',
        required: true,
        description: `Ingrese ${fieldName.toLowerCase().replace(/_/g, ' ')}`
      });
    }
  }
  
  return placeholders;
}

// Helper function to generate system prompt from conversation blocks
function generateSystemPrompt(docName: string, targetAudience: string, conversationBlocks: any[], fieldInstructions: any[], baseDNA: string) {
  const conversationStructure = conversationBlocks
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .map((block, index) => {
      const placeholdersList = block.placeholders.map((p: string) => `    * {{${p}}}`).join('\n');
      return `
### BLOQUE ${index + 1}: ${block.blockName}
**Frase de Introducción:** "${block.introPhrase}"
**Información a Recopilar:**
${placeholdersList}`;
    }).join('\n');

  const fieldSpecificInstructions = fieldInstructions.length > 0 ? `

## INSTRUCCIONES ESPECÍFICAS POR CAMPO

${fieldInstructions.map(instruction => `
**Para el campo \`${instruction.fieldName}\`:**
${instruction.validationRule ? `* **Validación:** ${instruction.validationRule}` : ''}
${instruction.helpText ? `* **Ayuda:** ${instruction.helpText}` : ''}
`).join('')}` : '';

  return `${baseDNA}

## INFORMACIÓN DEL DOCUMENTO
- **Documento:** ${docName}
- **Audiencia Objetivo:** ${targetAudience}

## ESTRUCTURA DE RECOPILACIÓN DE INFORMACIÓN (OBLIGATORIA)
${conversationStructure}
${fieldSpecificInstructions}

## PROTOCOLO DE EJECUCIÓN
1. **Saludo Inicial:** Preséntate como Lexi y explica brevemente qué documento van a crear juntos
2. **Recopilación por Bloques:** Sigue EXACTAMENTE el orden de los bloques definidos arriba
3. **Validación por Bloque:** Al completar cada bloque, confirma la información antes de continuar
4. **Resumen Final:** Al terminar todos los bloques, presenta un resumen completo para confirmación
5. **Generación:** Solo procede a generar el documento cuando toda la información esté confirmada`;
}

serve(async (req) => {
  console.log('🎯 === AI-AGENT-PROCESSOR FUNCTION STARTED (Responses API) ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: securityHeaders
    });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: securityHeaders
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const body = await req.json();

    const { docName, docDesc, category, docTemplate, targetAudience, conversationBlocks = [], fieldInstructions = [] } = body;

    if (!docName || !docTemplate) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // Get system configuration
    const model = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4.1-2025-04-14');
    const baseDNA = await getSystemConfig(supabase, 'agent_creation_system_prompt', '');
    
    if (!baseDNA) {
      console.error('❌ agent_creation_system_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: agent_creation_system_prompt' }), { 
        status: 500, headers: securityHeaders 
      });
    }

    logResponsesRequest(model, 'ai-agent-processor', true);

    // Extract placeholders
    const placeholders = extractPlaceholders(docTemplate);

    // Generate enhanced prompt
    let enhancedPrompt = '';
    
    if (conversationBlocks.length > 0) {
      enhancedPrompt = generateSystemPrompt(docName, targetAudience, conversationBlocks, fieldInstructions, baseDNA);
    } else {
      const fallbackBlocks = [{
        blockName: 'Información General',
        introPhrase: 'Empecemos recopilando la información principal para tu documento.',
        placeholders: placeholders.map(p => p.field),
        blockOrder: 1
      }];
      
      enhancedPrompt = generateSystemPrompt(docName, targetAudience, fallbackBlocks, fieldInstructions, baseDNA);
    }

    // Generate price suggestion using Responses API
    let suggestedPrice = 35000;
    let priceJustification = 'Precio base estimado';
    
    try {
      const priceInstructions = 'Eres un experto en precios de servicios legales en Colombia. Analiza la complejidad del documento y sugiere un precio justo en pesos colombianos. Responde ÚNICAMENTE con el número del precio sin formato.';
      
      const priceInput = `Documento: ${docName}
Categoría: ${category}
Campos requeridos: ${placeholders.length}
Audiencia: ${targetAudience}
Complejidad: ${placeholders.length > 15 ? 'Alta' : placeholders.length > 8 ? 'Media' : 'Baja'}`;

      const priceParams = buildResponsesRequestParams(model, {
        input: priceInput,
        instructions: priceInstructions,
        maxOutputTokens: 100,
        temperature: 0.3,
        store: false
      });

      const priceResult = await callResponsesAPI(openAIApiKey, priceParams);
      
      if (priceResult.success && priceResult.text) {
        const extractedPrice = parseInt(priceResult.text.replace(/\D/g, '')) || 35000;
        
        if (extractedPrice >= 15000 && extractedPrice <= 500000) {
          suggestedPrice = extractedPrice;
          priceJustification = `Precio calculado por IA: ${placeholders.length} campos, ${category}, ${targetAudience}`;
        }
      }
    } catch (priceError) {
      console.error('Error generating price:', priceError);
    }

    console.log('✅ Processing completed successfully');

    return new Response(JSON.stringify({
      success: true,
      enhancedPrompt,
      placeholders,
      suggestedPrice: `$ ${suggestedPrice.toLocaleString()} COP`,
      priceJustification,
      model,
      processingDetails: {
        placeholdersFound: placeholders.length,
        conversationBlocksProcessed: conversationBlocks.length,
        fieldInstructionsProcessed: fieldInstructions.length,
        promptLength: enhancedPrompt.length,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: securityHeaders
    });

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});
