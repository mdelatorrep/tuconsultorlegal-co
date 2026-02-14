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

// Mapeo expandido: cada estado puede tener múltiples destinatarios
const STATUS_TO_TEMPLATE: Record<string, Array<{ key: string; recipient: 'user' | 'lawyer' | 'admin' }>> = {
  'solicitado': [
    { key: 'document_requested', recipient: 'admin' },
    { key: 'document_confirmation_user', recipient: 'user' }
  ],
  'en_revision_abogado': [
    { key: 'lawyer_new_assignment', recipient: 'lawyer' },
    { key: 'document_in_review', recipient: 'user' }
  ],
  'revision_usuario': [
    { key: 'document_ready_for_review', recipient: 'user' },
    { key: 'lawyer_review_completed', recipient: 'lawyer' }
  ],
  'pagado': [
    { key: 'document_paid', recipient: 'lawyer' },
    { key: 'payment_confirmation_user', recipient: 'user' }
  ],
  'descargado': [
    { key: 'document_downloaded', recipient: 'lawyer' },
    { key: 'download_confirmation_user', recipient: 'user' }
  ]
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
    const { document_token_id, new_status, old_status } = body;

    console.log(`Processing notification for document ${document_token_id}, status: ${new_status}, old_status: ${old_status}`);

    // Fetch the document token details with legal agent info
    const { data: document, error: docError } = await supabaseClient
      .from('document_tokens')
      .select(`
        *,
        legal_agents (
          id,
          name,
          price,
          created_by
        )
      `)
      .eq('id', document_token_id)
      .single();

    if (docError || !document) {
      console.error('Error fetching document:', docError);
      throw new Error('Document not found');
    }

    // ✅ SPECIAL CASE: Detect if user sent observations (en_revision_abogado with user_observations)
    let templateConfigs = STATUS_TO_TEMPLATE[new_status];
    const hasUserObservations = new_status === 'en_revision_abogado' && 
                                document.user_observations && 
                                document.user_observations.trim().length > 0;
    
    if (hasUserObservations) {
      console.log('📝 User observations detected - using special template for lawyer');
      // Override lawyer template to use observations-specific one
      templateConfigs = [
        { key: 'lawyer_user_observations', recipient: 'lawyer' },
        { key: 'document_in_review', recipient: 'user' }
      ];
    }
    
    if (!templateConfigs || templateConfigs.length === 0) {
      console.log(`No email template configured for status: ${new_status}`);
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No notification configured for this status'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${templateConfigs.length} notifications for status: ${new_status}`);

    // Process each notification
    let notificationsSent = 0;
    for (const templateConfig of templateConfigs) {
      try {
        // Fetch the active template
        const { data: template, error: templateError } = await supabaseClient
          .from('email_templates')
          .select('*')
          .eq('template_key', templateConfig.key)
          .eq('is_active', true)
          .maybeSingle();

        if (templateError || !template) {
          console.error(`Email template not found: ${templateConfig.key}`, templateError);
          continue; // Skip to next notification
        }

        // Determine recipient based on config
        let recipientEmail = '';
        let recipientName = '';
        
        if (templateConfig.recipient === 'admin') {
          // Send to configured admin email
          const { data: admin } = await supabaseClient
            .from('admin_profiles')
            .select('email, full_name')
            .eq('active', true)
            .limit(1)
            .maybeSingle();
          
          if (admin) {
            recipientEmail = admin.email;
            recipientName = admin.full_name;
          }
        } else if (templateConfig.recipient === 'user') {
          recipientEmail = document.user_email;
          recipientName = document.user_name;
        } else if (templateConfig.recipient === 'lawyer') {
          // Determine which lawyer to notify based on status
          if (new_status === 'en_revision_abogado' && document.reviewed_by_lawyer_id) {
            // Notify assigned lawyer
            const { data: lawyer } = await supabaseClient
              .from('lawyer_profiles')
              .select('email, full_name')
              .eq('id', document.reviewed_by_lawyer_id)
              .single();
            
            if (lawyer) {
              recipientEmail = lawyer.email;
              recipientName = lawyer.full_name;
            }
          } else if ((new_status === 'revision_usuario' || new_status === 'pagado' || new_status === 'descargado') 
                     && document.reviewed_by_lawyer_id) {
            // Notify reviewing lawyer
            const { data: lawyer } = await supabaseClient
              .from('lawyer_profiles')
              .select('email, full_name')
              .eq('id', document.reviewed_by_lawyer_id)
              .single();
            
            if (lawyer) {
              recipientEmail = lawyer.email;
              recipientName = lawyer.full_name;
            }
          }
        }

        if (!recipientEmail) {
          console.log(`No recipient email available for ${templateConfig.recipient}`);
          continue; // Skip to next notification
        }

        // Prepare template variables
        const variables: Record<string, any> = {
          user_name: document.user_name,
          user_email: document.user_email,
          document_type: document.legal_agents?.name || document.document_type,
          token: document.token,
          price: document.legal_agents?.price || document.price || 0,
          sla_deadline: document.sla_deadline ? new Date(document.sla_deadline).toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'No definido',
          tracking_url: `https://praxis-hub.co/#documento?code=${document.token}`,
          site_url: 'https://praxis-hub.co',
          dashboard_url: 'https://praxis-hub.co/#abogados',
          current_year: new Date().getFullYear().toString(),
          payment_date: new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          lawyer_name: recipientName,
          // ✅ Add observations-specific variables
          observations_summary: document.user_observations || 'Sin observaciones adicionales'
        };

        // Replace variables in subject and body
        const subject = replaceVariables(template.subject, variables);
        const htmlBody = replaceVariables(template.html_body, variables);

        // Invoke send-email function
        const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: recipientEmail,
            subject: subject,
            html: htmlBody,
            template_key: templateConfig.key,
            recipient_type: templateConfig.recipient
          }
        });

        if (emailError) {
          console.error(`Error sending email to ${recipientEmail}:`, emailError);
          continue; // Skip to next notification
        }

        notificationsSent++;
        console.log(`✅ Email sent to ${recipientEmail} (${templateConfig.recipient}) - Template: ${templateConfig.key}`);

      } catch (notificationError) {
        console.error(`Error processing notification for ${templateConfig.key}:`, notificationError);
        continue; // Continue with other notifications
      }
    }

    // Special case: If document was created from an agent, notify the agent creator
    if (new_status === 'solicitado' && document.legal_agent_id && document.legal_agents?.created_by) {
      try {
        const { data: creatorLawyer } = await supabaseClient
          .from('lawyer_profiles')
          .select('email, full_name')
          .eq('id', document.legal_agents.created_by)
          .single();

        if (creatorLawyer) {
          const { data: agentTemplate } = await supabaseClient
            .from('email_templates')
            .select('*')
            .eq('template_key', 'lawyer_document_from_agent')
            .eq('is_active', true)
            .maybeSingle();

          if (agentTemplate) {
            const { data: agentStats } = await supabaseClient
              .from('legal_agents')
              .select('openai_conversations_count, openai_success_rate')
              .eq('id', document.legal_agent_id)
              .single();

            const agentVariables = {
              lawyer_name: creatorLawyer.full_name,
              agent_name: document.legal_agents.name,
              document_type: document.legal_agents.name,
              token: document.token,
              user_name: document.user_name,
              user_email: document.user_email,
              total_documents: agentStats?.openai_conversations_count || 0,
              success_rate: Math.round(agentStats?.openai_success_rate || 0),
              dashboard_url: 'https://praxis-hub.co/#abogados?view=agentes',
              current_year: new Date().getFullYear().toString()
            };

            const agentSubject = replaceVariables(agentTemplate.subject, agentVariables);
            const agentHtml = replaceVariables(agentTemplate.html_body, agentVariables);

            await supabaseClient.functions.invoke('send-email', {
              body: {
                to: creatorLawyer.email,
                subject: agentSubject,
                html: agentHtml,
                template_key: 'lawyer_document_from_agent',
                recipient_type: 'lawyer'
              }
            });

            notificationsSent++;
            console.log(`✅ Agent creator notification sent to ${creatorLawyer.email}`);
          }
        }
      } catch (agentNotificationError) {
        console.error('Error sending agent creator notification:', agentNotificationError);
        // Don't throw, this is optional
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'All notifications processed successfully',
      notifications_sent: notificationsSent
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in notify-document-status-change:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});