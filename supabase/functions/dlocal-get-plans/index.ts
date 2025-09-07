import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get dLocal API credentials
    const apiKey = Deno.env.get('DLOCAL_API_KEY');
    const secretKey = Deno.env.get('DLOCAL_SECRET_KEY');

    if (!apiKey || !secretKey) {
      console.error('Missing dLocal API credentials');
      return new Response(
        JSON.stringify({ error: 'API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call dLocal API to get plans
    const auth = btoa(`${apiKey}:${secretKey}`);
    const response = await fetch('https://api.dlocalgo.com/v1/subscription/plan/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('dLocal API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch plans from dLocal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('dLocal plans response:', data);

    // Transform dLocal plans to our format
    const transformedPlans = data.data?.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.amount,
      yearlyPrice: plan.amount * 10, // Assuming 2 months free for yearly
      currency: plan.currency,
      features: [
        'Acceso a herramientas IA',
        'Gestión de documentos',
        'Soporte técnico',
        'Estadísticas avanzadas'
      ],
      planToken: plan.plan_token,
      active: plan.active,
      isPopular: plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro')
    })) || [];

    return new Response(
      JSON.stringify({ plans: transformedPlans }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-plans function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});