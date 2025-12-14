import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error || !data) return defaultValue || '';
    return data.config_value;
  } catch (error) {
    return defaultValue || '';
  }
}

// Helper function to save results
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    await supabase.from('legal_tools_results').insert({
      lawyer_id: lawyerId,
      tool_type: toolType,
      input_data: inputData,
      output_data: outputData,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error saving tool result:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authentication
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id;
    }
    
    const { prompt, documentType } = await req.json();

    if (!prompt || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Prompt and document type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const draftingModel = await getSystemConfig(supabase, 'drafting_ai_model', 'gpt-4.1-2025-04-14');
    const draftingPrompt = await getSystemConfig(supabase, 'drafting_ai_prompt', '');
    
    if (!draftingPrompt) {
      console.error('❌ drafting_ai_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: drafting_ai_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    logResponsesRequest(draftingModel, 'legal-document-drafting', true);

    const instructions = `${draftingPrompt}

Instrucciones específicas:
- Genera un borrador profesional del documento solicitado
- Sigue la estructura típica del tipo de documento
- Incluye todas las cláusulas esenciales
- Usa terminología jurídica apropiada para Colombia
- Marca con [ESPECIFICAR] los campos que requieren personalización
- Incluye cláusulas de protección estándar

Responde en formato JSON:
{
  "content": "Contenido completo del borrador en formato markdown",
  "sections": ["Lista", "de", "secciones", "incluidas"],
  "documentType": "Nombre completo del tipo de documento"
}`;

    const input = `Genera un borrador de: ${documentType}

Descripción específica: ${prompt}

El documento debe ser apropiado para Colombia y seguir las mejores prácticas legales. Responde ÚNICAMENTE en formato JSON válido.`;

    // Get reasoning effort from system config (analysis = medium by default for drafting)
    const reasoningEffort = await getSystemConfig(supabase, 'reasoning_effort_analysis', 'medium') as 'low' | 'medium' | 'high';
    
    const params = buildResponsesRequestParams(draftingModel, {
      input,
      instructions,
      maxOutputTokens: 8000,
      temperature: 0.4,
      jsonMode: true,
      store: false,
      reasoning: { effort: reasoningEffort }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Drafting failed: ${result.error}`);
    }

    let draftResult;
    try {
      draftResult = JSON.parse(result.text || '{}');
    } catch (e) {
      draftResult = {
        content: result.text || '',
        sections: ["Contenido Generado"],
        documentType: documentType
      };
    }

    const resultData = {
      success: true,
      prompt,
      ...draftResult,
      timestamp: new Date().toISOString()
    };

    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'drafting', { prompt, documentType }, draftResult, {});
    }

    console.log('✅ Document drafting completed');

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in legal-document-drafting:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
