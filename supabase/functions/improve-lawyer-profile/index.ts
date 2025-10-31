import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, input, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "bio":
        systemPrompt = "Eres un experto en redacción de perfiles profesionales para abogados. Crea biografías profesionales, persuasivas y creíbles que destacan la experiencia y valores del abogado.";
        userPrompt = `Mejora esta biografía profesional de abogado, hazla más profesional, convincente y atractiva para clientes potenciales. Mantén un tono profesional pero cercano. Máximo 3 párrafos.

Biografía actual: ${input || "No hay biografía aún"}

${context?.specialties ? `Especialidades: ${context.specialties.join(", ")}` : ""}
${context?.yearsOfExperience ? `Años de experiencia: ${context.yearsOfExperience}` : ""}

Genera SOLO el texto de la biografía mejorada, sin introducción ni explicaciones adicionales.`;
        break;

      case "specialties":
        systemPrompt = "Eres un experto en derecho que conoce todas las áreas de especialización legal. Tu trabajo es sugerir especialidades legales relevantes y bien descritas.";
        userPrompt = `Basándote en estas especialidades actuales, sugiere 3-5 especialidades legales adicionales o mejoras que un abogado podría ofrecer.

Especialidades actuales: ${input && input.length > 0 ? input.join(", ") : "Ninguna todavía"}

Responde SOLO con una lista separada por comas de especialidades legales, sin numeración, sin explicaciones. Ejemplo: "Derecho Laboral, Derecho Corporativo, Derecho Penal"`;
        break;

      case "service":
        systemPrompt = "Eres un experto en marketing legal y redacción de servicios profesionales. Creas descripciones de servicios legales que son claras, profesionales y persuasivas.";
        userPrompt = `Crea una descripción profesional y atractiva para este servicio legal. Debe explicar qué incluye el servicio y cómo beneficia al cliente.

Nombre del servicio: ${input}

${context?.specialties ? `Especialidades del abogado: ${context.specialties.join(", ")}` : ""}

Genera SOLO la descripción del servicio (2-3 oraciones), sin introducción ni título. Mantén un tono profesional pero accesible.`;
        break;

      default:
        throw new Error("Invalid type specified");
    }

    console.log("Calling Lovable AI with type:", type);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido, intenta de nuevo más tarde." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere pago, contacta al administrador." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const improvedText = data.choices[0].message.content.trim();

    console.log("AI improvement successful for type:", type);

    return new Response(
      JSON.stringify({ improvedText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in improve-lawyer-profile function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido al mejorar el texto" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
