import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting n8n status monitoring...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log('Supabase client created successfully');

    let status = 'unknown';
    let responseTime = null;
    let errorMessage = null;
    const startTime = Date.now();

    try {
      console.log('Fetching n8n status from status page...');
      
      // First try to get status from n8n status page
      const statusResponse = await fetch('https://status.n8n.cloud/api/v2/status.json', {
        method: 'GET',
        headers: {
          'User-Agent': 'TuConsultorLegal-Monitor/1.0',
          'Accept': 'application/json'
        }
      });

      responseTime = Date.now() - startTime;
      console.log(`Status page response time: ${responseTime}ms`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('n8n status data:', JSON.stringify(statusData, null, 2));

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

        console.log(`Mapped status: ${status} from indicator: ${indicator}`);
      } else {
        console.log(`Status page returned ${statusResponse.status}, trying direct API check...`);
        
        // If status page fails, try to check the main n8n cloud domain
        const directCheckStart = Date.now();
        const directResponse = await fetch('https://n8n.cloud', {
          method: 'HEAD',
          headers: {
            'User-Agent': 'TuConsultorLegal-Monitor/1.0'
          }
        });
        
        responseTime = Date.now() - directCheckStart;
        
        if (directResponse.ok) {
          status = 'operational';
          console.log('Direct check successful, marking as operational');
        } else {
          status = 'outage';
          errorMessage = `Error en verificación directa: HTTP ${directResponse.status}`;
          console.log(`Direct check failed: ${directResponse.status}`);
        }
      }
    } catch (fetchError) {
      responseTime = Date.now() - startTime;
      status = 'outage';
      errorMessage = `Error de conectividad: ${fetchError.message}`;
      console.error('Error checking n8n status:', fetchError);
    }

    console.log(`Final status assessment: ${status}, responseTime: ${responseTime}ms`);

    // Update the service_status table
    const { data: updateData, error: updateError } = await supabase
      .from('service_status')
      .upsert({
        service_name: 'n8n',
        status: status,
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: errorMessage
      }, {
        onConflict: 'service_name'
      });

    if (updateError) {
      console.error('Error updating service status:', updateError);
      throw updateError;
    }

    console.log('Service status updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        service: 'n8n',
        status: status,
        response_time_ms: responseTime,
        error_message: errorMessage,
        checked_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in n8n status monitor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});