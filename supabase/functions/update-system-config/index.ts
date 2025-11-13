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
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("User authentication failed:", userError);
      throw new Error("User not authenticated");
    }

    // Verify user is admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('active', true)
      .single();

    if (adminError || !adminProfile) {
      console.error("Admin verification failed:", adminError);
      console.error("User ID attempting access:", userData.user.id);
      console.error("User email:", userData.user.email);
      throw new Error(`Usuario no autorizado como administrador. Solo los usuarios registrados en admin_profiles pueden modificar configuraciones del sistema. Email: ${userData.user.email}`);
    }

    // Parse and log request body
    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));
    
    const { configKey, configValue, description } = requestBody;

    // Validate required fields
    if (!configKey || configValue === undefined || configValue === null || configValue === '') {
      console.error("Validation failed - configKey:", configKey, "configValue:", configValue);
      throw new Error("Missing configKey or configValue in request body");
    }

    console.log(`Admin ${adminProfile.email} updating config: ${configKey} = ${configValue}`);

    // Upsert the system configuration (insert if not exists, update if exists)
    const { data: updatedConfig, error: updateError } = await supabaseAdmin
      .from('system_config')
      .upsert({
        config_key: configKey,
        config_value: String(configValue), // Ensure it's a string
        description: description || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error upserting system config:', updateError);
      throw updateError;
    }

    // Log the configuration change
    await supabaseAdmin
      .from('security_audit_log')
      .insert({
        event_type: 'system_config_updated',
        user_identifier: adminProfile.email,
        details: {
          config_key: configKey,
          new_value: configValue,
          admin_id: adminProfile.id
        },
        created_at: new Date().toISOString()
      });

    console.log(`Successfully updated system config: ${configKey}`);

    return new Response(JSON.stringify({
      success: true,
      config: updatedConfig
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error updating system config:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});