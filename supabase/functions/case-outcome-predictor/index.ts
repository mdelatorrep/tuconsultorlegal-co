import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Helper to get required system config - throws if not found
async function getRequiredConfig(supabase: any, configKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', configKey)
    .single();
  
  if (error || !data?.config_value) {
    throw new Error(`Configuration '${configKey}' not found in system_config. Please configure it in the admin panel.`);
  }
  
  return data.config_value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      lawyerId, 
      caseType, 
      caseDescription, 
      jurisdiction, 
      courtType,
      keyFacts,
      opposingArguments,
      saveResult = true
    } = await req.json();

    console.log(`[CasePredictor] Analyzing case: ${caseType} in ${jurisdiction}`);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get configurations from system_config - NO FALLBACKS
    const [model, basePrompt] = await Promise.all([
      getRequiredConfig(supabase, 'case_predictor_ai_model'),
      getRequiredConfig(supabase, 'case_predictor_system_prompt')
    ]);

    console.log(`[CasePredictor] Using model: ${model}`);
    
    const systemPrompt = `${basePrompt}

Jurisdicción: Colombia
Tipo de tribunal: ${courtType || 'No especificado'}
Jurisdicción específica: ${jurisdiction || 'No especificada'}`;

    const userPrompt = `Analiza el siguiente caso y proporciona una predicción detallada:

TIPO DE CASO: ${caseType}

DESCRIPCIÓN DEL CASO:
${caseDescription}

${keyFacts ? `HECHOS CLAVE:\n${keyFacts}` : ''}

${opposingArguments ? `ARGUMENTOS DE LA CONTRAPARTE:\n${opposingArguments}` : ''}

Proporciona tu análisis en formato estructurado.`;

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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'case_prediction',
            description: 'Provide structured case outcome prediction',
            parameters: {
              type: 'object',
              properties: {
                successProbability: { 
                  type: 'number', 
                  description: 'Probability of success (0-100)' 
                },
                confidenceLevel: { 
                  type: 'string', 
                  enum: ['bajo', 'medio', 'alto'],
                  description: 'Confidence in the prediction'
                },
                estimatedDurationMonths: { 
                  type: 'number', 
                  description: 'Estimated case duration in months' 
                },
                estimatedCostRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' },
                    currency: { type: 'string' }
                  }
                },
                keyStrengths: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Key strengths of the case'
                },
                keyWeaknesses: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Key weaknesses and risks'
                },
                recommendedStrategy: { 
                  type: 'string', 
                  description: 'Recommended legal strategy'
                },
                keyArguments: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Most effective arguments to use'
                },
                relevantPrecedents: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      case: { type: 'string' },
                      year: { type: 'number' },
                      relevance: { type: 'string' }
                    }
                  }
                },
                riskFactors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      factor: { type: 'string' },
                      impact: { type: 'string', enum: ['bajo', 'medio', 'alto'] },
                      mitigation: { type: 'string' }
                    }
                  }
                },
                alternativeOutcomes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      outcome: { type: 'string' },
                      probability: { type: 'number' }
                    }
                  }
                },
                summary: { 
                  type: 'string', 
                  description: 'Executive summary of the analysis'
                }
              },
              required: ['successProbability', 'confidenceLevel', 'estimatedDurationMonths', 'keyStrengths', 'keyWeaknesses', 'recommendedStrategy', 'summary']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'case_prediction' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CasePredictor] AI error:', errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    let prediction = null;

    try {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        prediction = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error('[CasePredictor] Parse error:', e);
    }

    if (!prediction) {
      throw new Error('Failed to generate prediction');
    }

    // Save prediction to database if requested
    if (saveResult && lawyerId) {
      const { data: savedPrediction, error: saveError } = await supabase
        .from('case_predictions')
        .insert({
          lawyer_id: lawyerId,
          case_type: caseType,
          case_description: caseDescription,
          jurisdiction,
          court_type: courtType,
          prediction_result: prediction,
          ai_analysis: prediction.summary,
          recommended_arguments: prediction.keyArguments,
          risk_factors: prediction.riskFactors
        })
        .select()
        .single();

      if (saveError) {
        console.error('[CasePredictor] Save error:', saveError);
      } else {
        prediction.id = savedPrediction.id;
      }
    }

    console.log(`[CasePredictor] Prediction complete: ${prediction.successProbability}% success probability`);

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[CasePredictor] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
