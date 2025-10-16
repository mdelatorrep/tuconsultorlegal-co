import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  template_key?: string;
  document_token_id?: string;
  recipient_type: 'user' | 'lawyer' | 'admin';
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

    const body: SendEmailRequest = await req.json();
    const { to, subject, html, template_key, document_token_id, recipient_type } = body;

    if (!to || !subject || !html || !recipient_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    // Obtener configuración SMTP
    const { data: config, error: configError } = await supabaseClient
      .from('email_configuration')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Error getting email config:', configError);
      return new Response(
        JSON.stringify({ error: 'Email configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    if (!smtpPassword) {
      console.error('SMTP_PASSWORD not configured');
      return new Response(
        JSON.stringify({ error: 'SMTP password not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear log inicial
    const { data: logData, error: logError } = await supabaseClient
      .from('email_notifications_log')
      .insert({
        document_token_id,
        recipient_email: to,
        recipient_type,
        template_key: template_key || 'custom',
        subject,
        status: 'pending'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating log:', logError);
    }

    const logId = logData?.id;

    try {
      console.log(`Connecting to SMTP server: ${config.smtp_host}:${config.smtp_port}`);
      
      // Crear cliente SMTP con denomailer (versión actualizada)
      const client = new SMTPClient({
        connection: {
          hostname: config.smtp_host,
          port: config.smtp_port,
          tls: config.smtp_secure,
          auth: {
            username: config.smtp_user,
            password: smtpPassword,
          },
        },
      });

      console.log('SMTP connection established, sending email...');

      // Enviar email
      await client.send({
        from: `${config.smtp_from_name} <${config.smtp_from_email}>`,
        to: to,
        subject: subject,
        content: 'auto',
        html: html,
      });

      // Cerrar conexión
      await client.close();

      console.log(`Email sent successfully to ${to}`);
      
      // Actualizar log como exitoso
      if (logId) {
        await supabaseClient
          .from('email_notifications_log')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', logId);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      
      // Actualizar log como fallido
      if (logId) {
        await supabaseClient
          .from('email_notifications_log')
          .update({
            status: 'failed',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          .eq('id', logId);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError instanceof Error ? emailError.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
