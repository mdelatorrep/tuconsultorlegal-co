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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { orderId, amount, packageId, packageName, credits, lawyerId } = await req.json();

    console.log('Creating credit payment config:', { orderId, amount, packageId, packageName, credits, lawyerId });

    // Validate required fields
    if (!orderId || !amount || !packageId || !lawyerId) {
      console.error('Missing required parameters:', { orderId: !!orderId, amount: !!amount, packageId: !!packageId, lawyerId: !!lawyerId });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Bold credentials from environment (same as document payments)
    const boldApiKey = Deno.env.get('BOLD_API_KEY');
    const boldSecretKey = Deno.env.get('BOLD_SECRET_KEY');
    const boldMerchantId = Deno.env.get('BOLD_MERCHANT_ID');

    console.log('Bold credentials check:', {
      hasApiKey: !!boldApiKey,
      hasSecretKey: !!boldSecretKey,
      hasMerchantId: !!boldMerchantId
    });

    if (!boldApiKey || !boldSecretKey || !boldMerchantId) {
      console.error('Missing Bold credentials in environment variables');
      return new Response(JSON.stringify({ error: 'Payment system not configured - missing credentials' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate integrity signature (same format as document payments)
    // Format: {orderId}{amount}{currency}{secretKey}
    const signatureString = `${orderId}${amount}COP${boldSecretKey}`;
    const integritySignature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signatureString))
      .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Create payment configuration (matching document payment format exactly)
    const paymentConfig = {
      orderId: orderId,
      currency: 'COP',
      amount: amount.toString(), // Must be string like document payments
      apiKey: boldApiKey,
      integritySignature: integritySignature,
      merchantId: boldMerchantId,
      description: `Compra de ${credits} créditos - ${packageName || 'Paquete de créditos'}`,
      redirectionUrl: `${req.headers.get('origin') || 'https://tuconsultorlegal.co'}/#abogados?credits=success&order=${orderId}`,
      renderMode: 'embedded', // Same as document payments
    };

    console.log('Credit payment config created successfully for order:', orderId);

    return new Response(JSON.stringify(paymentConfig), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating credit payment config:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
