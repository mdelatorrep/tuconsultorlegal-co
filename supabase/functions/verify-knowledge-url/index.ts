import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urlId, url, verifyAll } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Función para verificar una URL
    const verifyUrl = async (targetUrl: string): Promise<{ accessible: boolean; statusCode?: number; error?: string }> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        const response = await fetch(targetUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'TuConsultorLegal-URLVerifier/1.0'
          }
        });

        clearTimeout(timeoutId);

        // Considerar éxito: 2xx, 3xx (redirecciones)
        const accessible = response.status >= 200 && response.status < 400;
        
        return { 
          accessible, 
          statusCode: response.status 
        };
      } catch (error: any) {
        // Si HEAD falla, intentar GET (algunos servidores no soportan HEAD)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(targetUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': 'TuConsultorLegal-URLVerifier/1.0'
            }
          });

          clearTimeout(timeoutId);

          const accessible = response.status >= 200 && response.status < 400;
          return { accessible, statusCode: response.status };
        } catch (getError: any) {
          return { 
            accessible: false, 
            error: getError.message || 'Error de conexión' 
          };
        }
      }
    };

    // Verificar todas las URLs pendientes
    if (verifyAll) {
      const { data: urls, error: fetchError } = await supabase
        .from('knowledge_base_urls')
        .select('id, url')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const results = [];
      for (const urlRecord of urls || []) {
        const result = await verifyUrl(urlRecord.url);
        
        const { error: updateError } = await supabase
          .from('knowledge_base_urls')
          .update({
            verification_status: result.accessible ? 'verified' : 'failed',
            last_verified: new Date().toISOString()
          })
          .eq('id', urlRecord.id);

        if (updateError) {
          console.error(`Error updating URL ${urlRecord.id}:`, updateError);
        }

        results.push({
          id: urlRecord.id,
          url: urlRecord.url,
          ...result
        });
      }

      console.log(`Verified ${results.length} URLs`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        verified: results.length,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar una URL específica
    if (!url && !urlId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Se requiere url o urlId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let targetUrl = url;
    let targetId = urlId;

    // Si solo tenemos ID, buscar la URL
    if (urlId && !url) {
      const { data: urlRecord, error: fetchError } = await supabase
        .from('knowledge_base_urls')
        .select('url')
        .eq('id', urlId)
        .single();

      if (fetchError || !urlRecord) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'URL no encontrada' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      targetUrl = urlRecord.url;
    }

    const result = await verifyUrl(targetUrl);

    // Actualizar en base de datos si tenemos ID
    if (targetId) {
      const { error: updateError } = await supabase
        .from('knowledge_base_urls')
        .update({
          verification_status: result.accessible ? 'verified' : 'failed',
          last_verified: new Date().toISOString()
        })
        .eq('id', targetId);

      if (updateError) {
        console.error('Error updating verification status:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      url: targetUrl,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in verify-knowledge-url:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
