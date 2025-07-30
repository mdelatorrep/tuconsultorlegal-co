import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle, Eye, Loader2 } from "lucide-react";
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

    if (file.type !== 'application/pdf' && !file.type.includes('document')) {
      toast({
        title: "Tipo de archivo no soportado",
        description: "Por favor sube un archivo PDF o documento de Word.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Read file content (simplified for demo - in production would handle various formats)
      const fileContent = await file.text().catch(() => "Documento cargado para análisis");
      
      // Call the legal document analysis function
      const { data, error } = await supabase.functions.invoke('legal-document-analysis', {
        body: { 
          documentContent: fileContent, 
          fileName: file.name 
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en el análisis');
      }

      const analysisResult: AnalysisResult = {
        fileName: data.fileName,
        documentType: data.documentType,
        clauses: data.clauses,
        risks: data.risks,
        recommendations: data.recommendations,
        timestamp: data.timestamp
      };

      setAnalysis(analysisResult);
      
      toast({
        title: "Análisis completado",
        description: "El documento ha sido analizado exitosamente.",
      });
    } catch (error) {
      console.error("Error en análisis:", error);
      toast({
        title: "Error en el análisis",
        description: "Hubo un problema al procesar el documento.",
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
      <div className="min-h-screen flex w-full bg-background">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Header with Sidebar Toggle */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-lg font-semibold">Análisis de Documentos</h1>
            </div>
          </header>

          <div className="container mx-auto px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Análisis de Documentos</h2>
                    <p className="text-muted-foreground">
                      Análisis automático de contratos y documentos legales
                    </p>
                  </div>
                </div>

      {/* Upload Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento
          </CardTitle>
          <CardDescription>
            Sube un contrato o documento legal para obtener un análisis detallado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando documento...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar Documento
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Formatos soportados: PDF, DOC, DOCX
          </p>
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
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Sube un documento para comenzar el análisis
            </p>
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