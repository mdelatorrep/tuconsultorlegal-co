import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, FileText, Upload, CheckCircle, XCircle, AlertCircle, FileSignature, MessageSquare, CheckSquare, BarChart, Copy, Check, Download, Loader2, Eye, Sparkles, Shield, Target, History, Trash2, ChevronDown, Coins, Briefcase } from 'lucide-react';
import AnalysisResultsDisplay from './analysis/AnalysisResultsDisplay';
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { CaseSelectorDropdown } from "./CaseSelectorDropdown";
import { useCaseActivityLogger } from "@/hooks/useCaseActivityLogger";

interface AnalyzeModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface AnalysisResult {
  id?: string;
  fileName: string;
  documentType: string;
  documentCategory?: 'contrato' | 'respuesta_legal' | 'escrito_juridico' | 'informe' | 'correspondencia' | 'anexo' | 'otro';
  detectionConfidence?: 'alta' | 'media' | 'baja';
  summary?: string;
  clauses?: Array<{
    name: string;
    content: string;
    riskLevel: string;
    recommendation: string;
  }>;
  risks?: Array<{
    type: string;
    description: string;
    severity: string;
    mitigation?: string;
  }>;
  recommendations?: string[];
  keyDates?: Array<{
    date: string;
    description: string;
    importance: string;
  }>;
  parties?: Array<{
    name: string;
    role: string;
  }>;
  legalReferences?: Array<{
    reference: string;
    context: string;
  }>;
  missingElements?: string[];
  timestamp: Date;
}

