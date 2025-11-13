import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, audience = 'personas' } = await req.json();

    if (!query || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active documents for the audience
    const { data: documents, error: dbError } = await supabase
      .from('legal_agents')
      .select('id, name, description, document_name, document_description, category, price, frontend_icon, button_cta')
      .eq('status', 'active')
      .in('target_audience', [audience, 'ambos']);

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], explanation: 'No hay documentos disponibles actualmente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to analyze the query and match documents
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Eres un asistente legal experto en ayudar a las personas a encontrar documentos legales.
Tu trabajo es analizar la consulta del usuario y devolver los IDs de los documentos más relevantes.

Aquí están los documentos disponibles:
${JSON.stringify(documents, null, 2)}

Analiza la consulta del usuario y determina qué documentos son más relevantes. Considera:
- Palabras clave relacionadas con el tipo de documento
- La intención del usuario (comprar, vender, contratar, divorcio, etc.)
- La categoría del documento
- La descripción del documento

Responde SOLO con la lista de IDs de documentos relevantes, ordenados por relevancia (más relevante primero).
Si no encuentras documentos relevantes, devuelve una lista vacía.
También proporciona una breve explicación de por qué estos documentos son relevantes.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Consulta del usuario: "${query}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matching_documents",
              description: "Devuelve los IDs de documentos que coinciden con la búsqueda del usuario y una explicación",
              parameters: {
                type: "object",
                properties: {
                  document_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de IDs de documentos relevantes, ordenados por relevancia"
                  },
                  explanation: {
                    type: "string",
                    description: "Breve explicación de por qué estos documentos son relevantes para la consulta"
                  }
                },
                required: ["document_ids", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_matching_documents" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de búsquedas excedido. Por favor intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Error de configuración del servicio. Por favor contacta soporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', aiData);
      return new Response(
        JSON.stringify({ 
          matches: documents.slice(0, 5), // Return first 5 as fallback
          explanation: 'Aquí están algunos documentos que podrían interesarte.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const matchedDocumentIds = result.document_ids || [];
    const explanation = result.explanation || 'Documentos encontrados según tu búsqueda.';

    // Filter documents based on AI results
    const matches = documents.filter(doc => matchedDocumentIds.includes(doc.id));

    console.log(`Search query: "${query}" - Found ${matches.length} matches`);

    return new Response(
      JSON.stringify({ 
        matches,
        explanation,
        total: matches.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-document-search:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error procesando la búsqueda' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
