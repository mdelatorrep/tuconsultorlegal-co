import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, FileText, Upload, CheckCircle, AlertCircle, FileSignature, MessageSquare, CheckSquare, BarChart, Download, Loader2, Sparkles, History, Trash2, ChevronDown, Coins, Briefcase, Info } from 'lucide-react';
import AnalysisResultsDisplay from './analysis/AnalysisResultsDisplay';
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { CaseSelectorDropdown } from "./CaseSelectorDropdown";
import { useCaseActivityLogger } from "@/hooks/useCaseActivityLogger";
import { 
  AnalysisResult, 
  normalizeAnalysisOutput, 
  getCategoryLabel, 
  getElementLabel 
} from './analysis/analysisNormalizer';

interface AnalyzeModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function AnalyzeModule({ user, currentView, onViewChange, onLogout }: AnalyzeModuleProps) {
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
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

      const history = data?.map((item: any) => 
        normalizeAnalysisOutput(item.output_data, {
          id: item.id,
          fileName: item.input_data?.fileName,
          timestamp: new Date(item.created_at),
        })
      ) || [];

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
      const { error } = await supabase
        .from('legal_tools_results')
        .delete()
        .eq('id', analysisId)
        .eq('lawyer_id', user.id);

      if (error) throw error;

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

    const allowedExtensions = ['.pdf'];
    const allowedMimeTypes = ['application/pdf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Formato no soportado. Solo se permiten archivos PDF.");
      return;
    }

    if (!hasEnoughCredits('analysis')) {
      toast.error(`Necesitas ${getToolCost('analysis')} créditos para analizar documentos.`);
      return;
    }

    const creditResult = await consumeCredits('analysis', { fileName: file.name });
    if (!creditResult.success) return;

