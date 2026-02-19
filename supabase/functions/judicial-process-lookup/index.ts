import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Strategy 1: Firecrawl scraping del portal oficial ─────────────────────
async function scrapeWithFirecrawl(radicado: string): Promise<{ text: string; rawData: any } | null> {
  const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_KEY) {
    console.warn('[firecrawl] No API key configured');
    return null;
  }

  try {
    // Usar Firecrawl para hacer scraping del portal con JavaScript rendering
    // El portal acepta el número en la URL de consulta directa
    const targetUrl = `https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion`;
    
    console.log(`[firecrawl] Scraping portal with radicado: ${radicado}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown', 'rawHtml'],
        actions: [
          // Seleccionar "Todos los Procesos" para búsqueda completa
          { type: 'click', selector: 'input[type="radio"]:nth-of-type(2)' },
          // Esperar que el campo esté disponible
          { type: 'wait', milliseconds: 500 },
          // Escribir el número de radicado
          { type: 'write', text: radicado },
          // Hacer clic en Consultar
          { type: 'click', selector: 'button[type="submit"], button.consultar, .btn-consultar, button:has-text("CONSULTAR"), button:has-text("Consultar")' },
          // Esperar resultados
          { type: 'wait', milliseconds: 4000 },
        ],
        waitFor: 3000,
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[firecrawl] Error:', response.status, errText.slice(0, 300));
      return null;
    }

    const data = await response.json();
    console.log('[firecrawl] Success, content length:', data?.data?.markdown?.length || 0);
    
    return {
      text: data?.data?.markdown || '',
      rawData: data?.data,
    };
  } catch (err) {
    console.error('[firecrawl] Exception:', err.message);
    return null;
  }
}

// ── Strategy 2: Serper búsqueda en Google del radicado ────────────────────
async function searchWithSerper(query: string): Promise<any[]> {
  const SERPER_KEY = Deno.env.get('SERPER_API_KEY');
  if (!SERPER_KEY) {
    console.warn('[serper] No API key configured');
    return [];
  }

  try {
    const searchQuery = `"${query}" site:consultaprocesos.ramajudicial.gov.co OR radicado proceso judicial Colombia`;
    console.log('[serper] Searching:', searchQuery);
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        hl: 'es',
        gl: 'co',
        num: 5,
      }),
    });

    if (!response.ok) {
      console.error('[serper] Error:', response.status);
      return [];
    }

    const data = await response.json();
    return data?.organic || [];
  } catch (err) {
    console.error('[serper] Exception:', err.message);
    return [];
  }
}

// ── Strategy 3: Firecrawl scraping directo de resultados con JS actions ───
async function scrapeResultsPage(radicado: string): Promise<string | null> {
  const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_KEY) return null;

  try {
    // Intentar la URL de resultados directa que algunos portales exponen
    const searchUrl = `https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion?numero=${encodeURIComponent(radicado)}`;
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown'],
        waitFor: 5000,
        timeout: 30000,
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.data?.markdown || null;
  } catch (err) {
    console.error('[firecrawl-direct] Exception:', err.message);
    return null;
  }
}

// ── OpenAI analysis with all collected data ───────────────────────────────
async function analyzeWithOpenAI(
  radicado: string,
  scrapedContent: string | null,
  serperResults: any[],
  followUpQuery?: string,
  conversationHistory?: any[],
  systemPromptOverride?: string
): Promise<string | null> {
  const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_KEY) {
    console.warn('[openai] No API key configured');
    return null;
  }

  try {
    const systemPrompt = systemPromptOverride || 
      `Eres un asistente legal especializado en derecho procesal colombiano. 
Analiza información de procesos judiciales de la Rama Judicial de Colombia.
Cuando tengas datos reales del proceso, preséntales de forma estructurada y clara.
Cuando no tengas datos directos del sistema, indica claramente qué información encontraste y proporciona orientación sobre cómo consultar el proceso.
Siempre proporciona el enlace directo al portal: https://consultaprocesos.ramajudicial.gov.co`;

    let userContent: string;

    if (followUpQuery && conversationHistory && conversationHistory.length > 0) {
      userContent = followUpQuery;
    } else {
      const contextParts: string[] = [
        `# Consulta de Proceso Judicial`,
        `**Número de Radicado:** ${radicado}`,
        `**Enlace de consulta:** https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion`,
        '',
      ];

      if (scrapedContent && scrapedContent.length > 100) {
        contextParts.push(`## Datos extraídos del portal oficial:`);
        contextParts.push(scrapedContent.slice(0, 8000));
      } else {
        contextParts.push(`## Nota: No fue posible extraer datos automáticamente del portal`);
      }

      if (serperResults.length > 0) {
        contextParts.push(`\n## Información encontrada en búsqueda web:`);
        serperResults.slice(0, 3).forEach((r: any, i: number) => {
          contextParts.push(`${i + 1}. **${r.title}**`);
          if (r.snippet) contextParts.push(`   ${r.snippet}`);
          if (r.link) contextParts.push(`   Fuente: ${r.link}`);
        });
      }

      contextParts.push(`\n## Tarea:`);
      contextParts.push(`Basándote en la información disponible sobre el radicado ${radicado}:`);
      contextParts.push(`1. Analiza el proceso judicial si hay datos disponibles`);
      contextParts.push(`2. Identifica las partes, tipo de proceso, despacho y estado`);
      contextParts.push(`3. Resume las actuaciones más recientes`);
      contextParts.push(`4. Proporciona recomendaciones legales relevantes`);
      contextParts.push(`5. Indica el enlace directo donde el abogado puede consultar el expediente`);

      userContent = contextParts.join('\n');
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-6)); // últimas 6 para no exceder context
    }

    messages.push({ role: 'user', content: userContent });

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2500,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      console.error('[openai] Error:', aiResp.status);
      return null;
    }

    const aiData = await aiResp.json();
    return aiData.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('[openai] Exception:', err.message);
    return null;
  }
}

