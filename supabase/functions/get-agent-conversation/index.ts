import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { legal_agent_id } = req.method === 'GET'
      ? Object.fromEntries(new URL(req.url).searchParams)
      : await req.json()

    if (!legal_agent_id) {
      return new Response(JSON.stringify({ error: 'legal_agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [blocksRes, fieldsRes] = await Promise.all([
      supabase
        .from('conversation_blocks')
        .select('id, block_name, intro_phrase, block_order, placeholders, legal_agent_id')
        .eq('legal_agent_id', legal_agent_id)
        .order('block_order'),
      supabase
        .from('field_instructions')
        .select('id, field_name, validation_rule, help_text, legal_agent_id')
        .eq('legal_agent_id', legal_agent_id),
    ])

    if (blocksRes.error) {
      console.error('Error fetching conversation_blocks:', blocksRes.error)
      return new Response(JSON.stringify({ error: blocksRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (fieldsRes.error) {
      console.error('Error fetching field_instructions:', fieldsRes.error)
      return new Response(JSON.stringify({ error: fieldsRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_blocks: blocksRes.data || [],
        field_instructions: fieldsRes.data || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('get-agent-conversation error', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
