import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  buildResponsesRequestParams, 
  callResponsesAPI, 
  logResponsesRequest,
} from "../_shared/openai-responses-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ──────────────────────────────────────────────
// TEXT EXTRACTION HELPERS
// ──────────────────────────────────────────────

/**
 * Decode base64 string (strips data URI prefix if present)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extract text from a PDF using multiple strategies over the raw binary stream.
 * This works best for unencrypted, uncompressed text PDFs.
 */
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    console.log('🔍 Starting PDF text extraction...');
    const bytes = base64ToUint8Array(base64Data);
    const raw = new TextDecoder('latin1').decode(bytes);

    let extractedText = '';

    // Strategy 1: BT...ET blocks (standard PDF text objects)
    const btEtMatches = raw.match(/BT\s+([\s\S]*?)\s+ET/g) || [];
    for (const block of btEtMatches) {
      // Parentheses strings: (text)
      const parenTexts = block.match(/\(([^)\\]|\\.)*\)/g) || [];
      for (const t of parenTexts) {
        const decoded = t.slice(1, -1)
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')');
        extractedText += decoded + ' ';
      }
      // TJ array strings: [(text) kern (text) ...]
      const tjArrays = block.match(/\[([^\]]*)\]/g) || [];
      for (const arr of tjArrays) {
        const inner = arr.match(/\(([^)\\]|\\.)*\)/g) || [];
        for (const t of inner) {
          const decoded = t.slice(1, -1)
            .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
            .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
          extractedText += decoded + ' ';
        }
      }
    }

    // Strategy 2: Look for plain-text stream content (some PDFs store text plainly)
    if (extractedText.trim().length < 200) {
      const streamMatches = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || [];
      for (const s of streamMatches) {
        const inner = s.replace(/^stream\r?\n/, '').replace(/\r?\nendstream$/, '');
        // Only keep printable ASCII+latin
        const printable = inner.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
        if (printable.length > 50) {
          extractedText += printable + ' ';
        }
      }
    }

    // Clean up
    extractedText = extractedText
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')
      .replace(/\s{3,}/g, '  ')
      .trim();

    if (extractedText.length > 100) {
      console.log(`✅ PDF extracted ${extractedText.length} chars`);
      return extractedText;
    }

    console.warn('⚠️ PDF text extraction yielded minimal content (likely scanned/compressed PDF)');
    return '';
  } catch (error) {
    console.error('❌ Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from DOCX (which is a ZIP containing word/document.xml).
 * Uses JSZip available via esm.sh.
 */
async function extractTextFromDOCX(base64Data: string): Promise<string> {
  try {
    console.log('🔍 Starting DOCX text extraction...');
    // @ts-ignore - dynamic import from esm.sh
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;

    const bytes = base64ToUint8Array(base64Data);
    const zip = await JSZip.loadAsync(bytes.buffer);

    // Try word/document.xml (standard DOCX)
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      console.warn('⚠️ word/document.xml not found in ZIP');
      return '';
    }

    const xmlContent: string = await docFile.async('text');

    // Extract text from XML: grab content of <w:t> tags
    const wtMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    let text = wtMatches
      .map(m => m.replace(/<[^>]+>/g, ''))
      .join(' ');

    // Fallback: strip all XML tags
    if (text.trim().length < 100) {
      text = xmlContent.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }

    text = text.replace(/\s{3,}/g, '  ').trim();
    console.log(`✅ DOCX extracted ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('❌ Error extracting text from DOCX:', error);
    return '';
  }
}

// ──────────────────────────────────────────────
// SUPABASE / CONFIG HELPERS
// ──────────────────────────────────────────────

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

function inferDocumentTypeFromFilename(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.includes('contrato') || lower.includes('contract'))
    return { suggestedType: 'Contrato', category: 'contrato' };
  if (lower.includes('respuesta') || lower.includes('contestacion'))
    return { suggestedType: 'Respuesta Legal', category: 'respuesta_legal' };
  if (lower.includes('demanda') || lower.includes('escrito'))
    return { suggestedType: 'Escrito Jurídico', category: 'escrito_juridico' };
  return { suggestedType: 'Documento Legal', category: 'otro' };
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

    // ── Text extraction ────────────────────────
    let extractedText = '';
    let extractionMethod = 'none';

    if (fileBase64) {
      if (lowerName.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(fileBase64);
        extractionMethod = 'pdf';
      } else if (lowerName.endsWith('.docx')) {
        extractedText = await extractTextFromDOCX(fileBase64);
        extractionMethod = 'docx';
      } else if (lowerName.endsWith('.doc')) {
        // Legacy binary DOC — attempt PDF-style extraction as best-effort
        // Most .doc files won't yield much, but we try
        extractedText = await extractTextFromPDF(fileBase64);
        extractionMethod = 'doc-fallback';
        if (extractedText.length < 100) {
          console.warn('⚠️ .doc file: could not extract text from binary DOC format');
        }
      }
    }

    // Fallback to plain documentContent (TXT / RTF / pasted text)
    const contentToAnalyze = extractedText || documentContent || '';

    if (!contentToAnalyze || contentToAnalyze.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // ── Build analysis prompt ──────────────────
    let analysisInput = '';
    const hasRealContent = contentToAnalyze.length > 100;

    if (hasRealContent) {
      const truncatedContent = contentToAnalyze.substring(0, 15000);
      analysisInput = `Analiza exhaustivamente el siguiente documento legal "${fileName}":

CONTENIDO DEL DOCUMENTO:
${truncatedContent}

Proporciona un análisis profundo y profesional. Responde ÚNICAMENTE en formato JSON con: documentType, documentCategory, detectionConfidence, summary, clauses, risks, recommendations, keyDates, parties, legalReferences, missingElements.`;
    } else {
      // True fallback — no content could be extracted
      const fileTypeInference = inferDocumentTypeFromFilename(fileName);
      analysisInput = `Documento: "${fileName}" - análisis inferencial basado en nombre.
Tipo sugerido: ${fileTypeInference.suggestedType}
Categoría: ${fileTypeInference.category}

Proporciona análisis en formato JSON con detectionConfidence: "baja" indicando que es preliminar.`;
    }

    const reasoningEffort = await getSystemConfig(supabase, 'reasoning_effort_analysis', 'medium') as 'low' | 'medium' | 'high';

    const params = buildResponsesRequestParams(aiModel, {
      input: analysisInput,
      instructions: systemPrompt,
      maxOutputTokens: 8000,
      temperature: 0.2,
      jsonMode: true,
      store: false,
      reasoning: { effort: reasoningEffort }
    });

    const result = await callResponsesAPI(openaiApiKey, params);

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    // ── Parse response ─────────────────────────
    let analysis;
    try {
      let cleanContent = (result.text || '').trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace(/^```json\s*/i, '');
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```\s*/i, '');
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.replace(/\s*```$/i, '');
      analysis = JSON.parse(cleanContent.trim());
    } catch {
      analysis = {
        documentType: "Documento Legal",
        documentCategory: "otro",
        detectionConfidence: "baja",
        summary: "El documento requiere revisión manual.",
        clauses: [], risks: [], recommendations: ["Revisar documento manualmente"],
        keyDates: [], parties: [], legalReferences: [], missingElements: []
      };
    }

    const resultData = {
      success: true,
      fileName: fileName || 'Documento',
      ...analysis,
      timestamp: new Date().toISOString()
    };

    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'analysis',
        { documentContent: contentToAnalyze.substring(0, 500) + '...', fileName },
        analysis,
        { extractionMethod, textLength: contentToAnalyze.length }
      );
    }

    console.log(`✅ Analysis completed (method: ${extractionMethod}, chars: ${contentToAnalyze.length})`);

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
