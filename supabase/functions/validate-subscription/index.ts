import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
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
            const dLocalResponse = await supabase.functions.invoke('dlocal-admin-get-subscriptions', {
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

    // Update user's AI tools permission based on subscription status
    const canUseAiTools = hasActiveSubscription;
    
    console.log(`Updating AI tools permission for user ${user.id}: ${canUseAiTools}`);
    
    const { error: updateError } = await supabaseAdmin
      .from('lawyer_profiles')
      .update({
        can_use_ai_tools: canUseAiTools,
        updated_at: new Date().toISOString()
      })
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

    console.log(`Successfully updated permissions for user ${user.id}:`, {
      canUseAiTools: profile.can_use_ai_tools,
      hasActiveSubscription
    });

    return new Response(JSON.stringify({
      success: true,
      hasActiveSubscription,
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