    setAnalysisStatus('analyzing');
    try {
      let fileContent = '';
      let fileBase64 = null;

      // Binary files (PDF, DOC, DOCX) need base64 encoding; TXT is read as text
      const isBinaryFile = !file.name.toLowerCase().endsWith('.txt');

      if (isBinaryFile) {
        try {
          // Use FileReader.readAsDataURL for reliable binary-to-base64 encoding
          fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              // Strip the data:...;base64, prefix
              const base64 = dataUrl.split(',')[1];
              resolve(base64);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          fileContent = `Documento ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
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
          fileContent = `Documento: ${file.name}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('legal-document-analysis', {
        body: { documentContent: fileContent, fileName: file.name, fileBase64 }
      });

      if (error) {
        toast.error(`Error: ${error.message || 'Error desconocido al analizar el documento'}`);
        throw error;
      }

      if (!data || !data.success) {
        toast.error(`Error en el análisis: ${data?.error || 'Error desconocido'}`);
        throw new Error(data?.error || 'Error en el análisis del documento');
      }

      const result = normalizeAnalysisOutput(data, {
        fileName: file.name,
        timestamp: new Date(data.timestamp || Date.now()),
      });

      // Preserve extraction metadata from backend
      if (data.extractionQuality) result.extractionQuality = data.extractionQuality;
      if (data.extractionMethod) result.extractionMethod = data.extractionMethod;

      setAnalysisResult(result);
      setAnalysisStatus('completed');
      loadAnalysisHistory();
      toast.success(`Análisis completado: "${file.name}"`);

    } catch (error: any) {
      console.error("Error in analysis:", error);
      setAnalysisStatus('error');
      const errorMessage = error?.message || 'Error desconocido';
      if (errorMessage.includes('FunctionsHttpError')) {
        toast.error("Error de conexión con el servidor. Por favor intenta nuevamente.");
      } else if (errorMessage.includes('FunctionsRelayError')) {
        toast.error("Error de comunicación. Verifica tu conexión a internet.");
      } else if (errorMessage.includes('FunctionsFetchError')) {
        toast.error("No se pudo conectar al servidor. Verifica tu conexión.");
      }
    } finally {
      if (event.target) event.target.value = '';
    }
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

  const getRiskBadge = (level: string) => {
    const levels: Record<string, { color: string }> = {
      critical: { color: 'bg-red-500' },
      alto: { color: 'bg-red-500' },
      high: { color: 'bg-orange-500' },
      medium: { color: 'bg-yellow-500' },
      medio: { color: 'bg-yellow-500' },
      low: { color: 'bg-green-500' },
      bajo: { color: 'bg-green-500' },
    };
    const levelInfo = levels[level.toLowerCase()] || levels['medium'];
    return <Badge className={`${levelInfo.color} text-white`}><span className="capitalize">{level}</span></Badge>;
  };

  const exportAnalysisToText = () => {
    if (!analysisResult) return;
    let text = `ANÁLISIS DE DOCUMENTO: ${analysisResult.fileName}\n${'='.repeat(60)}\n\n`;
    text += `Tipo: ${analysisResult.documentType}\nCategoría: ${getCategoryLabel(analysisResult.documentCategory)}\n`;
    if (analysisResult.detectionConfidence) text += `Confianza: ${analysisResult.detectionConfidence}\n`;
    text += `Fecha: ${analysisResult.timestamp.toLocaleString()}\n\n`;
    if (analysisResult.summary) text += `RESUMEN:\n${analysisResult.summary}\n\n`;
    if (analysisResult.clauses?.length) {
      text += `${getElementLabel(analysisResult.documentCategory).toUpperCase()}S:\n`;
      analysisResult.clauses.forEach((c, i) => { text += `\n${i+1}. ${c.name}\n   ${c.content}\n   Riesgo: ${c.riskLevel}\n   Recomendación: ${c.recommendation}\n`; });
      text += '\n';
    }
    if (analysisResult.risks?.length) {
      text += `RIESGOS:\n`;
      analysisResult.risks.forEach((r, i) => { text += `\n${i+1}. ${r.type} [${r.severity}]\n   ${r.description}\n`; if (r.mitigation) text += `   Mitigación: ${r.mitigation}\n`; });
      text += '\n';
    }
    if (analysisResult.recommendations?.length) {
      text += `RECOMENDACIONES:\n`;
      analysisResult.recommendations.forEach((r, i) => { text += `${i+1}. ${r}\n`; });
      text += '\n';
    }
    if (analysisResult.parties?.length) {
      text += `PARTES:\n`;
      analysisResult.parties.forEach((p, i) => { text += `${i+1}. ${p.name} - ${p.role}\n`; });
      text += '\n';
    }
    if (analysisResult.legalReferences?.length) {
      text += `REFERENCIAS LEGALES:\n`;
      analysisResult.legalReferences.forEach((r, i) => { text += `${i+1}. ${r.reference} — ${r.context}\n`; });
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
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analizar Documento
          </CardTitle>
          <CardDescription>
            Sube un archivo PDF para obtener un análisis legal completo con IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            accept=".pdf"
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
                Analizando documento...
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

      {/* Extraction Quality Warning */}
      {analysisResult?.extractionQuality && analysisResult.extractionQuality !== 'full' && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {analysisResult.extractionQuality === 'minimal' 
                  ? 'Extracción de texto limitada' 
                  : 'Extracción de texto parcial'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {analysisResult.extractionQuality === 'minimal'
                  ? 'No se pudo extraer suficiente texto del documento. Los resultados son aproximados y requieren verificación manual.'
                  : 'Parte del contenido del documento no pudo extraerse completamente. Algunos detalles podrían estar incompletos.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Analysis Result */}
      {analysisResult && (
        <AnalysisResultsDisplay 
          result={analysisResult} 
          onExport={exportAnalysisToText}
        />
      )}

      {/* Analysis History - Collapsible */}
      {analysisHistory.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    Historial de Análisis
                    <Badge variant="secondary">{analysisHistory.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {analysisHistory.map((item, index) => (
                  <Collapsible key={item.id || index}>
                    <div className="border rounded-lg hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getCategoryIcon(item.documentCategory)}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.documentType} • {item.timestamp.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(item.documentCategory)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                              onClick={() => handleDeleteAnalysis(item.id, index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        {/* Quick stats */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                            <AlertTriangle className="h-3.5 w-3.5 mx-auto mb-0.5 text-red-600" />
                            <p className="text-sm font-bold">{item.risks?.length || 0}</p>
                            <p className="text-[10px] text-muted-foreground">Riesgos</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <FileText className="h-3.5 w-3.5 mx-auto mb-0.5 text-blue-600" />
                            <p className="text-sm font-bold">{item.clauses?.length || 0}</p>
                            <p className="text-[10px] text-muted-foreground">{getElementLabel(item.documentCategory)}s</p>
                          </div>
                          <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                            <CheckCircle className="h-3.5 w-3.5 mx-auto mb-0.5 text-green-600" />
                            <p className="text-sm font-bold">{item.recommendations?.length || 0}</p>
                            <p className="text-[10px] text-muted-foreground">Recomend.</p>
                          </div>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t pt-3">
                          {item.summary && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <h4 className="font-semibold text-sm mb-1">Resumen</h4>
                              <p className="text-xs text-muted-foreground">{item.summary}</p>
                            </div>
                          )}
                          {item.risks && item.risks.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Riesgos ({item.risks.length})</h4>
                              <div className="space-y-1.5">
                                {item.risks.map((risk, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                                    {getRiskBadge(risk.severity)}
                                    <div className="flex-1">
                                      <p className="font-medium text-xs">{risk.type}</p>
                                      <p className="text-[11px] text-muted-foreground">{risk.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.recommendations && item.recommendations.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Recomendaciones</h4>
                              <ul className="space-y-1">
                                {item.recommendations.map((rec, idx) => (
                                  <li key={idx} className="text-xs flex items-start gap-1.5">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
