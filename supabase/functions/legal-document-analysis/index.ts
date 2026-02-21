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
 * Extract text from PDF using regex on raw binary.
 * Returns whatever it can; caller decides if quality is sufficient.
 */
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    console.log('🔍 Starting PDF text extraction...');
    const bytes = base64ToUint8Array(base64Data);
    const raw = new TextDecoder('latin1').decode(bytes);

    let extractedText = '';

    // Strategy 1: BT...ET blocks
    const btEtMatches = raw.match(/BT\s+([\s\S]*?)\s+ET/g) || [];
    for (const block of btEtMatches) {
      const parenTexts = block.match(/\(([^)\\]|\\.)*\)/g) || [];
      for (const t of parenTexts) {
        const decoded = t.slice(1, -1)
          .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
        extractedText += decoded + ' ';
      }
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

    // Strategy 2: plain-text streams
    if (extractedText.trim().length < 200) {
      const streamMatches = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || [];
      for (const s of streamMatches) {
        const inner = s.replace(/^stream\r?\n/, '').replace(/\r?\nendstream$/, '');
        const printable = inner.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
        if (printable.length > 50) {
          extractedText += printable + ' ';
        }
      }
    }

    extractedText = extractedText
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')
      .replace(/\s{3,}/g, '  ')
      .trim();

    console.log(`✅ PDF extracted ${extractedText.length} chars`);
    return extractedText;
  } catch (error) {
    console.error('❌ Error extracting text from PDF:', error);
    return '';
  }
}

/**
 * Extract text from DOCX using proper XML namespace parsing via DOMParser.
 */
async function extractTextFromDOCX(base64Data: string): Promise<string> {
  try {
    console.log('🔍 Starting DOCX text extraction (DOMParser)...');
    // @ts-ignore - dynamic import from esm.sh
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;

    const bytes = base64ToUint8Array(base64Data);
    const zip = await JSZip.loadAsync(bytes.buffer);

    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      console.warn('⚠️ word/document.xml not found in ZIP');
      return '';
    }

    const xmlContent: string = await docFile.async('text');

    // Use DOMParser for robust namespace-aware parsing
    const { DOMParser } = await import('https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    let text = '';

    if (doc) {
      // Strategy 1: getElementsByTagNameNS for w:t elements
      const WP_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      const tNodes = doc.getElementsByTagNameNS(WP_NS, 't');
      
      if (tNodes && tNodes.length > 0) {
        for (let i = 0; i < tNodes.length; i++) {
          text += (tNodes[i].textContent || '') + ' ';
        }
      }

      // Strategy 2: If namespace approach yielded little, try tagName matching
      if (text.trim().length < 100) {
        console.log('🔄 DOCX: namespace approach yielded little, trying tag matching...');
        const allElements = doc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const tagName = el.tagName || el.nodeName || '';
          if (tagName === 'w:t' || tagName.endsWith(':t')) {
            text += (el.textContent || '') + ' ';
          }
        }
      }
    }

    // Strategy 3: Regex fallback for edge cases where DOMParser fails
    if (text.trim().length < 100) {
      console.log('🔄 DOCX: DOMParser yielded little, trying regex fallback...');
      // Match both <w:t> and <w:t xml:space="preserve"> variants
      const wtMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      text = wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      
      // Also try without namespace prefix
      if (text.trim().length < 100) {
        const allText = xmlContent.replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        text = allText;
      }
    }

    text = text.replace(/\s{3,}/g, '  ').trim();
    console.log(`✅ DOCX extracted ${text.length} chars`);
    return text;
  } catch (error) {
    console.error('❌ Error extracting text from DOCX:', error);
    return '';
  }
}

/**
 * Extract text from legacy binary .doc files.
 * Strategy A: mammoth library. Strategy B: CFB stream parsing.
 */
