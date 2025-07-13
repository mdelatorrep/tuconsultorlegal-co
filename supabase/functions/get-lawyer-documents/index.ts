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
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Get lawyer documents function called')

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    console.log('Auth header received:', !!authHeader)
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract lawyer token
    let lawyerToken = authHeader
    if (authHeader.startsWith('Bearer ')) {
      lawyerToken = authHeader.substring(7)
    }

    // Verify lawyer token and get lawyer data
    const { data: lawyer, error: lawyerError } = await supabase
      .from('lawyer_tokens')
      .select('id, full_name, email, active')
      .eq('access_token', lawyerToken)
      .eq('active', true)
      .single()

    if (lawyerError || !lawyer) {
      console.error('Invalid lawyer token:', lawyerError)
      return new Response(JSON.stringify({ error: 'Token de abogado inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Lawyer verified:', lawyer.full_name)

    // Get agents created by this lawyer
    const { data: agentNames, error: agentsError } = await supabase
      .from('legal_agents')
      .select('name')
      .eq('created_by', lawyer.id)

    if (agentsError) {
      console.error('Error fetching agent names:', agentsError)
      return new Response(JSON.stringify({ error: 'Error al obtener agentes del abogado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Agent names found:', agentNames?.map(a => a.name))

    // If lawyer has no agents, return empty array
    if (!agentNames || agentNames.length === 0) {
      console.log('Lawyer has no agents, returning empty documents')
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract agent names for filtering
    const agentNamesList = agentNames.map(agent => agent.name)

    // Get document tokens that match agent names (flexible matching)
    const { data: documents, error: documentsError } = await supabase
      .from('document_tokens')
      .select('*')
      .in('status', ['solicitado', 'en_revision_abogado'])
      .order('created_at', { ascending: true })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return new Response(JSON.stringify({ error: 'Error al obtener documentos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Filter documents by matching document_type with agent names (flexible matching)
    const filteredDocuments = documents?.filter(doc => {
      const docType = doc.document_type.toLowerCase().trim()
      return agentNamesList.some(agentName => {
        const normalizedAgentName = agentName.toLowerCase().trim()
        // Check for partial matches or similar names
        return docType.includes(normalizedAgentName) || 
               normalizedAgentName.includes(docType) ||
               // Handle specific case mappings
               (docType.includes('arrendamiento') && normalizedAgentName.includes('arrendamiento'))
      })
    }) || []

    console.log(`Filtered ${filteredDocuments.length} documents from ${documents?.length || 0} total`)

    return new Response(JSON.stringify(filteredDocuments), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in get-lawyer-documents:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})