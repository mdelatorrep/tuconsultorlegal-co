import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, requestedType } = await req.json();

    if (!email || !requestedType) {
      return new Response(
        JSON.stringify({ 
          error: 'Email y tipo de usuario son requeridos',
          canRegister: false 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Validating user type:', { email, requestedType });

    // Check if email already exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error checking auth users:', authError);
      throw authError;
    }

    const existingAuthUser = authUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingAuthUser) {
      // User already exists, check their type
      const userMetadata = existingAuthUser.raw_user_meta_data || {};
      const existingType = userMetadata.is_lawyer ? 'lawyer' : 'user';
      
      console.log('User exists with type:', existingType);
      
      if (existingType !== requestedType) {
        return new Response(
          JSON.stringify({ 
            error: existingType === 'lawyer' 
              ? 'Este email ya está registrado como abogado. Por favor inicia sesión en el portal de abogados.'
              : 'Este email ya está registrado como usuario. Por favor inicia sesión en el portal de usuarios.',
            canRegister: false,
            existingType,
            loginUrl: existingType === 'lawyer' ? '/auth-abogados' : '/'
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Este email ya está registrado. Por favor inicia sesión.',
          canRegister: false,
          existingType,
          shouldLogin: true
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check in lawyer_profiles table
    const { data: lawyerProfile } = await supabase
      .from('lawyer_profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (lawyerProfile && requestedType !== 'lawyer') {
      return new Response(
        JSON.stringify({ 
          error: 'Este email ya está registrado como abogado. Por favor inicia sesión en el portal de abogados.',
          canRegister: false,
          existingType: 'lawyer',
          loginUrl: '/auth-abogados'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check in user_profiles table
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userProfile && requestedType !== 'user') {
      return new Response(
        JSON.stringify({ 
          error: 'Este email ya está registrado como usuario. Por favor inicia sesión.',
          canRegister: false,
          existingType: 'user',
          loginUrl: '/'
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Email is available for the requested type
    return new Response(
      JSON.stringify({ 
        canRegister: true,
        message: 'Email disponible para registro'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in validate-user-type:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        canRegister: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
