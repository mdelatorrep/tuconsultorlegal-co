import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get dLocal API credentials
    const apiKey = Deno.env.get('DLOCAL_API_KEY');
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY');

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'dLocal credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Starting subscription synchronization from dLocal...');

    // Get all subscriptions from dLocal
    const auth = btoa(`${apiKey}:${secretKey}`);
    
    const dLocalResponse = await fetch('https://api.dlocalgo.com/v1/subscriptions', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!dLocalResponse.ok) {
      console.error('❌ dLocal API error:', dLocalResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions from dLocal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dLocalData = await dLocalResponse.json();
    console.log('📊 dLocal subscriptions response:', JSON.stringify(dLocalData, null, 2));

    let syncedCount = 0;
    let updatedCount = 0;

    // Process each subscription from dLocal
    if (dLocalData.data && Array.isArray(dLocalData.data)) {
      for (const dLocalSub of dLocalData.data) {
        console.log(`🔍 Processing dLocal subscription: ${dLocalSub.id}`);
        
        // Check if subscription exists in our database
        const { data: existingSub } = await supabase
          .from('lawyer_subscriptions')
          .select('*')
          .eq('dlocal_subscription_id', dLocalSub.id)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error: updateError } = await supabase
            .from('lawyer_subscriptions')
            .update({
              status: dLocalSub.status || 'active',
              current_period_start: dLocalSub.current_period_start ? new Date(dLocalSub.current_period_start).toISOString() : null,
              current_period_end: dLocalSub.current_period_end ? new Date(dLocalSub.current_period_end).toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('dlocal_subscription_id', dLocalSub.id);

          if (!updateError) {
            updatedCount++;
            console.log(`✅ Updated subscription: ${dLocalSub.id}`);
          } else {
            console.error(`❌ Error updating subscription ${dLocalSub.id}:`, updateError);
          }
        } else {
          // Try to match by external_id first, then email
          let lawyer = null;
          
          // First try external_id
          if (dLocalSub.user && dLocalSub.user.external_id) {
            const { data: foundLawyer } = await supabase
              .from('lawyer_profiles')
              .select('id, email')
              .eq('id', dLocalSub.user.external_id)
              .maybeSingle();
            lawyer = foundLawyer;
          }
          
          // Fallback to email if external_id didn't work
          if (!lawyer && dLocalSub.user && dLocalSub.user.email) {
            const { data: foundLawyer } = await supabase
              .from('lawyer_profiles')
              .select('id')
              .eq('email', dLocalSub.user.email)
              .maybeSingle();
            lawyer = foundLawyer;
          }

          if (lawyer) {
            // Create new subscription record
            const { error: insertError } = await supabase
              .from('lawyer_subscriptions')
              .insert({
                lawyer_id: lawyer.id,
                plan_id: dLocalSub.plan_id || 'unknown',
                billing_cycle: 'monthly', // Default, can be updated
                status: dLocalSub.status || 'active',
                dlocal_subscription_id: dLocalSub.id,
                current_period_start: dLocalSub.current_period_start ? new Date(dLocalSub.current_period_start).toISOString() : null,
                current_period_end: dLocalSub.current_period_end ? new Date(dLocalSub.current_period_end).toISOString() : null,
                cancel_at_period_end: false
              });

            if (!insertError) {
              syncedCount++;
              console.log(`✅ Created new subscription record for: ${dLocalSub.user.email || dLocalSub.user.external_id}`);
              
              // Update lawyer permissions if subscription is active
              if (dLocalSub.status === 'active') {
                await supabase
                  .from('lawyer_profiles')
                  .update({
                    can_create_agents: true,
                    can_create_blogs: true,
                    can_use_ai_tools: true
                  })
                  .eq('id', lawyer.id);
                  
                console.log(`✅ Updated permissions for lawyer: ${lawyer.id}`);
              }
            } else {
              console.error(`❌ Error creating subscription ${dLocalSub.id}:`, insertError);
            }
          } else {
            console.log(`⚠️ No lawyer found for subscription ${dLocalSub.id} (email: ${dLocalSub.user?.email}, external_id: ${dLocalSub.user?.external_id})`);
          }
        }
      }
    }

    console.log(`🎯 Sync completed. Created: ${syncedCount}, Updated: ${updatedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription sync completed',
        stats: {
          total_processed: dLocalData.data?.length || 0,
          synced: syncedCount,
          updated: updatedCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 Error in subscription sync:', error);
    return new Response(
      JSON.stringify({ error: 'Subscription sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});