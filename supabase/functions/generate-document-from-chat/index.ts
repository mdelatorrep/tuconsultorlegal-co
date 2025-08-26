import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to get system configuration
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get configured OpenAI model
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'openai_model')
      .maybeSingle();

    const selectedModel = (configError || !configData) 
      ? 'gpt-4.1-2025-04-14'  // Default fallback
      : configData.config_value;

    console.log('Using OpenAI model:', selectedModel);

    const { conversation, template_content, document_name, user_email, user_name, sla_hours, collected_data, placeholder_fields, price } = await req.json();

    if (!conversation || !template_content) {
      return new Response(
        JSON.stringify({ error: 'Conversation and template_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating document from conversation for:', document_name);

    // Function to normalize geographic information
    const normalizeGeographicInfo = (text: string): string => {
      const departmentMap: Record<string, string> = {
        'bogota': 'BOGOTÁ, CUNDINAMARCA',
        'bogotá': 'BOGOTÁ, CUNDINAMARCA',
        'medellin': 'MEDELLÍN, ANTIOQUIA',
        'medellín': 'MEDELLÍN, ANTIOQUIA',
        'cali': 'CALI, VALLE DEL CAUCA',
        'barranquilla': 'BARRANQUILLA, ATLÁNTICO',
        'cartagena': 'CARTAGENA, BOLÍVAR',
        'cucuta': 'CÚCUTA, NORTE DE SANTANDER',
        'cúcuta': 'CÚCUTA, NORTE DE SANTANDER',
        'bucaramanga': 'BUCARAMANGA, SANTANDER',
        'pereira': 'PEREIRA, RISARALDA',
        'manizales': 'MANIZALES, CALDAS',
        'ibague': 'IBAGUÉ, TOLIMA',
        'ibagué': 'IBAGUÉ, TOLIMA',
        'santa marta': 'SANTA MARTA, MAGDALENA',
        'villavicencio': 'VILLAVICENCIO, META',
        'pasto': 'PASTO, NARIÑO',
        'monteria': 'MONTERÍA, CÓRDOBA',
        'montería': 'MONTERÍA, CÓRDOBA',
        'valledupar': 'VALLEDUPAR, CESAR',
        'neiva': 'NEIVA, HUILA',
        'armenia': 'ARMENIA, QUINDÍO',
        'popayan': 'POPAYÁN, CAUCA',
        'popayán': 'POPAYÁN, CAUCA',
        'sincelejo': 'SINCELEJO, SUCRE',
        'florencia': 'FLORENCIA, CAQUETÁ',
        'tunja': 'TUNJA, BOYACÁ',
        'quibdo': 'QUIBDÓ, CHOCÓ',
        'quibdó': 'QUIBDÓ, CHOCÓ',
        'riohacha': 'RIOHACHA, LA GUAJIRA',
        'yopal': 'YOPAL, CASANARE',
        'mocoa': 'MOCOA, PUTUMAYO',
        'leticia': 'LETICIA, AMAZONAS',
        'puerto carreño': 'PUERTO CARREÑO, VICHADA',
        'inirida': 'INÍRIDA, GUAINÍA',
        'inírida': 'INÍRIDA, GUAINÍA',
        'mitu': 'MITÚ, VAUPÉS',
        'mitú': 'MITÚ, VAUPÉS',
        'san jose del guaviare': 'SAN JOSÉ DEL GUAVIARE, GUAVIARE',
        'san josé del guaviare': 'SAN JOSÉ DEL GUAVIARE, GUAVIARE'
      };
      
      const normalized = text.toLowerCase().trim();
      return departmentMap[normalized] || text.toUpperCase() + ', COLOMBIA';
    };

    // Function to format dates
    const formatDate = (dateStr: string): string => {
      const months = {
        'enero': 'enero', 'febrero': 'febrero', 'marzo': 'marzo', 'abril': 'abril',
        'mayo': 'mayo', 'junio': 'junio', 'julio': 'julio', 'agosto': 'agosto',
        'septiembre': 'septiembre', 'octubre': 'octubre', 'noviembre': 'noviembre', 'diciembre': 'diciembre'
      };
      
      // Handle various date formats
      const dateRegex = /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{4})/;
      const match = dateStr.match(dateRegex);
      
      if (match) {
        const [, day, month, year] = match;
        const monthNames = Object.keys(months);
        const monthName = monthNames[parseInt(month) - 1] || 'enero';
        return `${parseInt(day)} de ${monthName} de ${year}`;
      }
      
      return dateStr;
    };

    // Build additional context from collected data
    let additionalContext = '';
    if (collected_data) {
      additionalContext = `\n\nDATOS ESTRUCTURADOS EXTRAÍDOS:\n${JSON.stringify(collected_data, null, 2)}`;
    }

    if (placeholder_fields && Array.isArray(placeholder_fields)) {
      additionalContext += `\n\nPLACEHOLDERS DISPONIBLES EN LA PLANTILLA:\n${placeholder_fields.map(field => `- {{${field.field || field.name}}}: ${field.description}`).join('\n')}`;
    }

    const prompt = `Basándose en la siguiente conversación con el usuario, genera el contenido del documento legal utilizando EXACTAMENTE la plantilla proporcionada y completando todos los placeholders.

CONVERSACIÓN:
${conversation.map((msg: any) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`).join('\n')}
${additionalContext}

