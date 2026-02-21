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
    if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/i, '');
    if (clean.startsWith('```')) clean = clean.replace(/^```\s*/i, '');
    if (clean.endsWith('```')) clean = clean.replace(/\s*```$/i, '');
    return JSON.parse(clean.trim());
  } catch {
    return {
      documentType: "Documento Legal",
      documentCategory: "otro",
      detectionConfidence: "baja",
      summary: "El documento requiere revisión manual.",
      clauses: [], risks: [], recommendations: ["Revisar documento manualmente"],
      keyDates: [], parties: [], legalReferences: [], missingElements: []
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

    const analysisPrompt = `Analiza exhaustivamente este documento legal "${fileName}". Proporciona un análisis profundo y profesional. Responde ÚNICAMENTE en formato JSON con: documentType, documentCategory, detectionConfidence, summary, clauses, risks, recommendations, keyDates, parties, legalReferences, missingElements.`;

    // ── Route: Binary file (PDF, DOCX, DOC) with base64 ──
    if (fileBase64 && isBinaryFormat(lowerName)) {
      const mimeType = getMimeType(fileName);
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const isPdf = isPdfFormat(lowerName);

      console.log(`📤 Processing ${fileName} (${mimeType}, ${cleanBase64.length} base64 chars, method: ${isPdf ? 'input_file-direct' : 'files-api+code_interpreter'})`);

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
          max_output_tokens: 8000,
          store: false,
          text: { format: { type: 'json_object' } }
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
          tools: [{ type: 'code_interpreter', container: { type: 'auto', file_ids: [fileId] } }],
          max_output_tokens: 8000,
          store: false,
          text: { format: { type: 'json_object' } }
        };
      }

      if (isReasoningModel) {
        requestBody.reasoning = { effort: reasoningEffort };
      } else {
        requestBody.temperature = 0.2;
      }

      const method = isPdf ? 'input_file-direct' : 'files-api+code_interpreter';
      console.log(`🤖 Calling OpenAI Responses API (model: ${aiModel}, method: ${method})`);

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
        ...analysis,
        timestamp: new Date().toISOString()
      };

      if (lawyerId) {
        await saveToolResult(supabase, lawyerId, 'analysis',
          { documentContent: `Archivo procesado por OpenAI (${extractionMethod}): ${fileName}`, fileName },
          analysis,
          { extractionMethod, extractionQuality: 'full' }
        );
      }

      console.log(`✅ Analysis completed via ${extractionMethod} (model: ${aiModel})`);
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
      max_output_tokens: 8000,
      store: false,
      text: { format: { type: 'json_object' } }
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
      ...analysis,
      timestamp: new Date().toISOString()
    };

    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'analysis',
        { documentContent: textContent.substring(0, 500) + '...', fileName },
        analysis,
        { extractionMethod: 'text-direct', extractionQuality: 'full', textLength: textContent.length }
      );
    }

    console.log(`✅ Analysis completed (method: text-direct, chars: ${textContent.length})`);
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
