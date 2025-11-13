import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DocumentTokenSchema = z.object({
  document_content: z.string()
    .min(10, 'Content too short')
    .max(50000, 'Content exceeds 50KB limit'),
  document_type: z.string()
    .min(1, 'Document type is required')
    .max(200, 'Document type too long'),
  user_email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  user_name: z.string()
    .min(2, 'Name too short')
    .max(100, 'Name too long')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Name contains invalid characters'),
  sla_hours: z.number()
    .int('SLA hours must be an integer')
    .min(1, 'SLA hours must be at least 1')
    .max(72, 'SLA hours cannot exceed 72')
    .optional(),
  user_id: z.string().uuid('Invalid user ID format').optional().nullable()
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate input data
    let validatedData;
    try {
      const rawData = await req.json();
      validatedData = DocumentTokenSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    const { document_content, document_type, user_email, user_name, sla_hours, user_id } = validatedData;

    // Generate unique token
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Try to get price from legal_agents table based on document_type
    const { data: agentData } = await supabase
      .from('legal_agents')
      .select('price')
      .eq('name', document_type)
      .eq('status', 'active')
      .single();

    // Use price if available, otherwise default to 0 (free)
    // Changed from 50000 to 0 to avoid charging for documents without properly configured agents
    const price = agentData?.price ?? 0;

    // Calculate SLA deadline
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (sla_hours || 4) * 60 * 60 * 1000);

    // Create document token record
    const { data, error } = await supabase
      .from('document_tokens')
      .insert({
        token,
        document_type,
        document_content,
        user_email,
        user_name,
        price,
        sla_hours: sla_hours || 4,
        sla_deadline: slaDeadline.toISOString(),
        status: 'solicitado',
        sla_status: 'on_time',
        user_id: user_id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create document token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document token created successfully:', data);

    // Send notification email for new document
    try {
      console.log('Sending notification email for document:', data.id);
      const notifyResponse = await supabase.functions.invoke('notify-document-status-change', {
        body: {
          document_token_id: data.id,
          new_status: 'solicitado'
        }
      });

      if (notifyResponse.error) {
        console.error('Error sending notification:', notifyResponse.error);
        // Don't fail the request if notification fails, just log it
      } else {
        console.log('Notification sent successfully');
      }
    } catch (notifyError) {
      console.error('Exception sending notification:', notifyError);
      // Don't fail the request if notification fails
    }

    return new Response(
      JSON.stringify({ 
        token,
        message: 'Document token created successfully',
        document_id: data.id,
        price,
        sla_deadline: slaDeadline.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-document-token function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});