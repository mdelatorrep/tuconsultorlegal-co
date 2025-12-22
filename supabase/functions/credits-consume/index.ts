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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { lawyerId, toolType, metadata } = await req.json();

    if (!lawyerId || !toolType) {
      return new Response(
        JSON.stringify({ error: 'lawyerId and toolType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CREDITS] Consuming credits for lawyer ${lawyerId}, tool: ${toolType}`);

    // Get tool cost
    const { data: toolCost, error: toolError } = await supabase
      .from('credit_tool_costs')
      .select('*')
      .eq('tool_type', toolType)
      .eq('is_active', true)
      .single();

    if (toolError || !toolCost) {
      console.error('[CREDITS] Tool not found:', toolError);
      return new Response(
        JSON.stringify({ error: 'Tool type not found or inactive', allowed: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditCost = toolCost.credit_cost;

    // Get current balance
    const { data: credits, error: creditsError } = await supabase
      .from('lawyer_credits')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .single();

    if (creditsError) {
      // If no credits record, create one with 0 balance
      if (creditsError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('lawyer_credits')
          .insert({ lawyer_id: lawyerId, current_balance: 0, total_earned: 0, total_spent: 0 });
        
        if (insertError) {
          console.error('[CREDITS] Error creating credits record:', insertError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient credits', 
            allowed: false,
            currentBalance: 0,
            required: creditCost,
            toolName: toolCost.tool_name
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('[CREDITS] Error fetching credits:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentBalance = credits?.current_balance || 0;

    // Check if sufficient balance
    if (currentBalance < creditCost) {
      console.log(`[CREDITS] Insufficient balance: ${currentBalance} < ${creditCost}`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits', 
          allowed: false,
          currentBalance,
          required: creditCost,
          toolName: toolCost.tool_name
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits
    const newBalance = currentBalance - creditCost;
    const newTotalSpent = (credits?.total_spent || 0) + creditCost;

    const { error: updateError } = await supabase
      .from('lawyer_credits')
      .update({ 
        current_balance: newBalance, 
        total_spent: newTotalSpent,
        updated_at: new Date().toISOString()
      })
      .eq('lawyer_id', lawyerId);

    if (updateError) {
      console.error('[CREDITS] Error updating credits:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        lawyer_id: lawyerId,
        transaction_type: 'usage',
        amount: -creditCost,
        balance_after: newBalance,
        reference_type: 'tool',
        reference_id: toolCost.id,
        description: `Uso de ${toolCost.tool_name}`,
        metadata: metadata || {}
      });

    if (transactionError) {
      console.error('[CREDITS] Error recording transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    console.log(`[CREDITS] Successfully consumed ${creditCost} credits. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        allowed: true,
        creditsUsed: creditCost,
        newBalance,
        toolName: toolCost.tool_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREDITS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
