import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key for database operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "No authorization header provided",
        requiresReauth: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.log("Session expired or invalid:", userError?.message);
      // Return 401 for auth errors, not 500
      return new Response(JSON.stringify({ 
        success: false,
        error: "Session expired",
        requiresReauth: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    console.log(`Validating subscription for user: ${user.id} (${user.email})`);

    // Check if user has active subscription via dLocal
    let hasActiveSubscription = false;
    
    try {
      // Get user's active subscription from our database
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('lawyer_subscriptions')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription && !subError) {
        console.log(`Found active subscription for user ${user.id}:`, subscription);
        
        // Validate subscription with dLocal if we have the subscription ID
        if (subscription.dlocal_subscription_id) {
          try {
            const dLocalResponse = await supabaseClient.functions.invoke('dlocal-admin-get-subscriptions', {
              body: { subscriptionId: subscription.dlocal_subscription_id }
            });
            
            if (dLocalResponse.data && dLocalResponse.data.status === 'ACTIVE') {
              hasActiveSubscription = true;
              console.log(`dLocal confirms active subscription for user ${user.id}`);
            } else {
              console.log(`dLocal subscription not active for user ${user.id}:`, dLocalResponse.data);
              // Update local subscription status if dLocal says it's not active
              await supabaseAdmin
                .from('lawyer_subscriptions')
                .update({ status: 'cancelled' })
                .eq('id', subscription.id);
            }
          } catch (dLocalError) {
            console.warn(`Could not validate subscription with dLocal for user ${user.id}:`, dLocalError);
            // Assume active if we can't validate with dLocal to avoid false negatives
            hasActiveSubscription = true;
          }
        } else {
          // If no dLocal ID, treat as active (for testing or manual subscriptions)
          hasActiveSubscription = true;
        }
      } else {
        console.log(`No active subscription found for user ${user.id}`);
      }
    } catch (error) {
      console.error(`Error checking subscription for user ${user.id}:`, error);
    }

    // Get current lawyer profile to check if AI tools are manually enabled
    const { data: currentProfile, error: profileFetchError } = await supabaseAdmin
      .from('lawyer_profiles')
      .select('can_use_ai_tools')
      .eq('id', user.id)
      .single();

    let manualAiToolsEnabled = false;
    if (currentProfile && !profileFetchError) {
      manualAiToolsEnabled = currentProfile.can_use_ai_tools === true;
      console.log(`Manual AI tools enabled for user ${user.id}: ${manualAiToolsEnabled}`);
    }

    // AI tools are enabled if:
    // 1. User has active subscription, OR
    // 2. Admin has manually enabled AI tools for this lawyer
    const canUseAiTools = hasActiveSubscription || manualAiToolsEnabled;
    
    console.log(`Updating AI tools permission for user ${user.id}: ${canUseAiTools} (subscription: ${hasActiveSubscription}, manual: ${manualAiToolsEnabled})`);
    
    // Only update can_use_ai_tools if it's based on subscription status
    // Don't overwrite manual admin settings
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update can_use_ai_tools if it should be enabled by subscription and isn't already manually enabled
    if (hasActiveSubscription && !manualAiToolsEnabled) {
      updateData.can_use_ai_tools = true;
    } else if (!hasActiveSubscription && !manualAiToolsEnabled) {
      updateData.can_use_ai_tools = false;
    }
    // If manualAiToolsEnabled is true, don't change the can_use_ai_tools field

    const { error: updateError } = await supabaseAdmin
      .from('lawyer_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error(`Error updating lawyer profile for user ${user.id}:`, updateError);
      throw updateError;
    }

    // Get updated profile to return
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('lawyer_profiles')
      .select('id, email, full_name, can_create_agents, can_create_blogs, can_use_ai_tools')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Error fetching updated profile");
    }

    console.log(`Successfully validated permissions for user ${user.id}:`, {
      canUseAiTools: profile.can_use_ai_tools,
      hasActiveSubscription,
      manualAiToolsEnabled
    });

    return new Response(JSON.stringify({
      success: true,
      hasActiveSubscription,
      manualAiToolsEnabled,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        canCreateAgents: profile.can_create_agents,
        canCreateBlogs: profile.can_create_blogs,
        canUseAiTools: profile.can_use_ai_tools
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error validating subscription:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});