import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { orderId, amount, packageId, packageName, credits, lawyerId } = await req.json();

    console.log('Creating credit payment config:', { orderId, amount, packageId, packageName, credits, lawyerId });

    // Validate required fields
    if (!orderId || !amount || !packageId || !lawyerId) {
      throw new Error('Missing required fields: orderId, amount, packageId, lawyerId');
    }

    // Get Bold credentials from environment
    const boldApiKey = Deno.env.get('BOLD_API_KEY');
    const boldSecretKey = Deno.env.get('BOLD_SECRET_KEY');

    if (!boldApiKey || !boldSecretKey) {
      throw new Error('Bold credentials not configured');
    }

    // Get lawyer info for the payment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: lawyer, error: lawyerError } = await supabase
      .from('lawyer_profiles')
      .select('email, full_name')
      .eq('id', lawyerId)
      .single();

    if (lawyerError || !lawyer) {
      console.error('Error fetching lawyer:', lawyerError);
      throw new Error('Lawyer not found');
    }

    // Store the pending credit purchase for webhook processing
    const { error: insertError } = await supabase
      .from('credit_purchase_orders')
      .insert({
        order_id: orderId,
        lawyer_id: lawyerId,
        package_id: packageId,
        amount: amount,
        credits: credits,
        status: 'pending'
      });

    if (insertError) {
      console.error('Error storing credit purchase order:', insertError);
      // Continue anyway, webhook will handle if table doesn't exist
    }

    // Calculate integrity signature (same as document payments)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${orderId}${amount}COP${boldSecretKey}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const integritySignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Bold checkout configuration
    const checkoutConfig = {
      orderId: orderId,
      currency: 'COP',
      amount: amount,
      apiKey: boldApiKey,
      integritySignature: integritySignature,
      description: `Compra de ${credits} créditos - ${packageName}`,
      tax: 0,
      redirectionUrl: `${req.headers.get('origin') || 'https://tuconsultorlegal.co'}/#abogados?credits=success&order=${orderId}`,
      expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      customer: {
        email: lawyer.email,
        fullName: lawyer.full_name
      }
    };

    console.log('Credit payment config created successfully for order:', orderId);

    return new Response(
      JSON.stringify(checkoutConfig),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error creating credit payment config:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
