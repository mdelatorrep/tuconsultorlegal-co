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
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { documentId } = await req.json()

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Manual payment confirmation for document:', documentId)

    // Get current document status
    const { data: document, error: fetchError } = await supabase
      .from('document_tokens')
      .select('id, status, token, user_email')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      console.error('Document not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only allow updating if document is in revision_usuario status
    if (document.status !== 'revision_usuario') {
      return new Response(
        JSON.stringify({ 
          error: 'Document is not in the correct status for manual confirmation',
          currentStatus: document.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      return new Response(
        JSON.stringify({ error: 'Failed to update document status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Document ${document.token} manually confirmed as paid`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Document status updated to paid',
        documentToken: document.token
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manual payment confirmation:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