async function extractTextFromDOC(base64Data: string): Promise<string> {
  const bytes = base64ToUint8Array(base64Data);

  // Strategy A: mammoth
  try {
    console.log('🔍 [DOC] Trying mammoth extraction...');
    // @ts-ignore
    const mammoth = await import('https://esm.sh/mammoth@1.8.0');
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
    const text = (result?.value || '').trim();
    if (text.length > 100) {
      console.log(`✅ [DOC] mammoth extracted ${text.length} chars`);
      return text;
    }
    console.warn('⚠️ [DOC] mammoth returned minimal content, trying CFB fallback...');
  } catch (mammothErr: any) {
    console.warn('⚠️ [DOC] mammoth failed:', mammothErr?.message ?? mammothErr);
  }

  // Strategy B: CFB stream parsing (kept from original)
  try {
    console.log('🔍 [DOC] Trying CFB stream extraction...');

    const CFB_MAGIC = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
    if (!CFB_MAGIC.every((b, i) => bytes[i] === b)) {
      console.warn('⚠️ [DOC] Not a CFB file');
      return '';
    }

    const view = new DataView(bytes.buffer);
    const sectorShift = view.getUint16(0x1E, true);
    const sectorSize = 1 << sectorShift;
    const numFATSectors = view.getUint32(0x2C, true);
    const firstDirSect = view.getUint32(0x30, true);
    const firstMiniFAT = view.getUint32(0x3C, true);
    const miniSectorShift = view.getUint16(0x20, true);
    const miniSectorSize = 1 << miniSectorShift;
    const miniStreamCutoff = view.getUint32(0x38, true);

    const fatSectorList: number[] = [];
    for (let i = 0; i < 109; i++) {
      const sect = view.getUint32(0x4C + i * 4, true);
      if (sect >= 0xFFFFFFFE) break;
      fatSectorList.push(sect);
    }

    const sectOffset = (sect: number) => (sect + 1) * sectorSize;

    const fat = new Int32Array(numFATSectors * (sectorSize / 4));
    for (let si = 0; si < fatSectorList.length; si++) {
      const off = sectOffset(fatSectorList[si]);
      for (let j = 0; j < sectorSize / 4; j++) {
        fat[si * (sectorSize / 4) + j] = view.getInt32(off + j * 4, true);
      }
    }

    const readChain = (startSect: number): Uint8Array => {
      const chunks: Uint8Array[] = [];
      let cur = startSect;
      const visited = new Set<number>();
      while (cur >= 0 && cur < 0xFFFFFFFE && !visited.has(cur)) {
        visited.add(cur);
        const off = sectOffset(cur);
        chunks.push(bytes.slice(off, off + sectorSize));
        cur = fat[cur] ?? -1;
      }
      const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
      let pos = 0;
      for (const c of chunks) { out.set(c, pos); pos += c.length; }
      return out;
    };

    const dirBytes = readChain(firstDirSect);
    const dirView = new DataView(dirBytes.buffer);
    const numDirEntries = dirBytes.length / 128;

    let rootStartSect = -1;
    let wordDocStart = -1;
    let wordDocSize = 0;

    for (let i = 0; i < numDirEntries; i++) {
      const base = i * 128;
      const nameLen = dirView.getUint16(base + 0x40, true);
      if (nameLen < 2 || nameLen > 64) continue;

      let name = '';
      for (let c = 0; c < (nameLen - 2) / 2; c++) {
        name += String.fromCharCode(dirView.getUint16(base + c * 2, true));
      }

      const objectType = dirView.getUint8(base + 0x42);
      const startSect = dirView.getInt32(base + 0x74, true);
      const sizeLow = dirView.getUint32(base + 0x78, true);

      if (i === 0 && objectType === 5) {
        rootStartSect = startSect;
      }

      if (name === 'WordDocument' && objectType === 2) {
        wordDocStart = startSect;
        wordDocSize = sizeLow;
      }
    }

    if (wordDocStart < 0) {
      console.warn('⚠️ [DOC] WordDocument stream not found');
      return '';
    }

    let wordDocBytes: Uint8Array;
    if (wordDocSize < miniStreamCutoff && rootStartSect >= 0 && firstMiniFAT < 0xFFFFFFFE) {
      const miniStreamData = readChain(rootStartSect);
      const miniFATBytes = readChain(firstMiniFAT);
      const miniFAT = new Int32Array(miniFATBytes.buffer);

      const readMiniChain = (startMiniSect: number): Uint8Array => {
        const chunks: Uint8Array[] = [];
        let cur = startMiniSect;
        const visited = new Set<number>();
        while (cur >= 0 && cur < 0xFFFFFFFE && !visited.has(cur)) {
          visited.add(cur);
          const off = cur * miniSectorSize;
          chunks.push(miniStreamData.slice(off, off + miniSectorSize));
          cur = miniFAT[cur] ?? -1;
        }
        const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
        let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return out;
      };

      wordDocBytes = readMiniChain(wordDocStart).slice(0, wordDocSize);
    } else {
      wordDocBytes = readChain(wordDocStart).slice(0, wordDocSize);
    }

    const fibView = new DataView(wordDocBytes.buffer);
    const fFlags = fibView.getUint16(0x0A, true);
    const fComplex = (fFlags >> 4) & 1;
    const fExtChar = (fFlags >> 11) & 1;
    const fcMin = fibView.getUint32(0x18, true);
    const fcMac = fibView.getUint32(0x1C, true);

    if (!fComplex && fcMac > fcMin && fcMac <= wordDocBytes.length) {
      const textBytes = wordDocBytes.slice(fcMin, fcMac);
      let text: string;
      if (fExtChar) {
        text = new TextDecoder('utf-16le').decode(textBytes);
      } else {
        text = new TextDecoder('windows-1252', { fatal: false }).decode(textBytes);
      }
      text = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
        .replace(/\r/g, '\n')
        .replace(/\s{3,}/g, '  ')
        .trim();

      if (text.length > 100) {
        console.log(`✅ [DOC] CFB FIB extraction: ${text.length} chars`);
        return text;
      }
    }

    // Last resort: decode WordDocument bytes as UTF-16LE
    const rawUtf16 = new TextDecoder('utf-16le', { fatal: false }).decode(wordDocBytes);
    const filtered = rawUtf16
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\r/g, '\n')
      .replace(/\s{3,}/g, '  ')
      .trim();

    const runs = filtered.match(/\S[\s\S]{3,}\S/g) || [];
    const meaningful = runs.filter(r => {
      const letters = (r.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g) || []).length;
      return letters / r.length > 0.4;
    });
    const cleanText = meaningful.join(' ').replace(/\s{3,}/g, '  ').trim();
    console.log(`✅ [DOC] CFB WordDocument raw decode: ${cleanText.length} chars`);
    return cleanText;

  } catch (cfbErr) {
    console.error('❌ [DOC] CFB extraction failed:', cfbErr);
    return '';
  }
}

