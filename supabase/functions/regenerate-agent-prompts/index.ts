import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error) {
      console.error(`❌ Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    return data?.config_value || defaultValue || '';
  } catch (error) {
    console.error(`❌ Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

// Helper function to generate system prompt from conversation blocks
function generateSystemPrompt(docName: string, targetAudience: string, conversationBlocks: any[], fieldInstructions: any[], baseDNA: string) {
  console.log('🔧 Generating system prompt from conversation blocks...');
  console.log(`   - Document: ${docName}`);
  console.log(`   - Blocks: ${conversationBlocks.length}`);
  console.log(`   - Field Instructions: ${fieldInstructions.length}`);
  
  // Build conversation structure section
  const conversationStructure = conversationBlocks
    .sort((a, b) => (a.block_order || 0) - (b.block_order || 0))
    .map((block, index) => {
      const placeholders = Array.isArray(block.placeholders) ? block.placeholders : [];
      const placeholdersList = placeholders.map((p: string) => `    * {{${p}}}`).join('\n');
      return `
### BLOQUE ${index + 1}: ${block.block_name}
**Frase de Introducción:** "${block.intro_phrase}"
**Información a Recopilar:**
${placeholdersList || '    (Sin campos definidos)'}`;
    }).join('\n');

  // Build field-specific instructions
  const fieldSpecificInstructions = fieldInstructions.length > 0 ? `

## INSTRUCCIONES ESPECÍFICAS POR CAMPO

${fieldInstructions.map(instruction => {
  const parts = [];
  parts.push(`**Para el campo \`${instruction.field_name}\`:**`);
  if (instruction.validation_rule) parts.push(`* **Validación:** ${instruction.validation_rule}`);
  if (instruction.help_text) parts.push(`* **Ayuda:** ${instruction.help_text}`);
  return parts.join('\n');
}).join('\n\n')}` : '';

  // Generate complete system prompt
  const systemPrompt = `${baseDNA}

## INFORMACIÓN DEL DOCUMENTO
- **Documento:** ${docName}
- **Audiencia Objetivo:** ${targetAudience}

## ESTRUCTURA DE RECOPILACIÓN DE INFORMACIÓN (OBLIGATORIA)
${conversationStructure}
${fieldSpecificInstructions}

## PROTOCOLO DE EJECUCIÓN
1. **Saludo Inicial:** Preséntate como Lexi y explica brevemente qué documento van a crear juntos
2. **Recopilación por Bloques:** Sigue EXACTAMENTE el orden de los bloques definidos arriba
3. **Validación por Bloque:** Al completar cada bloque, confirma la información antes de continuar
4. **Resumen Final:** Al terminar todos los bloques, presenta un resumen completo para confirmación
5. **Generación:** Solo procede a generar el documento cuando toda la información esté confirmada`;

  console.log(`✅ System prompt generated (${systemPrompt.length} characters)`);
  return systemPrompt;
}

serve(async (req) => {
  console.log('🎯 === REGENERATE-AGENT-PROMPTS FUNCTION STARTED ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const body = await req.json();
    const { agent_id, agent_ids } = body;

    // Get base DNA configuration
    const baseDNA = await getSystemConfig(supabase, 'agent_creation_system_prompt', 
      `🚫🚫🚫 PROHIBICIONES ABSOLUTAS - VIOLACIÓN = COMPORTAMIENTO INCORRECTO 🚫🚫🚫

1. 🚫 NUNCA escribas, generes, redactes, ni muestres el CONTENIDO de ningún documento en la conversación
2. 🚫 NUNCA incluyas textos legales, cláusulas, artículos o párrafos del documento en tus respuestas
3. 🚫 NUNCA compartas el contenido del documento NI ANTES NI DESPUÉS de generarlo
4. 🚫 NUNCA describas el contenido específico del documento (qué dice, qué incluye textualmente)
5. 🚫 Si el usuario pide "ver el documento", "mostrar el borrador", "qué dice mi documento": SIEMPRE redirige al link de seguimiento
6. 🚫 NUNCA generes documentos sin usar la función generate_document
7. 🚫 SOLO muestra: TOKEN, LINK de seguimiento, precio y fecha de entrega estimada

⚠️ RESPUESTA CORRECTA SI PIDEN VER EL DOCUMENTO:
"Puedes ver tu documento completo en el link de seguimiento: [LINK]. Ahí podrás revisar el contenido, hacer el pago y descargarlo."

🚫🚫🚫 FIN DE PROHIBICIONES ABSOLUTAS 🚫🚫🚫

## ROL Y OBJETIVO
Eres "Lexi-Guía", un asistente de IA experto en la creación de documentos legales en Colombia. Tu misión es guiar al usuario de manera amigable, segura y profesional para recopilar toda la información necesaria.

