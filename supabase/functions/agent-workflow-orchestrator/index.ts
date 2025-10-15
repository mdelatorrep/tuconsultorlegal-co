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
    const { messages, agentId, documentTokenId, threadId } = await req.json();

    console.log('Starting workflow orchestration for agent:', agentId);

    // Get the OpenAI agent by the external OpenAI agent ID
    const { data: openaiAgent, error: agentError } = await supabase
      .from('openai_agents')
      .select('*, legal_agents(*)')
      .eq('openai_agent_id', agentId)
      .eq('status', 'active')
      .maybeSingle();

    if (agentError || !openaiAgent) {
      throw new Error('OpenAI agent not found');
    }

    // Create or use existing thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }

      const thread = await threadResponse.json();
      currentThreadId = thread.id;
    }

    // Add user message to thread
    const lastMessage = messages[messages.length - 1];
    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: lastMessage.content
      })
    });

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: agentId
        // Use the assistant's original instructions which include conversation blocks
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to start assistant run');
    }

    const run = await runResponse.json();
    console.log('Assistant run started:', run.id);

    // Poll for completion and handle function calls
    let runStatus = run.status;
    let runData = run;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 60; // 60 segundos máximo

    while ((runStatus === 'queued' || runStatus === 'in_progress' || runStatus === 'requires_action') 
           && pollAttempts < MAX_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      pollAttempts++;

      console.log(`[Attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS}] Run status: ${runStatus}`);

      // Check run status
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      runData = await statusResponse.json();
      runStatus = runData.status;

      // Handle error states
      if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
        const errorMsg = runData.last_error?.message || 'Unknown error';
        console.error(`Run ${runStatus}:`, errorMsg);
        throw new Error(`El asistente encontró un error: ${errorMsg}`);
      }

      // Handle function calls
      if (runStatus === 'requires_action') {
        const toolCalls = runData.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          console.log('Processing function call:', toolCall.function.name);
          
          let output = '';
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            switch (toolCall.function.name) {
              case 'search_legal_sources':
                output = await handleSearchLegalSources(supabase, functionArgs);
                break;
              
              case 'generate_document':
                output = await handleGenerateDocument(
                  supabase, 
                  functionArgs, 
                  openaiAgent.legal_agents, 
                  documentTokenId,
                  currentThreadId,
                  openaiAgent.id
                );
                break;
                
              case 'validate_information':
                output = await handleValidateInformation(
                  functionArgs, 
                  openaiAgent.legal_agents.placeholder_fields
                );
                break;
                
              case 'normalize_information':
                output = await handleNormalizeInformation(functionArgs);
                break;
              
              case 'store_collected_data':
                output = await handleStoreCollectedData(
                  supabase,
                  functionArgs,
                  openaiAgent.id,
                  currentThreadId
                );
                break;
              
              case 'request_clarification':
                output = await handleRequestClarification(functionArgs);
                break;
                
              default:
                output = `Función ${toolCall.function.name} no implementada`;
            }
          } catch (error) {
            console.error(`Error processing function ${toolCall.function.name}:`, error);
            output = `Error: ${error.message}`;
          }

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output
          });
        }

        // Submit tool outputs
        await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            tool_outputs: toolOutputs
          })
        });
      }
    }

    // Check for timeout
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      console.error('Timeout: Assistant took too long to respond');
      throw new Error('El asistente tardó demasiado en responder. Por favor intenta nuevamente.');
    }

    console.log(`Assistant run completed successfully after ${pollAttempts} attempts`);

    // Get the latest messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages');
    }

    const messagesData = await messagesResponse.json();
    const latestMessage = messagesData.data[0];
    
    // Asegurar encoding UTF-8 correcto para el contenido del mensaje
    const messageContent = latestMessage.content[0]?.text?.value || 'No response';
    console.log('Assistant response length:', messageContent.length, 'characters');

    // Save conversation to database
    await supabase
      .from('agent_conversations')
      .upsert({
        openai_agent_id: openaiAgent.id,
        thread_id: currentThreadId,
        document_token_id: documentTokenId,
        conversation_data: {
          last_message: latestMessage,
          run_status: runStatus,
          run_id: run.id
        },
        status: runStatus === 'completed' ? 'completed' : 'active'
      });

    // Update agent statistics
    const { error: statsError } = await supabase
      .from('legal_agents')
      .update({
        openai_conversations_count: openaiAgent.legal_agents.openai_conversations_count + 1,
        last_openai_activity: new Date().toISOString(),
        openai_success_rate: runStatus === 'completed' ? 
          ((openaiAgent.legal_agents.openai_success_rate || 0) * (openaiAgent.legal_agents.openai_conversations_count || 0) + (runStatus === 'completed' ? 100 : 0)) / 
          ((openaiAgent.legal_agents.openai_conversations_count || 0) + 1) : 
          openaiAgent.legal_agents.openai_success_rate
      })
      .eq('id', openaiAgent.legal_agent_id);

    if (statsError) {
      console.error('Error updating agent statistics:', statsError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: messageContent,
      threadId: currentThreadId,
      runStatus: runStatus,
      conversationComplete: runStatus === 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error in workflow orchestrator:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Function handlers
async function handleGenerateDocument(supabase: any, args: any, legalAgent: any, documentTokenId: string, threadId: string, openaiAgentId: string) {
  console.log('Generating document with data from args:', args);
  
  try {
    // Get collected data from agent_conversations
    let documentData = args.documentData || {};
    
    // If no data provided in args, retrieve from stored conversation
    if (Object.keys(documentData).length === 0) {
      console.log('No data in args, retrieving from agent_conversations for threadId:', threadId, 'and openaiAgentId:', openaiAgentId);
      
      const { data: conversation, error: convError } = await supabase
        .from('agent_conversations')
        .select('conversation_data')
        .eq('thread_id', threadId)
        .eq('openai_agent_id', openaiAgentId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (convError) {
        console.error('Error retrieving conversation data:', convError);
        throw new Error('No se pudo recuperar la información recopilada');
      }
      
      if (!conversation?.conversation_data?.collected_data) {
        console.error('No collected data found in conversation');
        throw new Error('No se ha recopilado información suficiente para generar el documento');
      }
      
      documentData = conversation.conversation_data.collected_data;
      console.log('Retrieved collected data:', documentData);
    }
    
    // Apply the template with the collected data
    let documentContent = legalAgent.template_content;
    const placeholderFields = legalAgent.placeholder_fields || [];
    
    // Replace placeholders with actual data from documentData
    for (const field of placeholderFields) {
      const placeholder = field.placeholder;
      const fieldName = field.name || placeholder;
      
      // Look for the value in the provided documentData
      let value = documentData[fieldName] || 
                 documentData[placeholder] || 
                 documentData[field.pregunta] || 
                 `[${placeholder}]`;
      
      // If value is still a placeholder, try to find it by question text
      if (value.startsWith('[') && value.endsWith(']')) {
        for (const [key, val] of Object.entries(documentData)) {
          if (key.toLowerCase().includes(fieldName.toLowerCase()) || 
              fieldName.toLowerCase().includes(key.toLowerCase())) {
            value = val as string;
            break;
          }
        }
      }
      
      // Replace all occurrences of the placeholder in the template
      const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
      documentContent = documentContent.replace(regex, value);
    }
    
    // Apply any user-specific requests
    if (args.userRequests) {
      documentContent += `\n\nObservaciones adicionales: ${args.userRequests}`;
    }
    
    // Update document token with generated content if documentTokenId is provided
    if (documentTokenId) {
      const { error: updateError } = await supabase
        .from('document_tokens')
        .update({
          document_content: documentContent,
          status: 'generado',
          user_observations: args.userRequests || null
        })
        .eq('id', documentTokenId);
        
      if (updateError) {
        console.error('Error updating document token:', updateError);
      }
    }
    
    return `Documento generado exitosamente. El documento ha sido actualizado con la información proporcionada y está listo para su revisión y pago.`;
    
  } catch (error) {
    console.error('Error generating document:', error);
    return `Error al generar el documento: ${error.message}`;
  }
}

async function handleValidateInformation(args: any, placeholderFields?: any[]) {
  console.log('Validating information:', args);
  
  const collectedData = args.collectedData || {};
  const missingFields = [];
  const requiredFields = placeholderFields || [];
  
  // Check if we have all required placeholder fields
  for (const field of requiredFields) {
    const fieldName = field.name || field.placeholder;
    const fieldValue = collectedData[fieldName] || 
                       collectedData[field.placeholder] || 
                       collectedData[field.pregunta];
    
    if (!fieldValue || fieldValue.toString().trim() === '') {
      missingFields.push(field.pregunta || field.placeholder || fieldName);
    }
  }
  
  // Check other collected data
  for (const [key, value] of Object.entries(collectedData)) {
    if (!value || value.toString().trim() === '') {
      // Only add if not already in missingFields
      const fieldLabel = requiredFields.find(f => 
        f.name === key || f.placeholder === key
      )?.pregunta || key;
      
      if (!missingFields.includes(fieldLabel)) {
        missingFields.push(fieldLabel);
      }
    }
  }
  
  if (missingFields.length > 0) {
    return `Información incompleta. Faltan los siguientes campos: ${missingFields.join(', ')}. Por favor proporciona esta información antes de generar el documento.`;
  }
  
  return 'Toda la información requerida ha sido recopilada correctamente. Puedes proceder a generar el documento.';
}

async function handleNormalizeInformation(args: any) {
  console.log('Normalizing information:', args);
  
  try {
    const rawData = args.rawData || {};
    const normalizedData: any = {};
    
    // Función para normalizar nombres propios a mayúsculas
    const normalizeNames = (text: string): string => {
      if (!text) return text;
      return text.trim().toUpperCase()
        .replace(/Á/g, 'Á').replace(/É/g, 'É').replace(/Í/g, 'Í')
        .replace(/Ó/g, 'Ó').replace(/Ú/g, 'Ú').replace(/Ñ/g, 'Ñ');
    };
    
    // Función para normalizar números de documento con puntos
    const normalizeDocument = (doc: string): string => {
      if (!doc) return doc;
      const numbers = doc.replace(/\D/g, '');
      return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };
    
    // Función para normalizar fechas al formato colombiano
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return dateStr;
      
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      // Detectar diferentes formatos de fecha
      const patterns = [
        /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{4})/,
        /(\d{4})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})/,
        /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i
      ];
      
      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          let day, month, year;
          if (pattern.source.includes('de')) {
            // Formato "DD de MMMM de YYYY"
            [, day, month, year] = match;
            const monthIndex = months.indexOf(month.toLowerCase());
            if (monthIndex >= 0) {
              return `${parseInt(day)} de ${months[monthIndex]} de ${year}`;
            }
          } else if (match[1].length === 4) {
            // Formato YYYY-MM-DD
            [, year, month, day] = match;
          } else {
            // Formato DD-MM-YYYY
            [, day, month, year] = match;
          }
          
          const monthName = months[parseInt(month) - 1] || 'enero';
          return `${parseInt(day)} de ${monthName} de ${year}`;
        }
      }
      
      return dateStr;
    };
    
    // Función para normalizar monedas
    const normalizeCurrency = (amount: string | number): string => {
      if (!amount) return '';
      
      const numericAmount = typeof amount === 'string' ? 
        parseFloat(amount.replace(/[^\d.]/g, '')) : amount;
      
      if (isNaN(numericAmount)) return amount.toString();
      
      // Formatear con puntos como separadores de miles
      const formatted = numericAmount.toLocaleString('es-CO');
      
      // Convertir número a letras (función simplificada)
      const numberToWords = (num: number): string => {
        const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        const thousands = ['', 'mil', 'millón', 'mil millones'];
        
        if (num === 0) return 'cero';
        if (num < 10) return units[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' y ' + units[num % 10] : '');
        if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 ? ' ' + numberToWords(num % 100) : '');
        if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' mil' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
        
        return 'cantidad compleja'; // Para números muy grandes
      };
      
      const wordsAmount = numberToWords(Math.floor(numericAmount));
      return `${formatted} (${wordsAmount} pesos)`;
    };
    
    // Función para normalizar información geográfica
    const normalizeGeographic = (location: string): string => {
      if (!location) return location;
      
      const departmentMap: Record<string, string> = {
        'bogota': 'BOGOTÁ, CUNDINAMARCA',
        'bogotá': 'BOGOTÁ, CUNDINAMARCA',
        'medellin': 'MEDELLÍN, ANTIOQUIA',
        'medellín': 'MEDELLÍN, ANTIOQUIA',
        'cali': 'CALI, VALLE DEL CAUCA',
        'barranquilla': 'BARRANQUILLA, ATLÁNTICO',
        'cartagena': 'CARTAGENA, BOLÍVAR',
        'cucuta': 'CÚCUTA, NORTE DE SANTANDER',
        'cúcuta': 'CÚCUTA, NORTE DE SANTANDER',
        'bucaramanga': 'BUCARAMANGA, SANTANDER',
        'pereira': 'PEREIRA, RISARALDA',
        'manizales': 'MANIZALES, CALDAS',
        'ibague': 'IBAGUÉ, TOLIMA',
        'ibagué': 'IBAGUÉ, TOLIMA',
        'santa marta': 'SANTA MARTA, MAGDALENA',
        'villavicencio': 'VILLAVICENCIO, META',
        'pasto': 'PASTO, NARIÑO',
        'monteria': 'MONTERÍA, CÓRDOBA',
        'montería': 'MONTERÍA, CÓRDOBA',
        'valledupar': 'VALLEDUPAR, CESAR',
        'neiva': 'NEIVA, HUILA',
        'armenia': 'ARMENIA, QUINDÍO',
        'popayan': 'POPAYÁN, CAUCA',
        'popayán': 'POPAYÁN, CAUCA',
        'sincelejo': 'SINCELEJO, SUCRE',
        'florencia': 'FLORENCIA, CAQUETÁ',
        'tunja': 'TUNJA, BOYACÁ',
        'quibdo': 'QUIBDÓ, CHOCÓ',
        'quibdó': 'QUIBDÓ, CHOCÓ',
        'riohacha': 'RIOHACHA, LA GUAJIRA',
        'yopal': 'YOPAL, CASANARE',
        'mocoa': 'MOCOA, PUTUMAYO',
        'leticia': 'LETICIA, AMAZONAS'
      };
      
      const normalized = location.toLowerCase().trim();
      return departmentMap[normalized] || location.toUpperCase() + ', COLOMBIA';
    };
    
    // Función para normalizar direcciones
    const normalizeAddress = (address: string): string => {
      if (!address) return address;
      
      return address.toUpperCase()
        .replace(/\bCALLE\b/g, 'CALLE')
        .replace(/\bCARRERA\b/g, 'CARRERA')
        .replace(/\bAVENIDA\b/g, 'AVENIDA')
        .replace(/\bDIAGONAL\b/g, 'DIAGONAL')
        .replace(/\bTRANSVERSAL\b/g, 'TRANSVERSAL')
        .replace(/\bCIRCULAR\b/g, 'CIRCULAR')
        .replace(/\bAPARTAMENTO\b/g, 'APARTAMENTO')
        .replace(/\bAPTO\b/g, 'APARTAMENTO')
        .replace(/\bOFICINA\b/g, 'OFICINA')
        .replace(/\bOF\b/g, 'OFICINA')
        .replace(/\bLOCAL\b/g, 'LOCAL')
        .replace(/\bBARRIO\b/g, 'BARRIO')
        .replace(/\bURBANIZACION\b/g, 'URBANIZACIÓN')
        .replace(/\bEDIFICIO\b/g, 'EDIFICIO');
    };
    
    // Procesar cada campo del rawData
    for (const [key, value] of Object.entries(rawData)) {
      const keyLower = key.toLowerCase();
      const valueStr = value?.toString() || '';
      
      if (keyLower.includes('nombre') || keyLower.includes('apellido')) {
        normalizedData[key] = normalizeNames(valueStr);
      } else if (keyLower.includes('cedula') || keyLower.includes('documento') || keyLower.includes('nit')) {
        normalizedData[key] = normalizeDocument(valueStr);
      } else if (keyLower.includes('fecha') || keyLower.includes('date')) {
        normalizedData[key] = normalizeDate(valueStr);
      } else if (keyLower.includes('ciudad') || keyLower.includes('municipio') || keyLower.includes('ubicacion')) {
        normalizedData[key] = normalizeGeographic(valueStr);
      } else if (keyLower.includes('direccion') || keyLower.includes('address')) {
        normalizedData[key] = normalizeAddress(valueStr);
      } else if (keyLower.includes('salario') || keyLower.includes('valor') || keyLower.includes('precio') || keyLower.includes('monto')) {
        normalizedData[key] = normalizeCurrency(valueStr);
      } else {
        // Para otros campos, aplicar normalización general
        normalizedData[key] = valueStr.trim();
      }
    }
    
    return `Información normalizada exitosamente. Datos estandarizados según formatos colombianos:\n${JSON.stringify(normalizedData, null, 2)}`;
    
  } catch (error) {
    console.error('Error normalizing information:', error);
    return `Error al normalizar la información: ${error.message}`;
  }
}

