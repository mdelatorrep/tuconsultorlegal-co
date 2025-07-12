
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

    // For now, we'll just return a success response since we don't have the database table
    // In a real implementation, you would save this to a database table
    console.log('Lawyer token request received:', {
      fullName,
      email,
      phoneNumber,
      lawFirm,
      specialization,
      yearsOfExperience,
      reasonForRequest
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Solicitud enviada exitosamente. Recibirás una respuesta por email una vez que sea revisada por el administrador.',
        requestId: 'temp-' + Date.now() // Temporary ID
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
