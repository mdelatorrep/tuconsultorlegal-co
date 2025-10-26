import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Target, Shield, CheckCircle, Upload, FileText, AlertTriangle, Sparkles } from "lucide-react";

export default function DemoAnalysisMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 p-8">
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
                    <p className="text-2xl font-bold text-orange-600">1,234</p>
                    <p className="text-sm text-muted-foreground">Documentos analizados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">156</p>
                    <p className="text-sm text-muted-foreground">Riesgos detectados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">892</p>
                    <p className="text-sm text-muted-foreground">Recomendaciones</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Interface */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Análisis de Documento Legal</CardTitle>
                <CardDescription className="text-base mt-2">
                  Sube un contrato o documento legal para obtener análisis completo de riesgos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-orange-200 rounded-xl p-8 text-center bg-gradient-to-br from-orange-50/50 to-white">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-xl mx-auto w-fit">
                  <FileText className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Arrastra tu documento aquí</h3>
                  <p className="text-muted-foreground">o haz clic para seleccionar</p>
                </div>
              </div>
            </div>
            
            <Button className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500" size="lg">
              <Sparkles className="h-5 w-5 mr-3" />
              Iniciar Análisis Inteligente
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato_Arrendamiento_2024.pdf
            </CardTitle>
            <CardDescription>
              Tipo: Contrato de Arrendamiento | Analizado hoy a las 14:35
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Riesgos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <Badge variant="destructive">Alto Riesgo</Badge>
                <div className="flex-1">
                  <h4 className="font-semibold">Cláusula de penalización excesiva</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    La cláusula penal establecida supera el límite legal permitido según el Código Civil colombiano
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Riesgo Medio</Badge>
                <div className="flex-1">
                  <h4 className="font-semibold">Falta de claridad en términos de renovación</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    El contrato no especifica claramente el procedimiento de renovación automática
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