async function handleRequestClarification(args: any) {
  console.log('Requesting clarification:', args);
  
  return `Necesito una aclaración sobre ${args.field || 'un campo'}: ${args.question}`;
}

async function handleStoreCollectedData(
  supabase: any,
  args: any,
  openaiAgentId: string,
  threadId: string
) {
  console.log('Storing collected data:', { threadId, keys: Object.keys(args?.data || {}) });
  try {
    const merge = args?.merge !== false; // default true
    const newData = args?.data || {};

    // Get existing conversation for this thread
    const { data: existing, error: fetchErr } = await supabase
      .from('agent_conversations')
      .select('id, conversation_data')
      .eq('openai_agent_id', openaiAgentId)
      .eq('thread_id', threadId)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Could not fetch existing conversation, continuing:', fetchErr.message);
    }

    const existingData = existing?.conversation_data?.collected_data || {};
    const collected_data = merge ? { ...existingData, ...newData } : newData;

    const conversation_data = {
      ...(existing?.conversation_data || {}),
      collected_data
    };

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from('agent_conversations')
        .update({ conversation_data, status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await supabase
        .from('agent_conversations')
        .insert({
          openai_agent_id: openaiAgentId,
          thread_id: threadId,
          conversation_data,
          status: 'active'
        });
      if (insErr) throw insErr;
    }

    return `Datos guardados (${Object.keys(collected_data).length} campos).`;
  } catch (error) {
    console.error('Error storing collected data:', error);
    return `Error al guardar datos: ${error.message}`;
  }
}

