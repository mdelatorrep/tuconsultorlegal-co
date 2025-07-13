import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TRACK-PRICING-CLICK] Function started');
    
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request data
    const { planId, planName, planType } = await req.json();
    
    if (!planId || !planName || !planType) {
      throw new Error('Missing required fields: planId, planName, planType');
    }

    console.log('[TRACK-PRICING-CLICK] Tracking click for plan:', { planId, planName, planType });

    // Get client IP and user agent for analytics
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Insert analytics record
    const { error } = await supabaseClient
      .from('pricing_analytics')
      .insert({
        plan_id: planId,
        plan_name: planName,
        plan_type: planType,
        user_ip: clientIP,
        user_agent: userAgent
      });

    if (error) {
      console.error('[TRACK-PRICING-CLICK] Error inserting analytics:', error);
      throw error;
    }

    console.log('[TRACK-PRICING-CLICK] Analytics recorded successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[TRACK-PRICING-CLICK] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error tracking pricing click' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});