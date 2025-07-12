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
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone_number: z.string().optional(),
  can_create_agents: z.boolean().default(false),
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

// Cryptographically secure token generation
const generateSecureToken = (nameSlug: string): string => {
  const randomBytes = new Uint8Array(6)
  crypto.getRandomValues(randomBytes)
  const randomSuffix = Array.from(randomBytes, byte => 
    byte.toString(36).toUpperCase()
  ).join('').substring(0, 8)
  return `${nameSlug}${randomSuffix}`.toUpperCase()
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
    // Debug: Log environment variables status
    logger.info('Environment check', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
    })
    
    logger.info('Create lawyer function started')
    
    // Get authorization header
    const authHeader = req.headers.get('authorization')
    logger.info('Authorization header received', { hasHeader: !!authHeader, headerStart: authHeader?.substring(0, 10) })
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('No authorization header found or invalid format')
      return createErrorResponse('Authorization header required', 401)
    }

    // Create clients
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user authentication
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    
    if (userError || !user) {
      logger.error('User authentication failed', userError)
      return createErrorResponse('Authentication failed', 401, userError?.message)
    }

    logger.info('User authenticated successfully', { email: user.email })

    // Verify admin privileges using email
    const { data: adminAccount, error: adminAccountError } = await serviceClient
      .from('admin_accounts')
      .select('id, full_name, is_super_admin')
      .eq('email', user.email)
      .eq('active', true)
      .maybeSingle()

    logger.info('Admin verification results', {
      hasAdminAccount: !!adminAccount,
      accountError: adminAccountError?.message,
      userEmail: user.email
    })

    if (adminAccountError) {
      logger.error('Admin verification error', { adminAccountError })
      return createErrorResponse('Admin verification failed', 500, adminAccountError.message)
    }

    if (!adminAccount) {
      logger.warn('User is not an admin', { email: user.email, userId: user.id })
      return createErrorResponse('Admin privileges required', 403)
    }

    logger.info('Admin privileges verified', { email: user.email })

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

    const { email, full_name, phone_number, can_create_agents } = validationResult.data

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

    // Generate secure access token
    const nameSlug = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12)
    
    const accessToken = generateSecureToken(nameSlug)

    logger.info('Creating lawyer token', { tokenLength: accessToken.length })

    // Create lawyer token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('lawyer_tokens')
      .insert({
        access_token: accessToken,
        email: email.toLowerCase(),
        full_name,
        phone_number: phone_number || null,
        can_create_agents,
        lawyer_id: crypto.randomUUID(),
        created_by: adminAccount.id
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

    logger.info('Lawyer token created successfully', { email })

    return createSuccessResponse({
      lawyer: {
        ...tokenData,
        secure_password: accessToken
      }
    }, 201)

  } catch (error) {
    logger.error('Unexpected error in create lawyer function', error)
    return createErrorResponse('Internal server error', 500, error?.message)
  }
})