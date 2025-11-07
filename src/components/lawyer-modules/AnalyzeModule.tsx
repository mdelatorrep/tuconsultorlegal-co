import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, Loader2, Sparkles, Shield, TrendingUp, Clock, Scan, Target, History, ChevronRight, FileSignature, MessageSquare, CheckSquare, BarChart, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  documentCategory?: 'contract' | 'response' | 'brief' | 'report' | 'correspondence' | 'other';
  clauses: {
    name: string;
    content: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation?: string;
  }[];
  risks: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: string[];
  timestamp: string;
}

export default function AnalyzeModule({ user, currentView, onViewChange, onLogout }: AnalyzeModuleProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load analysis history on mount
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
        documentType: (item.output_data as any)?.documentType || 'Documento Legal',
        clauses: (item.output_data as any)?.clauses || [],
        risks: (item.output_data as any)?.risks || [],
        recommendations: (item.output_data as any)?.recommendations || [],
        timestamp: item.created_at
      })) || [];

      setAnalysisHistory(history);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept more file types
    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ];

    if (!acceptedTypes.includes(file.type) && !file.type.includes('document')) {
      toast({
        title: "Tipo de archivo no soportado",
        description: "Por favor sube un archivo PDF, DOC, DOCX o TXT.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Iniciando análisis de documento:', file.name, 'Tipo:', file.type);
      
      let fileContent = '';
      
      // Handle different file types
      let fileBase64 = null;
      
      // Binary file types that need base64 encoding
      const binaryTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      ];
      
      const isBinaryFile = binaryTypes.includes(file.type) || 
                          file.name.toLowerCase().endsWith('.doc') ||
                          file.name.toLowerCase().endsWith('.docx') ||
                          file.name.toLowerCase().endsWith('.pdf');
      
      if (isBinaryFile) {
        // For binary files (PDF, DOC, DOCX), convert to base64
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          fileBase64 = btoa(String.fromCharCode(...uint8Array));
          
          let fileTypeDescription = 'documento';
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            fileTypeDescription = 'PDF';
          } else if (file.name.toLowerCase().endsWith('.doc')) {
            fileTypeDescription = 'DOC (Word 97-2003)';
          } else if (file.name.toLowerCase().endsWith('.docx')) {
            fileTypeDescription = 'DOCX (Word)';
          }
          
          fileContent = `Documento ${fileTypeDescription}: ${file.name}
          
Este es un archivo ${fileTypeDescription} que contiene información legal. El sistema analizará el contenido del documento para identificar cláusulas, riesgos y proporcionar recomendaciones especializadas.

Tipo de archivo: ${fileTypeDescription}
Nombre: ${file.name}
Tamaño: ${(file.size / 1024).toFixed(2)} KB

El contenido será procesado por el sistema de análisis de documentos legales con IA.`;
        } catch (binaryError) {
          console.error('Error processing binary file:', binaryError);
          fileContent = `Error procesando archivo binario: ${file.name}. Inténtalo de nuevo.`;
        }
      } else {
        // For text-based files, read the content
        try {
          fileContent = await file.text();
        } catch (textError) {
          console.error('Error reading file as text:', textError);
          fileContent = `Documento: ${file.name}
          
Este documento contiene información legal que será analizada por el sistema de IA.

Tipo de archivo: ${file.type}
Nombre: ${file.name}
Tamaño: ${(file.size / 1024).toFixed(2)} KB`;
        }
      }

      console.log('Contenido extraído, longitud:', fileContent.length);
      
      // Call the legal document analysis function
      const { data, error } = await supabase.functions.invoke('legal-document-analysis', {
        body: { 
          documentContent: fileContent, 
          fileName: file.name,
          fileBase64: fileBase64
        }
      });

      console.log('Respuesta del análisis:', { data, error });

      if (error) {
        console.error('Error en función edge:', error);
        throw error;
      }

      if (!data || !data.success) {
        console.error('Respuesta de análisis no exitosa:', data);
        throw new Error(data?.error || 'Error en el análisis del documento');
      }

      const analysisResult: AnalysisResult = {
        fileName: file.name,
        documentType: data.documentType || 'Documento Legal',
        documentCategory: data.documentCategory || 'other',
        clauses: data.clauses || [],
        risks: data.risks || [{
          type: 'Revisión Requerida',
          description: 'El documento requiere revisión manual adicional',
          severity: 'medium' as const
        }],
        recommendations: data.recommendations || ['Revisar documento completo', 'Validar términos legales'],
        timestamp: data.timestamp || new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'analysis',
          input_data: { 
            fileName: analysisResult.fileName,
            fileType: file.type,
            fileSize: file.size,
            documentContent: fileContent.substring(0, 500) + '...' // Store truncated content for privacy
          },
          output_data: {
            documentType: analysisResult.documentType,
            clauses: analysisResult.clauses,
            risks: analysisResult.risks,
            recommendations: analysisResult.recommendations
          },
          metadata: { 
            timestamp: analysisResult.timestamp,
            originalFileSize: file.size,
            processedAt: new Date().toISOString()
          }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
        // Don't throw here, just log the error
      }

      setAnalysis(analysisResult);
      loadAnalysisHistory(); // Reload history
      
      toast({
        title: "Análisis completado",
        description: `El documento "${file.name}" ha sido analizado exitosamente.`,
      });
      
    } catch (error) {
      console.error("Error en análisis:", error);
      // Create fallback analysis for better user experience
      const fallbackAnalysis: AnalysisResult = {
        fileName: file?.name || 'Documento',
        documentType: 'Documento Legal',
        clauses: [{
          name: 'Análisis General',
          content: `El documento "${file?.name || 'sin nombre'}" ha sido cargado para análisis. El sistema detectó contenido que requiere revisión legal.`,
          riskLevel: 'medium' as const,
          recommendation: 'Revisar el documento manualmente para una evaluación completa'
        }],
        risks: [{
          type: 'Procesamiento Limitado',
          description: 'No se pudo procesar completamente el contenido del documento. Se recomienda revisión manual.',
          severity: 'medium' as const
        }],
        recommendations: [
          'Revisar el documento original manualmente',
          'Verificar que el formato del archivo sea compatible',
          'Consultar con un especialista legal si es necesario'
        ],
        timestamp: new Date().toISOString()
      };

      setAnalysis(fallbackAnalysis);
      
      toast({
        title: "Documento procesado",
        description: `Se ha cargado "${file?.name || 'el documento'}" pero ocurrió un error en el análisis automático. Puedes revisar el contenido manualmente.`,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskBadge = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive">Alto Riesgo</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Riesgo Medio</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Bajo Riesgo</Badge>;
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'contract':
        return <FileSignature className="h-5 w-5" />;
      case 'response':
        return <MessageSquare className="h-5 w-5" />;
      case 'brief':
        return <CheckSquare className="h-5 w-5" />;
      case 'report':
        return <BarChart className="h-5 w-5" />;
      case 'correspondence':
        return <Mail className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'contract':
        return 'Contrato';
      case 'response':
        return 'Respuesta Legal';
      case 'brief':
        return 'Escrito Jurídico';
      case 'report':
        return 'Informe';
      case 'correspondence':
        return 'Correspondencia';
      default:
        return 'Documento';
    }
  };

  const getElementLabel = (category?: string) => {
    switch (category) {
      case 'contract':
        return 'Cláusulas';
      case 'response':
      case 'brief':
        return 'Argumentos';
      case 'report':
        return 'Secciones';
      case 'correspondence':
        return 'Puntos Clave';
      default:
        return 'Elementos';
    }
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

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Enhanced Header - Mobile First */}
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
                    Revisión inteligente y detección de riesgos
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
                          Revisión automatizada de contratos, detección de riesgos y recomendaciones expertas
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold text-orange-600">{analysis ? 1 : 0}</p>
                            <p className="text-sm text-muted-foreground">Documentos analizados</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Shield className="h-8 w-8 text-red-600" />
                          <div>
                            <p className="text-2xl font-bold text-red-600">{analysis?.risks.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Riesgos detectados</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">{analysis?.recommendations.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Recomendaciones</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Upload Interface */}
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-orange-500/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/10 opacity-50"></div>
                  <CardHeader className="relative pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                          Análisis de Documento Legal
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                          Sube un contrato o documento legal para obtener análisis completo de riesgos y recomendaciones
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.rtf"
                      className="hidden"
                    />
                    
                    <div 
                      className="border-2 border-dashed border-orange-200 rounded-xl p-8 text-center bg-gradient-to-br from-orange-50/50 to-white hover:border-orange-300 transition-colors duration-200 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-400/10 rounded-full blur-xl"></div>
                          <div className="relative p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-xl mx-auto w-fit">
                            <FileText className="h-12 w-12 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Arrastra tu documento aquí</h3>
                          <p className="text-muted-foreground">o haz clic para seleccionar</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          <span className="animate-pulse">Analizando documento...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-3" />
                          Iniciar Análisis Inteligente
                        </>
                      )}
                    </Button>
                    
                    <div className="bg-gradient-to-r from-orange-500/10 to-orange-400/5 rounded-xl p-4">
                      <p className="text-sm text-orange-700 font-medium text-center">
                        📄 Formatos soportados: PDF, DOC, DOCX, TXT, RTF | 🔒 Análisis seguro y confidencial
                      </p>
                    </div>
                  </CardContent>
                </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white">
                  {getCategoryIcon(analysis.documentCategory)}
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {analysis.fileName}
                    <Badge variant="secondary" className="ml-2">
                      {getCategoryLabel(analysis.documentCategory)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {analysis.documentType} | Analizado el {new Date(analysis.timestamp).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Risks Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Riesgos Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.risks.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="mt-1">
                      {getRiskBadge(risk.severity)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{risk.type}</h4>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clauses Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-orange-600" />
                {getElementLabel(analysis.documentCategory)} Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.clauses.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                    {getCategoryIcon(analysis.documentCategory)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No se encontraron {getElementLabel(analysis.documentCategory).toLowerCase()}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    El documento analizado no contiene elementos identificables para este tipo de documento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.clauses.map((clause, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1 text-orange-600">
                          {getCategoryIcon(analysis.documentCategory)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{clause.name}</h4>
                            {getRiskBadge(clause.riskLevel)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {clause.content}
                          </p>
                          {clause.recommendation && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                              <p className="text-sm">
                                <strong>Recomendación:</strong> {clause.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Recomendaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

                {!analysis && !isAnalyzing && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 overflow-hidden">
                    <CardContent className="p-12 text-center">
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-orange-400/10 rounded-full blur-2xl"></div>
                          <div className="relative p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl mx-auto w-fit">
                            <Scan className="h-16 w-16 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Inicia tu análisis legal inteligente!</h3>
                          <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Sube cualquier tipo de documento legal para obtener un análisis adaptado a su naturaleza
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500/10 to-orange-400/5 rounded-xl p-6 max-w-2xl mx-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-orange-700">
                            <div className="flex items-center gap-2">
                              <FileSignature className="h-4 w-4" />
                              <span>Contratos y convenios</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              <span>Respuestas legales</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4" />
                              <span>Escritos jurídicos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BarChart className="h-4 w-4" />
                              <span>Informes y dictámenes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>Correspondencia legal</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              <span>Análisis adaptativo</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {analysisHistory.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No hay análisis previos</h3>
                        <p className="text-muted-foreground">
                          Los análisis de documentos aparecerán aquí cuando completes tu primer análisis
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <h3 className="text-lg font-bold text-orange-900">
                          Historial de Análisis de Documentos
                        </h3>
                        <p className="text-orange-700 text-sm">
                          {analysisHistory.length} documento{analysisHistory.length !== 1 ? 's' : ''} analizado{analysisHistory.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {analysisHistory.map((item, index) => (
                        <Collapsible key={index}>
                          <Card className="hover:shadow-lg transition-shadow">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-orange-50/50 transition-colors">
                                 <div className="flex items-center justify-between gap-4">
                                   <div className="flex-1 min-w-0">
                                     <CardTitle className="text-lg flex items-center gap-2">
                                       {getCategoryIcon(item.documentCategory)}
                                       <span className="truncate">{item.fileName}</span>
                                       <Badge variant="outline" className="ml-2 flex-shrink-0">
                                         {getCategoryLabel(item.documentCategory)}
                                       </Badge>
                                     </CardTitle>
                                      <CardDescription className="mt-1">
                                       {item.documentType} • {new Date(item.timestamp).toLocaleDateString('es-ES', {
                                         year: 'numeric',
                                         month: 'long',
                                         day: 'numeric'
                                       })}
                                     </CardDescription>
                                   </div>
                                   <ChevronRight className="h-5 w-5 text-orange-600 flex-shrink-0" />
                                 </div>
                                 <div className="grid grid-cols-3 gap-2 mt-4">
                                   <div className="text-center p-2 bg-red-50 rounded-lg">
                                     <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
                                     <p className="text-lg font-bold">{item.risks.length}</p>
                                     <p className="text-xs text-muted-foreground">Riesgos</p>
                                   </div>
                                   <div className="text-center p-2 bg-blue-50 rounded-lg">
                                     <div className="mx-auto mb-1 text-blue-600 inline-flex items-center justify-center">
                                       {getCategoryIcon(item.documentCategory)}
                                     </div>
                                     <p className="text-lg font-bold">{item.clauses.length}</p>
                                     <p className="text-xs text-muted-foreground truncate">{getElementLabel(item.documentCategory)}</p>
                                   </div>
                                   <div className="text-center p-2 bg-green-50 rounded-lg">
                                     <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
                                     <p className="text-lg font-bold">{item.recommendations.length}</p>
                                     <p className="text-xs text-muted-foreground">Recomend.</p>
                                   </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0 space-y-4">
                                {item.risks.length > 0 && (
                                  <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      Riesgos Identificados ({item.risks.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {item.risks.map((risk, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                          <Badge 
                                            variant={risk.severity === 'high' ? 'destructive' : 'outline'}
                                            className="mt-0.5"
                                          >
                                            {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Medio' : 'Bajo'}
                                          </Badge>
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{risk.type}</p>
                                            <p className="text-xs text-muted-foreground">{risk.description}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                 {item.clauses.length > 0 && (
                                   <div className="border-t pt-4">
                                     <h4 className="font-semibold mb-3">
                                       {getElementLabel(item.documentCategory)} Analizados: {item.clauses.length}
                                     </h4>
                                     <div className="flex flex-wrap gap-2">{/* ... keep existing code */}
                                      {item.clauses.map((clause, idx) => (
                                        <Badge key={idx} variant="secondary">
                                          {clause.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.recommendations.length > 0 && (
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}