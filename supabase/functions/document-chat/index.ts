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

    const { message, messages, agent_prompt, document_name, sessionId, agentType, context } = await req.json();

    // Handle different chat types
    if (agentType === 'routing') {
      // Legal consultation routing logic
      const routingPrompt = `Eres un sistema experto de routing para consultas legales. Analiza la consulta del usuario y determina:

1. ¿Necesita asesoría legal especializada? (true/false)
2. ¿Qué especialización legal requiere? (civil, laboral, comercial, penal, etc.)
3. ¿Es una consulta compleja que requiere investigación legal profunda? (true/false)

ESPECIALIZACIONES DISPONIBLES:
- civil: Derecho civil, contratos, propiedad, familia
- laboral: Derecho laboral, empleos, contratos de trabajo
- comercial: Derecho comercial, empresas, sociedades
- penal: Derecho penal, delitos, procedimientos penales
- administrativo: Derecho administrativo, entidades públicas
- constitucional: Derecho constitucional, derechos fundamentales

CRITERIOS PARA ROUTING ESPECIALIZADO:
- Consultas sobre legislación específica
- Casos que requieren análisis jurisprudencial
- Situaciones contractuales complejas
- Procedimientos legales específicos
- Cálculos legales (laborales, civiles, etc.)

Responde SOLO en formato JSON:
{
  "needsSpecializedAdvice": boolean,
  "specialization": "string o null",
  "isComplex": boolean,
  "reasoning": "explicación breve"
}`;

      const routingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: routingPrompt
            },
            {
              role: 'user',
              content: message || (messages && messages[messages.length - 1]?.content) || ''
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      if (!routingResponse.ok) {
        throw new Error(`OpenAI API error: ${routingResponse.status}`);
      }

      const routingData = await routingResponse.json();
      const routingResult = JSON.parse(routingData.choices[0]?.message?.content || '{}');

      return new Response(
        JSON.stringify(routingResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (agentType === 'lexi') {
      // General legal assistant - Lexi
      const lexiSystemPrompt = `Eres Lexi, la asistente legal virtual de tuconsultorlegal.co, una plataforma innovadora que democratiza el acceso a servicios legales de alta calidad en Colombia.

PERSONALIDAD Y ESTILO:
- Eres amigable, profesional y cercana
- Hablas en un lenguaje claro y accesible, evitando jerga legal innecesaria
- Siempre muestras confianza y conocimiento
- Tu objetivo es ayudar y guiar a los usuarios hacia las mejores soluciones legales

CONOCIMIENTOS:
- Experta en derecho colombiano
- Conoces todos los servicios de tuconsultorlegal.co
- Puedes orientar sobre documentos legales, consultas y trámites
- Especializada en simplificar conceptos legales complejos

FUNCIONES PRINCIPALES:
1. Responder consultas legales generales
2. Orientar sobre documentos disponibles en la plataforma
3. Explicar procesos legales de manera simple
4. Conectar usuarios con servicios especializados
5. Brindar información sobre trámites y procedimientos

SERVICIOS DE TUCONSULTORLEGAL.CO:
- Documentos legales para personas y empresas
- Generación automatizada de documentos
- Información y orientación legal básica
- Trámites y gestiones legales
- Consultas de información legal general

IMPORTANTE:
- Siempre menciona que eres de tuconsultorlegal.co
- Mantén un tono profesional pero accesible
- Te especializas en orientación sobre documentos legales y información general
- No ofreces conexión directa con abogados, sino orientación e información
- Para casos complejos, recomienda buscar asesoría legal profesional externa

FORMATO DE RESPUESTA:
- Usa texto plano sin formato markdown
- Sé clara y concisa
- Estructura la información de manera fácil de leer
- Incluye emojis apropiados ocasionalmente (⚖️, 📄, 💼, etc.)`;

      const userMessage = message || (messages && messages[messages.length - 1]?.content) || '';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: lexiSystemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content?.trim();

      return new Response(
        JSON.stringify({ 
          response: assistantMessage,
          usage: data.usage
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original document chat functionality
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required for document chat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chat for document:', document_name);

    const systemPrompt = `${agent_prompt}

INSTRUCCIONES CRÍTICAS PARA RECOPILACIÓN DE INFORMACIÓN:
- Eres un asistente legal especializado en ${document_name}
- Debes recopilar TODA la información necesaria ANTES de permitir generar el documento
- Haz UNA pregunta específica y clara a la vez para cada campo requerido
- Normaliza automáticamente la información mientras la recopilas:
  * Nombres y apellidos: MAYÚSCULAS COMPLETAS
  * Ciudades: MAYÚSCULAS + departamento (ej: BOGOTÁ, CUNDINAMARCA)
  * Cédulas: formato con puntos separadores (ej: 1.234.567.890)
  * Fechas: formato DD de MMMM de YYYY
- Presenta un resumen completo de TODA la información recopilada antes de proceder
- SOLO cuando tengas TODOS los campos completos, responde: "He recopilado toda la información necesaria. ¿Deseas proceder con la generación del documento?"
- NO permitas generar el documento hasta verificar que TODOS los campos estén completos
- Si falta información, solicítala específicamente

IMPORTANTE - FORMATO DE RESPUESTA:
- NO uses asteriscos (*) para enfatizar texto
- NO uses guiones bajos (_) para cursiva
- NO uses caracteres especiales para formatear (**, __, ##, etc.)
- Escribe en texto plano sin formato markdown
- Usa solo puntos, comas y signos de puntuación normales
- Para enfatizar, usa palabras como "importante", "crucial", "especialmente"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content?.trim();

    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    console.log('Successfully generated chat response');

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        usage: data.usage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in document-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});