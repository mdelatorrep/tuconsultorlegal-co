import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { document_content, document_type, user_email, user_name, sla_hours } = await req.json();

    // Validate required fields
    if (!document_content || !document_type || !user_email || !user_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: document_content, document_type, user_email, user_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Try to get price from legal_agents table based on document_type
    const { data: agentData } = await supabase
      .from('legal_agents')
      .select('final_price, suggested_price')
      .eq('name', document_type)
      .eq('status', 'active')
      .single();

    // Use final_price if available, otherwise suggested_price, otherwise default to 50000
    const price = agentData?.final_price || agentData?.suggested_price || 50000;

    // Calculate SLA deadline
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (sla_hours || 4) * 60 * 60 * 1000);

    // Create document token record
    const { data, error } = await supabase
      .from('document_tokens')
      .insert({
        token,
        document_type,
        document_content,
        user_email,
        user_name,
        price,
        sla_hours: sla_hours || 4,
        sla_deadline: slaDeadline.toISOString(),
        status: 'solicitado',
        sla_status: 'on_time'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create document token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document token created successfully:', data);

    return new Response(
      JSON.stringify({ 
        token,
        message: 'Document token created successfully',
        document_id: data.id,
        price,
        sla_deadline: slaDeadline.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-document-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});