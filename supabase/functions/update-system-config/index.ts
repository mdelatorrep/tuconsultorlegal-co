import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to recalculate tool costs when system config changes
async function recalculateAffectedToolCosts(
  supabaseAdmin: any,
  configKey: string,
  configValue: string
) {
  console.log(`🔄 Checking if config change affects tool costs: ${configKey}`);
  
  // Check if this is a model or reasoning config
  const isModelConfig = configKey.includes('_model') || configKey.includes('_ai_model');
  const isReasoningConfig = configKey.includes('reasoning_effort') || configKey.includes('reasoning');
  
  if (!isModelConfig && !isReasoningConfig) {
    console.log('ℹ️ Config change does not affect tool costs');
    return { updated: 0, tools: [] };
  }

  // Get all tool costs that reference this config key
  const { data: affectedTools, error: toolsError } = await supabaseAdmin
    .from('credit_tool_costs')
    .select('*')
    .eq('auto_calculate', true)
    .or(`model_key.eq.${configKey},reasoning_key.eq.${configKey}`);

  if (toolsError || !affectedTools || affectedTools.length === 0) {
    console.log('ℹ️ No tools affected by this config change');
    return { updated: 0, tools: [] };
  }

  console.log(`📦 Found ${affectedTools.length} tools affected by config change`);

  // Get all system configs for cost calculation
  const { data: allConfigs } = await supabaseAdmin
    .from('system_config')
    .select('config_key, config_value');

  const configMap: Record<string, string> = {};
  if (allConfigs) {
    allConfigs.forEach((c: any) => { configMap[c.config_key] = c.config_value; });
  }
  // Apply the new value that's being updated
  configMap[configKey] = configValue;

  // Get cost calculation configs
  const { data: costConfigs } = await supabaseAdmin
    .from('cost_calculation_config')
    .select('*')
    .eq('is_active', true);

  const costMultipliers: Record<string, Record<string, number>> = {
    model: {},
    reasoning: {},
    technology: {},
    margin: {}
  };

  if (costConfigs) {
    costConfigs.forEach((c: any) => {
      if (!costMultipliers[c.config_type]) {
        costMultipliers[c.config_type] = {};
      }
      costMultipliers[c.config_type][c.config_key] = c.cost_multiplier;
    });
  }

  const updatedTools: string[] = [];

  for (const tool of affectedTools) {
    // Get model multiplier
    const modelKey = tool.model_key;
    const modelValue = modelKey ? configMap[modelKey] : null;
    const modelMultiplier = modelValue ? (costMultipliers.model[modelValue] || 1) : 1;

    // Get reasoning multiplier
    const reasoningKey = tool.reasoning_key;
    const reasoningValue = reasoningKey ? configMap[reasoningKey] : null;
    const reasoningMultiplier = reasoningValue ? (costMultipliers.reasoning[reasoningValue] || 1) : 1;

    // Get technology multiplier
    const technologyMultiplier = costMultipliers.technology[tool.technology_type] || 1;

    // Get margin multipliers
    const platformMargin = costMultipliers.margin['platform_margin'] || 3.5;
    const infraOverhead = costMultipliers.margin['infrastructure_overhead'] || 1.2;

    // Calculate new cost
    const baseCost = tool.base_cost || 1;
    const promptFactor = tool.prompt_size_factor || 1;
    
    const calculatedCost = Math.max(1, Math.round(
      baseCost * 
      modelMultiplier * 
      reasoningMultiplier * 
      technologyMultiplier * 
      promptFactor * 
      platformMargin * 
      infraOverhead
    ));

    // Update if changed
    if (calculatedCost !== tool.credit_cost) {
      console.log(`💰 Updating ${tool.tool_name}: ${tool.credit_cost} → ${calculatedCost} créditos`);
      
      await supabaseAdmin
        .from('credit_tool_costs')
        .update({ 
          credit_cost: calculatedCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', tool.id);

      updatedTools.push(`${tool.tool_name}: ${tool.credit_cost} → ${calculatedCost}`);
    }
  }

  return { updated: updatedTools.length, tools: updatedTools };
}

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

    // 🔄 AUTO-SYNC: Recalculate affected tool costs
    const costSyncResult = await recalculateAffectedToolCosts(
      supabaseAdmin, 
      configKey, 
      String(configValue)
    );

    if (costSyncResult.updated > 0) {
      console.log(`✅ Auto-synced ${costSyncResult.updated} tool costs:`, costSyncResult.tools);
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
          admin_id: adminProfile.id,
          cost_sync: costSyncResult
        },
        created_at: new Date().toISOString()
      });

    console.log(`Successfully updated system config: ${configKey}`);

    return new Response(JSON.stringify({
      success: true,
      config: updatedConfig,
      costSync: costSyncResult
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