import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { 
      fullName, 
      email, 
      phoneNumber, 
      lawFirm, 
      specialization, 
      yearsOfExperience, 
      reasonForRequest 
    } = await req.json()

    // Input validation
    if (!fullName || !email || !reasonForRequest) {
      return new Response(
        JSON.stringify({ error: 'Full name, email, and reason for request are required' }), 
        { 
          status: 400, 
          headers: securityHeaders
        }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { 
          status: 400, 
          headers: securityHeaders
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get client IP for logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Check if email already has a pending or approved request
    const { data: existingRequest, error: checkError } = await supabase
      .from('lawyer_token_requests')
      .select('id, status')
      .eq('email', email)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
      console.error('Error checking existing requests:', checkError)
      return new Response(
        JSON.stringify({ error: 'Database error occurred' }), 
        { 
          status: 500, 
          headers: securityHeaders
        }
      );
    }

    if (existingRequest) {
      const status = existingRequest.status === 'pending' ? 'pendiente de revisión' : 'ya aprobada'
      return new Response(
        JSON.stringify({ 
          error: `Ya existe una solicitud ${status} para este email. Contacta al administrador si necesitas ayuda.` 
        }), 
        { 
          status: 409, 
          headers: securityHeaders
        }
      );
    }

    // Create the token request
    const { data: request, error: createError } = await supabase
      .from('lawyer_token_requests')
      .insert({
        full_name: fullName,
        email: email,
        phone_number: phoneNumber,
        law_firm: lawFirm,
        specialization: specialization,
        years_of_experience: yearsOfExperience,
        reason_for_request: reasonForRequest,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating token request:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create request. Please try again.' }), 
        { 
          status: 500, 
          headers: securityHeaders
        }
      );
    }

    // Log the request
    await supabase.rpc('log_security_event', {
      event_type: 'lawyer_token_request_created',
      details: { 
        request_id: request.id,
        email: email,
        full_name: fullName,
        law_firm: lawFirm,
        ip: clientIP,
        user_agent: userAgent
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Solicitud enviada exitosamente. Recibirás una respuesta por email una vez que sea revisada por el administrador.',
        requestId: request.id
      }), 
      { headers: securityHeaders }
    );

  } catch (error) {
    console.error('Error in request-lawyer-token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: securityHeaders
      }
    );
  }
});