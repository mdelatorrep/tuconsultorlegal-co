import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, Loader2, Sparkles, Shield, TrendingUp, Clock, Scan, Target } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      
      if (file.type === 'application/pdf') {
        // For PDF files, convert to base64 and create descriptive content
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          fileBase64 = btoa(String.fromCharCode(...uint8Array));
          
          fileContent = `Documento PDF: ${file.name}
          
Este es un archivo PDF que contiene información legal. El sistema analizará el contenido del documento PDF para identificar cláusulas, riesgos y proporcionar recomendaciones especializadas.

Tipo de archivo: PDF
Nombre: ${file.name}
Tamaño: ${(file.size / 1024).toFixed(2)} KB

El contenido del PDF será procesado por el sistema de análisis de documentos legales con IA.`;
        } catch (pdfError) {
          console.error('Error processing PDF:', pdfError);
          fileContent = `Error procesando PDF: ${file.name}. Inténtalo de nuevo.`;
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
        clauses: data.clauses || [{
          name: 'Análisis General',
          content: 'Documento procesado correctamente',
          riskLevel: 'medium' as const,
          recommendation: 'Revisar contenido detalladamente'
        }],
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
              <div className="space-y-4 lg:space-y-8">
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {analysis.fileName}
              </CardTitle>
              <CardDescription>
                Tipo: {analysis.documentType} | Analizado el {new Date(analysis.timestamp).toLocaleDateString()}
              </CardDescription>
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
              <CardTitle>Análisis de Cláusulas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.clauses.map((clause, index) => (
                  <div key={index} className="border rounded-lg p-4">
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
                ))}
              </div>
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
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Inicia tu análisis legal!</h3>
                          <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Sube cualquier documento legal para obtener un análisis completo de riesgos, cláusulas y recomendaciones
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-500/10 to-orange-400/5 rounded-xl p-4 max-w-lg mx-auto">
                          <p className="text-sm text-orange-700 font-medium">
                            🔍 Análisis automático de cláusulas, detección de riesgos y recomendaciones de mejora
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}