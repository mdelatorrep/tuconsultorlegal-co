import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  buildResponsesRequestParams,
  callResponsesAPI,
  extractOutputText,
  extractWebSearchCitations,
  loadWebSearchConfigAndBuildTool,
  supportsWebSearch,
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
    console.log("=== SUIN-Juriscol search function called ===");

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
    console.log("[SUIN] Received search request:", { query, category, year, isFollowUp });

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

    console.log(`[SUIN] Model configured: ${model}`);
    console.log(`[SUIN] Reasoning effort: ${reasoningEffort}`);

    // Check OpenAI API key
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // CRITICAL: Check if model supports web search and load configuration
    const modelSupportsWebSearch = supportsWebSearch(model);
    console.log(`[SUIN] Model ${model} supports web search: ${modelSupportsWebSearch}`);

    let webSearchTool = null;
    if (modelSupportsWebSearch) {
      // Load web search configuration with verified domains from knowledge_base_urls
      webSearchTool = await loadWebSearchConfigAndBuildTool(supabase, 'suin_juriscol');
      console.log(`[SUIN] Web search tool loaded: ${webSearchTool ? 'YES' : 'NO (disabled in config)'}`);
    } else {
      console.warn(`[SUIN] ⚠️ WARNING: Model ${model} does NOT support web search. ` +
        `To use web search, change to gpt-5 or gpt-5-mini in admin config.`);
    }

    // Build the user message with context for better search targeting
    let userMessage: string;

    // Add explicit search instructions for web search to target correct sources
    const searchGuidance = webSearchTool ? `
INSTRUCCIONES DE BÚSQUEDA WEB:
- DEBES realizar búsqueda web para encontrar información actualizada
- PRIORIZA buscar en estos sitios oficiales colombianos:
  * suin-juriscol.gov.co - Sistema Único de Información Normativa (FUENTE PRINCIPAL)
  * corteconstitucional.gov.co - Jurisprudencia constitucional
  * cortesuprema.gov.co - Jurisprudencia de la Corte Suprema
  * consejodeestado.gov.co - Jurisprudencia contencioso administrativa
  * funcionpublica.gov.co - Normas de función pública
  * secretariasenado.gov.co - Legislación colombiana
- Incluye URLs específicas de las fuentes consultadas en tu respuesta
- Cita números de ley, decreto, sentencia y artículos específicos
` : '';

    if (isFollowUp && conversationContext) {
      userMessage = `Contexto de la conversación anterior:
${conversationContext}

Nueva pregunta del usuario: ${query}

Basándote en el contexto de la conversación anterior sobre "${originalQuery || "normativa colombiana"}", responde a esta nueva pregunta.
${searchGuidance}
Mantén tus respuestas concisas pero informativas con referencias específicas.`;
    } else {
      userMessage = `Consulta normativa colombiana:

Búsqueda: ${query}
${category && category !== "all" ? `Categoría específica: ${category}` : "Buscar en todas las categorías normativas"}
${year ? `Filtrar por año: ${year}` : "Sin filtro de año específico"}

${searchGuidance}

IMPORTANTE: Proporciona información sustantiva con:
- Referencias a leyes, decretos y normas específicas (número, año, artículos)
- Jurisprudencia relevante con números de sentencia
- URLs de las fuentes oficiales cuando estén disponibles`;
    }

    console.log("[SUIN] Building API request with web search...");

    // Build request params - CRITICAL: use the loaded webSearchTool
    const requestParams = buildResponsesRequestParams(model, {
      input: userMessage,
      instructions: systemPrompt,
      maxOutputTokens: 6000,
      temperature: 0.3,
      webSearch: webSearchTool || undefined,
      reasoning: { effort: reasoningEffort as "low" | "medium" | "high" },
    });

    console.log(`[SUIN] Request params built. Web search enabled: ${!!webSearchTool}`);
    console.log(`[SUIN] Tools in request:`, JSON.stringify(requestParams.tools || 'none'));

    // Call OpenAI Responses API
    const response = await callResponsesAPI(apiKey, requestParams);

    if (!response.success) {
      console.error("[SUIN] AI API error:", response.error);
      throw new Error(response.error || "Error calling AI API");
    }

    const responseData = response.data as Record<string, unknown>;
    const aiResponse = extractOutputText(responseData as any) ?? "";
    console.log(`[SUIN] AI response received, length: ${aiResponse.length} chars`);

    // Extract citations from web search - this is the key to getting real sources
    const citations = extractWebSearchCitations(responseData as any);
    console.log(`[SUIN] Web search citations found: ${citations.length}`);

    // Parse the response to extract structured results + sources
    const results: any[] = [];
    const sourcesSet = new Set<string>();

    const cleanUrl = (url: string) => url.trim().replace(/[\]\)\.,;:]+$/, "");
    const safeAddHostname = (url: string) => {
      try {
        const hostname = new URL(url).hostname;
        sourcesSet.add(hostname);
        return hostname;
      } catch {
        return null;
      }
    };

    // Process grounded citations from Responses API web_search annotations
    const uniqueCitations = new Map<string, { url: string; title?: string }>();

    for (const c of citations) {
      if (!c?.url) continue;
      const url = cleanUrl(c.url);
      if (!url) continue;
      if (!uniqueCitations.has(url)) {
        uniqueCitations.set(url, { url, title: c.title });
      }
    }

    console.log(`[SUIN] Unique citations after dedup: ${uniqueCitations.size}`);

    for (const [url, c] of uniqueCitations.entries()) {
      const hostname = safeAddHostname(url);
      results.push({
        title: c.title || hostname || "Fuente consultada",
        url,
        snippet: "Referencia encontrada en la búsqueda web",
        type: category !== "all" ? category : "normativa",
        source: hostname,
      });
    }

    // Fallback: extract URLs from plain text if no citations found
    if (results.length === 0 && aiResponse) {
      console.log("[SUIN] No citations found, extracting URLs from response text...");
      const urlMatches = aiResponse.match(/https?:\/\/[^\s\)\]\"\'<>]+/g) || [];
      for (const rawUrl of urlMatches) {
        const url = cleanUrl(rawUrl);
        if (!url || results.some((r) => r.url === url)) continue;

        const hostname = safeAddHostname(url);
        results.push({
          title: hostname || "Fuente consultada",
          url,
          snippet: "Ver documento en la fuente",
          type: category !== "all" ? category : "normativa",
          source: hostname,
        });
      }
      console.log(`[SUIN] URLs extracted from text: ${results.length}`);
    }

    // Always add SUIN-Juriscol as a source if the search was successful
    if (aiResponse.length > 100) {
      sourcesSet.add("suin-juriscol.gov.co");
    }

    const sources = Array.from(sourcesSet);
    console.log(`[SUIN] Final sources: ${sources.join(", ")}`);

    // Save result to database
    let resultId = null;
    if (lawyerId) {
      const { data: savedResult, error: saveError } = await supabase
        .from("legal_tools_results")
        .insert({
          lawyer_id: lawyerId,
          tool_type: "suin_juriscol",
          input_data: { query, category, year, isFollowUp },
          output_data: {
            summary: aiResponse,
            results,
            sources,
            citationsCount: citations.length,
            webSearchEnabled: !!webSearchTool,
            modelUsed: model,
          },
          metadata: {
            model,
            reasoning_effort: reasoningEffort,
            web_search_used: !!webSearchTool,
            citations_count: citations.length,
            timestamp: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (saveError) {
        console.error("[SUIN] Error saving result:", saveError);
      } else {
        resultId = savedResult?.id;
        console.log(`[SUIN] Result saved with ID: ${resultId}`);
      }
    }

    console.log("=== SUIN-Juriscol search completed ===");

    return new Response(
      JSON.stringify({
        success: true,
        result_id: resultId,
        summary: aiResponse,
        results,
        sources,
        query,
        webSearchUsed: !!webSearchTool,
        citationsFound: citations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[SUIN] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
