import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bold-signature',
}

// Interface for Bold webhook payload
interface BoldWebhookPayload {
  id: string
  type: 'SALE_APPROVED' | 'SALE_REJECTED' | 'VOID_APPROVED' | 'VOID_REJECTED'
  subject: string
  source: string
  spec_version: string
  time: number
  data: {
    payment_id: string
    merchant_id: string
    created_at: string
    amount: {
      total: number
      taxes: Array<{
        base: number
        type: string
        value: number
      }>
      tip: number
    }
    card?: {
      capture_mode: string
      franchise: string
      cardholder_name: string
      terminal_id: string
      masked_pan?: string
    }
    user_id: string
    payment_method: string
    metadata: {
      reference: string
    }
  }
  datacontenttype: string
}

async function verifyBoldSignature(body: string, signature: string, secretKey: string): Promise<boolean> {
  try {
    // Convert body to Base64
    const encoder = new TextEncoder()
    const data = encoder.encode(body)
    const base64Body = btoa(String.fromCharCode(...data))
    
    // Create HMAC-SHA256 hash
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const hmacBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(base64Body))
    const hashArray = Array.from(new Uint8Array(hmacBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Compare with provided signature
    return hashHex === signature
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
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

    // Get request body and signature
    const body = await req.text()
    const signature = req.headers.get('x-bold-signature') || ''
    
    console.log('Received webhook:', { body, signature })

    // Verify signature using environment variable
    const secretKey = Deno.env.get('BOLD_SECRET_KEY')
    
    if (!secretKey) {
      console.error('Bold secret key not configured')
      return new Response('Payment system not configured', { 
        status: 500, 
        headers: corsHeaders 
      })
    }
    const isValidSignature = await verifyBoldSignature(body, signature, secretKey)
    
    if (!isValidSignature) {
      console.error('Invalid signature')
      return new Response('Invalid signature', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Parse webhook payload
    const payload: BoldWebhookPayload = JSON.parse(body)
    
    console.log('Webhook payload:', payload)

    // Extract order reference from metadata
    const orderReference = payload.data.metadata.reference
    
    if (!orderReference) {
      console.error('No order reference found in webhook payload')
      return new Response('No order reference', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Find document token by order reference
    // Order reference format is: DOC-{document_id}-{timestamp}
    const documentId = orderReference.split('-')[1]
    
    if (!documentId) {
      console.error('Could not extract document ID from order reference:', orderReference)
      return new Response('Invalid order reference format', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Update document status based on payment result
    let newStatus: string
    switch (payload.type) {
      case 'SALE_APPROVED':
        newStatus = 'pagado'
        break
      case 'SALE_REJECTED':
        newStatus = 'revision_usuario' // Reset to user review state if payment failed
        break
      case 'VOID_APPROVED':
        newStatus = 'revision_usuario' // Reset if payment was voided
        break
      case 'VOID_REJECTED':
        // Void rejection doesn't change the paid status
        newStatus = 'pagado'
        break
      default:
        console.error('Unknown webhook type:', payload.type)
        return new Response('Unknown webhook type', { 
          status: 400, 
          headers: corsHeaders 
        })
    }

    // Update document status in database
    const { error: updateError } = await supabase
      .from('document_tokens')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Error updating document status:', updateError)
      return new Response('Database update failed', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    console.log(`Document ${documentId} status updated to: ${newStatus}`)

    // Log webhook event for debugging
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'bold_payment',
        event_type: payload.type,
        payment_id: payload.data.payment_id,
        order_reference: orderReference,
        document_id: documentId,
        amount: payload.data.amount.total,
        status: newStatus,
        raw_payload: payload
      })

    if (logError) {
      console.error('Error logging webhook event:', logError)
      // Don't fail the webhook processing if logging fails
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})