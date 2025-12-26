import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogRequest {
  log_type: 'edge_functions' | 'postgres' | 'auth' | 'security';
  function_name?: string;
  limit?: number;
  level_filter?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { log_type, function_name, limit = 50, level_filter }: LogRequest = await req.json();

    let logs: any[] = [];
    let query = '';

    switch (log_type) {
      case 'edge_functions':
        // Query edge function logs from analytics
        query = `
          SELECT 
            id,
            timestamp,
            event_message,
            metadata->0->>'level' as level,
            metadata->0->>'function_id' as function_id
          FROM edge_logs
          WHERE event_type = 'Log'
          ${level_filter ? `AND metadata->0->>'level' = '${level_filter}'` : ''}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
        break;

      case 'postgres':
        query = `
          SELECT 
            id,
            timestamp,
            event_message,
            metadata->0->'parsed'->>'error_severity' as level
          FROM postgres_logs
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
        break;

      case 'auth':
        query = `
          SELECT 
            id,
            timestamp,
            event_message,
            metadata->0->>'level' as level,
            metadata->0->>'status' as status,
            metadata->0->>'path' as path
          FROM auth_logs
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
        break;

      case 'security':
        // Query from our security_audit_log table
        const { data: securityLogs, error: secError } = await supabaseAdmin
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (secError) throw secError;
        
        logs = (securityLogs || []).map(log => ({
          id: log.id,
          timestamp: log.created_at,
          event_message: `${log.event_type}: ${log.user_identifier || 'anonymous'}`,
          level: 'info',
          details: log.details,
          ip_address: log.ip_address
        }));
        
        return new Response(JSON.stringify({ logs, source: 'database' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        throw new Error(`Unknown log type: ${log_type}`);
    }

    // For analytics queries, we need to use the Management API
    // Since we can't directly query analytics from edge functions,
    // we'll return instructions to use the dashboard or fetch from our stored logs
    
    // Alternative: Query our existing tables for relevant data
    if (log_type === 'edge_functions') {
      // Get recent edge function activity from our tables
      const { data: recentJobs } = await supabaseAdmin
        .from('openai_agent_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent AI tool results as proxy for edge function activity
      const { data: recentAIResults } = await supabaseAdmin
        .from('legal_tools_results')
        .select('id, lawyer_id, tool_type, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      logs = [
        ...(recentJobs || []).map(job => ({
          id: job.id,
          timestamp: job.created_at,
          event_message: `OpenAI Agent Job: ${job.status}`,
          level: job.status === 'failed' ? 'error' : 'info',
          details: { error: job.error_message }
        })),
        ...(recentAIResults || []).map(r => ({
          id: r.id,
          timestamp: r.created_at,
          event_message: `AI Tool (${r.tool_type}): ${(r.metadata as any)?.status || 'completed'}`,
          level: (r.metadata as any)?.status === 'failed' ? 'error' : 'info',
          details: { tool_type: r.tool_type }
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, limit);
    }

    if (log_type === 'postgres' || log_type === 'auth') {
      // For postgres/auth, we can show email notification logs as a proxy
      const { data: emailLogs } = await supabaseAdmin
        .from('email_notifications_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      logs = (emailLogs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        event_message: `Email: ${log.template_key} to ${log.recipient_email}`,
        level: log.status === 'failed' ? 'error' : 'info',
        details: { error: log.error_message, status: log.status }
      }));
    }

    return new Response(JSON.stringify({ logs, source: 'database' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
