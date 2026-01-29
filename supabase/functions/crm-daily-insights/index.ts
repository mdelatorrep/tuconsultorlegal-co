import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyerId } = await req.json();

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ error: 'lawyerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CRM-DAILY-INSIGHTS] Calculating metrics for lawyer: ${lawyerId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all data in parallel
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [casesResult, leadsResult, clientsResult, tasksResult] = await Promise.all([
      supabase.from('crm_cases').select('*').eq('lawyer_id', lawyerId),
      supabase.from('crm_leads').select('*').eq('lawyer_id', lawyerId),
      supabase.from('crm_clients').select('*').eq('lawyer_id', lawyerId),
      supabase.from('crm_tasks').select('*').eq('lawyer_id', lawyerId).eq('status', 'pending')
    ]);

    const cases = casesResult.data || [];
    const leads = leadsResult.data || [];
    const clients = clientsResult.data || [];
    const tasks = tasksResult.data || [];

    // Calculate metrics
    const activeCases = cases.filter(c => c.status === 'active');
    const pipelineValue = activeCases.reduce((sum, c) => sum + (Number(c.expected_value) || 0), 0);
    
    // Leads metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const leadsNew = leads.filter(l => l.status === 'new' && new Date(l.created_at) >= sevenDaysAgo).length;
    const leadsConverted = leads.filter(l => l.status === 'converted' && new Date(l.updated_at) >= startOfMonth).length;
    
    // Client metrics
    const activeClients = clients.filter(c => c.status === 'active').length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const clientsAtRisk = clients.filter(c => {
      const lastContact = c.last_contact_date ? new Date(c.last_contact_date) : null;
      const healthScore = c.health_score || 100;
      if (!lastContact && healthScore < 50) return true;
      if (lastContact && lastContact < thirtyDaysAgo) return true;
      return healthScore < 40;
    }).length;

    // Task metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tasksOverdue = tasks.filter(t => t.due_date && new Date(t.due_date) < todayStart).length;
    const tasksPending = tasks.length;

    // Case metrics
    const casesWon = cases.filter(c => c.status === 'won').length;
    const casesLost = cases.filter(c => c.status === 'lost').length;

    // Win rate
    const closedLeads = leads.filter(l => ['converted', 'lost'].includes(l.status || ''));
    const convertedLeads = leads.filter(l => l.status === 'converted');
    const winRate = closedLeads.length > 0 
      ? Math.round((convertedLeads.length / closedLeads.length) * 100) 
      : 0;

    // Average health scores
    const avgClientHealth = clients.length > 0
      ? clients.reduce((sum, c) => sum + (c.health_score || 100), 0) / clients.length
      : 100;
    
    const avgCaseHealth = activeCases.length > 0
      ? activeCases.reduce((sum, c) => sum + (c.health_score || 100), 0) / activeCases.length
      : 100;

    const metrics = {
      pipeline_value: pipelineValue,
      leads_count: leads.length,
      leads_new: leadsNew,
      leads_converted: leadsConverted,
      clients_active: activeClients,
      clients_at_risk: clientsAtRisk,
      cases_active: activeCases.length,
      cases_won: casesWon,
      cases_lost: casesLost,
      tasks_pending: tasksPending,
      tasks_overdue: tasksOverdue,
      revenue_collected: 0, // Would need billing integration
      revenue_pending: pipelineValue * 0.3, // Estimate
      avg_client_health: Math.round(avgClientHealth * 100) / 100,
      avg_case_health: Math.round(avgCaseHealth * 100) / 100,
      win_rate: winRate
    };

    // Upsert daily metrics
    const metricDate = today.toISOString().split('T')[0];
    const { error: upsertError } = await supabase
      .from('crm_daily_metrics')
      .upsert({
        lawyer_id: lawyerId,
        metric_date: metricDate,
        ...metrics
      }, {
        onConflict: 'lawyer_id,metric_date'
      });

    if (upsertError) {
      console.error('[CRM-DAILY-INSIGHTS] Error upserting metrics:', upsertError);
    }

    // Generate alerts
    const alerts = [];
    
    if (tasksOverdue > 5) {
      alerts.push({
        type: 'danger',
        message: `Tienes ${tasksOverdue} tareas vencidas. Tu productividad está en riesgo.`
      });
    }

    if (leadsNew >= 3) {
      alerts.push({
        type: 'info',
        message: `¡${leadsNew} nuevos leads esta semana! Contacta rápido para mejor conversión.`
      });
    }

    if (clientsAtRisk >= 3) {
      alerts.push({
        type: 'warning',
        message: `${clientsAtRisk} clientes sin contacto en 30+ días. Agenda seguimiento.`
      });
    }

    console.log(`[CRM-DAILY-INSIGHTS] Metrics calculated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics,
        alerts,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CRM-DAILY-INSIGHTS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
