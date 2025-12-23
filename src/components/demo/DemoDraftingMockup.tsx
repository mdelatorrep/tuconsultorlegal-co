import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenTool, Target, TrendingUp, Clock, FileText, Copy, Download, Sparkles, Lightbulb, MessageSquare, Wand2 } from "lucide-react";

export default function DemoDraftingMockup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-8">
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
                <PenTool className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                  Redacción + Copilot Legal
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Generación inteligente de documentos con asistencia en tiempo real
                </p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">3,456</p>
                    <p className="text-sm text-muted-foreground">Borradores generados</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">95%</p>
                    <p className="text-sm text-muted-foreground">Precisión legal</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">30 seg</p>
                    <p className="text-sm text-muted-foreground">Tiempo promedio</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">15K+</p>
                    <p className="text-sm text-muted-foreground">Sugerencias Copilot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copilot Assistant Section */}
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Copilot Legal
                  <Badge className="bg-amber-100 text-amber-800">IA Activa</Badge>
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Asistencia inteligente mientras redactas - sugerencias en tiempo real
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-amber-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold">Sugerencia de Cláusula</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  "Considera agregar una cláusula de confidencialidad reforzada según el art. 74 del Código de Comercio"
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Sparkles className="h-3 w-3 mr-2" />
                  Aplicar sugerencia
                </Button>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold">Mejora de Redacción</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  "El párrafo 3 puede ser más claro. Sugerencia: dividir en dos oraciones para mayor precisión"
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Sparkles className="h-3 w-3 mr-2" />
                  Ver mejora
                </Button>
              </div>
              <div className="p-4 bg-white rounded-xl border border-amber-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold">Referencia Legal</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  "Sentencia C-123/2023 establece precedentes relevantes para esta cláusula"
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <Sparkles className="h-3 w-3 mr-2" />
                  Insertar referencia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Draft Interface */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Nuevo Borrador</CardTitle>
                <CardDescription className="text-base mt-2">
                  Describe el documento que necesitas y la IA generará un borrador estructurado
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Documento</label>
              <div className="p-3 border rounded-lg bg-muted/30">
                Contrato de Prestación de Servicios
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción del Documento</label>
              <div className="min-h-[100px] p-4 border rounded-lg bg-muted/30 text-muted-foreground">
                Contrato de colaboración entre empresa de software y consultor independiente, incluyendo cláusulas de confidencialidad...
              </div>
            </div>
            
            <Button className="w-full h-12" size="lg">
              <PenTool className="h-4 w-4 mr-2" />
              Generar Borrador con Copilot
            </Button>
          </CardContent>
        </Card>

        {/* Generated Draft */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Contrato de Prestación de Servicios Profesionales</CardTitle>
                <CardDescription className="mt-1">
                  Contrato entre empresa de software y consultor independiente
                </CardDescription>
              </div>
              <Badge variant="outline">Hoy, 15:42</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Secciones Incluidas</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Identificación de las Partes</Badge>
                <Badge variant="secondary">Objeto del Contrato</Badge>
                <Badge variant="secondary">Obligaciones</Badge>
                <Badge variant="secondary">Confidencialidad</Badge>
                <Badge variant="secondary">Duración</Badge>
                <Badge variant="secondary">Firma</Badge>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white via-white to-blue-50 border border-blue-200/60 p-6 rounded-xl">
              <h4 className="font-bold mb-4 flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                Contenido del Borrador
              </h4>
              <div className="bg-white border border-gray-200 p-8 rounded-lg max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                  <div className="font-bold text-lg text-blue-900 border-b border-blue-200 pb-2">
                    CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Entre los suscritos a saber: [NOMBRE EMPRESA], sociedad legalmente constituida, identificada con NIT [NIT], representada legalmente por [REPRESENTANTE], quien en adelante se denominará EL CONTRATANTE...
                  </p>
                  <h3 className="font-semibold text-md text-gray-800 mt-6">
                    PRIMERA - OBJETO DEL CONTRATO
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    El CONTRATISTA se obliga a prestar sus servicios profesionales de desarrollo de software y consultoría tecnológica al CONTRATANTE, conforme a las especificaciones técnicas acordadas...
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600">
                <Wand2 className="h-4 w-4 mr-2" />
                Mejorar con Copilot
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
