import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFIK_BASE_URL = 'https://api.verifik.co/v2';

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
    const { documentType, documentNumber, lawyerId } = requestData;

    if (!documentType || !documentNumber) {
      return new Response(
        JSON.stringify({ error: 'documentType and documentNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verifik-lawyer-verification] Verifying lawyer:', { documentType, documentNumber });

    // Service client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call Verifik API - GET /v2/co/rama/abogados
    // Documentation: https://docs.verifik.co/legal/lawyer-verification/
    const params = new URLSearchParams({
      documentType: documentType,
      documentNumber: documentNumber,
    });

    const endpoint = `${VERIFIK_BASE_URL}/co/rama/abogados?${params.toString()}`;
    console.log('[verifik-lawyer-verification] Calling Verifik:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERIFIK_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const verifik_response = await response.json();
    console.log('[verifik-lawyer-verification] Verifik response status:', response.status);

    const apiCost = 0.10; // Track API cost

    // Log API usage
    await serviceClient.from('verifik_api_usage').insert({
      lawyer_id: lawyerId || user.id,
      admin_id: lawyerId ? user.id : null,
      endpoint: '/v2/co/rama/abogados',
      request_params: { documentType, documentNumber },
      response_status: response.status,
      response_data: verifik_response,
      api_cost: apiCost,
    });

    let verificationStatus = 'not_found';
    let lawyerData = null;

    if (response.ok && verifik_response.data) {
      const data = verifik_response.data;
      
      // Map response fields according to Verifik documentation
      lawyerData = {
        firstName: data.firstName || data.nombres,
        lastName: data.lastName || data.apellidos,
        fullName: data.fullName || `${data.nombres || ''} ${data.apellidos || ''}`.trim(),
        professionalStatus: data.professionalStatus || data.estado,
        barNumber: data.barNumber || data.tarjetaProfesional || data.numeroTarjeta,
        specialization: data.specialization || data.especialidad,
        registrationDate: data.registrationDate || data.fechaRegistro,
        isActive: data.isActive ?? (data.estado === 'VIGENTE' || data.professionalStatus === 'Active'),
      };

      verificationStatus = lawyerData.isActive ? 'verified' : 'expired';
    }

    // Store verification result
    const targetLawyerId = lawyerId || user.id;
    
    const verificationRecord = {
      lawyer_id: targetLawyerId,
      verification_type: 'professional_status',
      document_type: documentType,
      document_number: documentNumber,
      verifik_response: verifik_response,
      status: verificationStatus,
      professional_name: lawyerData?.fullName,
      bar_number: lawyerData?.barNumber,
      professional_status: lawyerData?.professionalStatus,
      specialization: lawyerData?.specialization,
      verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
      api_cost: apiCost,
    };

    await serviceClient.from('lawyer_verifications').insert(verificationRecord);

    // Update lawyer profile if verification successful
    if (verificationStatus === 'verified' && lawyerData) {
      await serviceClient
        .from('lawyer_profiles')
        .update({
          is_verified: true,
          verification_date: new Date().toISOString(),
          bar_number: lawyerData.barNumber,
          professional_status: lawyerData.professionalStatus,
        })
        .eq('id', targetLawyerId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        lawyer: lawyerData,
        message: verificationStatus === 'verified' 
          ? 'Abogado verificado exitosamente' 
          : verificationStatus === 'expired'
            ? 'La tarjeta profesional no está vigente'
            : 'No se encontró información del abogado',
        rawResponse: verifik_response,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verifik-lawyer-verification] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error verifying lawyer'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});