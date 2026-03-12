import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyerId, question } = await req.json();
    if (!lawyerId || !question) {
      return new Response(JSON.stringify({ error: "lawyerId and question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch CRM data in parallel
    const [casesRes, clientsRes, tasksRes, leadsRes, entitiesRes] = await Promise.all([
      supabase.from("crm_cases").select("id, title, case_type, status, priority, pipeline_stage, clase_proceso, juzgado, demandante, demandado, asignado_a, health_score, expected_value, nota_pendiente, start_date").eq("lawyer_id", lawyerId).limit(200),
      supabase.from("crm_clients").select("id, name, email, status, client_type, company, tags, health_score, payment_status").eq("lawyer_id", lawyerId).limit(200),
      supabase.from("crm_tasks").select("id, title, status, priority, due_date, type").eq("lawyer_id", lawyerId).limit(100),
      supabase.from("crm_leads").select("id, name, email, status, score, origin, estimated_case_value").eq("lawyer_id", lawyerId).limit(100),
      supabase.from("crm_entities").select("id, name, entity_type, industry, status, contract_value").eq("lawyer_id", lawyerId).limit(50),
    ]);

    const context = {
      procesos: casesRes.data || [],
      clientes: clientsRes.data || [],
      tareas: tasksRes.data || [],
      contactos_potenciales: leadsRes.data || [],
      empresas: entitiesRes.data || [],
      resumen: {
        total_procesos: (casesRes.data || []).length,
        procesos_activos: (casesRes.data || []).filter((c: any) => c.status === "active").length,
        total_clientes: (clientsRes.data || []).length,
        tareas_pendientes: (tasksRes.data || []).filter((t: any) => t.status === "pending").length,
        total_leads: (leadsRes.data || []).length,
        total_empresas: (entitiesRes.data || []).length,
      },
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Eres un asistente de CRM legal para abogados colombianos. Analiza los datos del CRM del abogado y responde preguntas de forma clara, concisa y útil. Usa terminología legal colombiana. Responde siempre en español.

Datos del CRM:
${JSON.stringify(context, null, 2)}

Instrucciones:
- Responde basándote SOLO en los datos proporcionados
- Si los datos no tienen la información, dilo claramente
- Usa formato con viñetas o listas cuando sea apropiado
- Sé específico con nombres, cifras y fechas cuando los datos los tengan
- Si encuentras alertas o riesgos (health_score bajo, tareas vencidas), menciónalos proactivamente`,
          },
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("crm-ai-assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
