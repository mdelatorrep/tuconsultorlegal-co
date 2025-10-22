import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authToken = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return new Response(JSON.stringify({ error: 'No token provided', hasAccess: false }), {
        status: 401,
        headers: securityHeaders
      })
    }

    // Verify JWT token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token', hasAccess: false }), {
        status: 401,
        headers: securityHeaders
      })
    }

    const { requiredRole, action } = await req.json()

    // Check if user is a lawyer
    const { data: lawyerProfile } = await supabase
      .from('lawyer_profiles')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    // Check if user is a regular user
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    let userType = 'guest'
    let hasAccess = false
    let permissions = {}

    if (lawyerProfile) {
      userType = 'lawyer'
      permissions = {
        can_create_agents: lawyerProfile.can_create_agents || false,
        can_create_blogs: lawyerProfile.can_create_blogs || false,
        can_use_ai_tools: lawyerProfile.can_use_ai_tools || false
      }
      
      // Validate access based on required role
      if (requiredRole === 'lawyer') {
        hasAccess = true
      } else if (requiredRole === 'user') {
        hasAccess = false
        // Log unauthorized access attempt
        await supabase.rpc('log_security_event', {
          event_type: 'unauthorized_access_attempt',
          user_identifier: user.email,
          details: {
            action,
            user_type: userType,
            required_role: requiredRole,
            user_id: user.id
          }
        })
      }
    } else if (userProfile) {
      userType = 'user'
      
      // Validate access based on required role
      if (requiredRole === 'user') {
        hasAccess = true
      } else if (requiredRole === 'lawyer') {
        hasAccess = false
        // Log unauthorized access attempt
        await supabase.rpc('log_security_event', {
          event_type: 'unauthorized_access_attempt',
          user_identifier: user.email,
          details: {
            action,
            user_type: userType,
            required_role: requiredRole,
            user_id: user.id
          }
        })
      }
    }

    // Log successful access
    if (hasAccess) {
      await supabase.rpc('log_security_event', {
        event_type: 'access_granted',
        user_identifier: user.email,
        details: {
          action,
          user_type: userType,
          required_role: requiredRole,
          user_id: user.id
        }
      })
    }

    return new Response(JSON.stringify({
      hasAccess,
      userType,
      permissions,
      user: {
        id: user.id,
        email: user.email
      }
    }), {
      headers: securityHeaders
    })

  } catch (error) {
    console.error('User access validation error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      hasAccess: false 
    }), {
      status: 500,
      headers: securityHeaders
    })
  }
})
