import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { decode as decodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  callResponsesAPI, 
  logResponsesRequest,
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function getMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.rtf')) return 'application/rtf';
  return 'application/octet-stream';
}

function isPdfFormat(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

function isBinaryFormat(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.docx') || lower.endsWith('.doc');
}

async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();
    if (error || !data) return defaultValue || '';
    return data.config_value;
  } catch {
    return defaultValue || '';
  }
}

async function saveToolResult(supabase: any, lawyerId: string, toolType: string, inputData: any, outputData: any, metadata: any = {}) {
  try {
    await supabase.from('legal_tools_results').insert({
      lawyer_id: lawyerId,
      tool_type: toolType,
      input_data: inputData,
      output_data: outputData,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error saving tool result:', error);
  }
}

function parseAnalysisJSON(text: string): any {
  try {
    let clean = (text || '').trim();
    // Remove markdown code fences if present
    if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/i, '');
    if (clean.startsWith('```')) clean = clean.replace(/^```\s*/i, '');
    if (clean.endsWith('```')) clean = clean.replace(/\s*```$/i, '');
    
    // Try to find a JSON object in the text if it's not pure JSON
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(clean.trim());
  } catch {
    return {
      documentType: "Documento Legal",
      documentCategory: "otro",
      detectionConfidence: "baja",
      summary: "El documento requiere revisión manual.",
      clauses: [], risks: [], recommendations: ["Revisar documento manualmente"],
      keyDates: [], parties: [], legalReferences: [], missingElements: [],
      sourcesConsulted: [], pendingVerifications: [], strategicConclusion: "",
      jurisdiction: "", applicableStatute: "", activatedLegalFramework: []
    };
  }
}

function extractOutputText(responseData: any): string {
  let resultText = '';
  if (responseData.output) {
    for (const item of responseData.output) {
      if (item.type === 'message' && item.content) {
        for (const c of item.content) {
          if (c.type === 'output_text') resultText += c.text;
        }
      }
    }
  }
  return resultText;
}

// ──────────────────────────────────────────────
// ANALYSIS PROMPT — requests JSON output matching frontend schema
// ──────────────────────────────────────────────

const ANALYSIS_JSON_PROMPT = `Analiza exhaustivamente este documento legal. Aplica todas las fases de análisis según tu protocolo (identificación, clasificación, análisis por tipo, matriz de riesgos, verificación web).

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes ni después, sin bloques de código markdown). El JSON debe seguir esta estructura exacta:

{
  "documentType": "Tipo específico del documento (ej: Demanda Civil Ordinaria, Sentencia de Tutela, Contrato de Arrendamiento)",
  "documentSubtype": "Subtipo según la clasificación del protocolo (ej: Demanda / Contestación / Recurso / Sentencia / Auto)",
  "documentCategory": "uno de: contrato | actuacion_procesal | providencia_judicial | mecanismo_constitucional | acto_administrativo | documento_notarial | respuesta_legal | escrito_juridico | informe | correspondencia | anexo | otro",
  "detectionConfidence": "alta | media | baja",
  "jurisdiction": "Jurisdicción aplicable (ej: Civil, Laboral, Contencioso-Administrativa, Constitucional)",
  "applicableStatute": "Estatuto procesal aplicable (ej: Ley 1564 de 2012 – CGP)",
  "activatedLegalFramework": [
    { "norm": "Nombre de la norma o estatuto", "status": "vigente | modificada | derogada | no_verificada", "verifiedUrl": "URL de verificación o vacío" }
  ],
  "summary": "Resumen ejecutivo narrativo del documento en estilo formal de memorando jurídico interno. Incluye propósito, partes, situación jurídica central y estado actual. Mínimo 3 párrafos.",
  "parties": [
    { "name": "Nombre completo de la parte", "role": "Rol jurídico (demandante, demandado, apoderado, juez, contratante, etc.)" }
  ],
  "clauses": [
    {
      "name": "Nombre o título de la cláusula, fundamento, argumento o sección según el tipo de documento",
      "content": "Descripción concisa del contenido de esta cláusula o sección",
      "riskLevel": "alto | medio | bajo",
      "recommendation": "Recomendación específica para esta cláusula"
    }
  ],
  "risks": [
    {
      "type": "Nombre del riesgo identificado",
      "description": "Descripción detallada del riesgo y su implicación legal",
      "severity": "alto | medio | bajo",
      "mitigation": "Acción concreta para mitigar este riesgo"
    }
  ],
  "recommendations": [
    "Recomendación accionable número 1 con justificación normativa",
    "Recomendación accionable número 2"
  ],
  "keyDates": [
    { "date": "Fecha en formato DD/MM/YYYY o descriptiva", "description": "Qué sucede o sucedió en esta fecha", "importance": "alto | medio | bajo" }
  ],
  "legalReferences": [
    { "reference": "Artículo, Ley, Decreto o Jurisprudencia citada", "context": "Cómo aplica al documento", "verified": true }
  ],
  "missingElements": [
    "Elemento legal que debería estar presente pero no está, o dato faltante del documento"
  ],
  "sourcesConsulted": [
    { "data": "Dato o norma verificada", "url": "URL de la fuente consultada", "consultDate": "Fecha de consulta", "result": "verificado | no_encontrado | parcial" }
  ],
  "pendingVerifications": [
    { "data": "Dato que no pudo verificarse", "source": "Fuente donde debe confirmarse", "url": "URL de la fuente oficial", "impact": "Impacto de no verificar este dato" }
  ],
  "strategicConclusion": "Conclusión estratégica en términos probabilísticos. Análisis de viabilidad, riesgo dominante y opciones estratégicas disponibles. Incluye la advertencia de que no sustituye el criterio del abogado responsable."
}

INSTRUCCIONES CRÍTICAS:
- Responde SOLO con el JSON, sin texto antes ni después
- Usa la herramienta de búsqueda web para verificar vigencia de normas y existencia de providencias ANTES de incluirlas
- Para datos no verificables, inclúyelos en pendingVerifications con el marcador correspondiente
- NO inventes radicados, fechas de sentencias, magistrados ponentes ni texto literal de normas sin verificación
- Si una búsqueda web no arroja resultado concluyente, decláralo en pendingVerifications
- El campo summary debe ser un análisis narrativo completo, no un resumen superficial`;

// ──────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
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
    const lowerName = (fileName || '').toLowerCase();

    console.log('📄 Analysis request:', {
      fileName,
      hasContent: !!documentContent,
      hasBase64: !!fileBase64,
      base64Length: fileBase64?.length ?? 0,
    });

    // ── Supabase & AI config ───────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const aiModel = await getSystemConfig(supabase, 'analysis_ai_model', 'gpt-4o');
    const systemPrompt = await getSystemConfig(supabase, 'analysis_ai_prompt', '');

    if (!systemPrompt) {
      console.error('❌ analysis_ai_prompt not configured in system_config');
      return new Response(JSON.stringify({ error: 'Configuración faltante: analysis_ai_prompt' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    logResponsesRequest(aiModel, 'legal-document-analysis', true);

    const reasoningEffort = await getSystemConfig(supabase, 'analysis_reasoning_effort', 'medium') as 'low' | 'medium' | 'high';
    const isReasoningModel = /^(o[1-4]|gpt-5)/.test(aiModel);
    
    // Check if web search is enabled for analysis
    const webSearchEnabled = await getSystemConfig(supabase, 'analysis_web_search', 'true');
    const useWebSearch = webSearchEnabled === 'true' || webSearchEnabled === true as any;

    // Build tools array — web_search_preview is added when enabled
    const tools: any[] = [];
    if (useWebSearch) {
      tools.push({ type: 'web_search_preview' });
    }

    const analysisPrompt = `${ANALYSIS_JSON_PROMPT}\n\nDocumento a analizar: "${fileName}"`;

    // ── Route: Binary file (PDF, DOCX, DOC) with base64 ──
    if (fileBase64 && isBinaryFormat(lowerName)) {
      const mimeType = getMimeType(fileName);
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const isPdf = isPdfFormat(lowerName);

      console.log(`📤 Processing ${fileName} (${mimeType}, ${cleanBase64.length} base64 chars, method: ${isPdf ? 'input_file-direct' : 'files-api+code_interpreter'}, webSearch: ${useWebSearch})`);

      let requestBody: any;

      if (isPdf) {
        // PDF: send directly as input_file (natively supported)
        const fileDataUri = `data:${mimeType};base64,${cleanBase64}`;
        requestBody = {
          model: aiModel,
          input: [
            {
              role: 'user' as const,
              content: [
                { type: 'input_file', filename: fileName, file_data: fileDataUri },
                { type: 'input_text', text: analysisPrompt },
              ]
            }
          ],
          instructions: systemPrompt,
          tools: tools.length > 0 ? tools : undefined,
          max_output_tokens: 16000,
          store: false,
          // NO json_object format — web_search is incompatible with it
          // JSON output is enforced via prompt instructions instead
        };
      } else {
        // DOCX/DOC: upload via Files API first, then reference file_id with code_interpreter
        console.log(`📤 Uploading ${fileName} to OpenAI Files API...`);

        const binaryData = decodeBase64(cleanBase64);
        const formData = new FormData();
        formData.append('purpose', 'user_data');
        formData.append('file', new Blob([binaryData], { type: mimeType }), fileName);

        const uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text();
          console.error(`❌ Files API upload error: ${uploadResponse.status}`, uploadError);
          throw new Error(`File upload failed: ${uploadError}`);
        }

        const uploadedFile = await uploadResponse.json();
        const fileId = uploadedFile.id;
        console.log(`✅ File uploaded: ${fileId}`);

        // Combine web_search with code_interpreter tools
        const docTools = [
          ...tools,
          { type: 'code_interpreter', container: { type: 'auto', file_ids: [fileId] } }
        ];

        requestBody = {
          model: aiModel,
          input: [
            {
              role: 'user' as const,
              content: [
                { type: 'input_text', text: `${analysisPrompt}\n\nEl archivo "${fileName}" ha sido cargado en el code interpreter. Léelo usando Python y analízalo.` },
              ]
            }
          ],
          instructions: systemPrompt,
          tools: docTools,
          max_output_tokens: 16000,
          store: false,
        };
      }

      if (isReasoningModel) {
        requestBody.reasoning = { effort: reasoningEffort };
      } else {
        requestBody.temperature = 0.2;
      }

      const method = isPdf ? 'input_file-direct' : 'files-api+code_interpreter';
      console.log(`🤖 Calling OpenAI Responses API (model: ${aiModel}, method: ${method}, webSearch: ${useWebSearch})`);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenAI error: ${response.status}`, errorText);
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const resultText = extractOutputText(responseData);
      const analysis = parseAnalysisJSON(resultText);

      const extractionMethod = isPdf ? 'openai-input-file' : 'openai-code-interpreter';
      const resultData = {
        success: true,
        fileName: fileName || 'Documento',
        extractionQuality: 'full',
        extractionMethod,
        webSearchUsed: useWebSearch,
        ...analysis,
        timestamp: new Date().toISOString()
      };

      if (lawyerId) {
        await saveToolResult(supabase, lawyerId, 'analysis',
          { documentContent: `Archivo procesado por OpenAI (${extractionMethod}): ${fileName}`, fileName },
          analysis,
          { extractionMethod, extractionQuality: 'full', webSearchUsed: useWebSearch }
        );
      }

      console.log(`✅ Analysis completed via ${extractionMethod} (model: ${aiModel}, webSearch: ${useWebSearch})`);
      return new Response(JSON.stringify(resultData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Route: Text content (TXT, RTF, or plain documentContent) ──
    const textContent = documentContent || '';
    if (!textContent || textContent.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate long text content
    let truncatedContent: string;
    if (textContent.length > 30000) {
      const firstPart = textContent.substring(0, 15000);
      const lastPart = textContent.substring(textContent.length - 15000);
      truncatedContent = `${firstPart}\n\n[... CONTENIDO INTERMEDIO OMITIDO (${textContent.length - 30000} caracteres) ...]\n\n${lastPart}`;
    } else {
      truncatedContent = textContent;
    }

    const textInput = `${analysisPrompt}\n\nCONTENIDO DEL DOCUMENTO:\n${truncatedContent}`;

    const requestBody: any = {
      model: aiModel,
      input: textInput,
      instructions: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      max_output_tokens: 16000,
      store: false,
      // NO json_object format — web_search is incompatible with it
    };

    if (isReasoningModel) {
      requestBody.reasoning = { effort: reasoningEffort };
    } else {
      requestBody.temperature = 0.2;
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI Responses API error: ${response.status}`, errorText);
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const resultText = extractOutputText(responseData);
    const analysis = parseAnalysisJSON(resultText);

    const resultData = {
      success: true,
      fileName: fileName || 'Documento',
      extractionQuality: 'full',
      extractionMethod: 'text-direct',
      webSearchUsed: useWebSearch,
      ...analysis,
      timestamp: new Date().toISOString()
    };

    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'analysis',
        { documentContent: textContent.substring(0, 500) + '...', fileName },
        analysis,
        { extractionMethod: 'text-direct', extractionQuality: 'full', textLength: textContent.length, webSearchUsed: useWebSearch }
      );
    }

    console.log(`✅ Analysis completed (method: text-direct, chars: ${textContent.length}, webSearch: ${useWebSearch})`);
    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in analysis:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
