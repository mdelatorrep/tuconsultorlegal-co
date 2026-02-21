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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Read sync frequency from system_config
    const { data: configData } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'process_monitor_sync_frequency_hours')
      .maybeSingle();

    const syncFrequencyHours = parseInt(configData?.config_value || '12', 10);
    console.log(`[process-monitor-cron] Sync frequency: every ${syncFrequencyHours} hours`);

    // 2. Check last successful cron execution
    const { data: lastRunConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'process_monitor_last_cron_run')
      .maybeSingle();

    const lastRunISO = lastRunConfig?.config_value || null;
    const now = new Date();

    if (lastRunISO) {
      const lastRun = new Date(lastRunISO);
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun < syncFrequencyHours) {
        console.log(`[process-monitor-cron] Skipping: last run ${hoursSinceLastRun.toFixed(1)}h ago (threshold: ${syncFrequencyHours}h)`);
        return new Response(
          JSON.stringify({ 
            skipped: true, 
            reason: `Last run ${hoursSinceLastRun.toFixed(1)}h ago, threshold is ${syncFrequencyHours}h`,
            nextRunIn: `${(syncFrequencyHours - hoursSinceLastRun).toFixed(1)}h`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Get all distinct lawyer_ids with active monitored processes
    const { data: activeProcesses, error: fetchError } = await supabase
      .from('monitored_processes')
      .select('lawyer_id')
      .eq('estado', 'activo');

    if (fetchError) throw fetchError;

    const lawyerIds = [...new Set((activeProcesses || []).map(p => p.lawyer_id))];
    
    if (lawyerIds.length === 0) {
      console.log('[process-monitor-cron] No active monitored processes found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active processes to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-monitor-cron] Syncing processes for ${lawyerIds.length} lawyer(s)...`);

    // 4. Call rama-judicial-monitor check_updates for each lawyer
    const results: any[] = [];
    
    for (const lawyerId of lawyerIds) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/rama-judicial-monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            action: 'check_updates',
            lawyerId,
          }),
        });

        const responseData = await response.json();
        results.push({ 
          lawyerId, 
          success: response.ok, 
          newActuations: responseData.newActuations?.length || 0,
          checked: responseData.checked || 0,
        });

        console.log(`[process-monitor-cron] Lawyer ${lawyerId}: ${response.ok ? 'OK' : 'FAIL'}, checked: ${responseData.checked || 0}`);

        // Small delay between lawyers to avoid overwhelming Firecrawl
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err: any) {
        console.error(`[process-monitor-cron] Error for lawyer ${lawyerId}:`, err.message);
        results.push({ lawyerId, success: false, error: err.message });
      }
    }

    // 5. Update last run timestamp
    const { data: existingConfig } = await supabase
      .from('system_config')
      .select('id')
      .eq('config_key', 'process_monitor_last_cron_run')
      .maybeSingle();

    if (existingConfig) {
      await supabase
        .from('system_config')
        .update({ config_value: now.toISOString(), updated_at: now.toISOString() })
        .eq('config_key', 'process_monitor_last_cron_run');
    } else {
      await supabase
        .from('system_config')
        .insert({
          config_key: 'process_monitor_last_cron_run',
          config_value: now.toISOString(),
          description: 'Última ejecución del cron de sincronización de procesos',
        });
    }

    const totalNew = results.reduce((sum, r) => sum + (r.newActuations || 0), 0);
    console.log(`[process-monitor-cron] ✅ Done. Lawyers: ${lawyerIds.length}, Total new actuations: ${totalNew}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lawyersProcessed: lawyerIds.length, 
        totalNewActuations: totalNew,
        syncFrequencyHours,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-monitor-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
