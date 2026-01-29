import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  last_contact_date: string | null;
  payment_status: string;
  engagement_score: number;
  health_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyerId, clientId } = await req.json();

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ error: 'lawyerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CRM-CLIENT-HEALTH] Calculating health for lawyer: ${lawyerId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch clients
    let query = supabase
      .from('crm_clients')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .eq('status', 'active');

    if (clientId) {
      query = query.eq('id', clientId);
    }

    const { data: clients, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`[CRM-CLIENT-HEALTH] Found ${clients?.length || 0} clients to evaluate`);

    // Fetch additional data for health calculation
    const clientIds = clients?.map(c => c.id) || [];
    
    const [casesResult, communicationsResult] = await Promise.all([
      supabase.from('crm_cases').select('client_id, status').in('client_id', clientIds),
      supabase.from('crm_communications').select('client_id, created_at').in('client_id', clientIds)
    ]);

    const casesByClient = new Map<string, { active: number; total: number }>();
    casesResult.data?.forEach(c => {
      const current = casesByClient.get(c.client_id) || { active: 0, total: 0 };
      current.total++;
      if (c.status === 'active') current.active++;
      casesByClient.set(c.client_id, current);
    });

    const commsByClient = new Map<string, Date>();
    communicationsResult.data?.forEach(c => {
      const current = commsByClient.get(c.client_id);
      const commDate = new Date(c.created_at);
      if (!current || commDate > current) {
        commsByClient.set(c.client_id, commDate);
      }
    });

    const healthResults = [];

    for (const client of clients || []) {
      const cases = casesByClient.get(client.id) || { active: 0, total: 0 };
      const lastComm = commsByClient.get(client.id);
      
      const healthScore = calculateHealthScore(client, cases, lastComm);
      const riskLevel = determineRiskLevel(healthScore, client);
      
      // Update client with new health score
      const { error: updateError } = await supabase
        .from('crm_clients')
        .update({ 
          health_score: healthScore,
          risk_level: riskLevel,
          last_contact_date: lastComm?.toISOString() || client.last_contact_date
        })
        .eq('id', client.id);

      if (updateError) {
        console.error(`[CRM-CLIENT-HEALTH] Error updating client ${client.id}:`, updateError);
        continue;
      }

      healthResults.push({
        id: client.id,
        name: client.name,
        previousScore: client.health_score || 100,
        newScore: healthScore,
        riskLevel,
        factors: getHealthFactors(client, cases, lastComm)
      });
    }

    // Generate recommendations
    const recommendations = generateRecommendations(healthResults);

    console.log(`[CRM-CLIENT-HEALTH] Evaluated ${healthResults.length} clients`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        healthResults,
        recommendations,
        summary: {
          total: healthResults.length,
          healthy: healthResults.filter(c => c.riskLevel === 'low').length,
          atRisk: healthResults.filter(c => c.riskLevel === 'medium').length,
          critical: healthResults.filter(c => c.riskLevel === 'high').length,
          avgHealth: healthResults.length > 0 
            ? Math.round(healthResults.reduce((sum, c) => sum + c.newScore, 0) / healthResults.length)
            : 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CRM-CLIENT-HEALTH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateHealthScore(
  client: any, 
  cases: { active: number; total: number }, 
  lastComm: Date | undefined
): number {
  let score = 100;
  const now = new Date();

  // Communication factor (25 points max deduction)
  if (lastComm) {
    const daysSinceComm = Math.floor((now.getTime() - lastComm.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceComm > 60) score -= 25;
    else if (daysSinceComm > 30) score -= 15;
    else if (daysSinceComm > 14) score -= 5;
  } else {
    score -= 20; // No communication history
  }

  // Payment factor (30 points max deduction)
  switch (client.payment_status) {
    case 'overdue':
      score -= 30;
      break;
    case 'pending':
      score -= 15;
      break;
    case 'late':
      score -= 10;
      break;
  }

  // Engagement factor (25 points max deduction)
  const engagement = client.engagement_score || 50;
  if (engagement < 20) score -= 25;
  else if (engagement < 40) score -= 15;
  else if (engagement < 60) score -= 5;

  // Case activity factor (20 points max deduction)
  if (cases.total === 0) {
    score -= 10; // No cases ever
  } else if (cases.active === 0) {
    score -= 5; // Had cases but none active
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function determineRiskLevel(healthScore: number, client: any): string {
  // Override based on critical factors
  if (client.payment_status === 'overdue') return 'high';
  
  if (healthScore < 40) return 'high';
  if (healthScore < 70) return 'medium';
  return 'low';
}

function getHealthFactors(
  client: any, 
  cases: { active: number; total: number }, 
  lastComm: Date | undefined
): string[] {
  const factors: string[] = [];
  const now = new Date();

  if (lastComm) {
    const daysSinceComm = Math.floor((now.getTime() - lastComm.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceComm > 30) {
      factors.push(`Sin contacto en ${daysSinceComm} días`);
    }
  } else {
    factors.push('Sin historial de comunicación');
  }

  if (client.payment_status === 'overdue') {
    factors.push('Pagos vencidos');
  } else if (client.payment_status === 'pending') {
    factors.push('Pagos pendientes');
  }

  if ((client.engagement_score || 50) < 40) {
    factors.push('Bajo engagement');
  }

  if (cases.active === 0 && cases.total > 0) {
    factors.push('Sin casos activos');
  }

  return factors;
}

function generateRecommendations(healthResults: any[]): any[] {
  const recommendations: any[] = [];

  for (const client of healthResults) {
    if (client.riskLevel === 'high') {
      recommendations.push({
        clientId: client.id,
        clientName: client.name,
        priority: 'high',
        action: 'call',
        message: `Llamar urgentemente a ${client.name} - Cliente en riesgo alto`,
        factors: client.factors
      });
    } else if (client.riskLevel === 'medium') {
      recommendations.push({
        clientId: client.id,
        clientName: client.name,
        priority: 'medium',
        action: 'email',
        message: `Enviar actualización a ${client.name} - Prevenir deterioro de relación`,
        factors: client.factors
      });
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  return recommendations.slice(0, 10); // Top 10 recommendations
}
