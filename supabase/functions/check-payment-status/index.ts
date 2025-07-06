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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId } = await req.json()
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Checking payment status for order:', orderId)

    // Call Bold's fallback service to get payment notification
    const boldApiKey = 'OUmoGBT-j4MEwEkhbt_hqJA22_0NdK8RVAkuCdkdMiQ'
    
    try {
      const response = await fetch(
        `https://integrations.api.bold.co/payments/webhook/notifications/${orderId}?is_external_reference=true`,
        {
          method: 'GET',
          headers: {
            'Authorization': `x-api-key ${boldApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('Bold API response:', data)
        
        if (data.notifications && data.notifications.length > 0) {
          const notification = data.notifications[0]
          
          // Extract document ID from order reference
          const documentId = orderId.split('-')[1]
          
          if (documentId && notification.type === 'SALE_APPROVED') {
            // Update document status to paid
            const { error: updateError } = await supabase
              .from('document_tokens')
              .update({ 
                status: 'pagado',
                updated_at: new Date().toISOString()
              })
              .eq('id', documentId)

            if (updateError) {
              console.error('Error updating document status:', updateError)
            } else {
              console.log(`Document ${documentId} status updated to paid`)
            }
          }
          
          return new Response(JSON.stringify({ 
            success: true,
            paymentStatus: notification.type,
            paymentApproved: notification.type === 'SALE_APPROVED'
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    } catch (apiError) {
      console.error('Error calling Bold API:', apiError)
    }

    return new Response(JSON.stringify({ 
      success: true,
      paymentStatus: 'PENDING',
      paymentApproved: false
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Payment status check error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})