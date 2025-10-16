import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SpellCheckRequest {
  content: string;
}

interface SpellCheckError {
  word: string;
  suggestions: string[];
  context: string;
  position: number;
}

interface SpellCheckResponse {
  errors: SpellCheckError[];
  correctedText: string;
  summary: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json() as SpellCheckRequest;

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "El contenido no puede estar vacío" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Analyzing document for spelling and grammar errors...");

    const systemPrompt = `Eres un experto corrector ortográfico y gramatical especializado en español legal.

Tu tarea es:
1. Analizar el texto en busca de errores ortográficos, gramaticales y de estilo
2. Identificar cada error con su posición aproximada en el texto
3. Proporcionar sugerencias de corrección para cada error
4. Generar una versión corregida del texto completo
5. Proporcionar un resumen de los errores encontrados

IMPORTANTE: 
- Respeta el formato legal del documento
- No cambies términos legales técnicos que sean correctos
- Enfócate en errores reales de ortografía y gramática
- Ten en cuenta el español de Colombia`;

    const userPrompt = `Por favor, analiza el siguiente documento legal y proporciona un informe de corrección ortográfica y gramatical.

DOCUMENTO A ANALIZAR:
${content}

Responde ÚNICAMENTE con un JSON válido en el siguiente formato:
{
  "errors": [
    {
      "word": "palabra con error",
      "suggestions": ["sugerencia1", "sugerencia2"],
      "context": "contexto donde aparece el error (fragmento de ~50 caracteres)",
      "position": número_aproximado_de_caracteres_desde_el_inicio
    }
  ],
  "correctedText": "texto completo corregido",
  "summary": "Resumen breve: X errores ortográficos, Y errores gramaticales encontrados"
}

Si no hay errores, devuelve:
{
  "errors": [],
  "correctedText": "${content}",
  "summary": "No se encontraron errores ortográficos ni gramaticales"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor, intenta más tarde." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere añadir créditos a tu espacio de trabajo de Lovable AI." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error en el servicio de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No se recibió respuesta del servicio de IA");
    }

    // Parse the JSON response from AI
    let spellCheckResult: SpellCheckResponse;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      spellCheckResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("AI response content:", aiContent);
      // Fallback response if parsing fails
      spellCheckResult = {
        errors: [],
        correctedText: content,
        summary: "No se pudo analizar la respuesta de IA. El documento se devuelve sin cambios."
      };
    }

    console.log(`Spell check completed: ${spellCheckResult.errors.length} errors found`);

    return new Response(
      JSON.stringify(spellCheckResult),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Spell check error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido al revisar ortografía" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});