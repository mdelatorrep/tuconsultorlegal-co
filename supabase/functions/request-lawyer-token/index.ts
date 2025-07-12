
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

    // Create Supabase client with anon key (public access for inserting requests)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Check if email already has a pending request
    const { data: existingRequest, error: checkError } = await supabase
      .from('lawyer_token_requests')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing requests:', checkError);
      return new Response(
        JSON.stringify({ error: 'Error checking existing requests' }), 
        { 
          status: 500, 
          headers: securityHeaders
        }
      );
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ 
          error: 'Ya existe una solicitud pendiente para este email. Por favor espera la respuesta del administrador.' 
        }), 
        { 
          status: 400, 
          headers: securityHeaders
        }
      );
    }

    // Insert the lawyer token request
    const { data: insertedRequest, error: insertError } = await supabase
      .from('lawyer_token_requests')
      .insert({
        full_name: fullName,
        email: email,
        phone_number: phoneNumber || null,
        law_firm: lawFirm || null,
        specialization: specialization || null,
        years_of_experience: yearsOfExperience || null,
        reason_for_request: reasonForRequest,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lawyer token request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error al enviar la solicitud. Intenta nuevamente.' }), 
        { 
          status: 500, 
          headers: securityHeaders
        }
      );
    }

    console.log('Lawyer token request created successfully:', insertedRequest);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Solicitud enviada exitosamente. Recibirás una respuesta por email una vez que sea revisada por el administrador.',
        requestId: insertedRequest.id
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
