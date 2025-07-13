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

    console.log('Starting OpenAI status check...');

    const startTime = Date.now();
    let status = 'unknown';
    let errorMessage = null;
    let responseTime = 0;

    try {
      // Check OpenAI API health by making a simple request
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        if (data && data.data && Array.isArray(data.data)) {
          status = 'operational';
          console.log(`OpenAI API is operational (${responseTime}ms)`);
        } else {
          status = 'degraded';
          errorMessage = 'Unexpected API response format';
        }
      } else {
        status = response.status >= 500 ? 'outage' : 'degraded';
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`OpenAI API error: ${errorMessage}`);
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

    // Update service status in database
    const { error: updateError } = await supabase
      .from('service_status')
      .update({
        status,
        last_checked: new Date().toISOString(),
        response_time_ms: responseTime,
        error_message: errorMessage
      })
      .eq('service_name', 'openai');

    if (updateError) {
      console.error('Error updating service status:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update service status',
          details: updateError.message 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`OpenAI status updated: ${status} (${responseTime}ms)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        status,
        responseTime,
        errorMessage,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in monitor-openai-status function:', error);
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