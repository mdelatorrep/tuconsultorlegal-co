import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const { orderId, amount, documentType, token } = await req.json()
    
    console.log('Received payment config request:', { orderId, amount, documentType, token });
    
    if (!orderId || !amount || !documentType || !token) {
      console.error('Missing required parameters:', { orderId: !!orderId, amount: !!amount, documentType: !!documentType, token: !!token });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get secure credentials from environment
    const boldApiKey = Deno.env.get('BOLD_API_KEY')
    const boldSecretKey = Deno.env.get('BOLD_SECRET_KEY')
    const boldMerchantId = Deno.env.get('BOLD_MERCHANT_ID')

    console.log('Bold credentials check:', {
      hasApiKey: !!boldApiKey,
      hasSecretKey: !!boldSecretKey,
      hasMerchantId: !!boldMerchantId
    });

    if (!boldApiKey || !boldSecretKey || !boldMerchantId) {
      console.error('Missing Bold credentials in environment variables')
      console.error('Required env vars: BOLD_API_KEY, BOLD_SECRET_KEY, BOLD_MERCHANT_ID')
      return new Response(JSON.stringify({ error: 'Payment system not configured - missing credentials' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate proper integrity signature (SHA256 hash)
    // Format: {orderId}{amount}{currency}{secretKey}
    const signatureString = `${orderId}${amount}COP${boldSecretKey}`;
    const integritySignature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signatureString))
      .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Create secure payment configuration
    const paymentConfig = {
      orderId: orderId,
      currency: 'COP',
      amount: amount.toString(),
      apiKey: boldApiKey,
      integritySignature: integritySignature,
      merchantId: boldMerchantId,
      description: `Pago documento: ${documentType}`,
      redirectionUrl: `${req.headers.get('origin') || 'https://tkaezookvtpulfpaffes.supabase.co'}/?code=${token}&payment=success`,
      renderMode: 'embedded',
    };

    console.log('Payment configuration created for order:', orderId);

    return new Response(JSON.stringify(paymentConfig), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error creating payment configuration:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})