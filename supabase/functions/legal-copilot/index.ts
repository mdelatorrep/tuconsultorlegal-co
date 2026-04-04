import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getRequiredConfigs(supabase: any, keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', keys);
  
  if (error) throw new Error(`Failed to fetch configurations: ${error.message}`);
  
  const result: Record<string, string> = {};
  data?.forEach((item: any) => { result[item.config_key] = item.config_value; });
  
  const missingConfigs = keys.filter(key => !result[key]);
  if (missingConfigs.length > 0) {
    throw new Error(`Missing required configurations: ${missingConfigs.join(', ')}. Please configure them in the admin panel.`);
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, text, context, documentType, language = 'es' } = await req.json();
    console.log(`[LegalCopilot] Action: ${action}, DocumentType: ${documentType}`);

    const configs = await getRequiredConfigs(supabase, [
      'copilot_ai_model',
      'copilot_suggest_prompt',
      'copilot_autocomplete_prompt',
      'copilot_risk_detection_prompt',
      'copilot_improve_prompt',
      'copilot_max_tokens_suggest',
      'copilot_max_tokens_autocomplete',
      'copilot_reasoning_effort'
    ]);

    const model = configs['copilot_ai_model'];
    const reasoningEffort = (configs['copilot_reasoning_effort'] || 'low') as 'low' | 'medium' | 'high';
    const maxTokensSuggest = Math.max(parseInt(configs['copilot_max_tokens_suggest']) || 500, 500);
    const maxTokensAutocomplete = Math.max(parseInt(configs['copilot_max_tokens_autocomplete']) || 300, 300);

    logResponsesRequest(model, 'legal-copilot', true);

    if (action === 'suggest') {
      const instructions = `${configs['copilot_suggest_prompt']}

Tipo de documento: ${documentType || 'legal genérico'}
Contexto adicional: ${context || 'ninguno'}`;

      const params = buildResponsesRequestParams(model, {
        input: text,
        instructions,
        maxOutputTokens: maxTokensSuggest,
        reasoning: { effort: reasoningEffort },
        store: false
      });

      const result = await callResponsesAPI(openaiApiKey, params);
      if (!result.success) throw new Error(result.error || 'AI generation failed');

      return new Response(JSON.stringify({ suggestion: result.text || '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'autocomplete') {
      const instructions = `${configs['copilot_autocomplete_prompt']}

Tipo de documento: ${documentType || 'contrato'}`;

      const params = buildResponsesRequestParams(model, {
        input: `Completa este texto legal:\n\n"${text}"`,
        instructions,
        maxOutputTokens: maxTokensAutocomplete,
        reasoning: { effort: reasoningEffort },
        store: false
      });

      const result = await callResponsesAPI(openaiApiKey, params);
      if (!result.success) throw new Error(result.error || 'AI autocomplete failed');

      return new Response(JSON.stringify({ suggestion: result.text || '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'detect_risks') {
      const instructions = `${configs['copilot_risk_detection_prompt']}

IMPORTANTE: Responde en formato JSON con esta estructura exacta:
{
  "overallRisk": "bajo|medio|alto|crítico",
  "risks": [{"type": "string", "severity": "info|warning|error", "description": "string", "suggestion": "string"}],
  "summary": "string"
}`;

      const params = buildResponsesRequestParams(model, {
        input: `Analiza los riesgos en este documento:\n\n${text}`,
        instructions,
        maxOutputTokens: 1000,
        reasoning: { effort: reasoningEffort },
        jsonMode: true,
        store: false
      });

      const result = await callResponsesAPI(openaiApiKey, params);
      let riskAnalysis = { overallRisk: 'bajo', risks: [], summary: 'No se detectaron riesgos significativos.' };

      if (result.success && result.text) {
        try { riskAnalysis = JSON.parse(result.text); } catch (e) { console.error('[LegalCopilot] Parse error:', e); }
      }

      return new Response(JSON.stringify(riskAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'improve') {
      const params = buildResponsesRequestParams(model, {
        input: text,
        instructions: configs['copilot_improve_prompt'],
        maxOutputTokens: 1000,
        reasoning: { effort: reasoningEffort },
        store: false
      });

      const result = await callResponsesAPI(openaiApiKey, params);
      const improved = result.success ? (result.text || text) : text;

      return new Response(JSON.stringify({ improved }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[LegalCopilot] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
