import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, FileText, Upload, CheckCircle, XCircle, AlertCircle, FileSignature, MessageSquare, CheckSquare, BarChart, Copy, Check, Download, Loader2, Eye, Sparkles, Shield, Target, History } from 'lucide-react';
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface AnalyzeModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface AnalysisResult {
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

      const history = data?.map((item: any) => ({
        fileName: item.input_data?.fileName || 'Documento',
        documentType: item.output_data?.documentType || 'Documento Legal',
        documentCategory: item.output_data?.documentCategory || 'otro',
        detectionConfidence: item.output_data?.detectionConfidence,
        summary: item.output_data?.summary,
        clauses: item.output_data?.clauses || [],
        risks: item.output_data?.risks || [],
        recommendations: item.output_data?.recommendations || [],
        keyDates: item.output_data?.keyDates || [],
        parties: item.output_data?.parties || [],
        legalReferences: item.output_data?.legalReferences || [],
        missingElements: item.output_data?.missingElements || [],
        timestamp: new Date(item.created_at)
      })) || [];

      setAnalysisHistory(history);
    } catch (error) {
      console.error('Error loading analysis history:', error);
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
          fileBase64 = btoa(String.fromCharCode(...uint8Array));
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
          console.error('Error reading text file:', textError);
          fileContent = `Documento: ${file.name}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('legal-document-analysis', {
        body: { 
          documentContent: fileContent, 
          fileName: file.name,
          fileBase64: fileBase64
        }
      });

      if (error) {
        console.error('Error in analysis:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Error en el análisis del documento');
      }

      const result: AnalysisResult = {
        fileName: file.name,
        documentType: data.documentType || 'Documento Legal',
        documentCategory: data.documentCategory || 'otro',
        detectionConfidence: data.detectionConfidence,
        summary: data.summary,
        clauses: data.clauses || [],
        risks: data.risks || [],
        recommendations: data.recommendations || [],
        keyDates: data.keyDates || [],
        parties: data.parties || [],
        legalReferences: data.legalReferences || [],
        missingElements: data.missingElements || [],
        timestamp: new Date(data.timestamp || Date.now())
      };

      setAnalysisResult(result);
      setAnalysisStatus('completed');
      loadAnalysisHistory();
      
      toast.success(`Análisis completado: "${file.name}"`);
      
    } catch (error) {
      console.error("Error in analysis:", error);
      setAnalysisStatus('error');
      toast.error("Error al analizar el documento. Por favor intenta nuevamente.");
    }
  };

  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      toast.success(`${sectionName} copiado al portapapeles`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Error al copiar al portapapeles');
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-orange-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0">
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-orange-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              <SidebarTrigger className="mr-2 lg:mr-4 hover:bg-orange-500/10 rounded-lg p-2 transition-all duration-200 flex-shrink-0" />
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <Eye className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent truncate">
                    Análisis de Documentos
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Revisión inteligente con IA avanzada
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto">
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

                <TabsContent value="analyze" className="space-y-4 lg:space-y-8">
                  {/* Hero Section */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 p-8">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl">
                          <Eye className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 bg-clip-text text-transparent">
                            Análisis Inteligente de Documentos
                          </h1>
                          <p className="text-lg text-muted-foreground mt-2">
                            Análisis automático de todo tipo de documentos legales con detección de riesgos y recomendaciones expertas
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-3">
                            <Target className="h-8 w-8 text-orange-600" />
                            <div>
                              <p className="text-2xl font-bold text-orange-600">{analysisHistory.length}</p>
                              <p className="text-sm text-muted-foreground">Análisis realizados</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-3">
                            <Shield className="h-8 w-8 text-red-600" />
                            <div>
                              <p className="text-2xl font-bold text-red-600">{analysisResult?.risks.length || 0}</p>
                              <p className="text-sm text-muted-foreground">Riesgos detectados</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                            <div>
                              <p className="text-2xl font-bold text-emerald-600">{analysisResult?.recommendations?.length || 0}</p>
                              <p className="text-sm text-muted-foreground">Recomendaciones</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Subir Documento para Análisis</CardTitle>
                      <CardDescription>
                        Soporta PDF, Word, y documentos de texto
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.rtf"
                        onChange={handleFileUpload}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={analysisStatus === 'analyzing'}
                        size="lg"
                        className="w-full"
                      >
                        {analysisStatus === 'analyzing' ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analizando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5" />
                            Seleccionar Documento
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Analysis Results */}
                  {analysisResult && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(analysisResult.documentCategory)}
                            <div>
                              <CardTitle>Resultados del Análisis</CardTitle>
                              <CardDescription>
                                {analysisResult.fileName} • {analysisResult.documentType}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={exportAnalysisToText}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Exportar
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="secondary">
                            {getCategoryLabel(analysisResult.documentCategory)}
                          </Badge>
                          {analysisResult.detectionConfidence && (
                            <Badge variant="outline">
                              Confianza: {analysisResult.detectionConfidence}
                            </Badge>
                          )}
                          {analysisResult.clauses && (
                            <Badge variant="outline">
                              {analysisResult.clauses.length} {getElementLabel(analysisResult.documentCategory)}(s)
                            </Badge>
                          )}
                          {analysisResult.risks && (
                            <Badge variant="outline">
                              {analysisResult.risks.length} Riesgo(s)
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                          {analysisResult.summary && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">Resumen Ejecutivo</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(analysisResult.summary!, 'Resumen')}
                                >
                                  {copiedSection === 'Resumen' ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                                {analysisResult.summary}
                              </p>
                            </div>
                          )}

                          {analysisResult.clauses && analysisResult.clauses.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold">
                                  {getElementLabel(analysisResult.documentCategory)}s Identificados
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    analysisResult.clauses!.map((c, i) => 
                                      `${i + 1}. ${c.name}\n${c.content}\nRiesgo: ${c.riskLevel}\nRecomendación: ${c.recommendation}`
                                    ).join('\n\n'),
                                    'Elementos'
                                  )}
                                >
                                  {copiedSection === 'Elementos' ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {analysisResult.clauses.map((clause, index) => (
                                  <Card key={index} className="border-l-4 border-l-primary">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-base">{clause.name}</h4>
                                        <div className="flex gap-2">
                                          {getRiskBadge(clause.riskLevel)}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(
                                              `${clause.name}\n${clause.content}\nRiesgo: ${clause.riskLevel}\nRecomendación: ${clause.recommendation}`,
                                              `Elemento ${index + 1}`
                                            )}
                                          >
                                            {copiedSection === `Elemento ${index + 1}` ? (
                                              <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{clause.content}</p>
                                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                                        <p className="text-sm"><strong>Recomendación:</strong> {clause.recommendation}</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.risks && analysisResult.risks.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Riesgos Identificados
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    analysisResult.risks!.map((r, i) => 
                                      `${i + 1}. ${r.type} [${r.severity}]\n${r.description}${r.mitigation ? `\nMitigación: ${r.mitigation}` : ''}`
                                    ).join('\n\n'),
                                    'Riesgos'
                                  )}
                                >
                                  {copiedSection === 'Riesgos' ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {analysisResult.risks.map((risk, index) => (
                                  <Card key={index} className="border-l-4 border-l-orange-500">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-base">{risk.type}</h4>
                                        <div className="flex gap-2">
                                          {getRiskBadge(risk.severity)}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyToClipboard(
                                              `${risk.type} [${risk.severity}]\n${risk.description}${risk.mitigation ? `\nMitigación: ${risk.mitigation}` : ''}`,
                                              `Riesgo ${index + 1}`
                                            )}
                                          >
                                            {copiedSection === `Riesgo ${index + 1}` ? (
                                              <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                                      {risk.mitigation && (
                                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                                          <p className="text-sm"><strong>Mitigación:</strong> {risk.mitigation}</p>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                  Recomendaciones
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    analysisResult.recommendations!.map((r, i) => `${i + 1}. ${r}`).join('\n'),
                                    'Recomendaciones'
                                  )}
                                >
                                  {copiedSection === 'Recomendaciones' ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <ul className="space-y-2">
                                {analysisResult.recommendations.map((rec, index) => (
                                  <li key={index} className="flex gap-2 items-start bg-muted p-3 rounded">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysisResult.keyDates && analysisResult.keyDates.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-lg font-semibold mb-3">Fechas Clave</h3>
                              <div className="space-y-2">
                                {analysisResult.keyDates.map((date, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                                    <div>
                                      <p className="font-medium">{date.date}</p>
                                      <p className="text-sm text-muted-foreground">{date.description}</p>
                                    </div>
                                    {getRiskBadge(date.importance)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.parties && analysisResult.parties.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-lg font-semibold mb-3">Partes Involucradas</h3>
                              <div className="grid grid-cols-2 gap-2">
                                {analysisResult.parties.map((party, index) => (
                                  <div key={index} className="p-3 bg-muted rounded">
                                    <p className="font-medium">{party.name}</p>
                                    <p className="text-sm text-muted-foreground">{party.role}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.legalReferences && analysisResult.legalReferences.length > 0 && (
                            <div className="mb-6">
                              <h3 className="text-lg font-semibold mb-3">Referencias Legales</h3>
                              <div className="space-y-2">
                                {analysisResult.legalReferences.map((ref, index) => (
                                  <div key={index} className="p-3 bg-muted rounded">
                                    <p className="font-medium text-sm">{ref.reference}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{ref.context}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.missingElements && analysisResult.missingElements.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                Elementos Faltantes
                              </h3>
                              <ul className="space-y-2">
                                {analysisResult.missingElements.map((elem, index) => (
                                  <li key={index} className="flex gap-2 items-start p-3 bg-yellow-50 dark:bg-yellow-950 rounded">
                                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{elem}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
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
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getCategoryIcon(item.documentCategory)}
                                <div>
                                  <CardTitle className="text-base">{item.fileName}</CardTitle>
                                  <CardDescription>
                                    {item.documentType} • {item.timestamp.toLocaleDateString()}
                                  </CardDescription>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {getCategoryLabel(item.documentCategory)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">{getElementLabel(item.documentCategory)}s</p>
                                <p className="font-semibold">{item.clauses?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Riesgos</p>
                                <p className="font-semibold text-orange-600">{item.risks?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Recomendaciones</p>
                                <p className="font-semibold text-green-600">{item.recommendations?.length || 0}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
