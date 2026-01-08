import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFIK_BASE_URL = 'https://api.verifik.co/v2';

type VerifikProcessFetchResult =
  | { ok: true; data: { despacho: string | null; fechaUltimaActuacion: string | null; ultimaActuacion: string | null; actuaciones: any[] } }
  | { ok: false; status: number; body: any };

async function fetchProcessByRadicadoFromVerifik(radicado: string): Promise<VerifikProcessFetchResult> {
  const apiKey = Deno.env.get('VERIFIK_API_KEY');
  if (!apiKey) {
    throw new Error('VERIFIK_API_KEY not configured');
  }

  const endpoint = `${VERIFIK_BASE_URL}/co/rama/proceso/${encodeURIComponent(radicado)}`;
  const resp = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Verifik docs show Authorization: "JWT <token>" / "jwt <token>"
      'Authorization': `JWT ${apiKey}`,
      'User-Agent': 'Lovable-Edge/1.0',
    },
  });

  let body: any = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  if (!resp.ok) {
    return { ok: false, status: resp.status, body };
  }

  const details = body?.data?.details ?? {};
  const actions = Array.isArray(body?.data?.actions) ? body.data.actions : [];

  const actuaciones = actions
    .map((a: any) => ({
      fechaActuacion: a.fechaActuacion,
      actuacion: a.actuacion,
      anotacion: a.anotacion,
      fechaInicio: a.fechaInicial ?? null,
      fechaFin: a.fechaFinal ?? null,
    }))
    .filter((a: any) => !!a.fechaActuacion);

  const sorted = [...actuaciones].sort(
    (a: any, b: any) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
  );

  const fechaUltimaActuacion = sorted[0]?.fechaActuacion ?? details.ultimaActualizacion ?? null;
  const ultimaActuacion = sorted[0]?.actuacion ?? null;

  return {
    ok: true,
    data: {
      despacho: details.despacho ?? null,
      fechaUltimaActuacion,
      ultimaActuacion,
      actuaciones,
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

    const { action, lawyerId, radicado, processId } = await req.json();
    console.log(`[RamaJudicial] Action: ${action}, Lawyer: ${lawyerId}, ProcessId: ${processId}, Radicado: ${radicado}`);

    // Handle 'sync' action - sync a specific process (alias for check_updates with processId)
    if (action === 'sync' && processId) {
      // Get the process details
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

      // Lookup the process in Verifik (Rama Judicial data)
      const result = await fetchProcessByRadicadoFromVerifik(process.radicado);

      if (!result.ok) {
        console.error(`[RamaJudicial] Verifik API error: ${result.status}`);
        return new Response(
          JSON.stringify({
            error: 'No se pudo consultar el proceso',
            details: `Error ${result.status}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const processData = result.data;

      if (!processData) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Proceso no encontrado',
            newActuations: 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      // Get existing actuations
      const { data: existingActs } = await supabase
        .from('process_actuations')
        .select('fecha_actuacion, anotacion')
        .eq('monitored_process_id', processId);

      const existingSet = new Set(
        (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
      );

      // Find new actuations
      const newActs = (processData.actuaciones || []).filter((act: any) => 
        !existingSet.has(`${act.fechaActuacion}-${act.anotacion}`)
      );

      if (newActs.length > 0) {
        // Insert new actuations
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

      // Update process info
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle 'sync-all' action - sync all processes for a lawyer
    if (action === 'sync-all' && lawyerId) {
      const { data: processes, error: fetchError } = await supabase
        .from('monitored_processes')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .eq('estado', 'activo');

      if (fetchError) throw fetchError;

      console.log(`[RamaJudicial] Syncing ${processes?.length || 0} processes for lawyer ${lawyerId}`);

      const results: any[] = [];
      let totalNewActuations = 0;

       for (const process of processes || []) {
         try {
           const result = await fetchProcessByRadicadoFromVerifik(process.radicado);

           if (!result.ok) {
             results.push({ radicado: process.radicado, success: false, error: `API error ${result.status}` });
             continue;
           }

           const processData = result.data;

           if (!processData) {
             results.push({ radicado: process.radicado, success: true, newActuations: 0, message: 'Not found' });
             continue;
           }
          // Get existing actuations
          const { data: existingActs } = await supabase
            .from('process_actuations')
            .select('fecha_actuacion, anotacion')
            .eq('monitored_process_id', process.id);

          const existingSet = new Set(
            (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
          );

          // Find new actuations
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

          // Update process
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

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err: any) {
          results.push({ radicado: process.radicado, success: false, error: err.message });
        }
      }

      console.log(`[RamaJudicial] Sync-all complete: ${totalNewActuations} new actuations across ${processes?.length || 0} processes`);
      return new Response(JSON.stringify({ 
        success: true, 
        synced: results.length,
        totalNewActuations,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

     if (action === 'lookup') {
       // Lookup process by radicado (via Verifik)
       const result = await fetchProcessByRadicadoFromVerifik(radicado);

       if (!result.ok) {
         console.error(`[RamaJudicial] Verifik API error: ${result.status}`);
         return new Response(
           JSON.stringify({
             error: 'No se pudo consultar el proceso',
             details: `Error ${result.status}`,
           }),
           {
             status: 400,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           }
         );
       }

       return new Response(JSON.stringify({ processes: result.data ? [result.data] : [] }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
    if (action === 'add_monitor') {
      // Add process to monitoring
      if (!lawyerId || !radicado) {
        return new Response(JSON.stringify({ error: 'lawyerId y radicado son requeridos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

       // First, lookup the process
       let processInfo: any = null;
       try {
         const result = await fetchProcessByRadicadoFromVerifik(radicado);
         if (result.ok) {
           processInfo = result.data;
         }
       } catch (e) {
         console.error('[RamaJudicial] add_monitor lookup error:', e);
       }
      // Insert monitored process
      const { data: monitoredProcess, error: insertError } = await supabase
        .from('monitored_processes')
        .insert({
          lawyer_id: lawyerId,
          radicado,
          despacho: processInfo?.despacho || null,
          demandante: processInfo?.sujetos?.find((s: any) => s.tipoSujeto === 'DEMANDANTE')?.nombre || null,
          demandado: processInfo?.sujetos?.find((s: any) => s.tipoSujeto === 'DEMANDADO')?.nombre || null,
          tipo_proceso: processInfo?.tipoProceso || null,
          ultima_actuacion_fecha: processInfo?.fechaUltimaActuacion || null,
          ultima_actuacion_descripcion: processInfo?.ultimaActuacion || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('[RamaJudicial] Insert error:', insertError);
        if (insertError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Este proceso ya está siendo monitoreado' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw insertError;
      }

      // If we have actuations, insert them
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

      console.log(`[RamaJudicial] Process ${radicado} added to monitoring`);
      return new Response(JSON.stringify({ 
        success: true, 
        process: monitoredProcess,
        actuationsCount: processInfo?.actuaciones?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'check_updates') {
      // Check for updates on all monitored processes (or specific one)
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

      console.log(`[RamaJudicial] Checking ${processes?.length || 0} processes`);

      const updates: any[] = [];
      const newActuations: any[] = [];

       for (const process of processes || []) {
         try {
           const result = await fetchProcessByRadicadoFromVerifik(process.radicado);
           if (!result.ok) continue;

           const processData = result.data;
           if (!processData) continue;
          // Get existing actuations
          const { data: existingActs } = await supabase
            .from('process_actuations')
            .select('fecha_actuacion, anotacion')
            .eq('monitored_process_id', process.id);

          const existingSet = new Set(
            (existingActs || []).map(a => `${a.fecha_actuacion}-${a.anotacion}`)
          );

          // Find new actuations
          const newActs = (processData.actuaciones || []).filter((act: any) => 
            !existingSet.has(`${act.fechaActuacion}-${act.anotacion}`)
          );

          if (newActs.length > 0) {
            console.log(`[RamaJudicial] Found ${newActs.length} new actuations for ${process.radicado}`);
            
            // Insert new actuations
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

            // Update process
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

            // TODO: Send email notification
          }

          updates.push({
            processId: process.id,
            radicado: process.radicado,
            checked: true,
            newActuations: newActs.length
          });

          // Rate limiting: wait 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[RamaJudicial] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
