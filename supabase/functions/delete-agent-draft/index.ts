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

    const { draftId, lawyerId } = await req.json();

    if (!draftId || !lawyerId) {
      throw new Error('draftId and lawyerId are required');
    }

    console.log('Deleting agent draft:', draftId, 'for lawyer:', lawyerId);

    // Use returning to confirm deletion
    const { data, error } = await supabase
      .from('agent_drafts')
      .delete()
      .eq('id', draftId)
      .eq('lawyer_id', lawyerId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }

    if (!data) {
      console.log('Draft not found or already deleted');
      return new Response(JSON.stringify({
        success: true,
        message: 'Borrador ya fue eliminado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Draft deleted successfully:', data.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Borrador eliminado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-agent-draft function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error interno del servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});