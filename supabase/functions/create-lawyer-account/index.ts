import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Email, password y nombre son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== CREATE LAWYER ACCOUNT START ===')
    console.log('Email:', email)

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if email already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: 'Error verificando usuarios existentes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (existingUser) {
      const isLawyer = existingUser.user_metadata?.is_lawyer === true
      
      if (isLawyer) {
        return new Response(
          JSON.stringify({ error: 'Este email ya está registrado como abogado. Por favor inicia sesión.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Este email ya está registrado como usuario. Por favor usa otro email o contacta soporte.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if exists in lawyer_profiles
    const { data: existingLawyer } = await supabaseAdmin
      .from('lawyer_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingLawyer) {
      return new Response(
        JSON.stringify({ error: 'Este email ya está registrado como abogado.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if exists in user_profiles
    const { data: existingUserProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUserProfile) {
      return new Response(
        JSON.stringify({ error: 'Este email ya está registrado como usuario.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user with admin API...')

    // Create user using admin API (bypasses email confirmation)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        is_lawyer: true,
        can_create_agents: false,
        can_create_blogs: false,
        can_use_ai_tools: false
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message || 'Error al crear la cuenta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser.user) {
      console.error('No user returned from createUser')
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', newUser.user.id)

    // Create lawyer profile
    const { error: profileError } = await supabaseAdmin
      .from('lawyer_profiles')
      .insert({
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        is_active: true,
        active: true,
        can_create_agents: false,
        can_create_blogs: false,
        can_use_ai_tools: false
      })

    if (profileError) {
      console.error('Error creating lawyer profile:', profileError)
      // Don't fail - the trigger might have created it
    }

    console.log('Lawyer account created successfully')

    // Try to send welcome email (non-blocking)
    try {
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('template_key', 'lawyer_welcome')
        .eq('is_active', true)
        .maybeSingle()

      if (template) {
        const baseUrl = req.headers.get('origin') || 'https://tuconsultorlegal.co'
        const dashboardUrl = `${baseUrl}/#abogados`
        const currentYear = new Date().getFullYear().toString()

        const variables: Record<string, string> = {
          lawyer_name: fullName,
          dashboard_url: dashboardUrl,
          current_year: currentYear,
          site_url: baseUrl
        }

        let subject = template.subject
        let html = template.html_body

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          subject = subject.replace(regex, value)
          html = html.replace(regex, value)
        })

        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: email.toLowerCase(),
            subject,
            html,
            template_key: 'lawyer_welcome',
            recipient_type: 'lawyer'
          }
        })
        console.log('Welcome email sent')
      }
    } catch (emailError) {
      console.warn('Could not send welcome email:', emailError)
      // Don't fail the registration
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-lawyer-account:', error)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})