export default function AnalyzeModule({ user, currentView, onViewChange, onLogout }: AnalyzeModuleProps) {
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);
  const { logAIToolUsage } = useCaseActivityLogger();

  useEffect(() => {
    loadAnalysisHistory();
  }, [user.id]);

  const loadAnalysisHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'analysis')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const history = data?.map((item: any) => {
        const out = item.output_data || {};
        const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
        const safeString = (v: any, fallback: string) => (typeof v === 'string' ? v : fallback);

        const normalizeConfidenceH = (v: any): 'alta' | 'media' | 'baja' | undefined => {
          if (typeof v === 'string') {
            const lower = v.toLowerCase();
            if (['alta', 'high'].includes(lower)) return 'alta';
            if (['media', 'medium'].includes(lower)) return 'media';
            return 'baja';
          }
          if (typeof v === 'number') return v >= 0.7 ? 'alta' : v >= 0.4 ? 'media' : 'baja';
          return undefined;
        };

        const normalizeClausesH = (v: any) => safeArray(v).map((c: any) => ({
          name: c.name || c.clause || c.title || 'Elemento',
          content: c.content || c.description || c.text || c.clause || '',
          riskLevel: c.riskLevel || c.risk_level || c.risk || 'medio',
          recommendation: c.recommendation || c.recomendacion || '',
        }));

        const normalizePartiesH = (v: any) => {
          if (Array.isArray(v)) return v.map((p: any) => ({ name: p.name || 'Parte', role: p.role || p.likelyProfile || '' }));
          if (v && typeof v === 'object') {
            const res: any[] = [];
            if (Array.isArray(v.extracted)) v.extracted.forEach((p: any) => res.push({ name: p.name || 'Parte', role: p.role || '' }));
            if (Array.isArray(v.inferredRoles)) v.inferredRoles.forEach((p: any) => res.push({ name: p.role || 'Parte inferida', role: p.likelyProfile || '' }));
            return res;
          }
          return [];
        };

        const normalizeKeyDatesH = (v: any) => {
          if (Array.isArray(v)) return v.map((d: any) => ({ date: d.date || d.fecha || '', description: d.description || d.context || '', importance: d.importance || 'normal' }));
          if (v && typeof v === 'object' && Array.isArray(v.extractedFromFilename)) {
            return v.extractedFromFilename.map((d: any) => ({ date: d.possibleDate1 || '', description: d.context || '', importance: 'baja' }));
          }
          return [];
        };

        const normalizeLegalRefsH = (v: any) => {
          if (Array.isArray(v)) return v.map((r: any) => ({ reference: r.reference || String(r), context: r.context || r.subject || '' }));
          if (v && typeof v === 'object') {
            const res: any[] = [];
            if (Array.isArray(v.foundInDocument)) v.foundInDocument.forEach((r: any) => res.push({ reference: r.reference || String(r), context: r.context || 'En documento' }));
            if (Array.isArray(v.recommendedToCheck)) v.recommendedToCheck.forEach((r: any) => res.push({ reference: r.reference || String(r), context: r.subject || 'Recomendada' }));
            return res;
          }
          return [];
        };

        return {
          id: item.id,
          fileName: safeString(item.input_data?.fileName, 'Documento'),
          documentType: safeString(out?.documentType, 'Documento Legal'),
          documentCategory: safeString(out?.documentCategory, 'otro') as any,
          detectionConfidence: normalizeConfidenceH(out?.detectionConfidence),
          summary: safeString(out?.summary, ''),
          clauses: normalizeClausesH(out?.clauses),
          risks: safeArray(out?.risks).map((r: any) => ({
            type: r.type || r.tipo || 'Riesgo',
            description: r.description || r.descripcion || '',
            severity: r.severity || r.severidad || r.level || 'medio',
            mitigation: r.mitigation,
          })),
          recommendations: safeArray(out?.recommendations).map((r: any) => typeof r === 'string' ? r : r.recommendation || String(r)),
          keyDates: normalizeKeyDatesH(out?.keyDates),
          parties: normalizePartiesH(out?.parties),
          legalReferences: normalizeLegalRefsH(out?.legalReferences),
          missingElements: safeArray(out?.missingElements).map((m: any) => typeof m === 'string' ? m : m.description || String(m)),
          timestamp: new Date(item.created_at)
        } as AnalysisResult;
      }) || [];

      setAnalysisHistory(history);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const handleDeleteAnalysis = async (analysisId: string | undefined, index: number) => {
    if (!analysisId) {
      toast.error('No se puede eliminar: ID no válido');
      return;
    }

    try {
      console.log('Deleting analysis with ID:', analysisId);
      
      const { error } = await supabase
        .from('legal_tools_results')
        .delete()
        .eq('id', analysisId)
        .eq('lawyer_id', user.id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      // Actualizar el estado local solo si la eliminación fue exitosa
      setAnalysisHistory(prev => prev.filter((_, i) => i !== index));
      toast.success('Análisis eliminado correctamente');
    } catch (error: any) {
      console.error('Error deleting analysis:', error);
      toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ];

    if (!acceptedTypes.includes(file.type) && !file.type.includes('document')) {
      toast.error("Tipo de archivo no soportado. Por favor sube un archivo PDF, DOC, DOCX o TXT.");
      return;
    }

    // Check and consume credits before proceeding
    if (!hasEnoughCredits('analysis')) {
      toast.error(`Necesitas ${getToolCost('analysis')} créditos para analizar documentos.`);
      return;
    }

    const creditResult = await consumeCredits('analysis', { fileName: file.name });
    if (!creditResult.success) {
      return;
    }

    setAnalysisStatus('analyzing');
    try {
      console.log('Analyzing document:', file.name);
      
      let fileContent = '';
      let fileBase64 = null;
      
      const binaryTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      
      const isBinaryFile = binaryTypes.includes(file.type) || 
                          file.name.toLowerCase().endsWith('.doc') ||
                          file.name.toLowerCase().endsWith('.docx') ||
                          file.name.toLowerCase().endsWith('.pdf');
      
      if (isBinaryFile) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          // Use chunked approach to avoid stack overflow on large files
          const chunkSize = 8192;
          const chunks: string[] = [];
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            chunks.push(String.fromCharCode(...uint8Array.slice(i, i + chunkSize)));
          }
          fileBase64 = btoa(chunks.join(''));
          fileContent = `Documento ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
          console.log(`✅ Binary file encoded: ${uint8Array.length} bytes → base64 length ${fileBase64.length}`);
        } catch (binaryError) {
          console.error('Error processing binary file:', binaryError);
          toast.error('Error procesando el archivo');
          setAnalysisStatus('error');
          return;
        }
      } else {
        try {
          fileContent = await file.text();
        } catch (textError) {
          console.error('Error reading text file:', textError);
          fileContent = `Documento: ${file.name}`;
        }
      }

      console.log('Invoking edge function with:', {
        fileName: file.name,
        fileSize: file.size,
        hasBase64: !!fileBase64,
        contentLength: fileContent.length
      });

      const { data, error } = await supabase.functions.invoke('legal-document-analysis', {
        body: { 
          documentContent: fileContent, 
          fileName: file.name,
          fileBase64: fileBase64
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        const errorMessage = error.message || 'Error desconocido al analizar el documento';
        toast.error(`Error: ${errorMessage}`);
        throw error;
      }

      if (!data) {
        console.error('No data returned from edge function');
        toast.error('No se recibió respuesta del servidor');
        throw new Error('No data returned');
      }

      if (!data.success) {
        console.error('Analysis failed:', data.error);
        toast.error(`Error en el análisis: ${data.error || 'Error desconocido'}`);
        throw new Error(data.error || 'Error en el análisis del documento');
      }

      const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

      // Normalize detectionConfidence: number (0-1) → string label
      const normalizeConfidence = (v: any): 'alta' | 'media' | 'baja' | undefined => {
        if (typeof v === 'string') {
          const lower = v.toLowerCase();
          if (['alta', 'high'].includes(lower)) return 'alta';
          if (['media', 'medium'].includes(lower)) return 'media';
          if (['baja', 'low'].includes(lower)) return 'baja';
          return 'baja';
        }
        if (typeof v === 'number') {
          if (v >= 0.7) return 'alta';
          if (v >= 0.4) return 'media';
          return 'baja';
        }
        return undefined;
      };

      // Normalize clauses: handle both {name, content, riskLevel} and {clause, description, ...}
      const normalizeClauses = (v: any): AnalysisResult['clauses'] => {
        return safeArray(v).map((c: any) => ({
          name: c.name || c.clause || c.title || 'Elemento',
          content: c.content || c.description || c.text || c.clause || '',
          riskLevel: c.riskLevel || c.risk_level || c.risk || 'medio',
          recommendation: c.recommendation || c.recomendacion || '',
        }));
      };

      // Normalize parties: handle {name, role} and {extracted, inferredRoles}
      const normalizeParties = (v: any): AnalysisResult['parties'] => {
        if (Array.isArray(v)) {
          return v.map((p: any) => ({
            name: p.name || p.nombre || 'Parte',
            role: p.role || p.rol || p.likelyProfile || '',
          }));
        }
        if (v && typeof v === 'object') {
          const result: AnalysisResult['parties'] = [];
          if (Array.isArray(v.extracted)) {
            v.extracted.forEach((p: any) => result.push({ name: p.name || p.nombre || 'Parte', role: p.role || p.rol || '' }));
          }
          if (Array.isArray(v.inferredRoles)) {
            v.inferredRoles.forEach((p: any) => result.push({ name: p.role || 'Parte inferida', role: p.likelyProfile || p.role || '' }));
          }
          return result;
        }
        return [];
      };

      // Normalize keyDates: handle both array and object with sub-arrays
      const normalizeKeyDates = (v: any): AnalysisResult['keyDates'] => {
        if (Array.isArray(v)) {
          return v.map((d: any) => ({
            date: d.date || d.fecha || d.possibleDate1 || '',
            description: d.description || d.descripcion || d.context || '',
            importance: d.importance || d.importancia || 'normal',
          }));
        }
        if (v && typeof v === 'object') {
          const result: AnalysisResult['keyDates'] = [];
          if (Array.isArray(v.extractedFromFilename)) {
            v.extractedFromFilename.forEach((d: any) => {
              result.push({ date: d.possibleDate1 || d.possibleDate2 || '', description: d.context || '', importance: 'baja' });
            });
          }
          return result;
        }
        return [];
      };

      // Normalize legalReferences: handle object with {foundInDocument, recommendedToCheck}
      const normalizeLegalRefs = (v: any): AnalysisResult['legalReferences'] => {
        if (Array.isArray(v)) {
          return v.map((r: any) => ({
            reference: r.reference || r.referencia || r.name || '',
            context: r.context || r.contexto || r.subject || '',
          }));
        }
        if (v && typeof v === 'object') {
          const result: AnalysisResult['legalReferences'] = [];
          const found = Array.isArray(v.foundInDocument) ? v.foundInDocument : [];
          const recommended = Array.isArray(v.recommendedToCheck) ? v.recommendedToCheck : [];
          found.forEach((r: any) => result.push({ reference: r.reference || String(r), context: r.context || 'Encontrado en documento' }));
          recommended.forEach((r: any) => result.push({ reference: r.reference || String(r), context: r.subject || r.context || 'Referencia recomendada' }));
          return result;
        }
        return [];
      };

      // Normalize missingElements: handle string[] and object[] 
      const normalizeMissing = (v: any): string[] => {
        if (Array.isArray(v)) return v.map((m: any) => (typeof m === 'string' ? m : m.description || m.name || String(m)));
        return [];
      };

      // Normalize recommendations: handle string[] and object[]
      const normalizeRecommendations = (v: any): string[] => {
        if (Array.isArray(v)) return v.map((r: any) => (typeof r === 'string' ? r : r.recommendation || r.text || String(r)));
        return [];
      };

      const result: AnalysisResult = {
        fileName: file.name,
        documentType: data.documentType || 'Documento Legal',
        documentCategory: data.documentCategory || 'otro',
        detectionConfidence: normalizeConfidence(data.detectionConfidence),
        summary: data.summary,
        clauses: normalizeClauses(data.clauses),
        risks: safeArray(data.risks).map((r: any) => ({
          type: r.type || r.tipo || 'Riesgo',
          description: r.description || r.descripcion || '',
          severity: r.severity || r.severidad || r.level || 'medio',
          mitigation: r.mitigation || r.mitigacion || undefined,
        })),
        recommendations: normalizeRecommendations(data.recommendations),
        keyDates: normalizeKeyDates(data.keyDates),
        parties: normalizeParties(data.parties),
        legalReferences: normalizeLegalRefs(data.legalReferences),
        missingElements: normalizeMissing(data.missingElements),
        timestamp: new Date(data.timestamp || Date.now())
      };

      setAnalysisResult(result);
      setAnalysisStatus('completed');
      loadAnalysisHistory();
      
      toast.success(`Análisis completado: "${file.name}"`);
      
    } catch (error: any) {
      console.error("Error in analysis:", error);
      setAnalysisStatus('error');
      
      // Mostrar error más específico
      const errorMessage = error?.message || 'Error desconocido';
      if (errorMessage.includes('FunctionsHttpError')) {
        toast.error("Error de conexión con el servidor. Por favor intenta nuevamente.");
      } else if (errorMessage.includes('FunctionsRelayError')) {
        toast.error("Error de comunicación. Verifica tu conexión a internet.");
      } else if (errorMessage.includes('FunctionsFetchError')) {
        toast.error("No se pudo conectar al servidor. Verifica tu conexión.");
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      // Resetear el input para permitir cargar el mismo archivo nuevamente
      if (event.target) {
        event.target.value = '';
      }
    }
  };


  const getRiskBadge = (level: string) => {
    const levels: Record<string, { color: string; icon: React.ReactNode }> = {
      critical: { color: 'bg-red-500', icon: <XCircle className="w-4 h-4" /> },
      high: { color: 'bg-orange-500', icon: <AlertCircle className="w-4 h-4" /> },
      medium: { color: 'bg-yellow-500', icon: <AlertTriangle className="w-4 h-4" /> },
      low: { color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> }
    };

    const levelInfo = levels[level.toLowerCase()] || levels['medium'];
    
    return (
      <Badge className={`${levelInfo.color} text-white`}>
        {levelInfo.icon}
        <span className="ml-1 capitalize">{level}</span>
      </Badge>
    );
  };

  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, React.ReactNode> = {
      contrato: <FileSignature className="w-5 h-5" />,
      respuesta_legal: <MessageSquare className="w-5 h-5" />,
      escrito_juridico: <CheckSquare className="w-5 h-5" />,
      informe: <BarChart className="w-5 h-5" />,
      correspondencia: <FileText className="w-5 h-5" />,
      anexo: <FileText className="w-5 h-5" />,
      otro: <FileText className="w-5 h-5" />
    };
    return icons[category || 'otro'] || icons['otro'];
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      contrato: 'Contrato',
      respuesta_legal: 'Respuesta Legal',
      escrito_juridico: 'Escrito Jurídico',
      informe: 'Informe',
      correspondencia: 'Correspondencia',
      anexo: 'Anexo',
      otro: 'Otro'
    };
    return labels[category || 'otro'] || 'Documento';
  };

  const getElementLabel = (category?: string) => {
    const labels: Record<string, string> = {
      contrato: 'Cláusula',
      respuesta_legal: 'Argumento',
      escrito_juridico: 'Fundamento',
      informe: 'Hallazgo',
      correspondencia: 'Punto',
      anexo: 'Sección',
      otro: 'Elemento'
    };
    return labels[category || 'otro'] || 'Elemento';
  };

  const exportAnalysisToText = () => {
    if (!analysisResult) return;
    
    let text = `ANÁLISIS DE DOCUMENTO: ${analysisResult.fileName}\n`;
    text += `${'='.repeat(60)}\n\n`;
    text += `Tipo: ${analysisResult.documentType}\n`;
    text += `Categoría: ${getCategoryLabel(analysisResult.documentCategory)}\n`;
    if (analysisResult.detectionConfidence) {
      text += `Confianza: ${analysisResult.detectionConfidence}\n`;
    }
    text += `Fecha: ${analysisResult.timestamp.toLocaleString()}\n\n`;
    
    if (analysisResult.summary) {
      text += `RESUMEN:\n${analysisResult.summary}\n\n`;
    }
    
    if (analysisResult.clauses && analysisResult.clauses.length > 0) {
      text += `${getElementLabel(analysisResult.documentCategory).toUpperCase()}S:\n`;
      analysisResult.clauses.forEach((clause, idx) => {
        text += `\n${idx + 1}. ${clause.name}\n`;
        text += `   Contenido: ${clause.content}\n`;
        text += `   Nivel de riesgo: ${clause.riskLevel}\n`;
        text += `   Recomendación: ${clause.recommendation}\n`;
      });
      text += '\n';
    }
    
    if (analysisResult.risks && analysisResult.risks.length > 0) {
      text += `RIESGOS IDENTIFICADOS:\n`;
      analysisResult.risks.forEach((risk, idx) => {
        text += `\n${idx + 1}. ${risk.type} [${risk.severity}]\n`;
        text += `   ${risk.description}\n`;
        if (risk.mitigation) {
          text += `   Mitigación: ${risk.mitigation}\n`;
        }
      });
      text += '\n';
    }
    
    if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
      text += `RECOMENDACIONES:\n`;
      analysisResult.recommendations.forEach((rec, idx) => {
        text += `${idx + 1}. ${rec}\n`;
      });
      text += '\n';
    }
    
    if (analysisResult.keyDates && analysisResult.keyDates.length > 0) {
      text += `FECHAS CLAVE:\n`;
      analysisResult.keyDates.forEach((date, idx) => {
        text += `${idx + 1}. ${date.date} [${date.importance}] - ${date.description}\n`;
      });
      text += '\n';
    }
    
    if (analysisResult.parties && analysisResult.parties.length > 0) {
      text += `PARTES INVOLUCRADAS:\n`;
      analysisResult.parties.forEach((party, idx) => {
        text += `${idx + 1}. ${party.name} - ${party.role}\n`;
      });
      text += '\n';
    }
    
    if (analysisResult.legalReferences && analysisResult.legalReferences.length > 0) {
      text += `REFERENCIAS LEGALES:\n`;
      analysisResult.legalReferences.forEach((ref, idx) => {
        text += `${idx + 1}. ${ref.reference}\n   ${ref.context}\n`;
      });
      text += '\n';
    }
    
    if (analysisResult.missingElements && analysisResult.missingElements.length > 0) {
      text += `ELEMENTOS FALTANTES:\n`;
      analysisResult.missingElements.forEach((elem, idx) => {
        text += `${idx + 1}. ${elem}\n`;
      });
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-${analysisResult.fileName.replace(/[^a-z0-9]/gi, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Análisis exportado correctamente');
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Nuevo Análisis
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial ({analysisHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          {/* Upload Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Subir Documento para Análisis</CardTitle>
                      <CardDescription>
                        Soporta PDF, Word, y documentos de texto
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Case Selector */}
                      <CaseSelectorDropdown
                        lawyerId={user?.id}
                        selectedCaseId={selectedCaseId}
                        onCaseSelect={(caseId, caseData) => {
                          setSelectedCaseId(caseId);
                          setSelectedCaseData(caseData);
                        }}
                        disabled={analysisStatus === 'analyzing'}
                      />

                      {selectedCaseData && (
                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Vinculado a:</span>
                          <Badge variant="secondary">{selectedCaseData.title}</Badge>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.rtf"
                        onChange={handleFileUpload}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={analysisStatus === 'analyzing' || !hasEnoughCredits('analysis')}
                        size="lg"
                        className="w-full h-12"
                      >
                        {analysisStatus === 'analyzing' ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analizando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5" />
                            <span>Seleccionar Documento</span>
                            <span className="ml-3 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                              <Coins className="h-4 w-4" />
                              {getToolCost('analysis')}
                            </span>
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Analysis Results */}
                  {analysisResult && (
                    <AnalysisResultsDisplay 
                      result={analysisResult} 
                      onExport={exportAnalysisToText}
                    />
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {analysisHistory.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay análisis previos</h3>
                        <p className="text-muted-foreground">
                          Los documentos que analices aparecerán aquí
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {analysisHistory.map((item, index) => (
                        <Collapsible key={index}>
                          <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {getCategoryIcon(item.documentCategory)}
                                  <div className="min-w-0">
                                    <CardTitle className="text-base truncate">{item.fileName}</CardTitle>
                                    <CardDescription>
                                      {item.documentType} • {item.timestamp.toLocaleDateString()}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="secondary">
                                    {getCategoryLabel(item.documentCategory)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteAnalysis(item.id, index)}
                                    className="hover:bg-red-100 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="text-center p-2 bg-red-50 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
                                  <p className="text-lg font-bold">{item.risks?.length || 0}</p>
                                  <p className="text-xs text-muted-foreground">Riesgos</p>
                                </div>
                                <div className="text-center p-2 bg-blue-50 rounded-lg">
                                  <FileText className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                                  <p className="text-lg font-bold">{item.clauses?.length || 0}</p>
                                  <p className="text-xs text-muted-foreground">{getElementLabel(item.documentCategory)}s</p>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded-lg">
                                  <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                                  <p className="text-lg font-bold">{item.recommendations?.length || 0}</p>
                                  <p className="text-xs text-muted-foreground">Recomend.</p>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CollapsibleContent>
                              <CardContent className="pt-0 space-y-4">
                                {item.summary && (
                                  <div className="p-4 bg-muted/30 rounded-lg">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-orange-600" />
                                      Resumen
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                                  </div>
                                )}

                                {item.risks && item.risks.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      Riesgos Identificados ({item.risks.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {item.risks.map((risk, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                          {getRiskBadge(risk.severity)}
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{risk.type}</p>
                                            <p className="text-xs text-muted-foreground">{risk.description}</p>
                                            {risk.mitigation && (
                                              <p className="text-xs text-orange-600 mt-2">💡 {risk.mitigation}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.clauses && item.clauses.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">
                                      {getElementLabel(item.documentCategory)}s Analizad{getElementLabel(item.documentCategory) === 'Cláusula' ? 'as' : 'os'}: {item.clauses.length}
                                    </h4>
                                    <div className="space-y-3">
                                      {item.clauses.map((clause, idx) => (
                                        <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-sm">{clause.name}</p>
                                            {getRiskBadge(clause.riskLevel)}
                                          </div>
                                          <p className="text-sm text-muted-foreground mb-2">{clause.content}</p>
                                          {clause.recommendation && (
                                            <p className="text-xs text-orange-600">💡 {clause.recommendation}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.recommendations && item.recommendations.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      Recomendaciones ({item.recommendations.length})
                                    </h4>
                                    <ul className="space-y-2">
                                      {item.recommendations.map((rec, idx) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <span className="text-green-600 mt-1">•</span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {item.keyDates && item.keyDates.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">Fechas Clave</h4>
                                    <div className="space-y-2">
                                      {item.keyDates.map((date, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                          <Badge variant="outline">{date.importance}</Badge>
                                          <span className="font-medium">{date.date}</span>
                                          <span className="text-muted-foreground">- {date.description}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.parties && item.parties.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">Partes Involucradas</h4>
                                    <div className="space-y-2">
                                      {item.parties.map((party, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                          <Badge variant="secondary">{party.role}</Badge>
                                          <span>{party.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.legalReferences && item.legalReferences.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3">Referencias Legales</h4>
                                    <div className="space-y-2">
                                      {item.legalReferences.map((ref, idx) => (
                                        <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                                          <p className="font-medium text-sm">{ref.reference}</p>
                                          <p className="text-xs text-muted-foreground mt-1">{ref.context}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.missingElements && item.missingElements.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                                      Elementos Faltantes
                                    </h4>
                                    <ul className="space-y-1">
                                      {item.missingElements.map((elem, idx) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <span className="text-yellow-600 mt-1">⚠</span>
                                          <span>{elem}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </TabsContent>
      </Tabs>
    </div>
  );
}