// ── Parse process data from scraped content ───────────────────────────────
function extractProcessDataFromMarkdown(markdown: string, radicado: string): any[] {
  if (!markdown || markdown.length < 50) return [];
  
  // Buscar patrones de datos de proceso en el markdown
  const hasProcessData = markdown.includes('Despacho') || 
                         markdown.includes('despacho') ||
                         markdown.includes('Actuaci') ||
                         markdown.includes('Proceso') ||
                         markdown.includes(radicado.substring(0, 10));

  if (!hasProcessData) return [];

  // Extraer datos básicos del markdown
  const process: any = {
    llaveProceso: radicado,
    source: 'firecrawl_scrape',
    rawContent: markdown.slice(0, 3000),
  };

  // Buscar despacho
  const despachoMatch = markdown.match(/[Dd]espacho[:\s]+([^\n]+)/);
  if (despachoMatch) process.despacho = despachoMatch[1].trim();

  // Buscar tipo proceso
  const tipoMatch = markdown.match(/[Tt]ipo\s+[Pp]roceso[:\s]+([^\n]+)/);
  if (tipoMatch) process.tipoProceso = tipoMatch[1].trim();

  // Buscar clase proceso
  const claseMatch = markdown.match(/[Cc]lase\s+[Pp]roceso[:\s]+([^\n]+)/);
  if (claseMatch) process.claseProceso = claseMatch[1].trim();

  // Buscar fecha radicación
  const fechaMatch = markdown.match(/[Ff]echa\s+[Rr]adicaci[oó]n[:\s]+([^\n]+)/);
  if (fechaMatch) process.fechaRadicacion = fechaMatch[1].trim();

  // Buscar ponente
  const ponenteMatch = markdown.match(/[Pp]onente[:\s]+([^\n]+)/);
  if (ponenteMatch) process.ponente = ponenteMatch[1].trim();

  return [process];
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const { queryType, radicado, documentNumber, documentType, followUpQuery, conversationHistory } = requestData;

    console.log('[judicial-process-lookup] Query:', { queryType, radicado, documentNumber, documentType });

    // Normalizar el input
    const searchTerm = radicado || documentNumber;
    const isRadicado = queryType === 'radicado' || (radicado && !documentNumber);

    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Debe especificar un número de radicado o documento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTerm = searchTerm.replace(/\s/g, '');

    // ── Fetch AI config from DB ─────────────────────────────────────────
    const [modelConfigResult, promptConfigResult] = await Promise.allSettled([
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_model').maybeSingle(),
      serviceClient.from('system_config').select('config_value').eq('config_key', 'process_query_ai_prompt').maybeSingle(),
    ]);

    const aiModel = (modelConfigResult.status === 'fulfilled' ? modelConfigResult.value.data?.config_value : null) || 'gpt-4o';
    const systemPromptFromDB = (promptConfigResult.status === 'fulfilled' ? promptConfigResult.value.data?.config_value : null) || undefined;

    // ── Step 1: Multi-strategy data collection ───────────────────────────
    let scrapedContent: string | null = null;
    let processes: any[] = [];
    let serperResults: any[] = [];

    console.log('[judicial-process-lookup] Starting multi-strategy lookup for:', cleanTerm);

    if (followUpQuery) {
      // Para follow-up, solo usar OpenAI con el historial
      console.log('[judicial-process-lookup] Follow-up query, skipping scraping');
    } else {
      // Ejecutar scraping y búsqueda en paralelo
      const [scrapeResult, serperResult] = await Promise.allSettled([
        scrapeWithFirecrawl(cleanTerm),
        searchWithSerper(cleanTerm),
      ]);

      if (scrapeResult.status === 'fulfilled' && scrapeResult.value) {
        scrapedContent = scrapeResult.value.text;
        processes = extractProcessDataFromMarkdown(scrapedContent, cleanTerm);
        console.log(`[judicial-process-lookup] Firecrawl: ${scrapedContent?.length || 0} chars, ${processes.length} processes extracted`);
      }

      if (serperResult.status === 'fulfilled') {
        serperResults = serperResult.value;
        console.log(`[judicial-process-lookup] Serper: ${serperResults.length} results`);
      }

      // Si no hubo resultados del scraping, intentar scraping directo
      if (!scrapedContent || scrapedContent.length < 100) {
        console.log('[judicial-process-lookup] Trying direct URL scraping...');
        const directContent = await scrapeResultsPage(cleanTerm);
        if (directContent && directContent.length > 100) {
          scrapedContent = directContent;
          const directProcesses = extractProcessDataFromMarkdown(directContent, cleanTerm);
          if (directProcesses.length > 0) processes = directProcesses;
        }
      }
    }

    // ── Step 2: AI Analysis ──────────────────────────────────────────────
    const aiAnalysis = await analyzeWithOpenAI(
      cleanTerm,
      scrapedContent,
      serperResults,
      followUpQuery,
      conversationHistory,
      systemPromptFromDB
    );

    // ── Step 3: Build portal URL for direct user access ──────────────────
    const portalUrl = `https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion`;
    
    // ── Step 4: Save result ───────────────────────────────────────────────
    try {
      await serviceClient.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'judicial_process',
        input_data: { queryType, radicado: cleanTerm, documentNumber, documentType, followUpQuery },
        output_data: {
          processes,
          processDetails: processes[0] || null,
          aiAnalysis,
          processCount: processes.length,
          scrapedContentLength: scrapedContent?.length || 0,
          serperResultsCount: serperResults.length,
        },
        metadata: {
          source: 'multi_strategy',
          strategies_used: [
            scrapedContent ? 'firecrawl' : null,
            serperResults.length > 0 ? 'serper' : null,
            aiAnalysis ? 'openai' : null,
          ].filter(Boolean),
          portal: 'consultaprocesos.ramajudicial.gov.co',
          timestamp: new Date().toISOString(),
        }
      });
    } catch (saveErr) {
      console.error('[judicial-process-lookup] Save error:', saveErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processes,
        processDetails: processes[0] || null,
        processCount: processes.length,
        aiAnalysis,
        queryType: isRadicado ? 'radicado' : 'document',
        source: 'multi_strategy',
        portalUrl,
        // Incluir info de debug
        _debug: {
          scrapedChars: scrapedContent?.length || 0,
          serperResults: serperResults.length,
          hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
          hasFirecrawl: !!Deno.env.get('FIRECRAWL_API_KEY'),
          hasSerper: !!Deno.env.get('SERPER_API_KEY'),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[judicial-process-lookup] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        details: 'Error al consultar el sistema de la Rama Judicial. Verifique el número ingresado e intente nuevamente.',
        processes: [],
        processCount: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