async function handleSearchLegalSources(supabase: any, args: any) {
  console.log('Searching legal sources:', args);
  
  try {
    const { query, legal_area, source_type } = args;
    
    // Call the search-legal-sources edge function
    const { data, error } = await supabase.functions.invoke('search-legal-sources', {
      body: { 
        query, 
        legal_area, 
        source_type,
        include_kb_urls: true 
      }
    });
    
    if (error) {
      console.error('Error calling search-legal-sources:', error);
      return `Error al buscar fuentes legales: ${error.message}`;
    }
    
    if (!data || !data.success) {
      return 'No se pudieron obtener resultados de la búsqueda legal.';
    }
    
    const results = data.results;
    let response = `📚 RESULTADOS DE BÚSQUEDA LEGAL: "${query}"${legal_area ? ` (${legal_area})` : ''}\n\n`;
    
    // Add knowledge base URLs (official sources)
    if (results.knowledge_base_urls && results.knowledge_base_urls.length > 0) {
      response += '🏛️ FUENTES OFICIALES AUTORIZADAS:\n';
      
      const urlsByCategory = results.knowledge_base_urls.reduce((acc: any, url: any) => {
        if (!acc[url.category]) acc[url.category] = [];
        acc[url.category].push(url);
        return acc;
      }, {});
      
      const categoryNames: Record<string, string> = {
        'legislacion': 'LEGISLACIÓN Y NORMATIVIDAD',
        'jurisprudencia': 'JURISPRUDENCIA Y DECISIONES JUDICIALES',
        'normatividad': 'NORMATIVIDAD LOCAL Y DISTRITAL',
        'doctrina': 'DOCTRINA JURÍDICA',
        'general': 'FUENTES GENERALES'
      };
      
      Object.entries(urlsByCategory).forEach(([category, urls]: [string, any]) => {
        response += `\n**${categoryNames[category] || category.toUpperCase()}:**\n`;
        urls.slice(0, 3).forEach((url: any) => {
          response += `• ${url.url}${url.description ? ` - ${url.description}` : ''}\n`;
        });
      });
      
      response += '\n';
    }
    
    // Add web search results
    if (results.web_results && results.web_results.length > 0) {
      response += '🔍 RESULTADOS DE BÚSQUEDA EN LÍNEA (Priorizados por relevancia oficial):\n\n';
      
      results.web_results.slice(0, 5).forEach((result: any, idx: number) => {
        const isOfficial = result.link.includes('gov.co');
        response += `${idx + 1}. ${isOfficial ? '🏛️ ' : ''}**${result.title}**\n`;
        response += `   ${result.snippet}\n`;
        response += `   🔗 ${result.link}\n\n`;
      });
    }
    
    // Add answer box if available
    if (results.answer_box) {
      response += '💡 RESPUESTA DIRECTA:\n';
      response += `${results.answer_box.answer}\n`;
      response += `Fuente: ${results.answer_box.source}\n\n`;
    }
    
    // Add knowledge graph if available
    if (results.knowledge_graph) {
      response += '📖 INFORMACIÓN CONTEXTUAL:\n';
      response += `${results.knowledge_graph.title}\n`;
      response += `${results.knowledge_graph.description}\n\n`;
    }
    
    response += '\n⚠️ IMPORTANTE:\n';
    response += '- Prioriza siempre las fuentes oficiales (.gov.co)\n';
    response += '- Verifica la vigencia de las normas antes de citarlas\n';
    response += '- Usa esta información como guía para orientar al usuario\n';
    response += '- Siempre menciona las fuentes oficiales consultadas\n';
    
    return response;
    
  } catch (error) {
    console.error('Error in handleSearchLegalSources:', error);
    return `Error al buscar fuentes legales: ${error.message}`;
  }
}
