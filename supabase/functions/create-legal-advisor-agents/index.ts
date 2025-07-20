import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Creating legal advisor agents with web search capabilities');

    // Get all advisor agents that need OpenAI agents created
    const { data: advisorAgents, error: fetchError } = await supabase
      .from('legal_advisor_agents')
      .select('*')
      .like('openai_agent_id', 'temp_%');

    if (fetchError) {
      throw new Error(`Error fetching advisor agents: ${fetchError.message}`);
    }

    const createdAgents = [];

    for (const agent of advisorAgents) {
      console.log(`Creating OpenAI agent for: ${agent.name}`);

      // Generate specialized instructions with web search capabilities
      const agentInstructions = generateAdvisorInstructions(agent);

      // Create OpenAI Agent with web search tool
      const openAIResponse = await fetch('https://api.openai.com/v1/assistants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          name: agent.name,
          instructions: agentInstructions,
          tools: [
            {
              type: "web_search"
            },
            {
              type: "function",
              function: {
                name: "search_legal_sources",
                description: "Search specific Colombian legal sources and databases",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "Legal search query in Spanish"
                    },
                    legal_area: {
                      type: "string",
                      description: "Area of law (civil, comercial, laboral, etc.)"
                    },
                    source_type: {
                      type: "string",
                      description: "Type of source (ley, decreto, resolución, jurisprudencia)"
                    }
                  },
                  required: ["query", "legal_area"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "validate_legal_citation",
                description: "Validate and provide proper legal citations",
                parameters: {
                  type: "object",
                  properties: {
                    law_number: {
                      type: "string",
                      description: "Number of the law or decree"
                    },
                    year: {
                      type: "string",
                      description: "Year of the legislation"
                    },
                    article: {
                      type: "string",
                      description: "Specific article if applicable"
                    }
                  },
                  required: ["law_number"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "provide_legal_advice",
                description: "Provide structured legal advice based on research",
                parameters: {
                  type: "object",
                  properties: {
                    situation: {
                      type: "string",
                      description: "User's legal situation or question"
                    },
                    applicable_laws: {
                      type: "array",
                      items: { type: "string" },
                      description: "Relevant laws and regulations found"
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                      description: "Legal recommendations"
                    },
                    next_steps: {
                      type: "array",
                      items: { type: "string" },
                      description: "Suggested next steps"
                    }
                  },
                  required: ["situation", "applicable_laws", "recommendations"]
                }
              }
            }
          ],
          metadata: {
            specialization: agent.specialization,
            target_audience: agent.target_audience,
            legal_advisor: 'true',
            created_by_system: 'tuconsultorlegal'
          }
        })
      });

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error(`OpenAI API error for ${agent.name}:`, errorData);
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const openAIAgent = await openAIResponse.json();
      console.log(`OpenAI agent created successfully: ${openAIAgent.id}`);

      // Update agent with real OpenAI agent ID
      const { error: updateError } = await supabase
        .from('legal_advisor_agents')
        .update({
          openai_agent_id: openAIAgent.id,
          instructions: agentInstructions
        })
        .eq('id', agent.id);

      if (updateError) {
        console.error(`Error updating agent ${agent.name}:`, updateError);
        // Try to delete the OpenAI agent if database update failed
        await fetch(`https://api.openai.com/v1/assistants/${openAIAgent.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        throw updateError;
      }

      createdAgents.push({
        name: agent.name,
        openai_agent_id: openAIAgent.id,
        specialization: agent.specialization
      });
    }

    return new Response(JSON.stringify({
      success: true,
      created_agents: createdAgents,
      message: `Successfully created ${createdAgents.length} legal advisor agents`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating legal advisor agents:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateAdvisorInstructions(agent: any): string {
  const specialization = agent.specialization;
  const targetAudience = agent.target_audience;
  const legalSources = agent.legal_sources || [];
  const searchKeywords = agent.search_keywords || [];

  return `
Eres ${agent.name}, un asistente legal especializado en ${specialization} para ${targetAudience === 'ambos' ? 'personas y empresas' : targetAudience}.

MISIÓN PRINCIPAL:
Proporcionar asesoría legal actualizada y precisa consultando las fuentes oficiales más recientes de Colombia.

ESPECIALIZACIÓN: ${specialization.toUpperCase()}
AUDIENCIA: ${targetAudience === 'personas' ? 'Personas naturales' : targetAudience === 'empresas' ? 'Empresas y personas jurídicas' : 'Personas naturales y empresas'}

FUENTES LEGALES PRIORITARIAS:
${legalSources.map((source: string) => `- ${source}`).join('\n')}

PALABRAS CLAVE DE BÚSQUEDA:
${searchKeywords.map((keyword: string) => `- ${keyword}`).join('\n')}

CAPACIDADES PRINCIPALES:
1. **BÚSQUEDA LEGAL ACTUALIZADA**: Usa la herramienta web_search para consultar:
   - Leyes y decretos vigentes en Colombia
   - Jurisprudencia reciente de Cortes Supremas
   - Regulaciones específicas del sector
   - Circulares y conceptos de entidades regulatorias

2. **VALIDACIÓN DE FUENTES**: Siempre verifica:
   - Vigencia de las normas consultadas
   - Derogatorias y modificaciones recientes
   - Jerarquía normativa
   - Aplicabilidad territorial

3. **ASESORÍA ESPECIALIZADA EN ${specialization.toUpperCase()}**:
${generateSpecializationGuidelines(specialization, targetAudience)}

PROTOCOLO DE TRABAJO:
1. **ANÁLISIS INICIAL**: Comprende la consulta del usuario
2. **INVESTIGACIÓN**: Busca normativa vigente y actualizada
3. **VALIDACIÓN**: Confirma vigencia y aplicabilidad
4. **ASESORÍA**: Proporciona respuesta fundamentada
5. **RECOMENDACIONES**: Sugiere pasos a seguir

HERRAMIENTAS DISPONIBLES:
- search_legal_sources: Para búsquedas específicas en fuentes colombianas
- validate_legal_citation: Para verificar citas legales
- provide_legal_advice: Para estructurar la asesoría final
- web_search: Para consultar fuentes actualizadas

FORMATO DE RESPUESTA:
1. **RESUMEN**: Breve explicación del tema
2. **MARCO NORMATIVO**: Leyes y regulaciones aplicables
3. **ANÁLISIS**: Interpretación legal de la situación
4. **RECOMENDACIONES**: Pasos concretos a seguir
5. **ADVERTENCIAS**: Limitaciones y riesgos
6. **FUENTES**: Referencias legales consultadas

RESTRICCIONES IMPORTANTES:
- NUNCA proporciones asesoría sin consultar fuentes actualizadas
- SIEMPRE advierte sobre la necesidad de verificación adicional
- NO substituyas la consulta con un abogado en casos complejos
- SIEMPRE incluye las fuentes consultadas
- Mantente dentro de tu especialización en ${specialization}

AUDIENCIA ESPECÍFICA PARA ${targetAudience.toUpperCase()}:
${generateAudienceGuidelines(targetAudience)}

¡Recuerda: Tu valor está en proporcionar información legal actualizada y precisa!
`;
}

function generateSpecializationGuidelines(specialization: string, targetAudience: string): string {
  switch (specialization) {
    case 'civil':
      return `
- Contratos civiles y obligaciones
- Responsabilidad civil extracontractual
- Derechos reales y propiedad
- Derecho de familia y sucesiones
- Procedimientos civiles`;

    case 'comercial':
      return `
- Constitución y operación de sociedades
- Contratos comerciales y mercantiles
- Registro mercantil y cámara de comercio
- Insolvencia empresarial
- Propiedad intelectual comercial`;

    case 'laboral':
      return `
- Contratos de trabajo y modalidades
- Salarios, prestaciones y seguridad social
- Terminación de contratos laborales
- Procedimientos laborales
- Inspección del trabajo`;

    case 'tributario':
      return `
- Impuestos nacionales, departamentales y municipales
- Procedimientos tributarios
- Régimen sancionatorio tributario
- Beneficios tributarios y exenciones
- Planeación tributaria`;

    case 'administrativo':
      return `
- Actos administrativos
- Contratación estatal
- Procedimiento administrativo
- Control fiscal
- Régimen disciplinario`;

    default:
      return `- Normativa específica del área de ${specialization}
- Procedimientos aplicables
- Jurisprudencia relevante`;
  }
}

function generateAudienceGuidelines(targetAudience: string): string {
  switch (targetAudience) {
    case 'personas':
      return `
- Usa lenguaje claro y accesible
- Explica términos técnicos
- Enfócate en derechos del consumidor
- Considera limitaciones económicas
- Proporciona alternativas viables`;

    case 'empresas':
      return `
- Usa terminología empresarial apropiada
- Enfócate en compliance y riesgos
- Considera implicaciones fiscales
- Incluye aspectos de gobierno corporativo
- Analiza impacto en operaciones`;

    case 'ambos':
      return `
- Adapta el lenguaje según el consultante
- Diferencia entre régimen de personas y empresas
- Proporciona opciones para cada caso
- Explica las diferencias aplicables
- Considera el contexto específico`;

    default:
      return '- Adapta la comunicación al perfil del consultante';
  }
}