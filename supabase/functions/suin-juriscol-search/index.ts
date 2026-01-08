import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  buildResponsesRequestParams,
  callResponsesAPI,
  extractOutputText,
  extractWebSearchCitations,
} from "../_shared/openai-responses-utils.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to get required system configuration - throws if not found
async function getRequiredConfig(supabaseClient: any, configKey: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from("system_config")
    .select("config_value")
    .eq("config_key", configKey)
    .maybeSingle();

  if (error || !data?.config_value) {
    throw new Error(
      `Configuración '${configKey}' no encontrada en system_config. Por favor configúrela en el panel de administración.`,
    );
  }

  return data.config_value;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("SUIN-Juriscol search function called");

    // Get authentication header and verify user
    const authHeader = req.headers.get("authorization");
    let lawyerId: string | null = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseClient = createClient(supabaseUrl, anonKey);

      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id || null;
    }

    const { query, category, year, conversationContext, isFollowUp, originalQuery } = await req.json();
    console.log("Received search request:", { query, category, year, isFollowUp });

    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lawyerId) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AI model, prompt and reasoning effort from system config - NO FALLBACKS
    const [model, systemPrompt, reasoningEffort] = await Promise.all([
      getRequiredConfig(supabase, "suin_juriscol_ai_model"),
      getRequiredConfig(supabase, "suin_juriscol_ai_prompt"),
      getRequiredConfig(supabase, "suin_juriscol_reasoning_effort"),
    ]);

    console.log(`[SUIN-Juriscol] Using model: ${model}, reasoning effort: ${reasoningEffort}`);

    // Build the user message based on whether this is a follow-up
    let userMessage: string;

    if (isFollowUp && conversationContext) {
      userMessage = `Contexto de la conversación anterior:
${conversationContext}

Nueva pregunta del usuario: ${query}

Basándote en el contexto de la conversación anterior sobre "${originalQuery || "normativa colombiana"}", responde a esta nueva pregunta.
Si necesitas buscar información adicional, hazlo usando web search enfocándote en SUIN-Juriscol y fuentes oficiales colombianas.
Mantén tus respuestas concisas pero informativas.`;
    } else {
      userMessage = `Consulta normativa colombiana:

Búsqueda: ${query}
${category && category !== "all" ? `Categoría: ${category}` : ""}
${year ? `Año: ${year}` : ""}`;
    }

    console.log("Calling AI with web search for SUIN-Juriscol...");

    // Build request params with web search tool and reasoning effort
    const requestParams = buildResponsesRequestParams(model, {
      input: userMessage,
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      webSearch: { type: "web_search_preview" },
      reasoning: { effort: reasoningEffort as "low" | "medium" | "high" },
    });

    console.log("Request params:", JSON.stringify(requestParams, null, 2));

    // Call OpenAI Responses API
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await callResponsesAPI(apiKey, requestParams);

    if (!response.success) {
      console.error("AI API error:", response.error);
      throw new Error(response.error || "Error calling AI API");
    }

    const responseData = response.data as Record<string, unknown>;

    const aiResponse = extractOutputText(responseData as any) ?? "";
    console.log("AI response received, length:", aiResponse.length);

    // Parse the response to extract structured results + sources
    const results: any[] = [];
    const sourcesSet = new Set<string>(["SUIN-Juriscol (suin-juriscol.gov.co)"]);

    const cleanUrl = (url: string) => url.trim().replace(/[\]\)\.,;:]+$/, "");
    const safeAddHostname = (url: string) => {
      try {
        sourcesSet.add(new URL(url).hostname);
      } catch {
        // ignore invalid URLs
      }
    };

    // Prefer grounded citations from Responses API web_search annotations
    const citations = extractWebSearchCitations(responseData as any);
    const uniqueCitations = new Map<string, { url: string; title?: string }>();

    for (const c of citations) {
      if (!c?.url) continue;
      const url = cleanUrl(c.url);
      if (!url) continue;
      if (!uniqueCitations.has(url)) uniqueCitations.set(url, { url, title: c.title });
    }

    for (const [url, c] of uniqueCitations.entries()) {
      results.push({
        title: c.title || "Fuente consultada",
        url,
        snippet: "Referencia encontrada en la búsqueda web",
        type: category !== "all" ? category : "normativa",
      });
      safeAddHostname(url);
    }

    // Fallback: extract URLs from plain text (in case there are no citations)
    if (results.length === 0 && aiResponse) {
      const urlMatches = aiResponse.match(/https?:\/\/[^\s\)]+/g) || [];
      for (const rawUrl of urlMatches) {
        const url = cleanUrl(rawUrl);
        // Avoid duplicates
        if (!url || results.some((r) => r.url === url)) continue;

        results.push({
          title: "Fuente consultada",
          url,
          snippet: "Ver documento en la fuente",
          type: category !== "all" ? category : "normativa",
        });
        safeAddHostname(url);
      }
    }

    const sources = Array.from(sourcesSet);

    // Save result to database
    let resultId = null;
    if (lawyerId) {
      const { data: savedResult, error: saveError } = await supabase
        .from("legal_tools_results")
        .insert({
          lawyer_id: lawyerId,
          tool_type: "suin_juriscol",
          input_data: { query, category, year },
          output_data: {
            summary: aiResponse,
            results,
            sources,
          },
          metadata: {
            model,
            timestamp: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("Error saving result:", saveError);
      } else {
        resultId = savedResult?.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result_id: resultId,
        summary: aiResponse,
        results,
        sources,
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in suin-juriscol-search:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
