import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Get multiple configs at once - throws if any required config is missing
async function getRequiredConfigs(supabase: any, keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', keys);
  
  if (error) {
    throw new Error(`Failed to fetch configurations: ${error.message}`);
  }
  
  const result: Record<string, string> = {};
  data?.forEach((item: any) => {
    result[item.config_key] = item.config_value;
  });
  
  // Validate all required configs are present
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, text, context, documentType, language = 'es' } = await req.json();
    console.log(`[LegalCopilot] Action: ${action}, DocumentType: ${documentType}`);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get all relevant configs at once - NO FALLBACKS
    const configs = await getRequiredConfigs(supabase, [
      'copilot_ai_model',
      'copilot_suggest_prompt',
      'copilot_autocomplete_prompt',
      'copilot_risk_detection_prompt',
      'copilot_improve_prompt',
      'copilot_max_tokens_suggest',
      'copilot_max_tokens_autocomplete'
    ]);

    const model = configs['copilot_ai_model'];
    const maxTokensSuggest = parseInt(configs['copilot_max_tokens_suggest']);
    const maxTokensAutocomplete = parseInt(configs['copilot_max_tokens_autocomplete']);

    console.log(`[LegalCopilot] Using model: ${model}`);

    if (action === 'suggest') {
      const systemPrompt = `${configs['copilot_suggest_prompt']}

Tipo de documento: ${documentType || 'legal genérico'}
Contexto adicional: ${context || 'ninguno'}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analiza este fragmento y proporciona una sugerencia breve:\n\n"${text}"` }
          ],
          max_tokens: maxTokensSuggest,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LegalCopilot] AI error:', errorText);
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ suggestion }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'autocomplete') {
      const systemPrompt = `${configs['copilot_autocomplete_prompt']}

Tipo de documento: ${documentType || 'contrato'}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Completa este texto legal:\n\n"${text}"` }
          ],
          max_tokens: maxTokensAutocomplete,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      const completion = data.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ completion }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'detect_risks') {
      const systemPrompt = configs['copilot_risk_detection_prompt'];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analiza los riesgos en este documento:\n\n${text}` }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'report_risks',
              description: 'Report identified legal risks',
              parameters: {
                type: 'object',
                properties: {
                  overallRisk: { type: 'string', enum: ['bajo', 'medio', 'alto', 'crítico'] },
                  risks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        severity: { type: 'string', enum: ['info', 'warning', 'error'] },
                        description: { type: 'string' },
                        suggestion: { type: 'string' },
                        affectedText: { type: 'string' }
                      },
                      required: ['type', 'severity', 'description']
                    }
                  },
                  summary: { type: 'string' }
                },
                required: ['overallRisk', 'risks', 'summary']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'report_risks' } }
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      let riskAnalysis = { overallRisk: 'bajo', risks: [], summary: 'No se detectaron riesgos significativos.' };

      try {
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          riskAnalysis = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        console.error('[LegalCopilot] Parse error:', e);
      }

      return new Response(JSON.stringify(riskAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'improve') {
      const systemPrompt = configs['copilot_improve_prompt'];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      const improvedText = data.choices?.[0]?.message?.content || text;

      return new Response(JSON.stringify({ improvedText }), {
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
