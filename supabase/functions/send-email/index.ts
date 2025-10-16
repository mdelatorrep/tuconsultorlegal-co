import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
      // Enviar email usando SMTP
      const emailBody = `From: ${config.smtp_from_name} <${config.smtp_from_email}>\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subject}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `Content-Type: text/html; charset=utf-8\r\n\r\n` +
        html;

      const command = new Deno.Command('openssl', {
        args: [
          's_client',
          '-connect',
          `${config.smtp_host}:${config.smtp_port}`,
          '-crlf',
          '-quiet'
        ],
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'piped'
      });

      const process = command.spawn();
      const writer = process.stdin.getWriter();
      
      const encoder = new TextEncoder();
      
      // Enviar comandos SMTP
      await writer.write(encoder.encode(`EHLO localhost\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`AUTH LOGIN\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`${btoa(config.smtp_user)}\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`${btoa(smtpPassword)}\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`MAIL FROM:<${config.smtp_from_email}>\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`RCPT TO:<${to}>\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`DATA\r\n`));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(emailBody + '\r\n.\r\n'));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await writer.write(encoder.encode(`QUIT\r\n`));
      
      await writer.close();
      
      const { code } = await process.status;

      if (code === 0) {
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
      } else {
        throw new Error('SMTP command failed');
      }
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