## TONO Y ESTILO DE CONVERSACIÓN
* **Saludo Inicial:** Comienza siempre con: "¡Hola! Soy Lexi, tu asistente legal. Juntos vamos a crear tu documento paso a paso. No te preocupes, me aseguraré de que toda la información sea correcta..."
* **Tono:** Profesional pero cercano, como un abogado de confianza
* **Explicaciones:** Siempre explica brevemente por qué necesitas cada información
* **Paciencia:** Si el usuario no entiende algo, explícalo de manera más simple
* **Validación:** Confirma cada respuesta importante antes de continuar

## REGLAS DE FORMATEO Y VALIDACIÓN DE DATOS
* **Nombres y lugares:** Siempre en formato de título (Primera Letra Mayúscula)
* **Números de identificación:** Sin puntos ni espacios, solo números
* **Direcciones:** Formato estándar colombiano
* **Dinero:** Sin símbolos ni puntos, solo números (ej: 1500000)
* **Fechas:** Formato DD/MM/AAAA

## CONFIDENCIALIDAD Y REVISIÓN
* Recuerda al usuario que toda la información es confidencial
* Al final, menciona: "Un abogado humano revisará el documento antes de la entrega final para garantizar su precisión legal"`
    );

    // Determine which agents to process
    let agentIdsToProcess: string[] = [];
    
    if (agent_id) {
      agentIdsToProcess = [agent_id];
    } else if (agent_ids && Array.isArray(agent_ids)) {
      agentIdsToProcess = agent_ids;
    } else {
      // If no specific IDs provided, process all agents with conversation blocks
      const { data: allAgents, error: fetchError } = await supabase
        .from('legal_agents')
        .select('id')
        .not('id', 'is', null);
      
      if (fetchError) throw fetchError;
      agentIdsToProcess = allAgents?.map(a => a.id) || [];
    }

    console.log(`📋 Processing ${agentIdsToProcess.length} agents...`);

    const results = {
      success: true,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[]
    };

    // Process each agent
    for (const agentId of agentIdsToProcess) {
      try {
        console.log(`\n🔄 Processing agent: ${agentId}`);
        results.processed++;

        // Get agent data
        const { data: agent, error: agentError } = await supabase
          .from('legal_agents')
          .select('id, name, target_audience')
          .eq('id', agentId)
          .single();

        if (agentError || !agent) {
          console.error(`❌ Agent not found: ${agentId}`);
          results.skipped++;
          results.errors.push({ agent_id: agentId, error: 'Agent not found' });
          continue;
        }

        // Get conversation blocks
        const { data: blocks, error: blocksError } = await supabase
          .from('conversation_blocks')
          .select('id, block_name, intro_phrase, placeholders, block_order')
          .eq('legal_agent_id', agentId)
          .order('block_order');

        if (blocksError) {
          console.error(`❌ Error fetching blocks for ${agentId}:`, blocksError);
          results.errors.push({ agent_id: agentId, agent_name: agent.name, error: blocksError.message });
          results.skipped++;
          continue;
        }

        // Get field instructions
        const { data: instructions, error: instructionsError } = await supabase
          .from('field_instructions')
          .select('id, field_name, validation_rule, help_text')
          .eq('legal_agent_id', agentId);

        if (instructionsError) {
          console.error(`❌ Error fetching instructions for ${agentId}:`, instructionsError);
          results.errors.push({ agent_id: agentId, agent_name: agent.name, error: instructionsError.message });
          results.skipped++;
          continue;
        }

        // Skip if no conversation blocks
        if (!blocks || blocks.length === 0) {
          console.log(`⚠️ Skipping ${agent.name}: No conversation blocks`);
          results.skipped++;
          continue;
        }

        // Generate new prompt
        const newPrompt = generateSystemPrompt(
          agent.name,
          agent.target_audience || 'personas',
          blocks,
          instructions || [],
          baseDNA
        );

        // Update agent with new prompt
        const { error: updateError } = await supabase
          .from('legal_agents')
          .update({ 
            ai_prompt: newPrompt,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId);

        if (updateError) {
          console.error(`❌ Error updating agent ${agentId}:`, updateError);
          results.errors.push({ agent_id: agentId, agent_name: agent.name, error: updateError.message });
          results.skipped++;
          continue;
        }

        console.log(`✅ Updated prompt for: ${agent.name} (${blocks.length} blocks, ${instructions?.length || 0} instructions)`);
        results.updated++;

      } catch (error: any) {
        console.error(`💥 Error processing agent ${agentId}:`, error);
        results.errors.push({ agent_id: agentId, error: error.message });
        results.skipped++;
      }
    }

    console.log(`\n✅ === REGENERATION COMPLETED ===`);
    console.log(`   - Processed: ${results.processed}`);
    console.log(`   - Updated: ${results.updated}`);
    console.log(`   - Skipped: ${results.skipped}`);
    console.log(`   - Errors: ${results.errors.length}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 === FATAL ERROR ===', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
