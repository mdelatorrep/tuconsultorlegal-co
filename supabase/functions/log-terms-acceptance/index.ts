import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TermsAcceptanceRequest {
  user_id?: string;
  user_type: 'user' | 'lawyer' | 'anonymous';
  user_email: string;
  user_name?: string;
  acceptance_type: 'registration' | 'document_creation' | 'subscription' | 'profile_update';
  acceptance_context?: string;
  terms_version?: string;
  privacy_policy_version?: string;
  data_processing_consent: boolean;
  intellectual_property_consent?: boolean;
  marketing_consent?: boolean;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener IP del cliente
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Obtener User Agent
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Parsear el body de la request
    const body: TermsAcceptanceRequest = await req.json();

    // Validar campos requeridos
    if (!body.user_email || !body.user_type || !body.acceptance_type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['user_email', 'user_type', 'acceptance_type']
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar data_processing_consent
    if (typeof body.data_processing_consent !== 'boolean') {
      return new Response(
        JSON.stringify({ 
          error: 'data_processing_consent must be a boolean'
        }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📝 Registering terms acceptance for ${body.user_email} (${body.user_type}) - ${body.acceptance_type}`);

    // Insertar el registro de auditoría
    const { data, error } = await supabase
      .from('terms_acceptance_audit')
      .insert({
        user_id: body.user_id || null,
        user_type: body.user_type,
        user_email: body.user_email,
        user_name: body.user_name || null,
        acceptance_type: body.acceptance_type,
        acceptance_context: body.acceptance_context || null,
        terms_version: body.terms_version || '1.0',
        privacy_policy_version: body.privacy_policy_version || '1.0',
        data_processing_consent: body.data_processing_consent,
        intellectual_property_consent: body.intellectual_property_consent || null,
        marketing_consent: body.marketing_consent || false,
        ip_address: clientIP,
        user_agent: userAgent,
        device_info: {
          userAgent: userAgent,
          timestamp: new Date().toISOString()
        },
        metadata: body.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting terms acceptance:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to log terms acceptance',
          details: error.message
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Terms acceptance logged successfully for ${body.user_email}. Record ID: ${data.id}`);

    // También registrar en el log de seguridad general
    await supabase
      .from('security_audit_log')
      .insert({
        event_type: 'terms_accepted',
        user_identifier: body.user_email,
        details: {
          acceptance_type: body.acceptance_type,
          user_type: body.user_type,
          terms_version: body.terms_version || '1.0',
          audit_record_id: data.id
        },
        ip_address: clientIP
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        audit_id: data.id,
        message: 'Terms acceptance logged successfully'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in log-terms-acceptance:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
