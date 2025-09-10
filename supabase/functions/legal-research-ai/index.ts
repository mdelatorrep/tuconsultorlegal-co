import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    console.log(`Fetching config for key: ${configKey}`);
    
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    console.log(`Config result for ${configKey}:`, { data, error });

    if (error) {
      console.error(`Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    if (!data) {
      console.log(`No config found for ${configKey}, using default: ${defaultValue}`);
      return defaultValue || '';
    }

    console.log(`Using config ${configKey}: ${data.config_value}`);
    return data.config_value;
  } catch (error) {
    console.error(`Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to save results to legal_tools_results table
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    console.log(`Saving ${toolType} result for lawyer: ${lawyerId}`);
    
    const { error } = await supabase
      .from('legal_tools_results')
      .insert({
        lawyer_id: lawyerId,
        tool_type: toolType,
        input_data: inputData,
        output_data: outputData,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error saving tool result:', error);
    } else {
      console.log(`✅ Successfully saved ${toolType} result`);
    }
  } catch (error) {
    console.error('Exception saving tool result:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Legal research function called with request method:', req.method);
    
    // Get authentication header and verify user
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
    
    const { query } = await req.json();
    console.log('Received query:', query);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get research AI model and prompt from system config - use valid models
    const configModel = await getSystemConfig(supabase, 'research_ai_model', 'gpt-4o-mini');
    const researchPrompt = await getSystemConfig(
      supabase, 
      'research_ai_prompt', 
      'Eres un asistente especializado en investigación jurídica colombiana. Analiza la consulta y proporciona respuestas basadas en legislación, jurisprudencia y normativa vigente.'
    );

    // Use valid OpenAI model - map config to supported models
    let researchModel = 'gpt-4o-mini'; // Default fallback
    if (configModel === 'gpt-5-2025-08-07') researchModel = 'gpt-5-2025-08-07';
    else if (configModel === 'gpt-4.1-2025-04-14') researchModel = 'gpt-4.1-2025-04-14';
    else if (configModel === 'gpt-4o') researchModel = 'gpt-4o';

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Using research model: ${researchModel}`);

    // Use the OpenAI API directly since the Agents SDK is not available in Deno
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: researchModel,
        messages: [
          {
            role: 'system',
            content: `${researchPrompt}

Eres un experto en investigación jurídica colombiana.

INSTRUCCIONES ESPECÍFICAS:
1. Analiza la consulta jurídica del usuario sobre derecho colombiano
2. Proporciona información basada en:
   - Constitución Política de Colombia
   - Códigos (Civil, Comercial, Penal, Laboral, etc.)
   - Jurisprudencia de altas cortes
   - Normativa vigente y reglamentaria

3. Estructura tu respuesta en formato JSON:
{
  "findings": "Análisis detallado con referencias legales específicas",
  "sources": ["Lista de fuentes jurídicas consultadas"],
  "conclusion": "Conclusión práctica basada en la normativa vigente"
}

4. Incluye siempre:
   - Referencias específicas de normativa
   - Artículos aplicables
   - Jurisprudencia relevante
   - Recomendaciones prácticas

5. Si la consulta requiere información muy específica, indica claramente las limitaciones`
          },
          {
            role: 'user',
            content: `Consulta jurídica: ${query}`
          }
        ],
        // Use appropriate parameters based on model
        ...(researchModel.startsWith('gpt-5') || researchModel.startsWith('gpt-4.1') ? 
          { max_completion_tokens: 2000 } : 
          { max_tokens: 2000, temperature: 0.3 }
        )
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'No se pudo obtener respuesta del asistente';
    
    console.log('Research completed, processing results...');

    // Try to parse as JSON, fallback to structured text analysis
    let findings, sources, conclusion;
    try {
      const parsed = JSON.parse(content);
      findings = parsed.findings;
      sources = parsed.sources || ["Normativa jurídica colombiana"];
      conclusion = parsed.conclusion;
    } catch (e) {
      // Fallback: structure the content intelligently
      findings = content;
      sources = ["Análisis jurídico basado en normativa colombiana"];
      
      // Extract conclusion from content if possible
      const conclusionMatch = content.match(/conclusi[óo]n[:\s]*(.*?)(?:\n|$)/i);
      conclusion = conclusionMatch ? conclusionMatch[1].trim() : "Consulte con un especialista para casos específicos.";
    }

    const resultData = {
      success: true,
      findings,
      sources,
      conclusion,
      query,
      timestamp: new Date().toISOString()
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'research',
        { query },
        { findings, sources, conclusion },
        { timestamp: new Date().toISOString() }
      );
    }

    return new Response(
      JSON.stringify(resultData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-research-ai function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Note: Using OpenAI Chat Completions API directly as it's more reliable in Deno edge functions
// The Agents SDK requires Node.js runtime features not available in Deno