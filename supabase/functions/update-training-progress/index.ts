import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lawyer_id, module_name, action, completion_percentage } = await req.json();

    if (!lawyer_id) {
      throw new Error('lawyer_id is required');
    }

    // Get or create training progress record
    let { data: progress, error: fetchError } = await supabase
      .from('lawyer_training_progress')
      .select('*')
      .eq('lawyer_id', lawyer_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // If no progress exists, create it
    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from('lawyer_training_progress')
        .insert({
          lawyer_id,
          modules_completed: [],
          completion_percentage: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      progress = newProgress;
    }

    // Update progress based on action
    let updatedModules = progress.modules_completed || [];
    let updatedPercentage = progress.completion_percentage || 0;

    if (action === 'complete_module' && module_name) {
      // Add module if not already completed
      if (!updatedModules.includes(module_name)) {
        updatedModules.push(module_name);
        updatedPercentage = Math.round((updatedModules.length / progress.total_modules) * 100);
      }
    } else if (action === 'set_percentage' && completion_percentage !== undefined) {
      updatedPercentage = completion_percentage;
      
      // If setting to 100%, mark all modules as completed
      if (completion_percentage >= 100) {
        const allModules = [
          'Introducción a la IA Legal',
          'Herramientas de IA para Abogados',
          'Automatización de Documentos',
          'Análisis Predictivo Legal',
          'Ética en IA Legal',
          'Implementación Práctica',
          'Casos de Uso Avanzados',
          'Integración con Sistemas Legales',
          'Mejores Prácticas',
          'Evaluación Final'
        ];
        updatedModules = allModules;
      }
    }

    // Determine if certified
    const is_certified = updatedPercentage >= 100;
    const completed_at = is_certified && !progress.completed_at ? new Date().toISOString() : progress.completed_at;

    // Update progress
    const { data: updatedProgress, error: updateError } = await supabase
      .from('lawyer_training_progress')
      .update({
        modules_completed: updatedModules,
        completion_percentage: updatedPercentage,
        is_certified,
        completed_at
      })
      .eq('id', progress.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        progress: updatedProgress,
        message: is_certified ? 'Certificación completada! Se ha emitido el badge automáticamente.' : 'Progreso actualizado exitosamente'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error updating training progress:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error updating training progress'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});