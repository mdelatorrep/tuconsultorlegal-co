import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildOpenAIRequestParams, logModelRequest } from "../_shared/openai-model-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to get system configuration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .maybeSingle();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4.1-2025-04-14'
      : configData.config_value;

    logModelRequest(selectedModel, 'generate-document-from-chat');

    const { conversation, template_content, document_name, user_email, user_name, user_id, sla_hours, collected_data, placeholder_fields, price, legal_agent_id } = await req.json();

    if (!conversation || !template_content) {
      return new Response(
        JSON.stringify({ error: 'Conversation and template_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating document from conversation for:', document_name);

    // Build additional context from collected data
    let additionalContext = '';
    if (collected_data) {
      additionalContext = `\n\nDATOS ESTRUCTURADOS EXTRAÍDOS:\n${JSON.stringify(collected_data, null, 2)}`;
    }

    if (placeholder_fields && Array.isArray(placeholder_fields)) {
      additionalContext += `\n\nPLACEHOLDERS DISPONIBLES EN LA PLANTILLA:\n${placeholder_fields.map(field => `- {{${field.field || field.name}}}: ${field.description}`).join('\n')}`;
    }

    const prompt = `Basándose en la siguiente conversación con el usuario, genera el contenido del documento legal utilizando EXACTAMENTE la plantilla proporcionada y completando todos los placeholders.

CONVERSACIÓN:
${conversation.map((msg: any) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`).join('\n')}
${additionalContext}

PLANTILLA DEL DOCUMENTO (USAR EXACTAMENTE ESTA PLANTILLA):
${template_content}

INSTRUCCIONES CRÍTICAS:
1. USA LA PLANTILLA EXACTA proporcionada arriba como base del documento
2. Identifica TODOS los placeholders en formato {{NOMBRE_PLACEHOLDER}} en la plantilla
3. Extrae información de la conversación Y los datos estructurados para completar cada placeholder
4. NORMALIZACIÓN OBLIGATORIA:
   - Nombres propios, apellidos: MAYÚSCULAS COMPLETAS (ej: JUAN CARLOS PÉREZ LÓPEZ)
   - Ciudades: MAYÚSCULAS + departamento (ej: BOGOTÁ, CUNDINAMARCA)
   - Departamentos: MAYÚSCULAS COMPLETAS
   - País: siempre agregar COLOMBIA si no se especifica
   - Documentos de identidad: números con puntos separadores (ej: 1.234.567.890)
5. FECHAS: formato DD de MMMM de YYYY (ej: 15 de enero de 2024)
6. DIRECCIONES: normalizar formato con mayúsculas para la ciudad
7. Si algún placeholder no puede completarse, mantenerlo vacío: {{PLACEHOLDER}}
8. Mantén EXACTAMENTE el formato, estructura y contenido legal de la plantilla
9. 🚫 PROHIBIDO: NO AGREGUES títulos, encabezados H1 ni el nombre del documento al inicio. El documento debe comenzar EXACTAMENTE como comienza la plantilla original.
10. NO agregues ni quites texto de la plantilla original
11. Resultado: plantilla original con placeholders reemplazados por información normalizada

FORMATO DE RESPUESTA: Devuelve únicamente el documento final usando la plantilla exacta con los placeholders completados. SIN agregar título ni encabezado.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un experto abogado colombiano especializado en redacción de documentos legales. Tu tarea es generar documentos completos y profesionales basándose en conversaciones con usuarios.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestParams = buildOpenAIRequestParams(selectedModel, messages, {
      maxTokens: 2000,
      temperature: 0.3
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestParams),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let documentContent = data.choices[0]?.message?.content?.trim();

    if (!documentContent) {
      throw new Error('No document content generated');
    }

    // Convert plain text content to structured HTML for consistent rendering
    console.log('Converting document content to structured HTML...');
    
    const hasHtmlStructure = /<(p|div|br|strong|em|h[1-6]|ul|ol|li)[^>]*>/i.test(documentContent);
    
    const cleanEntities = (text: string) => text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    
    if (!hasHtmlStructure) {
      documentContent = cleanEntities(documentContent)
        .replace(/^###\s+(.+)$/gm, '<h3 class="ql-align-left">$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2 class="ql-align-left">$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1 class="ql-align-left">$1</h1>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/__([^_]+)__/g, '<u>$1</u>');
      
      const parts = documentContent.split(/\n\s*\n/);
      documentContent = parts
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0)
        .map(paragraph => {
          if (paragraph.startsWith('<h1') || paragraph.startsWith('<h2') || paragraph.startsWith('<h3') ||
              paragraph.startsWith('<h4') || paragraph.startsWith('<h5') || paragraph.startsWith('<h6')) {
            return paragraph;
          }
          const withBreaks = paragraph.replace(/\n/g, '<br>');
          return `<p class="ql-align-justify">${withBreaks}</p>`;
        })
        .join('\n');
    } else {
      documentContent = cleanEntities(documentContent);
      documentContent = documentContent.replace(
        /<p(?![^>]*class="[^"]*ql-align)([^>]*)>/gi, 
        '<p class="ql-align-justify"$1>'
      );
    }
    
    console.log('Document content converted to HTML structure');

    // Check for unreplaced placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const unreplacedPlaceholders = documentContent.match(placeholderRegex);
    
    if (unreplacedPlaceholders && unreplacedPlaceholders.length > 0) {
      console.warn('⚠️ Found unreplaced placeholders:', unreplacedPlaceholders);
      
      if (collected_data) {
        for (const placeholder of unreplacedPlaceholders) {
          const fieldName = placeholder.replace(/[{}]/g, '');
          const fieldKey = Object.keys(collected_data).find(
            key => key.toLowerCase() === fieldName.toLowerCase()
          );
          
          if (fieldKey && collected_data[fieldKey]) {
            console.log(`Replacing ${placeholder} with value from collected_data`);
            documentContent = documentContent.replace(
              new RegExp(placeholder.replace(/[{}]/g, '\\{\\}'), 'g'),
              collected_data[fieldKey]
            );
          }
        }
      }
      
      const stillUnreplaced = documentContent.match(placeholderRegex);
      if (stillUnreplaced && stillUnreplaced.length > 0) {
        console.error('❌ Still have unreplaced placeholders after retry:', stillUnreplaced);
      }
    }

    // Now create the document token with the generated content
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (sla_hours || 4) * 60 * 60 * 1000);

    const { data: tokenData, error } = await supabase
      .from('document_tokens')
      .insert({
        token,
        document_type: document_name,
        document_content: documentContent,
        user_email: user_email,
        user_name: user_name,
        user_id: user_id || null,
        legal_agent_id: legal_agent_id || null,
        price: price || 0,
        sla_hours: sla_hours || 4,
        sla_deadline: slaDeadline.toISOString(),
        status: 'solicitado',
        sla_status: 'on_time',
        form_data: collected_data || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document token:', error);
      throw new Error('Failed to create document token');
    }

    console.log('Document generated and token created successfully');

    // Send notification email for new document
    try {
      console.log('Sending notification email for document:', tokenData.id);
      const notifyResponse = await supabase.functions.invoke('notify-document-status-change', {
        body: {
          document_token_id: tokenData.id,
          new_status: 'solicitado'
        }
      });

      if (notifyResponse.error) {
        console.error('Error sending notification:', notifyResponse.error);
      } else {
        console.log('Notification sent successfully');
      }
    } catch (notifyError) {
      console.error('Exception sending notification:', notifyError);
    }

    return new Response(
      JSON.stringify({ 
        token,
        document_content: documentContent,
        document_id: tokenData.id,
        sla_deadline: slaDeadline.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-document-from-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
