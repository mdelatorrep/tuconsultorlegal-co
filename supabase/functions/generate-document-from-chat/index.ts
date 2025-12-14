import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

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
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to get system config
    const getSystemConfig = async (key: string, defaultValue: string): Promise<string> => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', key)
          .maybeSingle();
        if (error || !data) return defaultValue;
        return data.config_value;
      } catch (e) {
        return defaultValue;
      }
    };

    // Get configured OpenAI model and prompt
    const selectedModel = await getSystemConfig('drafting_ai_model', 'gpt-4.1-2025-04-14');
    const systemPrompt = await getSystemConfig('generate_document_prompt', '');
    
    if (!systemPrompt) {
      console.error('❌ generate_document_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: generate_document_prompt' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    logResponsesRequest(selectedModel, 'generate-document-from-chat', true);

    const { conversation, template_content, document_name, user_email, user_name, user_id, sla_hours, collected_data, placeholder_fields, price, legal_agent_id } = await req.json();

    if (!conversation || !template_content) {
      return new Response(
        JSON.stringify({ error: 'Conversation and template_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Generating document from conversation for:', document_name);

    // Build additional context
    let additionalContext = '';
    if (collected_data) {
      additionalContext = `\n\nDATOS ESTRUCTURADOS EXTRAÍDOS:\n${JSON.stringify(collected_data, null, 2)}`;
    }
    if (placeholder_fields && Array.isArray(placeholder_fields)) {
      additionalContext += `\n\nPLACEHOLDERS DISPONIBLES:\n${placeholder_fields.map(field => `- {{${field.field || field.name}}}: ${field.description}`).join('\n')}`;
    }

    const instructions = systemPrompt;

    const input = `Basándose en la siguiente conversación con el usuario, genera el contenido del documento legal utilizando EXACTAMENTE la plantilla proporcionada y completando todos los placeholders.

CONVERSACIÓN:
${conversation.map((msg: any) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`).join('\n')}
${additionalContext}

PLANTILLA DEL DOCUMENTO (USAR EXACTAMENTE ESTA PLANTILLA):
${template_content}

INSTRUCCIONES CRÍTICAS:
1. USA LA PLANTILLA EXACTA proporcionada como base
2. Identifica TODOS los placeholders {{NOMBRE_PLACEHOLDER}}
3. NORMALIZACIÓN OBLIGATORIA:
   - Nombres propios: MAYÚSCULAS COMPLETAS
   - Ciudades: MAYÚSCULAS + departamento
   - Documentos de identidad: números con puntos separadores
4. FECHAS: formato DD de MMMM de YYYY
5. 🚫 PROHIBIDO: NO AGREGUES títulos, encabezados H1 ni el nombre del documento al inicio
6. El documento debe comenzar EXACTAMENTE como comienza la plantilla original
7. NO agregues ni quites texto de la plantilla original

FORMATO DE RESPUESTA: Devuelve únicamente el documento final usando la plantilla exacta con los placeholders completados.`;

    const params = buildResponsesRequestParams(selectedModel, {
      input,
      instructions,
      maxOutputTokens: 2000,
      temperature: 0.3,
      store: false
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Document generation failed: ${result.error}`);
    }

    let documentContent = (result.text || '').trim();

    if (!documentContent) {
      throw new Error('No document content generated');
    }

    // Convert plain text content to structured HTML
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

    // Check for unreplaced placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const unreplacedPlaceholders = documentContent.match(placeholderRegex);
    
    if (unreplacedPlaceholders && collected_data) {
      for (const placeholder of unreplacedPlaceholders) {
        const fieldName = placeholder.replace(/[{}]/g, '');
        const fieldKey = Object.keys(collected_data).find(
          key => key.toLowerCase() === fieldName.toLowerCase()
        );
        
        if (fieldKey && collected_data[fieldKey]) {
          documentContent = documentContent.replace(
            new RegExp(placeholder.replace(/[{}]/g, '\\{\\}'), 'g'),
            collected_data[fieldKey]
          );
        }
      }
    }

    // Create the document token
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

    console.log('✅ Document generated and token created successfully');

    // Send notification email
    try {
      const notifyResponse = await supabase.functions.invoke('notify-document-status-change', {
        body: { document_token_id: tokenData.id, new_status: 'solicitado' }
      });

      if (notifyResponse.error) {
        console.error('Error sending notification:', notifyResponse.error);
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
    console.error('❌ Error in generate-document-from-chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
