import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scrape actuaciones for a process from Rama Judicial using Firecrawl
async function fetchProcessByRadicadoFromFirecrawl(radicado: string, firecrawlApiKey: string): Promise<{
  ok: boolean;
  data?: {
    despacho: string | null;
    fechaUltimaActuacion: string | null;
    ultimaActuacion: string | null;
    actuaciones: any[];
    sujetos?: any[];
    tipoProceso?: string;
    claseProceso?: string;
  };
  error?: string;
}> {
  const targetUrl = `https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion?llave=${encodeURIComponent(radicado)}&Generate=Consultar`;

  console.log(`[rama-judicial-monitor] Scraping: ${targetUrl}`);

  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: [
        {
          type: 'json',
          prompt: `Extract judicial process data from this Colombian Rama Judicial page for monitoring purposes.
Return a JSON object with:
- despacho: court name (string or null)
- tipoProceso: type of legal process (string or null)
- claseProceso: class of process (string or null)
- fechaUltimaActuacion: date of last action in ISO format (string or null)
- ultimaActuacion: description of last action (string or null)
- actuaciones: array of all process actions, each with:
  - fechaActuacion: date in ISO format (string)
  - actuacion: action name (string)
  - anotacion: annotation/notes (string or null)
  - fechaInicio: start date (string or null)
  - fechaFin: end date (string or null)
- sujetos: array of parties with nombre (string) and tipoSujeto (string)
- found: boolean, true if process data was found on the page`,
        }
      ],
      waitFor: 5000,
      onlyMainContent: true,
    }),
  });

  if (!scrapeResponse.ok) {
    const errText = await scrapeResponse.text();
    console.error(`[rama-judicial-monitor] Firecrawl error: ${scrapeResponse.status} - ${errText}`);
    return { ok: false, error: `Firecrawl error: ${scrapeResponse.status}` };
  }

  const scrapeData = await scrapeResponse.json();
  const jsonData = scrapeData?.data?.json || scrapeData?.json;

  if (!jsonData || jsonData.found === false) {
    console.warn(`[rama-judicial-monitor] No data found for radicado: ${radicado}`);
    return { ok: false, error: 'Proceso no encontrado en el portal' };
  }

  const actuaciones = (jsonData.actuaciones || [])
    .filter((a: any) => !!a.fechaActuacion)
    .map((a: any) => ({
      fechaActuacion: a.fechaActuacion,
      actuacion: a.actuacion || '',
      anotacion: a.anotacion || null,
      fechaInicio: a.fechaInicio || null,
      fechaFin: a.fechaFin || null,
    }));

  const sorted = [...actuaciones].sort(
    (a: any, b: any) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
  );

  return {
    ok: true,
    data: {
      despacho: jsonData.despacho || null,
      fechaUltimaActuacion: jsonData.fechaUltimaActuacion || sorted[0]?.fechaActuacion || null,
      ultimaActuacion: jsonData.ultimaActuacion || sorted[0]?.actuacion || null,
      actuaciones,
      sujetos: jsonData.sujetos || [],
      tipoProceso: jsonData.tipoProceso || null,
      claseProceso: jsonData.claseProceso || null,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, lawyerId, radicado, processId } = await req.json();
    console.log(`[RamaJudicial] Action: ${action}, Lawyer: ${lawyerId}, ProcessId: ${processId}, Radicado: ${radicado}`);

    // Handle 'sync' action - sync a specific process
    if (action === 'sync' && processId) {
      const { data: process, error: fetchError } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('id', processId)
        .single();

      if (fetchError || !process) {
        return new Response(JSON.stringify({ error: 'Proceso no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await fetchProcessByRadicadoFromFirecrawl(process.radicado, FIRECRAWL_API_KEY);

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: 'No se pudo consultar el proceso', details: result.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const processData = result.data!;

      // Get existing actuations
      const { data: existingActs } = await supabase
        .from('process_actuations')
        .select('fecha_actuacion, anotacion')
        .eq('monitored_process_id', processId);

      const existingSet = new Set(
        (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
      );

      const newActs = (processData.actuaciones || []).filter((act: any) =>
        !existingSet.has(`${act.fechaActuacion}-${act.anotacion}`)
      );

      if (newActs.length > 0) {
        const actuationsToInsert = newActs.map((act: any) => ({
          monitored_process_id: processId,
          fecha_actuacion: act.fechaActuacion,
          anotacion: act.anotacion,
          actuacion: act.actuacion,
          fecha_inicio: act.fechaInicio,
          fecha_fin: act.fechaFin,
          is_new: true
        }));
        await supabase.from('process_actuations').insert(actuationsToInsert);
      }

      await supabase
        .from('monitored_processes')
        .update({
          despacho: processData.despacho || process.despacho,
          ultima_actuacion_fecha: processData.fechaUltimaActuacion || null,
          ultima_actuacion_descripcion: processData.ultimaActuacion || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', processId);

      console.log(`[RamaJudicial] Synced process ${process.radicado}: ${newActs.length} new actuations`);
      return new Response(JSON.stringify({
        success: true,
        newActuations: newActs.length,
        process: processData
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle 'sync-all' action
    if (action === 'sync-all' && lawyerId) {
      const { data: processes, error: fetchError } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('estado', 'activo');

      if (fetchError) throw fetchError;

      const results: any[] = [];
      let totalNewActuations = 0;

      for (const process of processes || []) {
        try {
          const result = await fetchProcessByRadicadoFromFirecrawl(process.radicado, FIRECRAWL_API_KEY);

          if (!result.ok) {
            results.push({ radicado: process.radicado, success: false, error: result.error });
            continue;
          }

          const processData = result.data!;

          const { data: existingActs } = await supabase
            .from('process_actuations')
            .select('fecha_actuacion, anotacion')
            .eq('monitored_process_id', process.id);

          const existingSet = new Set(
            (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
          );

          const newActs = (processData.actuaciones || []).filter((act: any) =>
            !existingSet.has(`${act.fechaActuacion}-${act.anotacion}`)
          );

          if (newActs.length > 0) {
            const actuationsToInsert = newActs.map((act: any) => ({
              monitored_process_id: process.id,
              fecha_actuacion: act.fechaActuacion,
              anotacion: act.anotacion,
              actuacion: act.actuacion,
              fecha_inicio: act.fechaInicio,
              fecha_fin: act.fechaFin,
              is_new: true
            }));
            await supabase.from('process_actuations').insert(actuationsToInsert);
            totalNewActuations += newActs.length;
          }

          await supabase
            .from('monitored_processes')
            .update({
              despacho: processData.despacho || process.despacho,
              ultima_actuacion_fecha: processData.fechaUltimaActuacion || null,
              ultima_actuacion_descripcion: processData.ultimaActuacion || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', process.id);

          results.push({ radicado: process.radicado, success: true, newActuations: newActs.length });

          // Rate limiting to avoid overwhelming the portal
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          results.push({ radicado: process.radicado, success: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        synced: results.length,
        totalNewActuations,
        results
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'lookup') {
      const result = await fetchProcessByRadicadoFromFirecrawl(radicado, FIRECRAWL_API_KEY);

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: 'No se pudo consultar el proceso', details: result.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ processes: result.data ? [result.data] : [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add_monitor') {
      if (!lawyerId || !radicado) {
        return new Response(JSON.stringify({ error: 'lawyerId y radicado son requeridos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let processInfo: any = null;
      try {
        const result = await fetchProcessByRadicadoFromFirecrawl(radicado, FIRECRAWL_API_KEY);
        if (result.ok) {
          processInfo = result.data;
        }
      } catch (e) {
        console.error('[RamaJudicial] add_monitor lookup error:', e);
      }

      const { data: monitoredProcess, error: insertError } = await supabase
        .from('monitored_processes')
        .insert({
          lawyer_id: lawyerId,
          radicado,
          despacho: processInfo?.despacho || null,
          demandante: processInfo?.sujetos?.find((s: any) => s.tipoSujeto?.toUpperCase().includes('DEMANDANTE'))?.nombre || null,
          demandado: processInfo?.sujetos?.find((s: any) => s.tipoSujeto?.toUpperCase().includes('DEMANDADO'))?.nombre || null,
          tipo_proceso: processInfo?.tipoProceso || null,
          ultima_actuacion_fecha: processInfo?.fechaUltimaActuacion || null,
          ultima_actuacion_descripcion: processInfo?.ultimaActuacion || null
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Este proceso ya está siendo monitoreado' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw insertError;
      }

      if (processInfo?.actuaciones?.length > 0) {
        const actuations = processInfo.actuaciones.slice(0, 20).map((act: any) => ({
          monitored_process_id: monitoredProcess.id,
          fecha_actuacion: act.fechaActuacion,
          anotacion: act.anotacion,
          actuacion: act.actuacion,
          fecha_inicio: act.fechaInicio,
          fecha_fin: act.fechaFin,
          is_new: false
        }));
        await supabase.from('process_actuations').insert(actuations);
      }

      return new Response(JSON.stringify({
        success: true,
        process: monitoredProcess,
        actuationsCount: processInfo?.actuaciones?.length || 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'check_updates') {
      let query = supabase
        .from('monitored_processes')
        .select('*')
        .eq('estado', 'activo')
        .eq('notificaciones_activas', true);

      if (processId) {
        query = query.eq('id', processId);
      } else if (lawyerId) {
        query = query.eq('lawyer_id', lawyerId);
      }

      const { data: processes, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const updates: any[] = [];
      const newActuations: any[] = [];

      for (const process of processes || []) {
        try {
          const result = await fetchProcessByRadicadoFromFirecrawl(process.radicado, FIRECRAWL_API_KEY);
          if (!result.ok) continue;

          const processData = result.data!;

          const { data: existingActs } = await supabase
            .from('process_actuations')
            .select('fecha_actuacion, anotacion')
            .eq('monitored_process_id', process.id);

          const existingSet = new Set(
            (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
          );

          const newActs = (processData.actuaciones || []).filter((act: any) =>
            !existingSet.has(`${act.fechaActuacion}-${act.anotacion}`)
          );

          if (newActs.length > 0) {
            const actuationsToInsert = newActs.map((act: any) => ({
              monitored_process_id: process.id,
              fecha_actuacion: act.fechaActuacion,
              anotacion: act.anotacion,
              actuacion: act.actuacion,
              fecha_inicio: act.fechaInicio,
              fecha_fin: act.fechaFin,
              is_new: true
            }));
            await supabase.from('process_actuations').insert(actuationsToInsert);

            await supabase
              .from('monitored_processes')
              .update({
                ultima_actuacion_fecha: processData.fechaUltimaActuacion,
                ultima_actuacion_descripcion: processData.ultimaActuacion,
                updated_at: new Date().toISOString()
              })
              .eq('id', process.id);

            newActuations.push({
              processId: process.id,
              radicado: process.radicado,
              newCount: newActs.length,
              actuations: newActs
            });
          }

          updates.push({
            processId: process.id,
            radicado: process.radicado,
            checked: true,
            newActuations: newActs.length
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          console.error(`[RamaJudicial] Error checking ${process.radicado}:`, err);
          updates.push({
            processId: process.id,
            radicado: process.radicado,
            checked: false,
            error: err.message
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        checked: updates.length,
        newActuations,
        updates
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'remove_monitor') {
      if (!processId) {
        return new Response(JSON.stringify({ error: 'processId es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabase
        .from('monitored_processes')
        .delete()
        .eq('id', processId)
        .eq('lawyer_id', lawyerId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Acción no reconocida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RamaJudicial] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error processing request'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
