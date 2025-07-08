import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { docName, docDesc, docCategory } = await req.json();

    console.log('Improving document info with AI:', {
      docName,
      docDesc,
      docCategory
    });

    if (!docName || !docDesc) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El nombre y descripción del documento son requeridos' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en marketing legal y comunicación con usuarios finales en Colombia. Tu tarea es mejorar el nombre y descripción de servicios legales para que sean más atractivos y comprensibles para el usuario final.

REGLAS IMPORTANTES:
1. Usa lenguaje claro y sencillo que cualquier persona pueda entender
2. Evita jerga legal compleja innecesaria
3. Enfócate en los beneficios y la utilidad para el usuario
4. Usa términos que la gente busca comúnmente
5. Haz que suene profesional pero accesible
6. Mantén la precisión legal pero con lenguaje amigable
7. RESPONDE ÚNICAMENTE CON UN JSON con las claves "improvedName" e "improvedDescription"
8. NO incluyas explicaciones adicionales, solo el JSON

OBJETIVO: Mejorar el nombre y descripción para que sean más atractivos y comprensibles para usuarios finales.`
          },
          {
            role: 'user',
            content: `Categoría: ${docCategory}
Nombre actual: ${docName}
Descripción actual: ${docDesc}

Mejora el nombre y descripción para que sean más atractivos y comprensibles para usuarios finales.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`Error de OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response:', data);
      throw new Error('Respuesta inválida de OpenAI');
    }

    const responseText = data.choices[0].message.content.trim();
    
    // Parse the JSON response
    let improvedInfo;
    try {
      improvedInfo = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Error al procesar la respuesta de IA');
    }

    console.log('Document info improvement successful:', {
      originalName: docName,
      improvedName: improvedInfo.improvedName,
      originalDesc: docDesc,
      improvedDesc: improvedInfo.improvedDescription
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        improvedName: improvedInfo.improvedName,
        improvedDescription: improvedInfo.improvedDescription,
        originalName: docName,
        originalDescription: docDesc
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in improve-document-info function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});