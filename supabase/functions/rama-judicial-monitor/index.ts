import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAMA_JUDICIAL_API = 'https://consultaprocesos.ramajudicial.gov.co/api/Procesos/NumeroProceso';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, lawyerId, radicado, processId } = await req.json();
    console.log(`[RamaJudicial] Action: ${action}, Lawyer: ${lawyerId}, Radicado: ${radicado}`);

    if (action === 'lookup') {
      // Lookup process by radicado
      const response = await fetch(`${RAMA_JUDICIAL_API}/${radicado}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.error(`[RamaJudicial] API error: ${response.status}`);
        return new Response(JSON.stringify({ 
          error: 'No se pudo consultar el proceso',
          details: `Error ${response.status}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      console.log(`[RamaJudicial] Found ${data?.length || 0} processes`);

      return new Response(JSON.stringify({ processes: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      const lookupResponse = await fetch(`${RAMA_JUDICIAL_API}/${radicado}`, {
        headers: { 'Accept': 'application/json' }
      });

      let processInfo = null;
      if (lookupResponse.ok) {
        const processes = await lookupResponse.json();
        if (processes?.length > 0) {
          processInfo = processes[0];
        }
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
          const response = await fetch(`${RAMA_JUDICIAL_API}/${process.radicado}`, {
            headers: { 'Accept': 'application/json' }
          });

          if (!response.ok) continue;

          const data = await response.json();
          const processData = data?.[0];
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
