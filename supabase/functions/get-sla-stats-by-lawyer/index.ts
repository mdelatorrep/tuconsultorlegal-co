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

    console.log('Get SLA stats by lawyer function called')

    // Get all lawyers
    const { data: lawyers, error: lawyersError } = await supabase
      .from('lawyer_tokens')
      .select(`
        id,
        full_name,
        email,
        active
      `)
      .eq('active', true)

    if (lawyersError) {
      console.error('Error fetching lawyers:', lawyersError)
      return new Response(JSON.stringify({ error: 'Error al obtener abogados' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${lawyers?.length || 0} active lawyers`)

    // Get all documents with SLA information
    const { data: allDocuments, error: documentsError } = await supabase
      .from('document_tokens')
      .select(`
        id,
        created_at,
        updated_at,
        status,
        sla_hours,
        sla_deadline,
        sla_status,
        document_type
      `)
      .not('sla_hours', 'is', null)

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return new Response(JSON.stringify({ error: 'Error al obtener documentos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${allDocuments?.length || 0} documents with SLA`)

    // Calculate stats for each lawyer
    const lawyerStats = []
    let globalStats = calculateSLAStats(allDocuments || [])

    for (const lawyer of lawyers || []) {
      // Get agents created by this lawyer
      const { data: agentNames } = await supabase
        .from('legal_agents')
        .select('name')
        .eq('created_by', lawyer.id)

      if (!agentNames || agentNames.length === 0) {
        // Lawyer has no agents, add empty stats
        lawyerStats.push({
          lawyer_id: lawyer.id,
          lawyer_name: lawyer.full_name,
          lawyer_email: lawyer.email,
          total_documents: 0,
          on_time_completion: 0,
          late_completion: 0,
          overdue_documents: 0,
          at_risk_documents: 0,
          on_time_documents: 0,
          completion_rate: 0,
          average_completion_time: 0,
          agents_count: 0
        })
        continue
      }

      // Filter documents by agent names
      const agentNamesList = agentNames.map(agent => agent.name.toLowerCase().trim())
      
      const lawyerDocuments = allDocuments?.filter(doc => {
        const docType = doc.document_type.toLowerCase().trim()
        return agentNamesList.some(agentName => {
          return docType.includes(agentName) || 
                 agentName.includes(docType) ||
                 (docType.includes('arrendamiento') && agentName.includes('arrendamiento'))
        })
      }) || []

      console.log(`Found ${lawyerDocuments.length} documents for lawyer ${lawyer.full_name}`)
      
      // Calculate stats for this lawyer's documents
      const lawyerSlaStats = calculateSLAStats(lawyerDocuments)
      
      lawyerStats.push({
        lawyer_id: lawyer.id,
        lawyer_name: lawyer.full_name,
        lawyer_email: lawyer.email,
        agents_count: agentNames.length,
        ...lawyerSlaStats
      })
    }

    return new Response(JSON.stringify({
      global_stats: globalStats,
      lawyer_stats: lawyerStats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in get-sla-stats-by-lawyer:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateSLAStats(documents: any[]) {
  const now = new Date()
  
  // Update SLA status for real-time calculation
  const documentsWithUpdatedStatus = documents.map(doc => {
    const deadline = new Date(doc.sla_deadline || doc.created_at)
    if (!doc.sla_deadline && doc.sla_hours) {
      deadline.setHours(deadline.getHours() + doc.sla_hours)
    }
    
    let slaStatus = doc.sla_status
    
    if (doc.status === 'pagado' || doc.status === 'descargado') {
      // Completed documents
      const completedAt = new Date(doc.updated_at)
      slaStatus = completedAt <= deadline ? 'completed_on_time' : 'completed_late'
    } else {
      // In-progress documents
      if (now > deadline) {
        slaStatus = 'overdue'
      } else if (now > new Date(deadline.getTime() - 2 * 60 * 60 * 1000)) { // 2 hours before
        slaStatus = 'at_risk'
      } else {
        slaStatus = 'on_time'
      }
    }
    
    return { ...doc, sla_status: slaStatus, sla_deadline: deadline }
  })
  
  const totalDocuments = documentsWithUpdatedStatus.length
  
  // Count by status
  const onTimeCompleted = documentsWithUpdatedStatus.filter(d => d.sla_status === 'completed_on_time').length
  const lateCompleted = documentsWithUpdatedStatus.filter(d => d.sla_status === 'completed_late').length
  const overdue = documentsWithUpdatedStatus.filter(d => d.sla_status === 'overdue').length
  const atRisk = documentsWithUpdatedStatus.filter(d => d.sla_status === 'at_risk').length
  const onTime = documentsWithUpdatedStatus.filter(d => d.sla_status === 'on_time').length
  
  const completedDocuments = onTimeCompleted + lateCompleted
  const completionRate = completedDocuments > 0 ? (onTimeCompleted / completedDocuments) * 100 : 0
  
  // Calculate average completion time for completed documents
  const completedDocs = documentsWithUpdatedStatus.filter(d => 
    d.status === 'pagado' || d.status === 'descargado'
  )
  
  let averageCompletionTime = 0
  if (completedDocs.length > 0) {
    const totalCompletionTime = completedDocs.reduce((sum, doc) => {
      const created = new Date(doc.created_at)
      const completed = new Date(doc.updated_at)
      const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
      return sum + hours
    }, 0)
    averageCompletionTime = totalCompletionTime / completedDocs.length
  }
  
  return {
    total_documents: totalDocuments,
    on_time_completion: onTimeCompleted,
    late_completion: lateCompleted,
    overdue_documents: overdue,
    at_risk_documents: atRisk,
    on_time_documents: onTime,
    completion_rate: Math.round(completionRate * 10) / 10,
    average_completion_time: Math.round(averageCompletionTime * 10) / 10,
    status_distribution: {
      on_time: onTime,
      at_risk: atRisk,
      overdue: overdue,
      completed_on_time: onTimeCompleted,
      completed_late: lateCompleted
    }
  }
}