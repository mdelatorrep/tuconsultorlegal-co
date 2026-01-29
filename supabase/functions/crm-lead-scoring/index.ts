import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  origin: string;
  status: string;
  created_at: string;
  score?: number;
  interaction_count?: number;
  estimated_case_value?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lawyerId, leadId } = await req.json();

    if (!lawyerId) {
      return new Response(
        JSON.stringify({ error: 'lawyerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CRM-LEAD-SCORING] Scoring leads for lawyer: ${lawyerId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch leads to score
    let query = supabase
      .from('crm_leads')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .in('status', ['new', 'contacted', 'qualified']);

    if (leadId) {
      query = query.eq('id', leadId);
    }

    const { data: leads, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`[CRM-LEAD-SCORING] Found ${leads?.length || 0} leads to score`);

    const scoredLeads = [];

    for (const lead of leads || []) {
      const score = calculateLeadScore(lead);
      const sourceQuality = determineSourceQuality(lead.origin);
      
      // Update lead with new score
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({ 
          score,
          source_quality: sourceQuality,
          last_activity_date: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`[CRM-LEAD-SCORING] Error updating lead ${lead.id}:`, updateError);
        continue;
      }

      scoredLeads.push({
        id: lead.id,
        name: lead.name,
        previousScore: lead.score || 0,
        newScore: score,
        sourceQuality,
        temperature: getTemperature(score)
      });
    }

    console.log(`[CRM-LEAD-SCORING] Scored ${scoredLeads.length} leads successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scoredLeads,
        summary: {
          total: scoredLeads.length,
          hot: scoredLeads.filter(l => l.newScore >= 70).length,
          warm: scoredLeads.filter(l => l.newScore >= 40 && l.newScore < 70).length,
          cold: scoredLeads.filter(l => l.newScore < 40).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CRM-LEAD-SCORING] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateLeadScore(lead: Lead): number {
  let score = 20; // Base score

  // Origin scoring (0-30 points)
  switch (lead.origin?.toLowerCase()) {
    case 'referido':
    case 'referral':
      score += 30;
      break;
    case 'perfil_publico':
    case 'profile':
      score += 20;
      break;
    case 'web':
    case 'website':
      score += 15;
      break;
    case 'redes_sociales':
    case 'social':
      score += 10;
      break;
    default:
      score += 5;
  }

  // Phone provided (0-15 points)
  if (lead.phone && lead.phone.length >= 10) {
    score += 15;
  }

  // Message engagement (0-20 points)
  const messageLength = lead.message?.length || 0;
  if (messageLength > 300) {
    score += 20;
  } else if (messageLength > 150) {
    score += 15;
  } else if (messageLength > 50) {
    score += 10;
  } else if (messageLength > 0) {
    score += 5;
  }

  // Recency bonus (0-15 points)
  const hoursAgo = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) {
    score += 15;
  } else if (hoursAgo < 48) {
    score += 10;
  } else if (hoursAgo < 72) {
    score += 5;
  }

  // Interaction history bonus
  const interactions = lead.interaction_count || 0;
  score += Math.min(interactions * 5, 15);

  // Estimated value bonus
  if (lead.estimated_case_value && lead.estimated_case_value > 10000000) {
    score += 10;
  } else if (lead.estimated_case_value && lead.estimated_case_value > 5000000) {
    score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

function determineSourceQuality(origin: string): string {
  switch (origin?.toLowerCase()) {
    case 'referido':
    case 'referral':
      return 'excellent';
    case 'perfil_publico':
    case 'profile':
      return 'good';
    case 'web':
    case 'website':
      return 'average';
    default:
      return 'unknown';
  }
}

function getTemperature(score: number): string {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}
