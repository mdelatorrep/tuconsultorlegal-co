import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting unified services status check...');

    // Monitor both services concurrently
    const [openaiResult, n8nResult] = await Promise.allSettled([
      checkOpenAIStatus(),
      checkN8NStatus()
    ]);

    // Process OpenAI results
    if (openaiResult.status === 'fulfilled') {
      const { data: openaiData, error: openaiError } = await supabase
        .from('service_status')
        .upsert({
          service_name: 'openai',
          status: openaiResult.value.status,
          last_checked: new Date().toISOString(),
          response_time_ms: openaiResult.value.responseTime,
          error_message: openaiResult.value.errorMessage
        }, {
          onConflict: 'service_name'
        });

      if (openaiError) {
        console.error('Error updating OpenAI status:', openaiError);
      } else {
        console.log(`OpenAI status updated: ${openaiResult.value.status} (${openaiResult.value.responseTime}ms)`);
      }
    } else {
      console.error('OpenAI status check failed:', openaiResult.reason);
    }

    // Process N8N results
    if (n8nResult.status === 'fulfilled') {
      const { data: n8nData, error: n8nError } = await supabase
        .from('service_status')
        .upsert({
          service_name: 'n8n',
          status: n8nResult.value.status,
          last_checked: new Date().toISOString(),
          response_time_ms: n8nResult.value.responseTime,
          error_message: n8nResult.value.errorMessage
        }, {
          onConflict: 'service_name'
        });

      if (n8nError) {
        console.error('Error updating N8N status:', n8nError);
      } else {
        console.log(`N8N status updated: ${n8nResult.value.status} (${n8nResult.value.responseTime}ms)`);
      }
    } else {
      console.error('N8N status check failed:', n8nResult.reason);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        openai: openaiResult.status === 'fulfilled' ? openaiResult.value : { error: openaiResult.reason },
        n8n: n8nResult.status === 'fulfilled' ? n8nResult.value : { error: n8nResult.reason }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in monitor-services-status function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Function to check OpenAI status
async function checkOpenAIStatus() {
  const startTime = Date.now();
  let status = 'unknown';
  let errorMessage = null;
  let responseTime = 0;

  try {
    console.log('Checking OpenAI status...');
    
    // Check OpenAI official status page
    const statusResponse = await fetch('https://status.openai.com/api/v2/status.json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TuConsultorLegal-Monitor/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    responseTime = Date.now() - startTime;

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      
      if (statusData && statusData.status && statusData.status.indicator) {
        const indicator = statusData.status.indicator;
        
        // Map OpenAI status indicators to our internal status
        switch (indicator) {
          case 'none':
            status = 'operational';
            break;
          case 'minor':
          case 'major':
            status = 'degraded';
            errorMessage = statusData.status.description || 'Service experiencing issues';
            break;
          case 'critical':
            status = 'outage';
            errorMessage = statusData.status.description || 'Service is experiencing a major outage';
            break;
          default:
            status = 'unknown';
            errorMessage = `Unknown status indicator: ${indicator}`;
        }
        
        console.log(`OpenAI status check: ${indicator} (${status}) - ${responseTime}ms`);
        
      } else {
        status = 'unknown';
        errorMessage = 'Invalid status response format';
      }
    } else {
      status = 'degraded';
      errorMessage = `Status API error: HTTP ${statusResponse.status}`;
      console.error(`OpenAI status API error: ${errorMessage}`);
    }
    
    // If status page indicates issues, also verify API availability
    if (status !== 'operational') {
      console.log('Status page indicates issues, also checking API availability...');
      
      try {
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiKey) {
          const apiStartTime = Date.now();
          const apiResponse = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(8000) // 8 second timeout for API check
          });
          
          const apiResponseTime = Date.now() - apiStartTime;
          
          if (apiResponse.ok) {
            console.log(`API is still responding (${apiResponseTime}ms) despite status page issues`);
            // Don't override status, but log additional info
            errorMessage = `${errorMessage} (API still responding in ${apiResponseTime}ms)`;
          } else {
            console.log(`API also failing: HTTP ${apiResponse.status}`);
            errorMessage = `${errorMessage} + API error: HTTP ${apiResponse.status}`;
          }
        }
      } catch (apiError) {
        console.log(`API check also failed: ${apiError.message}`);
        errorMessage = `${errorMessage} + API unavailable`;
      }
    }
    
  } catch (error) {
    responseTime = Date.now() - startTime;
    
    if (error.name === 'TimeoutError') {
      status = 'degraded';
      errorMessage = 'API request timeout (>10s)';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      status = 'outage';
      errorMessage = 'Network connectivity issue';
    } else {
      status = 'degraded';
      errorMessage = error.message || 'Unknown error';
    }
    
    console.error(`OpenAI API check failed: ${errorMessage}`);
  }

  return { status, responseTime, errorMessage };
}

// Function to check N8N status
async function checkN8NStatus() {
  const startTime = Date.now();
  let status = 'unknown';
  let responseTime = null;
  let errorMessage = null;

  try {
    console.log('Checking N8N status...');
    
    // First try to get status from n8n status page
    const statusResponse = await fetch('https://status.n8n.cloud/api/v2/status.json', {
      method: 'GET',
      headers: {
        'User-Agent': 'TuConsultorLegal-Monitor/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    responseTime = Date.now() - startTime;
    console.log(`N8N status page response time: ${responseTime}ms`);

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('N8N status data:', JSON.stringify(statusData, null, 2));

      // Map n8n status indicators to our internal status
      const indicator = statusData.status?.indicator || 'unknown';
      switch (indicator) {
        case 'none':
          status = 'operational';
          break;
        case 'minor':
          status = 'degraded';
          errorMessage = 'Status API indica: Incidentes menores reportados';
          break;
        case 'major':
        case 'critical':
          status = 'outage';
          errorMessage = `Status API indica: ${indicator} - ${statusData.status?.description || 'Incidente crítico'}`;
          break;
        default:
          status = 'unknown';
          errorMessage = `Status API indica estado desconocido: ${indicator}`;
      }

      console.log(`Mapped N8N status: ${status} from indicator: ${indicator}`);
    } else {
      console.log(`N8N status page returned ${statusResponse.status}, trying direct API check...`);
      
      // If status page fails, try to check the main n8n cloud domain
      const directCheckStart = Date.now();
      const directResponse = await fetch('https://n8n.cloud', {
        method: 'HEAD',
        headers: {
          'User-Agent': 'TuConsultorLegal-Monitor/1.0'
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout for direct check
      });
      
      responseTime = Date.now() - directCheckStart;
      
      if (directResponse.ok) {
        status = 'operational';
        console.log('N8N direct check successful, marking as operational');
      } else {
        status = 'outage';
        errorMessage = `Error en verificación directa: HTTP ${directResponse.status}`;
        console.log(`N8N direct check failed: ${directResponse.status}`);
      }
    }
  } catch (fetchError) {
    responseTime = Date.now() - startTime;
    
    if (fetchError.name === 'TimeoutError') {
      status = 'degraded';
      errorMessage = 'Request timeout (>10s)';
    } else if (fetchError.message?.includes('network') || fetchError.message?.includes('fetch')) {
      status = 'outage';
      errorMessage = 'Network connectivity issue';
    } else {
      status = 'outage';
      errorMessage = `Error de conectividad: ${fetchError.message}`;
    }
    
    console.error('Error checking N8N status:', fetchError);
  }

  console.log(`Final N8N status assessment: ${status}, responseTime: ${responseTime}ms`);
  return { status, responseTime, errorMessage };
}