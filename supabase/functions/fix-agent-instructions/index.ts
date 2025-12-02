import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Fixing agent instructions to follow correct document generation flow...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { openai_agent_id } = await req.json();

    if (!openai_agent_id) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'openai_agent_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get current instructions
    const { data: agent, error: fetchError } = await supabase
      .from('openai_agents')
      .select('id, name, instructions')
      .eq('id', openai_agent_id)
      .single();

    if (fetchError || !agent) {
      console.error('❌ Agent not found:', fetchError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Agent not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Found agent:', agent.name);

    // Fix the instructions - remove the part where it shows document content in chat
    let fixedInstructions = agent.instructions;

    // Replace the problematic section
    const problematicText = `**Después de confirmar los datos**:
1. Genero el contrato completo aplicando el template y reemplazando todos los placeholders con los datos recopilados y normalizados.
2. Muestro al usuario el contenido del contrato generado para que lo revise.
3. Si está conforme, llamo a \`generate_document\` con toda la información para crear el token de seguimiento.
4. Si el usuario pide cambios, los realizo y vuelvo a mostrar el documento actualizado.`;

    const correctText = `**Después de confirmar los datos**:
1. Llamo INMEDIATAMENTE a \`generate_document\` para crear el token de seguimiento y el documento oficial.
2. Muestro al usuario SOLO el link de seguimiento donde podrá ver, pagar y descargar el documento.
3. NUNCA muestro el contenido completo del documento en el chat. El documento solo se visualiza en la página de pago.
4. Si el usuario pide cambios DESPUÉS de que el documento fue generado, le explico que debe usar el link de seguimiento para solicitar modificaciones.`;

    if (fixedInstructions.includes(problematicText)) {
      fixedInstructions = fixedInstructions.replace(problematicText, correctText);
      console.log('✅ Found and replaced problematic instructions');
    } else {
      console.log('⚠️ Problematic text not found exactly, will add new guidance at the end');
      
      // Add critical guidance at the end
      fixedInstructions += `\n\n---\n\n## ⚠️ REGLA CRÍTICA DE FLUJO DE DOCUMENTOS\n\n**NUNCA MOSTRAR EL DOCUMENTO COMPLETO EN EL CHAT**\n\nCuando termines de recopilar todos los datos:\n1. ✅ Llama INMEDIATAMENTE a \`generate_document\`\n2. ✅ Muestra SOLO el link de seguimiento al usuario\n3. ❌ NUNCA generes ni muestres el contenido del documento en el chat\n4. ❌ NUNCA apliques el template manualmente en la conversación\n\nEl documento se genera en el sistema y el usuario lo verá en la página de pago/seguimiento.`;
    }

    // Update the agent with fixed instructions
    const { error: updateError } = await supabase
      .from('openai_agents')
      .update({ 
        instructions: fixedInstructions,
        updated_at: new Date().toISOString()
      })
      .eq('id', openai_agent_id);

    if (updateError) {
      console.error('❌ Error updating agent:', updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to update agent instructions',
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Agent instructions updated successfully');

    // Now update the OpenAI assistant via API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the OpenAI assistant ID
    const { data: openaiAgent, error: openaiAgentError } = await supabase
      .from('openai_agents')
      .select('openai_agent_id')
      .eq('id', openai_agent_id)
      .single();

    console.log('📋 OpenAI agent query result:', { 
      hasData: !!openaiAgent, 
      hasError: !!openaiAgentError,
      openaiAgentId: openaiAgent?.openai_agent_id,
      error: openaiAgentError 
    });

    if (openaiAgentError || !openaiAgent?.openai_agent_id) {
      console.error('❌ OpenAI assistant ID not found', openaiAgentError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI assistant ID not found',
        details: openaiAgentError?.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const assistantId = openaiAgent.openai_agent_id;

    // Update OpenAI assistant
    console.log('🔄 Updating OpenAI assistant:', assistantId);
    const updateResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        instructions: fixedInstructions
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update OpenAI assistant:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to update OpenAI assistant',
        details: error
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ OpenAI assistant updated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Agent instructions fixed successfully. The agent will now follow the correct document generation flow.',
      agent_id: openai_agent_id,
      agent_name: agent.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Critical error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