/**
 * For PDFs where text extraction fails, use OpenAI's vision to read the PDF as base64 image.
 */
async function analyzeWithVision(
  openaiApiKey: string,
  base64Data: string,
  fileName: string,
  systemPrompt: string,
  aiModel: string,
  reasoningEffort: 'low' | 'medium' | 'high'
): Promise<{ success: boolean; text?: string; error?: string }> {
  console.log('🔍 Using OpenAI file input for PDF analysis (vision fallback)...');
  
  const analysisInput = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text',
          text: `Analiza exhaustivamente este documento legal "${fileName}". Proporciona un análisis profundo y profesional. Responde ÚNICAMENTE en formato JSON con: documentType, documentCategory, detectionConfidence, summary, clauses, risks, recommendations, keyDates, parties, legalReferences, missingElements.`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:application/pdf;base64,${base64Data.substring(0, 50000)}`,
            detail: 'high'
          }
        }
      ]
    }
  ];

  const params = buildResponsesRequestParams(aiModel, {
    input: analysisInput as any,
    instructions: systemPrompt,
    maxOutputTokens: 8000,
    temperature: 0.2,
    jsonMode: true,
    store: false,
    reasoning: { effort: reasoningEffort }
  });

  return await callResponsesAPI(openaiApiKey, params);
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

/**
 * Determine extraction quality based on character count
 */
function getExtractionQuality(charCount: number): 'full' | 'partial' | 'minimal' {
  if (charCount >= 500) return 'full';
  if (charCount >= 100) return 'partial';
  return 'minimal';
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
        extractedText = await extractTextFromDOC(fileBase64);
        extractionMethod = 'doc-binary';
      }
    }

    // Fallback to plain documentContent
    const contentToAnalyze = extractedText || documentContent || '';
    const extractionQuality = getExtractionQuality(contentToAnalyze.trim().length);

    console.log(`📊 Extraction quality: ${extractionQuality} (${contentToAnalyze.length} chars)`);

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

    // ── Route: Vision fallback for PDFs with minimal extraction ──
    if (extractionQuality === 'minimal' && lowerName.endsWith('.pdf') && fileBase64) {
      console.log('🔀 Routing to vision fallback for PDF with minimal text extraction');
      
      const visionResult = await analyzeWithVision(
        openaiApiKey, fileBase64, fileName, systemPrompt, aiModel, reasoningEffort
      );

      if (visionResult.success && visionResult.text) {
        let analysis;
        try {
          let cleanContent = (visionResult.text || '').trim();
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
          extractionQuality: 'partial',
          extractionMethod: 'vision-fallback',
          ...analysis,
          timestamp: new Date().toISOString()
        };

        if (lawyerId) {
          await saveToolResult(supabase, lawyerId, 'analysis',
            { documentContent: 'PDF procesado por visión', fileName },
            analysis,
            { extractionMethod: 'vision-fallback', extractionQuality: 'partial' }
          );
        }

        console.log('✅ Analysis completed via vision fallback');
        return new Response(JSON.stringify(resultData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // If vision also failed, continue with minimal content below
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build analysis prompt ──────────────────
    let analysisInput = '';
    const hasRealContent = contentToAnalyze.length > 100;

    if (hasRealContent) {
      // Increased limit: 30K chars, with smart sectioning for very long docs
      let truncatedContent: string;
      if (contentToAnalyze.length > 30000) {
        const firstPart = contentToAnalyze.substring(0, 15000);
        const lastPart = contentToAnalyze.substring(contentToAnalyze.length - 15000);
        truncatedContent = `${firstPart}\n\n[... CONTENIDO INTERMEDIO OMITIDO (${contentToAnalyze.length - 30000} caracteres) ...]\n\n${lastPart}`;
      } else {
        truncatedContent = contentToAnalyze;
      }

      const qualityWarning = extractionQuality === 'partial' 
        ? '\n\nNOTA: La extracción de texto fue parcial. Algunos segmentos pueden estar incompletos.' 
        : '';

      analysisInput = `Analiza exhaustivamente el siguiente documento legal "${fileName}":${qualityWarning}

CONTENIDO DEL DOCUMENTO:
${truncatedContent}

Proporciona un análisis profundo y profesional. Responde ÚNICAMENTE en formato JSON con: documentType, documentCategory, detectionConfidence, summary, clauses, risks, recommendations, keyDates, parties, legalReferences, missingElements.`;
    } else {
      const fileTypeInference = inferDocumentTypeFromFilename(fileName);
      analysisInput = `Documento: "${fileName}" - análisis inferencial basado en nombre.
Tipo sugerido: ${fileTypeInference.suggestedType}
Categoría: ${fileTypeInference.category}

Proporciona análisis en formato JSON con detectionConfidence: "baja" indicando que es preliminar.`;
    }

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
      extractionQuality,
      extractionMethod,
      ...analysis,
      timestamp: new Date().toISOString()
    };

    if (lawyerId) {
      await saveToolResult(supabase, lawyerId, 'analysis',
        { documentContent: contentToAnalyze.substring(0, 500) + '...', fileName },
        analysis,
        { extractionMethod, extractionQuality, textLength: contentToAnalyze.length }
      );
    }

    console.log(`✅ Analysis completed (method: ${extractionMethod}, quality: ${extractionQuality}, chars: ${contentToAnalyze.length})`);

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
