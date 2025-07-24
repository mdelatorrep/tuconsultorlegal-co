import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, FolderOpen, Calendar, Settings, Bot, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IntegrationsModuleProps {
  onBack?: () => void;
}

interface IntegrationResult {
  type: 'email_summary' | 'file_organization' | 'calendar_management';
  title: string;
  input: string;
  output: string;
  actions: string[];
  timestamp: string;
}

export default function IntegrationsModule({ onBack }: IntegrationsModuleProps) {
  const [emailContent, setEmailContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<IntegrationResult[]>([]);
  const { toast } = useToast();

  const handleEmailSummary = async () => {
    if (!emailContent.trim()) {
      toast({
        title: "Contenido requerido",
        description: "Por favor pega el contenido del email a resumir.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result: IntegrationResult = {
        type: 'email_summary',
        title: 'Resumen de Cadena de Emails',
        input: emailContent,
        output: `**RESUMEN EJECUTIVO:**

**Partes Involucradas:** Cliente Juan Pérez, Contraparte Empresa ABC S.A.S.

**Tema Principal:** Incumplimiento en contrato de suministro por demoras en entrega

**Puntos Clave:**
• El cliente reporta demoras de 45 días en entrega de mercancía
• La contraparte alega problemas en la cadena de suministro
• Se ha generado un perjuicio económico estimado en $50.000.000
• Cliente solicita terminación del contrato y compensación

**Cronología:**
- 15/01: Firma del contrato inicial
- 28/02: Primera demora reportada
- 15/03: Reunión de negociación fallida
- 25/03: Cliente solicita asesoría legal

**Acciones Sugeridas:**
1. Revisar cláusulas de incumplimiento en el contrato
2. Cuantificar daños y perjuicios exactos
3. Enviar carta de requerimiento formal
4. Evaluar mecanismos alternativos de solución`,
        actions: [
          "Crear recordatorio para envío de carta de requerimiento",
          "Agendar reunión con cliente para revisión de documentos",
          "Solicitar documentación adicional sobre perjuicios",
          "Programar seguimiento en 5 días hábiles"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setEmailContent("");
      
      toast({
        title: "Resumen generado",
        description: "El resumen ejecutivo ha sido creado exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error en el resumen",
        description: "Hubo un problema al procesar el email.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileOrganization = async () => {
    if (!fileName.trim()) {
      toast({
        title: "Nombre de archivo requerido",
        description: "Por favor ingresa el nombre del archivo a organizar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result: IntegrationResult = {
        type: 'file_organization',
        title: 'Organización de Archivo',
        input: fileName,
        output: `**ANÁLISIS DEL DOCUMENTO:** ${fileName}

**Tipo de Documento Detectado:** Contrato de Arrendamiento Comercial

**Partes Identificadas:**
- Arrendador: María González Rodríguez
- Arrendatario: Comercial Futuro S.A.S.

**Caso/Cliente Sugerido:** González vs Comercial Futuro - Arrendamiento Local 2024

**Estructura de Carpetas Recomendada:**
📁 Casos Activos/
  📁 González vs Comercial Futuro/
    📁 01 - Contratos/
      📄 ${fileName} ← **UBICACIÓN SUGERIDA**
    📁 02 - Correspondencia/
    📁 03 - Evidencias/
    📁 04 - Procedimientos/

**Metadatos Extraídos:**
- Fecha del contrato: 15 de marzo de 2024
- Valor del canon: $2.500.000 mensuales
- Duración: 24 meses
- Garantía: 3 meses de canon`,
        actions: [
          "Crear estructura de carpetas automáticamente",
          "Mover archivo a ubicación sugerida",
          "Generar etiquetas para búsqueda rápida",
          "Crear recordatorio para revisión de vencimientos"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setFileName("");
      
      toast({
        title: "Organización completada",
        description: "Se ha analizado el archivo y generado sugerencias de organización.",
      });
    } catch (error) {
      toast({
        title: "Error en organización",
        description: "Hubo un problema al procesar el archivo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCalendarManagement = async () => {
    if (!eventDescription.trim()) {
      toast({
        title: "Descripción requerida",
        description: "Por favor describe el evento o fecha límite.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result: IntegrationResult = {
        type: 'calendar_management',
        title: 'Gestión de Calendario',
        input: eventDescription,
        output: `**EVENTOS IDENTIFICADOS:**

**1. Audiencia de Conciliación**
- Fecha: 15 de abril de 2024, 2:00 PM
- Ubicación: Centro de Conciliación - Calle 72 #10-51
- Duración estimada: 2 horas
- Preparación requerida: 1 hora antes

**2. Vencimiento de Términos**
- Fecha límite respuesta: 10 de abril de 2024
- Tipo: Contestación de demanda
- Días restantes: 8 días hábiles

**RECORDATORIOS SUGERIDOS:**
• 3 días antes: Preparar documentos para audiencia
• 1 día antes: Confirmar asistencia de las partes  
• 2 horas antes: Revisar estrategia de conciliación
• 5 días antes del vencimiento: Alerta de término próximo`,
        actions: [
          "Crear evento en calendario principal",
          "Configurar recordatorios automáticos",
          "Bloquear tiempo de preparación",
          "Enviar invitación a cliente y contraparte"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setEventDescription("");
      
      toast({
        title: "Eventos programados",
        description: "Se han identificado eventos y configurado recordatorios.",
      });
    } catch (error) {
      toast({
        title: "Error en calendario",
        description: "Hubo un problema al procesar los eventos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getIntegrationIcon = (type: IntegrationResult['type']) => {
    switch (type) {
      case 'email_summary':
        return <Mail className="h-5 w-5" />;
      case 'file_organization':
        return <FolderOpen className="h-5 w-5" />;
      case 'calendar_management':
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getIntegrationColor = (type: IntegrationResult['type']) => {
    switch (type) {
      case 'email_summary':
        return "bg-blue-100 text-blue-800";
      case 'file_organization':
        return "bg-green-100 text-green-800";
      case 'calendar_management':
        return "bg-purple-100 text-purple-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-primary">Integraciones IA</h2>
                <p className="text-muted-foreground">
                  Automatiza tareas administrativas y organizacionales
                </p>
              </div>
            </div>

      {/* Integration Tools */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Email Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Resumen de Emails
            </CardTitle>
            <CardDescription>
              Genera resúmenes ejecutivos de cadenas de correos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Pega aquí el contenido de los emails a resumir..."
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Button
              onClick={handleEmailSummary}
              disabled={isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bot className="h-4 w-4 mr-2" />
              )}
              Resumir
            </Button>
          </CardContent>
        </Card>

        {/* File Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Organización de Archivos
            </CardTitle>
            <CardDescription>
              Analiza documentos y sugiere organización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Nombre del archivo (ej: contrato_arrendamiento_2024.pdf)"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <Button
              onClick={handleFileOrganization}
              disabled={isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bot className="h-4 w-4 mr-2" />
              )}
              Organizar
            </Button>
          </CardContent>
        </Card>

        {/* Calendar Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gestión de Calendario
            </CardTitle>
            <CardDescription>
              Identifica fechas y crea recordatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe eventos, audiencias o fechas límite..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Button
              onClick={handleCalendarManagement}
              disabled={isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bot className="h-4 w-4 mr-2" />
              )}
              Programar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Resultados de Integraciones</h3>
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getIntegrationIcon(result.type)}
                    {result.title}
                  </CardTitle>
                  <Badge className={getIntegrationColor(result.type)}>
                    {new Date(result.timestamp).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Resultado del Procesamiento</h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {result.output}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Acciones Sugeridas
                  </h4>
                  <div className="space-y-2">
                    {result.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Utiliza las herramientas de integración para automatizar tu trabajo
            </p>
          </CardContent>
        </Card>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}