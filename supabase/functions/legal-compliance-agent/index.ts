import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { documentContent, documentType, documentCategory, documentTokenId } = await req.json();

    console.log('Starting legal compliance check for document:', documentTokenId);

    // Create legal compliance validation prompt
    const compliancePrompt = `
Eres un agente especializado en cumplimiento legal para documentos jurídicos en Colombia. Tu función es verificar que los documentos cumplan con todas las normativas legales vigentes.

TIPO DE DOCUMENTO: ${documentType}
CATEGORÍA: ${documentCategory}

ÁREAS DE VERIFICACIÓN:

1. CUMPLIMIENTO NORMATIVO:
   - Conformidad con el Código Civil Colombiano
   - Cumplimiento del Código de Comercio (si aplica)
   - Normativas específicas según el tipo de documento
   - Regulaciones sectoriales pertinentes

2. ELEMENTOS OBLIGATORIOS:
   - Cláusulas requeridas por ley
   - Información mínima obligatoria
   - Formalidades legales específicas
   - Referencias normativas necesarias

3. PROTECCIÓN DE DERECHOS:
   - Derechos del consumidor (Ley 1480 de 2011)
   - Protección de datos personales (Ley 1581 de 2012)
   - Derechos fundamentales constitucionales
   - Equidad contractual

4. VALIDEZ JURÍDICA:
   - Capacidad legal de las partes
   - Objeto lícito y posible
   - Causa lícita
   - Formalidades de ley

5. RIESGOS LEGALES:
   - Cláusulas abusivas
   - Términos ambiguos o contradictorios
   - Posibles nulidades
   - Conflictos normativos

INSTRUCCIONES:
1. Analiza minuciosamente el documento
2. Identifica cualquier incumplimiento normativo
3. Verifica la presencia de elementos obligatorios
4. Evalúa riesgos legales potenciales
5. Proporciona un puntaje de cumplimiento del 1-10
6. Sugiere correcciones específicas para cumplir con la ley

DOCUMENTO A VALIDAR:

${documentContent}
`;

    // Call OpenAI for legal compliance check
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: compliancePrompt
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent legal analysis
        max_tokens: 2500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const complianceResult = data.choices[0].message.content;

    console.log('Legal compliance check completed');

    // Extract compliance score
    const scoreMatch = complianceResult.match(/puntaje.*?(\d+)/i);
    const complianceScore = scoreMatch ? parseInt(scoreMatch[1]) : 7;

    // Determine if document has legal issues
    const hasLegalIssues = complianceScore < 8;

    // Identify critical issues that need immediate attention
    const criticalIssues = extractCriticalIssues(complianceResult);

    // Save compliance check result
    const { data: complianceRecord, error: saveError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: (await supabase
          .from('agent_workflows')
          .select('id')
          .eq('workflow_type', 'legal_compliance')
          .single()).data?.id,
        document_token_id: documentTokenId,
        execution_data: {
          compliance_result: complianceResult,
          compliance_score: complianceScore,
          has_legal_issues: hasLegalIssues,
          critical_issues: criticalIssues,
          agent_type: 'legal_compliance',
          timestamp: new Date().toISOString()
        },
        current_step: 1,
        status: 'completed'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving compliance result:', saveError);
    }

    // Generate legal recommendations if needed
    let legalRecommendations = null;
    if (hasLegalIssues) {
      legalRecommendations = await generateLegalRecommendations(
        documentContent,
        complianceResult,
        documentType,
        documentCategory
      );
    }

    return new Response(JSON.stringify({
      success: true,
      compliance_result: complianceResult,
      compliance_score: complianceScore,
      has_legal_issues: hasLegalIssues,
      critical_issues: criticalIssues,
      legal_recommendations: legalRecommendations,
      compliance_id: complianceRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal compliance check:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractCriticalIssues(complianceResult: string): string[] {
  const criticalKeywords = [
    'nulidad', 'ilegal', 'prohibido', 'violación', 'incumplimiento',
    'abusiva', 'inconstitucional', 'inválido', 'ilícito'
  ];

  const lines = complianceResult.split('\n');
  const criticalIssues: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (criticalKeywords.some(keyword => lowerLine.includes(keyword))) {
      criticalIssues.push(line.trim());
    }
  }

  return criticalIssues.slice(0, 5); // Limit to top 5 critical issues
}

async function generateLegalRecommendations(
  documentContent: string,
  complianceResult: string,
  documentType: string,
  documentCategory: string
) {
  try {
    const recommendationsPrompt = `
Basándote en el análisis de cumplimiento legal, proporciona recomendaciones específicas para corregir los problemas identificados.

RESULTADO DEL ANÁLISIS:
${complianceResult}

TIPO DE DOCUMENTO: ${documentType}
CATEGORÍA: ${documentCategory}

Proporciona recomendaciones en formato JSON con la siguiente estructura:
{
  "critical_fixes": [
    {
      "issue": "problema crítico identificado",
      "legal_basis": "fundamento legal",
      "recommendation": "corrección específica requerida",
      "urgency": "alta|media|baja"
    }
  ],
  "compliance_improvements": [
    {
      "area": "área de mejora",
      "current_issue": "problema actual",
      "suggested_clause": "cláusula sugerida",
      "legal_reference": "referencia normativa"
    }
  ],
  "risk_mitigation": [
    {
      "risk": "riesgo identificado",
      "impact": "impacto potencial",
      "mitigation": "medida de mitigación"
    }
  ],
  "mandatory_additions": [
    {
      "requirement": "elemento obligatorio faltante",
      "legal_source": "fuente legal",
      "suggested_text": "texto sugerido"
    }
  ]
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: recommendationsPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices[0].message.content;

    try {
      return JSON.parse(recommendations);
    } catch (parseError) {
      return { raw_recommendations: recommendations };
    }

  } catch (error) {
    console.error('Error generating legal recommendations:', error);
    return null;
  }
}