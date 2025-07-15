import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { conversation, template_content, document_name, user_email, user_name, sla_hours } = await req.json();

    if (!conversation || !template_content) {
      return new Response(
        JSON.stringify({ error: 'Conversation and template_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating document from conversation for:', document_name);

    const prompt = `Basándose en la siguiente conversación con el usuario, genera el contenido del documento legal utilizando la plantilla proporcionada.

CONVERSACIÓN:
${conversation.map((msg: any) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`).join('\n')}

PLANTILLA DEL DOCUMENTO:
${template_content}

INSTRUCCIONES:
1. Extrae toda la información relevante de la conversación
2. Completa la plantilla reemplazando los placeholders con la información obtenida
3. Si falta información crítica, indica qué información falta
4. Mantén el formato legal profesional
5. Asegúrate de que el documento sea coherente y completo
6. El documento debe cumplir con la legislación colombiana

Genera únicamente el contenido final del documento, sin explicaciones adicionales:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto abogado colombiano especializado en redacción de documentos legales. Tu tarea es generar documentos completos y profesionales basándose en conversaciones con usuarios.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const documentContent = data.choices[0]?.message?.content?.trim();

    if (!documentContent) {
      throw new Error('No document content generated');
    }

    // Now create the document token with the generated content
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate unique token
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Calculate SLA deadline
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (sla_hours || 4) * 60 * 60 * 1000);

    // Create document token record
    const { data: tokenData, error } = await supabase
      .from('document_tokens')
      .insert({
        token,
        document_type: document_name,
        document_content: documentContent,
        user_email: user_email,
        user_name: user_name,
        price: 50000, // Default price, should be calculated from agent
        sla_hours: sla_hours || 4,
        sla_deadline: slaDeadline.toISOString(),
        status: 'solicitado',
        sla_status: 'on_time'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document token:', error);
      throw new Error('Failed to create document token');
    }

    console.log('Document generated and token created successfully');

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