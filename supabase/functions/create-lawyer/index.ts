import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { z } from 'https://esm.sh/zod@3.22.4'

// Configuration and client initialization
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables')
}

// Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

// Validation schema
const CreateLawyerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().optional(),
  canCreateAgents: z.boolean().default(false),
  canCreateBlogs: z.boolean().default(false),
  // canSeeBusinessStats field is not stored in lawyer_tokens table, so we'll ignore it
})

// Response utilities
const createSuccessResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: securityHeaders
  })
}

const createErrorResponse = (error: string, status = 500, details?: string) => {
  return new Response(JSON.stringify({ 
    success: false,
    error,
    ...(details && { details })
  }), {
    status,
    headers: securityHeaders
  })
}

// Structured logger
const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...data }))
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({ level: 'error', message, timestamp: new Date().toISOString(), error: error?.message || error }))
  },
  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...data }))
  }
}

// Generate secure access token (same logic as manage-token-request)
const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let accessToken = '';
  for (let i = 0; i < 10; i++) {
    accessToken += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return accessToken;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    logger.info('Create lawyer function started')
    
    // **SISTEMA UNIFICADO**: Verificar autenticación y autorización del admin
    const authHeader = req.headers.get('authorization');
    logger.info('Auth header received', { hasHeader: !!authHeader, headerPreview: authHeader?.substring(0, 20) + '...' });
    
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    // Create authenticated client using the provided token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          authorization: authHeader
        }
      }
    });

    // Create service client for admin operations
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    
    logger.info('User authentication check', { 
      hasUser: !!authUser, 
      userId: authUser?.id, 
      userEmail: authUser?.email,
      authError: authError?.message 
    });
    
    if (authError || !authUser) {
      logger.error('Authentication failed', authError);
      return createErrorResponse('Invalid authentication', 401);
    }
    
    // Check if user has admin role using service client
    const { data: userRoles, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id)
      .in('role', ['admin', 'super_admin']);
    
    logger.info('Role verification', { 
      userId: authUser.id, 
      foundRoles: userRoles?.map(r => r.role) || [], 
      roleError: roleError?.message 
    });
    
    if (roleError || !userRoles || userRoles.length === 0) {
      logger.error('Admin role verification failed', { userId: authUser.id, roleError });
      return createErrorResponse('Insufficient permissions - Admin role required', 403);
    }
    
    logger.info('Admin authorization verified', { userId: authUser.id, roles: userRoles.map(r => r.role) });

    // Parse and validate request body
    let requestBody
    try {
      const bodyText = await req.text()
      if (!bodyText.trim()) {
        return createErrorResponse('Empty request body', 400)
      }
      requestBody = JSON.parse(bodyText)
    } catch (parseError) {
      logger.error('JSON parse error', parseError)
      return createErrorResponse('Invalid JSON in request body', 400, parseError.message)
    }

    // Validate input with Zod schema
    const validationResult = CreateLawyerSchema.safeParse(requestBody)
    if (!validationResult.success) {
      logger.error('Input validation failed', validationResult.error)
      return createErrorResponse(
        'Invalid input data', 
        400, 
        validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      )
    }

    const { email, name, phone_number, canCreateAgents, canCreateBlogs } = validationResult.data

    logger.info('Input validation passed, creating lawyer account')

    // Check if email already exists
    const { data: existingToken, error: checkError } = await serviceClient
      .from('lawyer_tokens')
      .select('email')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .maybeSingle()

    if (checkError) {
      logger.error('Error checking existing lawyer token', checkError)
      return createErrorResponse('Database error checking existing account', 500)
    }

    if (existingToken) {
      logger.warn('Email already exists', { email })
      return createErrorResponse('Email already exists', 409)
    }

    // Generate secure access token (same logic as manage-token-request)
    const accessToken = generateSecureToken()

    logger.info('Creating lawyer token', { tokenLength: accessToken.length })

    // Create lawyer token with unified system fields
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('lawyer_tokens')
      .insert({
        access_token: accessToken,
        email: email.toLowerCase(),
        full_name: name, // Map name to full_name for database
        phone_number: phone_number || null,
        can_create_agents: canCreateAgents,
        can_create_blogs: canCreateBlogs,
        lawyer_id: crypto.randomUUID(),
        created_by: authUser.id, // Track which admin created this lawyer
        active: true
      })
      .select()
      .single()

    if (tokenError) {
      logger.error('Error creating lawyer token', tokenError)
      return createErrorResponse(
        'Error al crear token de acceso', 
        500, 
        tokenError.message
      )
    }

    logger.info('Lawyer token created successfully', { email, createdBy: authUser.id })

    return createSuccessResponse({
      lawyer: {
        ...tokenData,
        access_token: accessToken // Return the token for admin reference
      }
    }, 201)

  } catch (error) {
    logger.error('Unexpected error in create lawyer function', error)
    return createErrorResponse('Internal server error', 500, error?.message)
  }
})