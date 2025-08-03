import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    if (error) {
      console.error(`Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    return data?.config_value || defaultValue || '';
  } catch (error) {
    console.error(`Error fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

serve(async (req) => {
  console.log('🎯 === AI-AGENT-PROCESSOR FUNCTION STARTED ===', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response('Method not allowed', { status: 405, headers: securityHeaders });
  }

  console.log('🚀 Processing POST request...');

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('🔑 Environment variables check:', {
      hasOpenAI: !!openAIApiKey,
      hasSupabaseKey: !!supabaseServiceKey,
      hasSupabaseUrl: !!supabaseUrl
    });

    if (!openAIApiKey) {
      console.error('❌ Missing OpenAI API key');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: securityHeaders
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Parse request body
    const body = await req.json();
    console.log('📥 Request body received:', {
      hasDocName: !!body.docName,
      hasDocTemplate: !!body.docTemplate,
      category: body.category,
      targetAudience: body.targetAudience
    });

    const { docName, docDesc, category, docTemplate, initialPrompt, targetAudience } = body;

    // Validate required fields
    console.log('🔍 Validating required fields:', {
      docName: !!docName,
      docTemplate: !!docTemplate,
      initialPrompt: initialPrompt?.length || 0
    });

    if (!docName || !docTemplate) {
      console.log('❌ Missing required fields - docName or docTemplate');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: docName and docTemplate' 
      }), {
        status: 400,
        headers: securityHeaders
      });
    }

    // Get system configurations
    console.log('⚙️ Fetching system configuration...');
    const model = await getSystemConfig(supabase, 'agent_creation_ai_model', 'gpt-4o-mini');
    const systemPrompt = await getSystemConfig(supabase, 'agent_creation_system_prompt', 
      'Eres un asistente legal experto en Colombia. Tu tarea es analizar documentos legales y mejorar prompts para agentes conversacionales.'
    );

    console.log('⚙️ System config loaded:', {
      model,
      hasSystemPrompt: !!systemPrompt
    });

    // Real OpenAI processing
    console.log('🤖 Starting OpenAI processing...');
    
    try {
      // 1. Enhance the prompt using OpenAI
      console.log('🔄 Step 1: Enhancing prompt with OpenAI...');
      const promptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Mejora el siguiente prompt para un agente conversacional que genera documentos de ${category}:

Documento: ${docName}
Descripción: ${docDesc}
Audiencia: ${targetAudience}
Prompt inicial: ${initialPrompt}

Devuelve SOLO el prompt mejorado, sin explicaciones adicionales.`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!promptResponse.ok) {
        throw new Error(`OpenAI API error for prompt enhancement: ${promptResponse.status}`);
      }

      const promptData = await promptResponse.json();
      const enhancedPrompt = promptData.choices[0]?.message?.content || initialPrompt;
      console.log('✅ Prompt enhanced successfully');

      // 2. Extract placeholders from template
      console.log('🔄 Step 2: Extracting placeholders...');
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const placeholders = [];
      let match;
      
      while ((match = placeholderRegex.exec(docTemplate)) !== null) {
        const fieldName = match[1].trim();
        placeholders.push({
          field: fieldName,
          label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text',
          required: true,
          description: `Ingrese ${fieldName.toLowerCase().replace(/_/g, ' ')}`
        });
      }

      // 3. Generate price analysis using OpenAI
      console.log('🔄 Step 3: Generating price analysis...');
      const priceResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en precios de documentos legales en Colombia. Analiza la complejidad y sugiere un precio justo en pesos colombianos.'
            },
            {
              role: 'user',
              content: `Analiza este documento legal y sugiere un precio en COP:

Documento: ${docName}
Categoría: ${category}
Campos requeridos: ${placeholders.length}
Audiencia: ${targetAudience}

Responde SOLO con el número del precio sin formato (ejemplo: 45000).`
            }
          ],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      if (!priceResponse.ok) {
        throw new Error(`OpenAI API error for price analysis: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      const suggestedPriceRaw = priceData.choices[0]?.message?.content?.replace(/\D/g, '') || '35000';
      const suggestedPrice = parseInt(suggestedPriceRaw) || 35000;

      const priceJustification = `Precio calculado por IA basado en: 
- Complejidad del documento: ${placeholders.length} campos
- Categoría: ${category}
- Audiencia: ${targetAudience}
- Análisis de mercado colombiano`;

      const response = {
        success: true,
        enhancedPrompt,
        placeholders,
        suggestedPrice: `$ ${suggestedPrice.toLocaleString()} COP`,
        priceJustification,
        model,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Processing completed successfully:', {
        placeholdersCount: placeholders.length,
        enhancedPromptLength: enhancedPrompt.length,
        suggestedPrice: response.suggestedPrice
      });

      return new Response(JSON.stringify(response), {
        headers: securityHeaders
      });

    } catch (aiError) {
      console.error('💥 OpenAI processing error:', aiError);
      
      // Fallback to mock processing if OpenAI fails
      console.log('🔄 Falling back to mock processing...');
      
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const placeholders = [];
      let match;
      
      while ((match = placeholderRegex.exec(docTemplate)) !== null) {
        const fieldName = match[1].trim();
        placeholders.push({
          field: fieldName,
          label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text',
          required: true,
          description: `Ingrese ${fieldName.toLowerCase().replace(/_/g, ' ')}`
        });
      }

      const enhancedPrompt = initialPrompt || `Eres un asistente legal especializado en ${docName}. 
Tu objetivo es ayudar a generar documentos de ${category} dirigidos a ${targetAudience}.

Información importante:
- Mantén un tono profesional y empático
- Recopila información paso a paso
- Valida los datos antes de continuar
- Asegúrate de cumplir con la legislación colombiana`;

      const basePrice = 25000;
      const complexityMultiplier = Math.min(placeholders.length * 0.5 + 1, 3);
      const suggestedPrice = Math.round(basePrice * complexityMultiplier);

      const response = {
        success: true,
        enhancedPrompt,
        placeholders,
        suggestedPrice: `$ ${suggestedPrice.toLocaleString()} COP`,
        priceJustification: `Precio calculado basado en complejidad del documento (${placeholders.length} campos)`,
        model,
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(response), {
        headers: securityHeaders
      });
    }

  } catch (error) {
    console.error('💥 Error in AI agent processor:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: securityHeaders
    });
  }
});