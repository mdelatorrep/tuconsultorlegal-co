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

    console.log('Get SLA stats function called')

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    let lawyerId = null
    let isGlobalView = false

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      
      // Try to identify if it's an admin or lawyer token
      const { data: adminCheck } = await supabase
        .from('admin_accounts')
        .select('id, is_super_admin')
        .eq('id', token)
        .single()

      if (adminCheck) {
        isGlobalView = true
        console.log('Admin user requesting global SLA stats')
      } else {
        // Check if it's a lawyer token
        const { data: lawyerCheck } = await supabase
          .from('lawyer_profiles')
          .select('id')
          .eq('access_token', token)
          .eq('active', true)
          .eq('is_active', true)
          .single()
        
        if (lawyerCheck) {
          lawyerId = lawyerCheck.id
          console.log('Lawyer user requesting SLA stats for their agents')
        }
      }
    }

    // Base query for documents with SLA information
    let documentsQuery = supabase
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

    // If not global view, filter by lawyer's agents
    if (!isGlobalView && lawyerId) {
      // Get agents created by this lawyer
      const { data: agentNames } = await supabase
        .from('legal_agents')
        .select('name')
        .eq('created_by', lawyerId)

      if (!agentNames || agentNames.length === 0) {
        // Return empty stats if lawyer has no agents
        return new Response(JSON.stringify({
          total_documents: 0,
          on_time_completion: 0,
          overdue_documents: 0,
          at_risk_documents: 0,
          completion_rate: 0,
          average_completion_time: 0,
          monthly_trends: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Filter documents by agent names (same logic as get-lawyer-documents)
      const agentNamesList = agentNames.map(agent => agent.name.toLowerCase().trim())
      
      const { data: allDocuments } = await documentsQuery
      
      // Filter by matching document types
      const filteredDocuments = allDocuments?.filter(doc => {
        const docType = doc.document_type.toLowerCase().trim()
        return agentNamesList.some(agentName => {
          return docType.includes(agentName) || 
                 agentName.includes(docType) ||
                 (docType.includes('arrendamiento') && agentName.includes('arrendamiento'))
        })
      }) || []
      
      console.log(`Found ${filteredDocuments.length} documents for lawyer's agents`)
      
      // Calculate stats for filtered documents
      const stats = calculateSLAStats(filteredDocuments)
      
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Global view - get all documents with SLA
    const { data: documents, error: documentsError } = await documentsQuery

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return new Response(JSON.stringify({ error: 'Error al obtener documentos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${documents?.length || 0} total documents with SLA`)

    // Calculate SLA statistics
    const stats = calculateSLAStats(documents || [])

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in get-sla-stats:', error)
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
  
  // Calculate monthly trends for the last 6 months
  const monthlyTrends = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date()
    monthDate.setMonth(monthDate.getMonth() - i)
    monthDate.setDate(1)
    monthDate.setHours(0, 0, 0, 0)
    
    const nextMonth = new Date(monthDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    const monthDocs = documentsWithUpdatedStatus.filter(doc => {
      const docDate = new Date(doc.created_at)
      return docDate >= monthDate && docDate < nextMonth
    })
    
    const monthOnTime = monthDocs.filter(d => d.sla_status === 'completed_on_time').length
    const monthCompleted = monthDocs.filter(d => 
      d.sla_status === 'completed_on_time' || d.sla_status === 'completed_late'
    ).length
    
    const monthRate = monthCompleted > 0 ? (monthOnTime / monthCompleted) * 100 : 0
    
    monthlyTrends.push({
      month: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
      completion_rate: Math.round(monthRate * 10) / 10,
      total_documents: monthDocs.length,
      on_time: monthOnTime,
      late: monthCompleted - monthOnTime
    })
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
    monthly_trends: monthlyTrends,
    status_distribution: {
      on_time: onTime,
      at_risk: atRisk,
      overdue: overdue,
      completed_on_time: onTimeCompleted,
      completed_late: lateCompleted
    }
  }
}