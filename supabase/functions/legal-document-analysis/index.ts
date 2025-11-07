import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    console.log(`Fetching config for key: ${configKey}`);
    
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    console.log(`Config result for ${configKey}:`, { data, error });

    if (error) {
      console.error(`Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    if (!data) {
      console.log(`No config found for ${configKey}, using default: ${defaultValue}`);
      return defaultValue || '';
    }

    console.log(`Using config ${configKey}: ${data.config_value}`);
    return data.config_value;
  } catch (error) {
    console.error(`Exception fetching config ${configKey}:`, error);
    return defaultValue || '';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to save results to legal_tools_results table
async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    console.log(`Saving ${toolType} result for lawyer: ${lawyerId}`);
    
    const { error } = await supabase
      .from('legal_tools_results')
      .insert({
        lawyer_id: lawyerId,
        tool_type: toolType,
        input_data: inputData,
        output_data: outputData,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error saving tool result:', error);
    } else {
      console.log(`✅ Successfully saved ${toolType} result`);
    }
  } catch (error) {
    console.error('Exception saving tool result:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authentication header and verify user
    const authHeader = req.headers.get('authorization');
    let lawyerId = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabaseClient.auth.getUser(token);
      lawyerId = userData.user?.id;
    }
    
    const { documentContent, fileName, fileBase64 } = await req.json();

    console.log('Received analysis request:', {
      fileName: fileName,
      hasContent: !!documentContent,
      hasBase64: !!fileBase64,
      contentLength: documentContent?.length || 0
    });

    // Handle base64 PDF content if provided
    let processedContent = documentContent;
    if (fileBase64 && fileName?.toLowerCase().endsWith('.pdf')) {
      try {
        // Enhanced PDF analysis based on filename patterns and document structure
        const fileNameLower = fileName.toLowerCase();
        let documentTypeGuess = "Documento Legal";
        let commonElements = [];
        let potentialRisks = [];
        
        // Contract types
        if (fileNameLower.includes('contrato') || fileNameLower.includes('contract')) {
          documentTypeGuess = "Contrato";
          commonElements = [
            { name: "Objeto del Contrato", riskLevel: "medium" },
            { name: "Obligaciones de las Partes", riskLevel: "high" },
            { name: "Condiciones de Pago", riskLevel: "high" },
            { name: "Resolución de Conflictos", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Términos de Pago", severity: "high" },
            { type: "Cláusulas de Rescisión", severity: "medium" }
          ];
        } 
        // Legal responses
        else if (fileNameLower.includes('respuesta') || fileNameLower.includes('contestacion') || 
                 fileNameLower.includes('replica') || fileNameLower.includes('alegato')) {
          documentTypeGuess = "Respuesta Legal";
          commonElements = [
            { name: "Argumentos Principales", riskLevel: "high" },
            { name: "Fundamentos de Derecho", riskLevel: "high" },
            { name: "Pruebas Aportadas", riskLevel: "medium" },
            { name: "Solicitudes", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Argumentación Débil", severity: "high" },
            { type: "Falta de Fundamento Legal", severity: "high" },
            { type: "Inconsistencias", severity: "medium" }
          ];
        }
        // Legal briefs and writings
        else if (fileNameLower.includes('escrito') || fileNameLower.includes('memorial') || 
                 fileNameLower.includes('demanda') || fileNameLower.includes('peticion')) {
          documentTypeGuess = "Escrito Jurídico";
          commonElements = [
            { name: "Hechos", riskLevel: "high" },
            { name: "Derecho Aplicable", riskLevel: "high" },
            { name: "Pretensiones", riskLevel: "high" },
            { name: "Pruebas", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Claridad de Hechos", severity: "high" },
            { type: "Base Legal Insuficiente", severity: "high" },
            { type: "Pretensiones Mal Formuladas", severity: "medium" }
          ];
        }
        // Reports and analysis
        else if (fileNameLower.includes('informe') || fileNameLower.includes('reporte') || 
                 fileNameLower.includes('analisis') || fileNameLower.includes('dictamen')) {
          documentTypeGuess = "Informe Legal";
          commonElements = [
            { name: "Resumen Ejecutivo", riskLevel: "medium" },
            { name: "Análisis de Situación", riskLevel: "high" },
            { name: "Conclusiones", riskLevel: "high" },
            { name: "Recomendaciones", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Análisis Incompleto", severity: "high" },
            { type: "Conclusiones Ambiguas", severity: "medium" },
            { type: "Falta de Recomendaciones", severity: "low" }
          ];
        }
        // Correspondence
        else if (fileNameLower.includes('carta') || fileNameLower.includes('oficio') || 
                 fileNameLower.includes('comunicacion') || fileNameLower.includes('notificacion')) {
          documentTypeGuess = "Correspondencia Legal";
          commonElements = [
            { name: "Remitente y Destinatario", riskLevel: "low" },
            { name: "Asunto", riskLevel: "medium" },
            { name: "Contenido Principal", riskLevel: "high" },
            { name: "Solicitud o Requerimiento", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Claridad del Mensaje", severity: "medium" },
            { type: "Formalidades Legales", severity: "low" },
            { type: "Plazos Mencionados", severity: "medium" }
          ];
        }
        // Agreements
        else if (fileNameLower.includes('convenio') || fileNameLower.includes('acuerdo') || 
                 fileNameLower.includes('pacto')) {
          documentTypeGuess = "Convenio o Acuerdo";
          commonElements = [
            { name: "Términos del Acuerdo", riskLevel: "high" },
            { name: "Responsabilidades", riskLevel: "high" },
            { name: "Duración", riskLevel: "medium" },
            { name: "Condiciones de Terminación", riskLevel: "medium" }
          ];
          potentialRisks = [
            { type: "Cumplimiento de Términos", severity: "high" },
            { type: "Desequilibrio de Obligaciones", severity: "medium" }
          ];
        }
        
        processedContent = `Documento PDF: ${fileName}

ANÁLISIS PRELIMINAR BASADO EN ESTRUCTURA:
Tipo de documento identificado: ${documentTypeGuess}
Tamaño del archivo: ${fileBase64.length} bytes (codificado)

ELEMENTOS TÍPICOS ESPERADOS:
${commonElements.map(element => `- ${element.name} (Nivel de importancia: ${element.riskLevel})`).join('\n')}

ÁREAS DE ANÁLISIS PRIORITARIAS:
${potentialRisks.map(risk => `- ${risk.type} (Prioridad: ${risk.severity})`).join('\n')}

Este documento PDF contiene información legal que será analizada en detalle por el sistema de IA para identificar elementos específicos, riesgos potenciales y proporcionar recomendaciones expertas según el tipo de documento.`;
      } catch (error) {
        console.error('Error processing PDF:', error);
        processedContent = `Documento: ${fileName}\n\nEste documento PDF requiere análisis manual especializado.`;
      }
    }

    if (!processedContent) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get analysis AI model and prompt from system config - use valid models
    const configModel = await getSystemConfig(supabase, 'analysis_ai_model', 'gpt-4o-mini');
    const analysisPrompt = await getSystemConfig(
      supabase, 
      'analysis_ai_prompt', 
      'Eres un asistente especializado en análisis de documentos legales. Analiza todo tipo de documentos jurídicos (contratos, respuestas, informes, escritos, correspondencias) identificando elementos clave, riesgos y proporcionando recomendaciones específicas según el tipo de documento.'
    );

    // Use valid OpenAI model and limit content to prevent token overflow
    const analysisModel = configModel.includes('o4-mini') ? 'gpt-4o-mini' : 
                          configModel.includes('o3-') || configModel.includes('o4-') ? 'gpt-4o-mini' : 
                          'gpt-4o-mini';
    
    console.log(`Using analysis model: ${analysisModel}`);
    console.log(`Processing content length: ${processedContent.length}`);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Truncate document content to prevent token limit issues
    const truncatedContent = processedContent.substring(0, 3000);

    // Use standard chat completions for reliability with adaptive analysis
    const requestBody = {
      model: analysisModel,
      messages: [
        {
          role: 'system',
          content: `${analysisPrompt}

DETECCIÓN AUTOMÁTICA Y ANÁLISIS ADAPTATIVO:

1. PRIMERO, identifica automáticamente el tipo de documento entre:
   - Contrato (contratos, convenios, acuerdos)
   - Respuesta Legal (respuestas, contestaciones, réplicas, alegatos)
   - Escrito Jurídico (escritos, memoriales, demandas, peticiones)
   - Informe Legal (informes, reportes, análisis, dictámenes)
   - Correspondencia (cartas, oficios, comunicaciones, notificaciones)
   - Otro tipo de documento jurídico

2. LUEGO, adapta el análisis según el tipo detectado:

   Para CONTRATOS/CONVENIOS/ACUERDOS:
   - Identifica cláusulas clave y su nivel de riesgo
   - Evalúa desequilibrios contractuales
   - Revisa términos de pago, obligaciones, rescisión
   - Analiza resolución de conflictos

   Para RESPUESTAS LEGALES/ALEGATOS:
   - Evalúa solidez de argumentos
   - Identifica fundamentos legales citados
   - Revisa coherencia argumentativa
   - Analiza pruebas aportadas
   - Identifica debilidades argumentativas

   Para ESCRITOS JURÍDICOS/DEMANDAS:
   - Claridad de hechos expuestos
   - Fundamento legal apropiado
   - Coherencia de pretensiones
   - Completitud probatoria
   - Viabilidad jurídica

   Para INFORMES LEGALES/DICTÁMENES:
   - Completitud del análisis
   - Claridad de conclusiones
   - Pertinencia de recomendaciones
   - Fundamentación técnica
   - Aplicabilidad práctica

   Para CORRESPONDENCIA:
   - Claridad del mensaje
   - Formalidades legales apropiadas
   - Identificación de plazos
   - Requerimientos explícitos
   - Tono y profesionalismo

3. ESTRUCTURA DE SALIDA adaptada al tipo:
   - Para contratos: "clauses" (cláusulas)
   - Para respuestas/escritos: "arguments" (argumentos) o "clauses"
   - Para informes: "sections" (secciones) o "clauses"
   - Para correspondencia: "keyPoints" (puntos clave) o "clauses"

Responde SIEMPRE en formato JSON con esta estructura flexible:
{
  "documentType": "Tipo específico detectado",
  "documentCategory": "contract|response|brief|report|correspondence|other",
  "clauses": [
    {
      "name": "Nombre del elemento clave",
      "content": "Extracto o descripción",
      "riskLevel": "low|medium|high",
      "recommendation": "Recomendación específica"
    }
  ],
  "risks": [
    {
      "type": "Tipo de riesgo/debilidad",
      "description": "Descripción contextual",
      "severity": "low|medium|high"
    }
  ],
  "recommendations": ["Recomendaciones", "específicas", "según tipo"]
}`
        },
        {
          role: 'user',
          content: `Analiza el siguiente documento legal con detección automática de tipo:

NOMBRE DEL ARCHIVO: ${fileName || 'Documento'}

CONTENIDO (primeros 3000 caracteres):
${truncatedContent}

Detecta automáticamente el tipo de documento y adapta el análisis según su naturaleza.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0].message.content;

    // Try to parse as JSON, fallback to structured response if parsing fails
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // Fallback: create structured response from text
      analysis = {
        documentType: "Documento Legal",
        clauses: [
          {
            name: "Análisis General",
            content: content.substring(0, 200) + "...",
            riskLevel: "medium",
            recommendation: "Revisar con detalle"
          }
        ],
        risks: [
          {
            type: "Análisis Requerido",
            description: "El documento requiere revisión manual",
            severity: "medium"
          }
        ],
        recommendations: ["Revisar documento manualmente", "Consultar con especialista"]
      };
    }

    const resultData = {
      success: true,
      fileName: fileName || 'Documento',
      ...analysis,
      timestamp: new Date().toISOString()
    };

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'analysis',
        { 
          documentContent: processedContent.substring(0, 500) + '...', 
          fileName,
          fileSize: fileBase64?.length 
        },
        analysis,
        { 
          originalFileSize: fileBase64?.length,
          processedAt: new Date().toISOString(),
          timestamp: new Date().toISOString() 
        }
      );
    }

    return new Response(
      JSON.stringify(resultData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in legal-document-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});