PLANTILLA DEL DOCUMENTO (USAR EXACTAMENTE ESTA PLANTILLA):
${template_content}

INSTRUCCIONES CRÍTICAS:
1. USA LA PLANTILLA EXACTA proporcionada arriba como base del documento
2. Identifica TODOS los placeholders en formato {{NOMBRE_PLACEHOLDER}} en la plantilla
3. Extrae información de la conversación Y los datos estructurados para completar cada placeholder
4. NORMALIZACIÓN OBLIGATORIA:
   - Nombres propios, apellidos: MAYÚSCULAS COMPLETAS (ej: JUAN CARLOS PÉREZ LÓPEZ)
   - Ciudades: MAYÚSCULAS + departamento (ej: BOGOTÁ, CUNDINAMARCA)
   - Departamentos: MAYÚSCULAS COMPLETAS
   - País: siempre agregar COLOMBIA si no se especifica
   - Documentos de identidad: números con puntos separadores (ej: 1.234.567.890)
5. FECHAS: formato DD de MMMM de YYYY (ej: 15 de enero de 2024)
6. DIRECCIONES: normalizar formato con mayúsculas para la ciudad
7. Si algún placeholder no puede completarse, mantenerlo vacío: {{PLACEHOLDER}}
8. Mantén EXACTAMENTE el formato, estructura y contenido legal de la plantilla
9. NO agregues ni quites texto de la plantilla original
10. Resultado: plantilla original con placeholders reemplazados por información normalizada

FORMATO DE RESPUESTA: Devuelve únicamente el documento final usando la plantilla exacta con los placeholders completados.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'Eres un experto abogado colombiano especializado en redacción de documentos legales. Tu tarea es generar documentos completos y profesionales basándose en conversaciones con usuarios.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const documentContent = data.choices[0]?.message?.content?.trim();

    if (!documentContent) {
      throw new Error('No document content generated');
    }

    // Now create the document token with the generated content
    // Reuse the existing supabase client already created above

    // Generate unique token
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Calculate SLA deadline
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (sla_hours || 4) * 60 * 60 * 1000);

    // Create document token record
    const { data: tokenData, error } = await supabase
      .from('document_tokens')
      .insert({
        token,
        document_type: document_name,
        document_content: documentContent,
        user_email: user_email,
        user_name: user_name,
        price: price || 0,
        sla_hours: sla_hours || 4,
        sla_deadline: slaDeadline.toISOString(),
        status: 'solicitado',
        sla_status: 'on_time'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document token:', error);
      throw new Error('Failed to create document token');
    }

    console.log('Document generated and token created successfully');

    return new Response(
      JSON.stringify({ 
        token,
        document_content: documentContent,
        document_id: tokenData.id,
        sla_deadline: slaDeadline.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-document-from-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});