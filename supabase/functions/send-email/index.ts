import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  bcc?: string;
  subject: string;
  html: string;
  template_key?: string;
  document_token_id?: string;
  recipient_type: 'user' | 'lawyer' | 'admin';
  variables?: Record<string, string>;
}

// Función para reemplazar variables en el template
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

function sanitizeHeaderValue(value: string | null | undefined): string {
  return (value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getFromConfig(config: { smtp_from_email?: string | null; smtp_from_name?: string | null }) {
  const address = sanitizeHeaderValue(config.smtp_from_email);
  const name = sanitizeHeaderValue(config.smtp_from_name);

  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error('Invalid SMTP from email configuration');
  }

  return {
    address,
    name: name || undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: SendEmailRequest = await req.json();
    const { to, bcc, subject, html, template_key, document_token_id, recipient_type, variables } = body;

    if (!to || !recipient_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to and recipient_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalSubject = subject;
    let finalHtml = html;

    // Si se proporciona template_key y no hay HTML, cargar la plantilla de la base de datos
    if (template_key && (!html || html.trim() === '')) {
      console.log(`Loading email template: ${template_key}`);
      
      const { data: templateData, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('subject, html_body')
        .eq('template_key', template_key)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        console.error('Error loading template:', templateError);
        return new Response(
          JSON.stringify({ error: `Email template '${template_key}' not found or inactive` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalSubject = templateData.subject;
      finalHtml = templateData.html_body;

      // Reemplazar variables si se proporcionan
      if (variables && Object.keys(variables).length > 0) {
        finalSubject = replaceVariables(finalSubject, variables);
        finalHtml = replaceVariables(finalHtml, variables);
      }
    }

    // Validar que tenemos subject y html después de cargar plantilla
    if (!finalSubject || !finalHtml) {
      return new Response(
        JSON.stringify({ error: 'Missing subject or html content. Either provide html directly or use a valid template_key with variables.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending email to ${to} with subject: ${finalSubject}`);

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
        subject: finalSubject,
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

      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
          user: config.smtp_user,
          pass: smtpPassword,
        },
      });

      // Limpiar espacios en blanco al final de cada línea para evitar "=20" en quoted-printable
      const cleanedHtml = finalHtml
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');

      const fromConfig = getFromConfig(config);
      const sanitizedTo = sanitizeHeaderValue(to);
      const sanitizedSubject = sanitizeHeaderValue(finalSubject);
      const textVersion = stripHtml(cleanedHtml) || 'Mensaje de Praxis Hub';

      console.log(`Using From address: ${fromConfig.name ? `${fromConfig.name} <${fromConfig.address}>` : fromConfig.address}`);

      await transporter.sendMail({
        from: fromConfig,
        sender: fromConfig,
        replyTo: fromConfig.address,
        to: sanitizedTo,
        subject: sanitizedSubject,
        html: cleanedHtml,
        text: textVersion,
        envelope: {
          from: fromConfig.address,
          to: [sanitizedTo],
        },
      });

      transporter.close();

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
