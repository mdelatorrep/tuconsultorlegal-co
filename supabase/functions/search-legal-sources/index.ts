import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    if (!serperApiKey) {
      throw new Error('SERPER_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query, legal_area, source_type, include_kb_urls = true } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Performing legal search for: "${query}" in ${legal_area || 'general'}`);

    let results: any = {
      query,
      legal_area,
      knowledge_base_urls: [],
      web_results: []
    };

    // 1. Get Knowledge Base URLs
    if (include_kb_urls) {
      const { data: urls, error: urlsError } = await supabase
        .from('knowledge_base_urls')
        .select('url, description, category, priority')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('category');

      if (!urlsError && urls) {
        results.knowledge_base_urls = urls;
        console.log(`Found ${urls.length} knowledge base URLs`);
      }
    }

    // 2. Build search queries for Colombian legal context
    const searchQueries = [];
    
    if (legal_area) {
      searchQueries.push(`${query} Colombia ley ${legal_area}`);
      searchQueries.push(`${query} jurisprudencia Colombia ${legal_area}`);
    } else {
      searchQueries.push(`${query} Colombia legislación`);
    }

    if (source_type) {
      searchQueries.push(`${query} ${source_type} Colombia`);
    }

    // 3. Perform web search with serper.dev
    for (const searchQuery of searchQueries.slice(0, 2)) {
      try {
        console.log(`Searching with serper: "${searchQuery}"`);
        
        const serperResponse = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: searchQuery,
            location: 'Colombia',
            gl: 'co',
            hl: 'es-419',
            num: 5 // Limit to 5 results per query
          })
        });

        if (!serperResponse.ok) {
          const errorText = await serperResponse.text();
          console.error('Serper API error:', serperResponse.status, errorText);
          continue; // Skip this query and continue with others
        }

        const serperData = await serperResponse.json();
        console.log(`Serper returned ${serperData.organic?.length || 0} results`);

        // Add organic search results
        if (serperData.organic && serperData.organic.length > 0) {
          for (const result of serperData.organic) {
            results.web_results.push({
              title: result.title,
              link: result.link,
              snippet: result.snippet,
              query: searchQuery,
              position: result.position
            });
          }
        }

        // Add knowledge graph if available (useful for legal entities, laws)
        if (serperData.knowledgeGraph) {
          results.knowledge_graph = {
            title: serperData.knowledgeGraph.title,
            description: serperData.knowledgeGraph.description,
            source: serperData.knowledgeGraph.source
          };
        }

        // Add answer box if available (useful for quick legal info)
        if (serperData.answerBox) {
          results.answer_box = {
            answer: serperData.answerBox.answer || serperData.answerBox.snippet,
            source: serperData.answerBox.link
          };
        }

      } catch (error) {
        console.error(`Error searching "${searchQuery}":`, error);
        // Continue with other queries
      }
    }

    // 4. Filter web results to prioritize official legal sources
    const priorityDomains = [
      'gov.co',
      'corteconstitucional.gov.co',
      'cortesuprema.gov.co',
      'sic.gov.co',
      'funcionpublica.gov.co',
      'icbf.gov.co',
      'mintrabajo.gov.co',
      'minjusticia.gov.co',
      'secretariasenado.gov.co'
    ];

    // Sort results by priority domains
    results.web_results.sort((a: any, b: any) => {
      const aDomain = priorityDomains.some(domain => a.link.includes(domain));
      const bDomain = priorityDomains.some(domain => b.link.includes(domain));
      
      if (aDomain && !bDomain) return -1;
      if (!aDomain && bDomain) return 1;
      return a.position - b.position;
    });

    // Limit total web results
    results.web_results = results.web_results.slice(0, 10);

    console.log(`Search completed: ${results.web_results.length} web results, ${results.knowledge_base_urls.length} KB URLs`);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-legal-sources:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
