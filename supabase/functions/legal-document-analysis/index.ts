import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest 
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract text from PDF base64
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    console.log('🔍 Starting PDF text extraction...');
    
    const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const textMatches = pdfText.match(/BT\s+(.*?)\s+ET/gs) || [];
    let extractedText = '';
    
    for (const match of textMatches) {
      const textContent = match.match(/\((.*?)\)/g) || [];
      for (const text of textContent) {
        extractedText += text.replace(/[()]/g, '').replace(/\\[nrt]/g, ' ').replace(/\\/g, '') + ' ';
      }
      
      const arrayContent = match.match(/\[(.*?)\]/g) || [];
      for (const array of arrayContent) {
        const texts = array.match(/\((.*?)\)/g) || [];
        for (const text of texts) {
          extractedText += text.replace(/[()]/g, '').replace(/\\[nrt]/g, ' ').replace(/\\/g, '') + ' ';
        }
      }
    }
    
    extractedText = extractedText.replace(/\s+/g, ' ').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ').trim();
    
    if (extractedText.length > 100) {
      console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error extracting text from PDF:', error);
    return '';
  }
}

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error || !data) return defaultValue || '';
    return data.config_value;
  } catch (error) {
    return defaultValue || '';
  }
}

// Helper function to infer document type from filename
function inferDocumentTypeFromFilename(filename: string) {
  const lower = filename.toLowerCase();
  
  if (lower.includes('contrato') || lower.includes('contract')) {
    return { suggestedType: 'Contrato', category: 'contrato', typicalElements: ['Partes', 'Objeto', 'Obligaciones', 'Plazos'] };
  } else if (lower.includes('respuesta') || lower.includes('contestacion')) {
    return { suggestedType: 'Respuesta Legal', category: 'respuesta_legal', typicalElements: ['Proceso', 'Defensa', 'Fundamentos'] };
  } else if (lower.includes('demanda') || lower.includes('escrito')) {
    return { suggestedType: 'Escrito Jurídico', category: 'escrito_juridico', typicalElements: ['Hechos', 'Derecho', 'Pretensiones'] };
  }
  
  return { suggestedType: 'Documento Legal', category: 'otro', typicalElements: ['Partes', 'Objeto', 'Condiciones'] };
}

// Helper function to save results
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authentication
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

    console.log('📄 Analysis request:', { fileName, hasContent: !!documentContent, hasBase64: !!fileBase64 });

    // Extract text from PDF if provided
    let pdfExtractedText = '';
    if (fileBase64 && fileName?.toLowerCase().endsWith('.pdf')) {
      pdfExtractedText = await extractTextFromPDF(fileBase64);
    }

    if (!pdfExtractedText && !documentContent) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get configuration
    const aiModel = await getSystemConfig(supabase, 'analysis_ai_model', 'gpt-4o');
    const systemPrompt = await getSystemConfig(
      supabase, 
      'analysis_ai_prompt',
      'Eres un experto analista legal. Analiza el documento y responde en formato JSON.'
    );
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OpenAI API key not configured');

    logResponsesRequest(aiModel, 'legal-document-analysis', true);

    // Build analysis input
    let analysisInput = '';
    const content = pdfExtractedText || documentContent || '';
    const truncatedContent = content.substring(0, 12000);
    
    if (truncatedContent.length > 100) {
      analysisInput = `Analiza exhaustivamente el siguiente documento legal "${fileName}":

CONTENIDO DEL DOCUMENTO:
${truncatedContent}

Proporciona un análisis profundo y profesional en formato JSON con: documentType, documentCategory, detectionConfidence, summary, clauses, risks, recommendations, keyDates, parties, legalReferences, missingElements.`;
    } else {
      const fileTypeInference = inferDocumentTypeFromFilename(fileName);
      analysisInput = `Documento: "${fileName}" - análisis inferencial basado en nombre.
Tipo sugerido: ${fileTypeInference.suggestedType}
Categoría: ${fileTypeInference.category}

Proporciona análisis JSON con detectionConfidence: "baja" indicando que es preliminar.`;
    }

    const params = buildResponsesRequestParams(aiModel, {
      input: analysisInput,
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      temperature: 0.2,
      jsonMode: true,
      store: false
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    // Parse response
    let analysis;
    try {
      let cleanContent = (result.text || '').trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace(/^```json\s*/i, '');
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```\s*/i, '');
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.replace(/\s*```$/i, '');
      
      analysis = JSON.parse(cleanContent.trim());
    } catch (e) {
      analysis = {
        documentType: "Documento Legal",
        documentCategory: "otro",
        detectionConfidence: "baja",
        summary: "El documento requiere revisión manual.",
        clauses: [],
        risks: [],
        recommendations: ["Revisar documento manualmente"],
        keyDates: [],
        parties: [],
        legalReferences: [],
        missingElements: []
      };
    }

    const resultData = {
      success: true,
      fileName: fileName || 'Documento',
      ...analysis,
      timestamp: new Date().toISOString()
    };

    // Save result if authenticated
    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'analysis', 
        { documentContent: content.substring(0, 500) + '...', fileName },
        analysis,
        { pdfTextExtracted: !!pdfExtractedText }
      );
    }

    console.log('✅ Analysis completed successfully');

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in analysis:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
