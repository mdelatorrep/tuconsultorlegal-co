import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Helper function to extract text from PDF base64
async function extractTextFromPDF(base64Data: string): Promise<string> {
  try {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
    
    // Decode base64 to bytes
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to string and try to extract text between stream/endstream
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Extract text from PDF streams
    const textMatches = pdfText.match(/BT\s+(.*?)\s+ET/gs) || [];
    let extractedText = '';
    
    for (const match of textMatches) {
      // Extract text within parentheses or brackets
      const textContent = match.match(/\((.*?)\)/g) || [];
      for (const text of textContent) {
        const cleanText = text.replace(/[()]/g, '').replace(/\\[nrt]/g, ' ');
        extractedText += cleanText + ' ';
      }
    }
    
    // Clean up extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
      .trim();
    
    if (extractedText.length > 100) {
      console.log(`✅ Successfully extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    }
    
    console.log('⚠️ PDF text extraction yielded minimal content, will use filename-based analysis');
    return '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
}

// Helper function to get system configuration
async function getSystemConfig(supabaseClient: any, configKey: string, defaultValue?: string): Promise<string> {
  try {
    console.log(`Fetching config for key: ${configKey}`);
    
    const { data, error } = await supabaseClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', configKey)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching config ${configKey}:`, error);
      return defaultValue || '';
    }

    if (!data) {
      console.log(`No config found for ${configKey}, using default`);
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

// Helper function to infer document type from filename
function inferDocumentTypeFromFilename(filename: string): {
  suggestedType: string;
  category: string;
  typicalElements: string[];
} {
  const lower = filename.toLowerCase();
  
  if (lower.includes('contrato') || lower.includes('contract')) {
    return {
      suggestedType: 'Contrato',
      category: 'contrato',
      typicalElements: [
        '- Identificación de las partes',
        '- Objeto del contrato',
        '- Obligaciones y derechos',
        '- Condiciones de pago',
        '- Plazos y vigencia',
        '- Cláusulas de terminación',
        '- Resolución de conflictos',
        '- Jurisdicción aplicable'
      ]
    };
  } else if (lower.includes('respuesta') || lower.includes('contestacion')) {
    return {
      suggestedType: 'Respuesta Legal',
      category: 'respuesta_legal',
      typicalElements: [
        '- Identificación del proceso',
        '- Argumentos de defensa',
        '- Fundamentos legales',
        '- Pruebas y evidencias',
        '- Pretensiones',
        '- Excepciones presentadas'
      ]
    };
  } else if (lower.includes('demanda') || lower.includes('escrito')) {
    return {
      suggestedType: 'Escrito Jurídico',
      category: 'escrito_juridico',
      typicalElements: [
        '- Hechos del caso',
        '- Fundamentos de derecho',
        '- Pretensiones',
        '- Pruebas',
        '- Peticiones al juez'
      ]
    };
  } else if (lower.includes('informe') || lower.includes('dictamen')) {
    return {
      suggestedType: 'Informe Legal',
      category: 'informe',
      typicalElements: [
        '- Antecedentes',
        '- Análisis de situación',
        '- Conclusiones',
        '- Recomendaciones',
        '- Referencias legales'
      ]
    };
  }
  
  return {
    suggestedType: 'Documento Legal',
    category: 'otro',
    typicalElements: [
      '- Identificación de partes involucradas',
      '- Objeto o propósito del documento',
      '- Derechos y obligaciones',
      '- Condiciones aplicables'
    ]
  };
}

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

    // Extract text from PDF if base64 provided
    let pdfExtractedText = '';
    if (fileBase64 && fileName?.toLowerCase().endsWith('.pdf')) {
      console.log('📄 Processing PDF file:', fileName);
      pdfExtractedText = await extractTextFromPDF(fileBase64);
      
      if (!pdfExtractedText) {
        console.log('⚠️ Could not extract text from PDF, will analyze based on structure and metadata');
      }
    }

    if (!pdfExtractedText && !documentContent) {
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

    // Get analysis AI model and prompt from system config
    const aiModel = await getSystemConfig(supabase, 'analysis_ai_model', 'gpt-4o');
    const systemPrompt = await getSystemConfig(
      supabase, 
      'analysis_ai_prompt',
      'Eres un experto analista legal. Analiza el documento proporcionado y responde en formato JSON con la siguiente estructura: {documentType, documentCategory, detectionConfidence, summary, clauses: [{name, content, riskLevel, recommendation}], risks: [{type, description, severity, mitigation}], recommendations: [], keyDates: [], parties: [], legalReferences: [], missingElements: []}.'
    );
    
    console.log(`Using analysis model: ${aiModel}`);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare OpenAI request
    const requestBody: any = {
      model: aiModel,
      messages: [
        {
          role: "system",
          content: systemPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    };

    // Build user message based on file type
    if (fileBase64 && fileName?.toLowerCase().endsWith('.pdf')) {
      // Upload PDF to OpenAI and use file_id for processing
      console.log('📄 Uploading PDF to OpenAI for analysis');
      
      try {
        // Convert base64 to blob for upload
        const base64Clean = fileBase64.replace(/^data:application\/pdf;base64,/, '');
        const binaryString = atob(base64Clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create FormData for file upload
        const formData = new FormData();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        formData.append('file', blob, fileName);
        formData.append('purpose', 'user_data');
        
        // Upload file to OpenAI
        const uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text();
          console.error('Error uploading PDF to OpenAI:', uploadError);
          throw new Error(`Failed to upload PDF: ${uploadResponse.status}`);
        }
        
        const fileData = await uploadResponse.json();
        console.log(`✅ PDF uploaded successfully. File ID: ${fileData.id}`);
        
        // Use file_id in chat completion
        requestBody.messages.push({
          role: "user",
          content: [
            {
              type: "file",
              file: {
                file_id: fileData.id
              }
            },
            {
              type: "text",
              text: `Analiza exhaustivamente este documento legal PDF llamado "${fileName}". Proporciona un análisis profundo y profesional en formato JSON siguiendo la estructura especificada en el prompt del sistema.`
            }
          ]
        });
      } catch (uploadError) {
        console.error('Failed to upload PDF, falling back to text extraction:', uploadError);
        // Fallback to text extraction if upload fails
        const content = pdfExtractedText || documentContent || '';
        const truncatedContent = content.substring(0, 8000);
        
        if (truncatedContent.length > 100) {
          requestBody.messages.push({
            role: "user",
            content: `Analiza exhaustivamente el siguiente documento legal (${fileName}):

CONTENIDO DEL DOCUMENTO:
${truncatedContent}

Proporciona un análisis profundo y profesional en formato JSON.`
          });
        } else {
          // Last resort: inferential analysis
          const fileTypeInference = inferDocumentTypeFromFilename(fileName);
          requestBody.messages.push({
            role: "user",
            content: `Documento: "${fileName}"

IMPORTANTE: Este es un documento del cual no se pudo extraer contenido. Proporciona un análisis inferencial basándote en el tipo de documento sugerido: ${fileTypeInference.suggestedType} (${fileTypeInference.category}).

Proporciona un análisis estructurado en formato JSON con "detectionConfidence": "baja".`
          });
        }
      }
    } else if (pdfExtractedText || documentContent) {
      // Use extracted text for analysis
      const content = pdfExtractedText || documentContent || '';
      const truncatedContent = content.substring(0, 8000);
      
      console.log('📝 Using extracted text for analysis');
      
      requestBody.messages.push({
        role: "user",
        content: `Analiza exhaustivamente el siguiente documento legal (${fileName}):

CONTENIDO DEL DOCUMENTO:
${truncatedContent}

Proporciona un análisis profundo y profesional en formato JSON.`
      });
    } else {
      // Fallback: inferential analysis from filename
      const fileTypeInference = inferDocumentTypeFromFilename(fileName);
      
      console.log('⚠️ Using inferential analysis based on filename');
      
      requestBody.messages.push({
        role: "user",
        content: `Documento: "${fileName}"

IMPORTANTE: Este es un documento del cual no se pudo extraer contenido automáticamente. Proporciona un análisis inferencial basándote en:
1. El nombre del archivo sugiere que es: ${fileTypeInference.suggestedType}
2. La categoría probable es: ${fileTypeInference.category}
3. Elementos típicos esperados en este tipo de documento

${fileTypeInference.typicalElements.length > 0 ? `ELEMENTOS TÍPICOS EN ESTE TIPO DE DOCUMENTO:
${fileTypeInference.typicalElements.join('\n')}` : ''}

Proporciona un análisis estructurado en formato JSON indicando:
- El tipo de documento inferido
- Los elementos legales típicos que debería contener
- Riesgos comunes asociados a este tipo de documento
- Recomendaciones generales para su revisión
- IMPORTANTE: En el campo "detectionConfidence" indica "baja" ya que el análisis es inferencial

Nota: Indica en el resumen que este es un análisis preliminar basado en el tipo de documento.`
      });
    }

    console.log('Calling OpenAI API with model:', aiModel);

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
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const responseContent = openaiData.choices[0].message.content;

    // Try to parse as JSON, fallback to structured response if parsing fails
    let analysis;
    try {
      // Clean markdown code blocks if present
      let cleanContent = responseContent.trim();
      
      // Remove markdown code block syntax if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/i, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/i, '');
      }
      
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.replace(/\s*```$/i, '');
      }
      
      cleanContent = cleanContent.trim();
      
      console.log('Attempting to parse cleaned content:', cleanContent.substring(0, 200));
      analysis = JSON.parse(cleanContent);
      console.log('✅ Successfully parsed analysis result');
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      console.error('Raw content:', responseContent);
      
      // Fallback: create structured response from text
      analysis = {
        documentType: "Documento Legal",
        documentCategory: "otro",
        detectionConfidence: "baja",
        summary: "El documento requiere revisión manual debido a un error en el procesamiento automático.",
        clauses: [
          {
            name: "Análisis General",
            content: responseContent.substring(0, 300) + "...",
            riskLevel: "medium",
            recommendation: "Revisar con detalle"
          }
        ],
        risks: [
          {
            type: "Análisis Requerido",
            description: "El documento requiere revisión manual debido a un error en el procesamiento automático",
            severity: "medium",
            mitigation: "Revisar manualmente o volver a analizar"
          }
        ],
        recommendations: ["Revisar documento manualmente", "Consultar con especialista si es necesario"],
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

    // Save result to database if user is authenticated
    if (lawyerId) {
      await saveToolResult(
        supabase,
        lawyerId,
        'analysis',
        { 
          documentContent: (pdfExtractedText || documentContent || '').substring(0, 500) + '...', 
          fileName,
          fileSize: fileBase64?.length 
        },
        analysis,
        { 
          originalFileSize: fileBase64?.length,
          pdfTextExtracted: !!pdfExtractedText,
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
