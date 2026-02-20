import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for Firecrawl v2 Agent API
const AGENT_SCHEMA = {
  type: "object",
  properties: {
    judicial_process_details: {
      type: "object",
      properties: {
        radication_number: { type: "string" },
        radication_number_citation: { type: "string" },
        court: { type: "string" },
        court_citation: { type: "string" },
        subject: { type: "string" },
        subject_citation: { type: "string" },
        parties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              name_citation: { type: "string" },
              role: { type: "string" },
              role_citation: { type: "string" },
            },
            required: ["name", "name_citation", "role", "role_citation"],
          },
        },
        last_update_date: { type: "string" },
        last_update_date_citation: { type: "string" },
        process_status: { type: "string" },
        process_status_citation: { type: "string" },
        proceedings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              date_citation: { type: "string" },
              description: { type: "string" },
              description_citation: { type: "string" },
              document_link: { type: "string", description: "URL to the document if available" },
              document_link_citation: { type: "string" },
            },
            required: ["date", "date_citation", "description", "description_citation"],
          },
        },
      },
      required: [
        "radication_number", "radication_number_citation",
        "court", "court_citation",
        "subject", "subject_citation",
        "parties",
        "last_update_date", "last_update_date_citation",
        "process_status", "process_status_citation",
        "proceedings",
      ],
    },
  },
  required: ["judicial_process_details"],
};

