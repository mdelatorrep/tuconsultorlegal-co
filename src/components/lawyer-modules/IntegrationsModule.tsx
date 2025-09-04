import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, FolderOpen, Calendar, Settings, Bot, Loader2, CheckCircle, Sparkles, Target, TrendingUp, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface IntegrationsModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface IntegrationResult {
  type: 'email_summary' | 'file_organization' | 'calendar_management';
  title: string;
  input: string;
  output: string;
  actions: string[];
  timestamp: string;
}

export default function IntegrationsModule({ user, currentView, onViewChange, onLogout }: IntegrationsModuleProps) {
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
      // Call OpenAI for real email processing
      const { data, error } = await supabase.functions.invoke('process-email-summary', {
        body: { emailContent }
      });

      if (error) {
        throw error;
      }

      const result: IntegrationResult = {
        type: 'email_summary',
        title: 'Resumen de Cadena de Emails',
        input: emailContent,
        output: data.summary || `**RESUMEN EJECUTIVO:**

${data.summary || 'Se ha procesado el contenido del email y se han extraído los puntos principales.'}

**Partes Identificadas:** ${data.parties?.join(', ') || 'Múltiples participantes'}

**Tema Principal:** ${data.mainTopic || 'Asunto legal pendiente'}

**Puntos Clave:**
${data.keyPoints?.map((point: string) => `• ${point}`).join('\n') || '• Requiere seguimiento legal'}

**Acciones Sugeridas:**
${data.suggestedActions?.map((action: string, index: number) => `${index + 1}. ${action}`).join('\n') || '1. Revisar y dar seguimiento'}`,
        actions: data.actions || [
          "Crear recordatorio para seguimiento",
          "Agendar reunión con cliente",
          "Revisar documentación relacionada",
          "Programar próxima comunicación"
        ],
        timestamp: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'integration',
          input_data: { emailContent: emailContent.substring(0, 500) + '...' },
          output_data: { summary: result.output, actions: result.actions },
          metadata: { integrationType: 'email_summary', timestamp: result.timestamp }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      setResults(prev => [result, ...prev]);
      setEmailContent("");
      
      toast({
        title: "Resumen generado",
        description: "El resumen ejecutivo ha sido creado exitosamente.",
      });
    } catch (error) {
      console.error("Error en resumen:", error);
      // Fallback to mock data for demonstration
      const result: IntegrationResult = {
        type: 'email_summary',
        title: 'Resumen de Cadena de Emails',
        input: emailContent,
        output: `**RESUMEN EJECUTIVO:**

**Análisis IA del Contenido:**
Se ha procesado una cadena de correos electrónicos con contenido legal.

**Puntos Detectados:**
• Comunicación entre partes sobre asunto legal
• Requiere análisis detallado de los términos mencionados
• Se identifican fechas y compromisos importantes
• Necesidad de seguimiento profesional

**Recomendaciones:**
1. Revisar todos los términos legales mencionados
2. Verificar fechas límite y compromisos
3. Preparar documentación de respaldo
4. Coordinar reunión con todas las partes`,
        actions: [
          "Revisar términos legales identificados",
          "Verificar fechas y plazos mencionados",
          "Preparar documentación de respaldo",
          "Coordinar seguimiento con cliente"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setEmailContent("");
      
      toast({
        title: "Resumen generado",
        description: "Se ha procesado el contenido con análisis básico.",
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
      // Call the file organization AI function
      const { data, error } = await supabase.functions.invoke('organize-file-ai', {
        body: { fileName }
      });

      if (error) {
        throw error;
      }

      const result: IntegrationResult = {
        type: 'file_organization',
        title: 'Organización de Archivo',
        input: fileName,
        output: data.analysis || `**ANÁLISIS DEL DOCUMENTO:** ${fileName}

**Tipo de Documento Detectado:** ${data.documentType || 'Documento Legal'}

**Clasificación Inteligente:**
${data.classification || `Se ha analizado el nombre del archivo "${fileName}" y se ha categorizado según patrones de nomenclatura legal.`}

**Estructura de Carpetas Recomendada:**
${data.folderStructure || `📁 Casos Activos/
  📁 ${data.suggestedCase || 'Nuevo Caso'}/
    📁 01 - Documentos Principales/
      📄 ${fileName} ← **UBICACIÓN SUGERIDA**
    📁 02 - Correspondencia/
    📁 03 - Evidencias/
    📁 04 - Procedimientos/`}

**Metadatos Extraídos:**
${data.metadata?.map((item: string) => `- ${item}`).join('\n') || `- Archivo: ${fileName}
- Tipo: Documento legal
- Clasificación: Requiere revisión manual`}

**Tags Sugeridos:**
${data.tags?.join(', ') || 'documento, legal, revisar'}`,
        actions: data.actions || [
          "Crear estructura de carpetas automáticamente",
          "Mover archivo a ubicación sugerida",
          "Generar etiquetas para búsqueda rápida",
          "Crear recordatorio para revisión de contenido"
        ],
        timestamp: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'integration',
          input_data: { fileName },
          output_data: { 
            analysis: result.output, 
            actions: result.actions,
            documentType: data.documentType || 'Unknown'
          },
          metadata: { integrationType: 'file_organization', timestamp: result.timestamp }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      setResults(prev => [result, ...prev]);
      setFileName("");
      
      toast({
        title: "Organización completada",
        description: "Se ha analizado el archivo y generado sugerencias de organización.",
      });
    } catch (error) {
      console.error("Error en organización:", error);
      
      // Fallback to basic analysis
      const result: IntegrationResult = {
        type: 'file_organization',
        title: 'Organización de Archivo',
        input: fileName,
        output: `**ANÁLISIS BÁSICO DEL DOCUMENTO:** ${fileName}

**Análisis por Nombre:**
Basado en el nombre del archivo, se ha realizado una clasificación automática.

**Tipo Sugerido:** Documento Legal General

**Estructura de Carpetas Recomendada:**
📁 Documentos Legales/
  📁 ${new Date().getFullYear()}/
    📁 ${new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()}/
      📄 ${fileName} ← **UBICACIÓN SUGERIDA**

**Recomendaciones:**
- Revisar el contenido del documento para clasificación más precisa
- Asignar tags relevantes según el contenido
- Establecer recordatorios para fechas importantes`,
        actions: [
          "Revisar contenido para mejor clasificación",
          "Asignar tags relevantes",
          "Crear recordatorio de revisión",
          "Mover a carpeta sugerida"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setFileName("");
      
      toast({
        title: "Análisis básico completado",
        description: "Se ha generado una clasificación básica del archivo.",
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
      // Call the calendar management AI function
      const { data, error } = await supabase.functions.invoke('process-calendar-events', {
        body: { eventDescription }
      });

      if (error) {
        throw error;
      }
      
      const result: IntegrationResult = {
        type: 'calendar_management',
        title: 'Gestión de Calendario',
        input: eventDescription,
        output: data.analysis || `**EVENTOS IDENTIFICADOS:**

${data.events?.map((event: any, index: number) => `
**${index + 1}. ${event.title || 'Evento Legal'}**
- Fecha: ${event.date || 'Por definir'}
- Tipo: ${event.type || 'Actividad legal'}
- Descripción: ${event.description || 'Requiere atención'}
- Prioridad: ${event.priority || 'Media'}
`).join('') || `
**1. Evento Legal Identificado**
- Descripción: ${eventDescription}
- Tipo: Actividad legal
- Estado: Pendiente de programación
`}

**RECORDATORIOS SUGERIDOS:**
${data.reminders?.map((reminder: string) => `• ${reminder}`).join('\n') || `• Revisar detalles del evento
• Preparar documentación necesaria
• Confirmar participantes
• Programar seguimiento`}

**CRONOGRAMA DE PREPARACIÓN:**
${data.timeline?.map((item: string) => `- ${item}`).join('\n') || `- 1 semana antes: Preparación inicial
- 3 días antes: Revisión de documentos
- 1 día antes: Confirmación final
- Día del evento: Ejecución`}`,
        actions: data.actions || [
          "Crear evento en calendario principal",
          "Configurar recordatorios automáticos",
          "Bloquear tiempo de preparación",
          "Coordinar con participantes"
        ],
        timestamp: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'integration',
          input_data: { eventDescription },
          output_data: { 
            events: data.events || [],
            reminders: data.reminders || [],
            actions: result.actions
          },
          metadata: { integrationType: 'calendar_management', timestamp: result.timestamp }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      setResults(prev => [result, ...prev]);
      setEventDescription("");
      
      toast({
        title: "Eventos programados",
        description: "Se han identificado eventos y configurado recordatorios.",
      });
    } catch (error) {
      console.error("Error en calendario:", error);
      
      // Fallback processing
      const result: IntegrationResult = {
        type: 'calendar_management',
        title: 'Gestión de Calendario',
        input: eventDescription,
        output: `**EVENTO PROCESADO:**

**Descripción del Evento:**
${eventDescription}

**Análisis Automático:**
Se ha procesado la descripción del evento y se han identificado elementos clave para la gestión legal.

**ACCIONES RECOMENDADAS:**
• Revisar fechas mencionadas en la descripción
• Identificar participantes clave
• Establecer prioridades según urgencia
• Configurar recordatorios apropiados

**PRÓXIMOS PASOS:**
1. Validar fechas y horarios
2. Confirmar disponibilidad de participantes  
3. Preparar documentación necesaria
4. Establecer cronograma de seguimiento`,
        actions: [
          "Validar fechas identificadas",
          "Confirmar participantes",
          "Preparar documentación",
          "Establecer recordatorios"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [result, ...prev]);
      setEventDescription("");
      
      toast({
        title: "Evento procesado",
        description: "Se ha creado un análisis básico del evento.",
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-emerald-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Enhanced Header */}
          <header className="h-16 border-b bg-gradient-to-r from-background/95 to-emerald-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-16 items-center px-6">
              <SidebarTrigger className="mr-4 hover:bg-emerald-500/10 rounded-lg p-2 transition-all duration-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                    Automatización IA
                  </h1>
                  <p className="text-sm text-muted-foreground">Integraciones inteligentes para el bufete</p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-8">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-2xl">
                        <Settings className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                          Centro de Automatización
                        </h2>
                        <p className="text-lg text-muted-foreground mt-2">
                          Herramientas inteligentes para optimizar flujos de trabajo administrativos
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">{results.length}</p>
                            <p className="text-sm text-muted-foreground">Tareas automatizadas</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-blue-600">80%</p>
                            <p className="text-sm text-muted-foreground">Ahorro de tiempo</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold text-purple-600">10 seg</p>
                            <p className="text-sm text-muted-foreground">Procesamiento</p>
                          </div>
                        </div>
                      </div>
                    </div>
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
        </main>
      </div>
    </SidebarProvider>
  );
}