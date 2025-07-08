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
    const { templateContent, docName, docCategory, docDescription } = await req.json();

    console.log('Improving template with AI:', {
      docName,
      docCategory,
      templateLength: templateContent?.length || 0
    });

    if (!templateContent || templateContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'El contenido de la plantilla es requerido' 
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
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en redacción de documentos legales en Colombia. Tu tarea es mejorar plantillas de documentos legales para hacerlas más completas, precisas y profesionales.

REGLAS IMPORTANTES:
1. MANTÉN TODOS LOS PLACEHOLDERS existentes en el formato {{nombre_variable}}
2. NO elimines ningún placeholder que ya existe
3. Puedes agregar nuevos placeholders si es necesario para completar el documento
4. Mejora la redacción legal, estructura y claridad
5. Asegúrate de que el documento sea válido bajo la ley colombiana
6. Mantén el formato profesional y la estructura lógica
7. Conserva todas las cláusulas importantes existentes
8. RESPONDE ÚNICAMENTE CON LA PLANTILLA MEJORADA EN TEXTO PLANO
9. NO incluyas explicaciones, comentarios, ni texto adicional
10. NO uses caracteres especiales de markdown como **, _, `, etc.
11. NO incluyas encabezados, títulos o secciones explicativas

OBJETIVO: Devolver únicamente la plantilla del documento mejorada en texto plano, sin formato adicional.`
          },
          {
            role: 'user',
            content: `Documento: ${docName} - Categoría: ${docCategory}

${templateContent}

Mejora esta plantilla manteniendo todos los placeholders {{variable}} existentes.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
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

    const improvedTemplate = data.choices[0].message.content.trim();

    console.log('Template improvement successful:', {
      originalLength: templateContent.length,
      improvedLength: improvedTemplate.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        improvedTemplate: improvedTemplate,
        originalLength: templateContent.length,
        improvedLength: improvedTemplate.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in improve-template-ai function:', error);
    
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