async function fetchProcessByRadicado(radicado: string, firecrawlApiKey: string): Promise<{
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
  console.log(`[rama-judicial-monitor] Using Firecrawl v2 Agent for radicado: ${radicado}`);

  const agentPrompt = `Extract judicial process details for the radication number '${radicado}' using the 'Todos los Procesos' option on the Rama Judicial portal (https://siugj.ramajudicial.gov.co/principalPortal/consultarProceso.php). For every extracted field, including nested items, you must provide the source URL in a corresponding field named with the suffix '_citation'. Ensure you capture all proceedings, including the date, description, and any available links to documents.`;

  const response = await fetch('https://api.firecrawl.dev/v2/agent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: agentPrompt,
      schema: AGENT_SCHEMA,
      model: "spark-1-pro",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[rama-judicial-monitor] Firecrawl Agent error: ${response.status} - ${errText}`);
    return { ok: false, error: `Firecrawl Agent error: ${response.status}` };
  }

  const result = await response.json();
  console.log(`[rama-judicial-monitor] Agent response status: ${result.success}`);

  const details = result?.data?.judicial_process_details || result?.judicial_process_details;

  if (!details) {
    console.warn(`[rama-judicial-monitor] No data found for radicado: ${radicado}`);
    return { ok: false, error: 'Proceso no encontrado en el portal' };
  }

  // Map proceedings to actuaciones format
  const actuaciones = (details.proceedings || [])
    .filter((p: any) => !!p.date)
    .map((p: any) => ({
      fechaActuacion: p.date,
      actuacion: p.description || '',
      anotacion: p.document_link || null,
      fechaInicio: null,
      fechaFin: null,
      citacion: p.date_citation || null,
    }));

  const sorted = [...actuaciones].sort(
    (a: any, b: any) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
  );

  // Map parties to sujetos format
  const sujetos = (details.parties || []).map((p: any) => ({
    nombre: p.name,
    tipoSujeto: p.role,
  }));

  return {
    ok: true,
    data: {
      despacho: details.court || null,
      fechaUltimaActuacion: details.last_update_date || sorted[0]?.fechaActuacion || null,
      ultimaActuacion: sorted[0]?.actuacion || details.process_status || null,
      actuaciones,
      sujetos,
      tipoProceso: details.subject || null,
      claseProceso: details.process_status || null,
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

    // ── sync: sync a specific process ──
    if (action === 'sync' && processId) {
      const { data: process, error: fetchError } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('id', processId)
        .single();

      if (fetchError || !process) {
        return new Response(JSON.stringify({ error: 'Proceso no encontrado' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await fetchProcessByRadicado(process.radicado, FIRECRAWL_API_KEY);
      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: 'No se pudo consultar el proceso', details: result.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const processData = result.data!;
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
        await supabase.from('process_actuations').insert(
          newActs.map((act: any) => ({
            monitored_process_id: processId,
            fecha_actuacion: act.fechaActuacion,
            anotacion: act.anotacion,
            actuacion: act.actuacion,
            fecha_inicio: act.fechaInicio,
            fecha_fin: act.fechaFin,
            is_new: true,
          }))
        );
      }

      await supabase.from('monitored_processes').update({
        despacho: processData.despacho || process.despacho,
        ultima_actuacion_fecha: processData.fechaUltimaActuacion || null,
        ultima_actuacion_descripcion: processData.ultimaActuacion || null,
        updated_at: new Date().toISOString(),
      }).eq('id', processId);

      console.log(`[RamaJudicial] Synced process ${process.radicado}: ${newActs.length} new actuations`);
      return new Response(JSON.stringify({
        success: true, newActuations: newActs.length, process: processData
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── sync-all: sync all active processes for a lawyer ──
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
          const result = await fetchProcessByRadicado(process.radicado, FIRECRAWL_API_KEY);
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
            await supabase.from('process_actuations').insert(
              newActs.map((act: any) => ({
                monitored_process_id: process.id,
                fecha_actuacion: act.fechaActuacion,
                anotacion: act.anotacion,
                actuacion: act.actuacion,
                fecha_inicio: act.fechaInicio,
                fecha_fin: act.fechaFin,
                is_new: true,
              }))
            );
            totalNewActuations += newActs.length;
          }

          await supabase.from('monitored_processes').update({
            despacho: processData.despacho || process.despacho,
            ultima_actuacion_fecha: processData.fechaUltimaActuacion || null,
            ultima_actuacion_descripcion: processData.ultimaActuacion || null,
            updated_at: new Date().toISOString(),
          }).eq('id', process.id);

          results.push({ radicado: process.radicado, success: true, newActuations: newActs.length });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          results.push({ radicado: process.radicado, success: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({
        success: true, synced: results.length, totalNewActuations, results
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── lookup: one-time lookup ──
    if (action === 'lookup') {
      const result = await fetchProcessByRadicado(radicado, FIRECRAWL_API_KEY);
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

    // ── add_monitor: add a process to monitoring ──
    if (action === 'add_monitor') {
      if (!lawyerId || !radicado) {
        return new Response(JSON.stringify({ error: 'lawyerId y radicado son requeridos' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let processInfo: any = null;
      try {
        const result = await fetchProcessByRadicado(radicado, FIRECRAWL_API_KEY);
        if (result.ok) processInfo = result.data;
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
          ultima_actuacion_descripcion: processInfo?.ultimaActuacion || null,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Este proceso ya está siendo monitoreado' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw insertError;
      }

      if (processInfo?.actuaciones?.length > 0) {
        await supabase.from('process_actuations').insert(
          processInfo.actuaciones.slice(0, 20).map((act: any) => ({
            monitored_process_id: monitoredProcess.id,
            fecha_actuacion: act.fechaActuacion,
            anotacion: act.anotacion,
            actuacion: act.actuacion,
            fecha_inicio: act.fechaInicio,
            fecha_fin: act.fechaFin,
            is_new: false,
          }))
        );
      }

      return new Response(JSON.stringify({
        success: true, process: monitoredProcess, actuationsCount: processInfo?.actuaciones?.length || 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── check_updates: check for new actuations ──
    if (action === 'check_updates') {
      let query = supabase
        .from('monitored_processes')
        .select('*')
        .eq('estado', 'activo')
        .eq('notificaciones_activas', true);

      if (processId) query = query.eq('id', processId);
      else if (lawyerId) query = query.eq('lawyer_id', lawyerId);

      const { data: processes, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const updates: any[] = [];
      const newActuations: any[] = [];

      for (const process of processes || []) {
        try {
          const result = await fetchProcessByRadicado(process.radicado, FIRECRAWL_API_KEY);
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
            await supabase.from('process_actuations').insert(
              newActs.map((act: any) => ({
                monitored_process_id: process.id,
                fecha_actuacion: act.fechaActuacion,
                anotacion: act.anotacion,
                actuacion: act.actuacion,
                fecha_inicio: act.fechaInicio,
                fecha_fin: act.fechaFin,
                is_new: true,
              }))
            );

            await supabase.from('monitored_processes').update({
              ultima_actuacion_fecha: processData.fechaUltimaActuacion,
              ultima_actuacion_descripcion: processData.ultimaActuacion,
              updated_at: new Date().toISOString(),
            }).eq('id', process.id);

            newActuations.push({
              processId: process.id, radicado: process.radicado,
              newCount: newActs.length, actuations: newActs,
            });
          }

          updates.push({
            processId: process.id, radicado: process.radicado,
            checked: true, newActuations: newActs.length,
          });

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err: any) {
          console.error(`[RamaJudicial] Error checking ${process.radicado}:`, err);
          updates.push({ processId: process.id, radicado: process.radicado, checked: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({
        success: true, checked: updates.length, newActuations, updates
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── remove_monitor ──
    if (action === 'remove_monitor') {
      if (!processId) {
        return new Response(JSON.stringify({ error: 'processId es requerido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
