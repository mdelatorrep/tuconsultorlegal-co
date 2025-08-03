import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { 
      lawyerId, 
      draftId, 
      draftName, 
      stepCompleted, 
      formData, 
      aiResults 
    } = await req.json();

    console.log('Saving agent draft:', {
      lawyerId,
      draftId,
      draftName,
      stepCompleted
    });

    // Validate required fields
    if (!lawyerId || !draftName) {
      throw new Error('lawyerId and draftName are required');
    }

    // Prepare the draft data with validation
    const draftData = {
      lawyer_id: lawyerId,
      draft_name: draftName.substring(0, 255), // Ensure name doesn't exceed limit
      step_completed: Math.max(1, Math.min(stepCompleted || 1, 5)), // Ensure valid step
      doc_name: formData?.docName?.substring(0, 255) || null,
      doc_desc: formData?.docDesc?.substring(0, 1000) || null,
      doc_cat: formData?.docCat || null,
      target_audience: ['personas', 'empresas'].includes(formData?.targetAudience) ? formData.targetAudience : 'personas',
      doc_template: formData?.docTemplate || null,
      initial_prompt: formData?.initialPrompt || null,
      sla_hours: Math.max(1, Math.min(formData?.slaHours || 4, 72)), // Between 1-72 hours
      sla_enabled: formData?.slaEnabled !== undefined ? formData.slaEnabled : true,
      lawyer_suggested_price: formData?.lawyerSuggestedPrice?.substring(0, 50) || null,
      ai_results: aiResults && typeof aiResults === 'object' ? aiResults : {},
      updated_at: new Date().toISOString()
    };

    let result;
    
    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('agent_drafts')
        .update(draftData)
        .eq('id', draftId)
        .eq('lawyer_id', lawyerId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating draft:', error);
        throw error;
      }
      
      // If no data returned, the draft might not exist or was already deleted
      if (!data) {
        console.log('Draft not found for update, creating new one instead');
        // Try to create a new draft instead
        const { data: newData, error: createError } = await supabase
          .from('agent_drafts')
          .insert(draftData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating draft after update failed:', createError);
          throw createError;
        }
        
        result = newData;
      } else {
        result = data;
      }
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('agent_drafts')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        console.error('Error creating draft:', error);
        throw error;
      }
      result = data;
    }

    console.log('Draft saved successfully:', result.id);

    return new Response(JSON.stringify({
      success: true,
      draftId: result.id,
      message: 'Borrador guardado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-agent-draft function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error interno del servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});