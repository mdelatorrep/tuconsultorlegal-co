import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFIK_BASE_URL = 'https://api.verifik.co/v2';

// Quality types for certificate validity
const QUALITY_TYPES = {
  ABG: 'Abogado',
  JUEZPAZ: 'Juez de Paz',
  LT: 'Litigante',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VERIFIK_API_KEY = Deno.env.get('VERIFIK_API_KEY');
    if (!VERIFIK_API_KEY) {
      console.error('VERIFIK_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Verifik API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();
    const { documentType, documentNumber, quality, lawyerId } = requestData;

    if (!documentType || !documentNumber) {
      return new Response(
        JSON.stringify({ error: 'documentType and documentNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verifik-certificate-validity] Checking validity:', { documentType, documentNumber, quality });

    // Service client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call Verifik API - GET /v2/co/rama/certificado/vigencia
    // Documentation: https://docs.verifik.co/legal/certificate-of-validity-for-legal-professionals/
    const params = new URLSearchParams({
      documentType: documentType,
      documentNumber: documentNumber,
    });

    // Add quality parameter if provided (ABG, JUEZPAZ, LT)
    if (quality) {
      params.append('quality', quality);
    }

    const endpoint = `${VERIFIK_BASE_URL}/co/rama/certificado/vigencia?${params.toString()}`;
    console.log('[verifik-certificate-validity] Calling Verifik:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERIFIK_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const verifik_response = await response.json();
    console.log('[verifik-certificate-validity] Verifik response status:', response.status);

    const apiCost = 0.12; // Track API cost

    // Log API usage
    await serviceClient.from('verifik_api_usage').insert({
      lawyer_id: lawyerId || user.id,
      admin_id: lawyerId ? user.id : null,
      endpoint: '/v2/co/rama/certificado/vigencia',
      request_params: { documentType, documentNumber, quality },
      response_status: response.status,
      response_data: verifik_response,
      api_cost: apiCost,
    });

    let verificationStatus = 'not_found';
    let certificateData = null;

    if (response.ok && verifik_response.data) {
      const data = verifik_response.data;
      
      // Map response fields according to Verifik documentation
      certificateData = {
        estado: data.estado || data.status,
        isVigente: data.estado === 'Vigente' || data.isValid === true,
        fechaExpedicion: data.fechaExpedicion || data.issueDate,
        numeroTarjeta: data.numeroTarjeta || data.cardNumber || data.barNumber,
        nombres: data.nombres || data.firstName,
        apellidos: data.apellidos || data.lastName,
        fullName: data.fullName || `${data.nombres || ''} ${data.apellidos || ''}`.trim(),
        tipoCalidad: quality ? QUALITY_TYPES[quality as keyof typeof QUALITY_TYPES] : 'Abogado',
        fechaVencimiento: data.fechaVencimiento || data.expiryDate,
        certificateUrl: data.certificateUrl || data.pdfUrl,
      };

      verificationStatus = certificateData.isVigente ? 'verified' : 'expired';
    }

    // Store verification result
    const targetLawyerId = lawyerId || user.id;
    
    const verificationRecord = {
      lawyer_id: targetLawyerId,
      verification_type: 'certificate_validity',
      document_type: documentType,
      document_number: documentNumber,
      verifik_response: verifik_response,
      status: verificationStatus,
      professional_name: certificateData?.fullName,
      bar_number: certificateData?.numeroTarjeta,
      professional_status: certificateData?.estado,
      certificate_expiry_date: certificateData?.fechaVencimiento,
      verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
      api_cost: apiCost,
    };

    await serviceClient.from('lawyer_verifications').insert(verificationRecord);

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        certificate: certificateData,
        message: verificationStatus === 'verified' 
          ? 'Certificado de vigencia válido' 
          : verificationStatus === 'expired'
            ? 'El certificado no está vigente'
            : 'No se encontró información del certificado',
        rawResponse: verifik_response,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verifik-certificate-validity] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error checking certificate validity'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});