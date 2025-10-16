import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  document_token_id: string;
  new_status: string;
  old_status?: string;
}

// Mapeo de estados a plantillas
const STATUS_TO_TEMPLATE: Record<string, { key: string; recipient: 'user' | 'lawyer' | 'admin' }> = {
  'solicitado': { key: 'document_requested', recipient: 'admin' },
  'en_revision_abogado': { key: 'document_in_review', recipient: 'user' },
  'revision_usuario': { key: 'document_ready_for_review', recipient: 'user' },
  'pagado': { key: 'document_paid', recipient: 'lawyer' },
  'descargado': { key: 'document_downloaded', recipient: 'lawyer' }
};

function replaceVariables(text: string, variables: Record<string, any>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: NotifyRequest = await req.json();
    const { document_token_id, new_status } = body;

    console.log(`Processing notification for document ${document_token_id}, status: ${new_status}`);

    // Verificar si debemos enviar notificación para este estado
    const templateConfig = STATUS_TO_TEMPLATE[new_status];
    if (!templateConfig) {
      console.log(`No template configured for status: ${new_status}`);
      return new Response(
        JSON.stringify({ message: 'No notification needed for this status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del documento
    const { data: document, error: docError } = await supabaseClient
      .from('document_tokens')
      .select('*')
      .eq('id', document_token_id)
      .single();

    if (docError || !document) {
      console.error('Error fetching document:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener plantilla
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_key', templateConfig.key)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Error fetching template:', templateError);
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar destinatario
    let recipientEmail = '';
    let recipientName = '';

    if (templateConfig.recipient === 'user') {
      recipientEmail = document.user_email || '';
      recipientName = document.user_name || 'Usuario';
    } else if (templateConfig.recipient === 'lawyer' && document.reviewed_by_lawyer_id) {
      // Obtener datos del abogado
      const { data: lawyer } = await supabaseClient
        .from('lawyer_profiles')
        .select('email, full_name')
        .eq('id', document.reviewed_by_lawyer_id)
        .single();

      if (lawyer) {
        recipientEmail = lawyer.email;
        recipientName = lawyer.full_name;
      }
    } else if (templateConfig.recipient === 'admin') {
      // Obtener primer admin activo
      const { data: admin } = await supabaseClient
        .from('admin_profiles')
        .select('email, full_name')
        .eq('active', true)
        .limit(1)
        .single();

      if (admin) {
        recipientEmail = admin.email;
        recipientName = admin.full_name;
      }
    }

    if (!recipientEmail) {
      console.error('No recipient email found');
      return new Response(
        JSON.stringify({ error: 'No recipient found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar variables para la plantilla
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '').replace('https://', '') || '';
    const trackingUrl = `https://${baseUrl}.lovable.app/#documento?code=${encodeURIComponent(document.token)}`;
    const dashboardUrl = `https://${baseUrl}.lovable.app/#admin`;

    const variables: Record<string, any> = {
      user_name: document.user_name || 'Usuario',
      user_email: document.user_email || '',
      document_type: document.document_type,
      tracking_code: document.token,
      price: document.price?.toLocaleString('es-CO') || '0',
      created_at: new Date(document.created_at).toLocaleDateString('es-CO'),
      tracking_url: trackingUrl,
      dashboard_url: dashboardUrl,
      lawyer_name: recipientName,
      sla_hours: document.sla_hours || 4
    };

    // Reemplazar variables en subject y body
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.html_body, variables);

    console.log(`Sending email to ${recipientEmail}`);

    // Llamar a send-email
    const { error: sendError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject,
        html,
        template_key: template.template_key,
        document_token_id,
        recipient_type: templateConfig.recipient
      }
    });

    if (sendError) {
      console.error('Error calling send-email:', sendError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: sendError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Notification sent successfully to ${recipientEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-document-status-change:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
