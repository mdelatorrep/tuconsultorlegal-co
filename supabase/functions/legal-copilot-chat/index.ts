import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, documentContext, documentType, lawyerId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[CopilotChat] Processing chat for lawyer: ${lawyerId}, docType: ${documentType}`);

    const systemPrompt = `Eres un asistente de redacción legal experto en derecho colombiano. 
Tu rol es ayudar al abogado a redactar y mejorar documentos legales.

CONTEXTO DEL DOCUMENTO ACTUAL:
Tipo: ${documentType || 'documento legal'}
Contenido parcial:
"""
${documentContext || 'No hay contenido aún'}
"""

INSTRUCCIONES:
1. Responde siempre en español colombiano formal
2. Usa terminología jurídica precisa y apropiada
3. Cuando sugieras texto, hazlo listo para copiar/insertar
4. Cita normas colombianas relevantes cuando aplique
5. Sé conciso pero completo en tus respuestas
6. Si el usuario pide mejorar algo, proporciona la versión mejorada directamente
7. Considera el contexto del documento para tus respuestas

CAPACIDADES:
- Mejorar redacción de cláusulas
- Sugerir términos legales apropiados
- Detectar posibles inconsistencias
- Proponer cláusulas adicionales relevantes
- Explicar implicaciones legales
- Generar variantes de redacción`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[CopilotChat] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('[CopilotChat] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
