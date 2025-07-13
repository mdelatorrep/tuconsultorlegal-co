import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle, Loader2, Copy, Wand2 } from "lucide-react";

interface AgentCreatorPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function AgentCreatorPage({ onBack, lawyerData }: AgentCreatorPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImprovingTemplate, setIsImprovingTemplate] = useState(false);
  const [isImprovingDocInfo, setIsImprovingDocInfo] = useState(false);
  const [formData, setFormData] = useState({
    docName: "",
    docDesc: "",
    docCat: "",
    docTemplate: "",
    initialPrompt: "",
    slaHours: 4,
    slaEnabled: true,
  });
  
  const [aiResults, setAiResults] = useState({
    enhancedPrompt: "",
    extractedPlaceholders: [] as Array<{ placeholder: string; pregunta: string }>,
    suggestedPrice: "",
    priceJustification: "",
  });
  
  const [docInfoImprovement, setDocInfoImprovement] = useState({
    improvedName: "",
    improvedDescription: "",
    originalName: "",
    originalDescription: "",
    showImprovement: false,
  });
  
  const [aiProcessingSuccess, setAiProcessingSuccess] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const steps = [
    { id: 1, title: "Info Básica", description: "Información del documento" },
    { id: 2, title: "Plantilla", description: "Texto del documento" },
    { id: 3, title: "Prompt", description: "Instrucciones iniciales" },
    { id: 4, title: "Magia IA", description: "Procesamiento automático" },
    { id: 5, title: "Revisar", description: "Envío a revisión" },
  ];

  const categories = [
    "Vivienda y Arriendos",
    "Trabajo y Empleo", 
    "Finanzas y Acuerdos Personales",
    "Comercial y Societario"
  ];

  const handleInputChange = (field: string, value: string) => {
    if (field === 'slaEnabled') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else if (field === 'slaHours') {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // For step 1, improve document info with AI first
      improveDocumentInfo();
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const processWithAI = async () => {
    setIsProcessing(true);
    setCurrentStep(4);
    
    try {
      console.log('Processing with AI...', {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCat: formData.docCat,
        templateLength: formData.docTemplate.length,
        promptLength: formData.initialPrompt.length
      });

      const { data, error } = await supabase.functions.invoke('process-agent-ai', {
        body: {
          docName: formData.docName,
          docDesc: formData.docDesc,
          docCat: formData.docCat,
          docTemplate: formData.docTemplate,
          initialPrompt: formData.initialPrompt
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al procesar con IA');
      }

      if (!data?.success) {
        console.error('AI processing failed:', data);
        throw new Error(data?.error || 'Error en el procesamiento de IA');
      }

      console.log('AI processing successful:', {
        enhancedPromptLength: data.enhancedPrompt?.length,
        placeholdersCount: data.extractedPlaceholders?.length,
        suggestedPrice: data.suggestedPrice
      });

      setAiResults({
        enhancedPrompt: data.enhancedPrompt || '',
        extractedPlaceholders: data.extractedPlaceholders || [],
        suggestedPrice: data.suggestedPrice || '$ 50,000 COP',
        priceJustification: data.priceJustification || 'Precio estimado basado en complejidad del documento.'
      });

      setAiProcessingSuccess(true);
      setIsProcessing(false);

      toast({
        title: "Procesamiento completado",
        description: `Se generó un prompt mejorado y se identificaron ${data.extractedPlaceholders?.length || 0} variables.`,
      });

    } catch (error) {
      console.error('Error processing with AI:', error);
      setIsProcessing(false);
      setAiProcessingSuccess(false);
      
      toast({
        title: "Error en el procesamiento",
        description: error instanceof Error ? error.message : "No se pudo procesar con IA. Intenta nuevamente.",
        variant: "destructive",
      });

      // Return to step 3 to try again
      setCurrentStep(3);
    }
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(formData.docTemplate);
      toast({
        title: "Plantilla copiada",
        description: "El contenido de la plantilla se ha copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar la plantilla. Intenta seleccionar y copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const improveTemplateWithAI = async () => {
    if (!formData.docTemplate.trim()) {
      toast({
        title: "Plantilla requerida",
        description: "Debes escribir una plantilla antes de mejorarla con IA.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingTemplate(true);
    
    try {
      console.log('Improving template with AI...', {
        templateLength: formData.docTemplate.length,
        docName: formData.docName,
        docCategory: formData.docCat
      });

      const { data, error } = await supabase.functions.invoke('improve-template-ai', {
        body: {
          templateContent: formData.docTemplate,
          docName: formData.docName,
          docCategory: formData.docCat,
          docDescription: formData.docDesc
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al mejorar la plantilla con IA');
      }

      if (!data?.success) {
        console.error('AI template improvement failed:', data);
        throw new Error(data?.error || 'Error en la mejora de la plantilla');
      }

      console.log('Template improvement successful:', {
        originalLength: data.originalLength,
        improvedLength: data.improvedLength
      });

      // Update the template with the improved version
      setFormData(prev => ({ ...prev, docTemplate: data.improvedTemplate }));

      setIsImprovingTemplate(false);

      toast({
        title: "Plantilla mejorada exitosamente",
        description: `Se mejoró la plantilla de ${data.originalLength} a ${data.improvedLength} caracteres.`,
      });

    } catch (error) {
      console.error('Error improving template with AI:', error);
      setIsImprovingTemplate(false);
      
      toast({
        title: "Error al mejorar plantilla",
        description: error instanceof Error ? error.message : "No se pudo mejorar la plantilla con IA. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const improveDocumentInfo = async () => {
    if (!formData.docName.trim() || !formData.docDesc.trim() || !formData.docCat) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre, descripción y categoría del documento.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingDocInfo(true);
    
    try {
      console.log('Improving document info with AI...', {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCategory: formData.docCat
      });

      const { data, error } = await supabase.functions.invoke('improve-document-info', {
        body: {
          docName: formData.docName,
          docDesc: formData.docDesc,
          docCategory: formData.docCat
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al mejorar la información del documento');
      }

      if (!data?.success) {
        console.error('AI document info improvement failed:', data);
        throw new Error(data?.error || 'Error en la mejora de información del documento');
      }

      console.log('Document info improvement successful:', {
        improvedName: data.improvedName,
        improvedDescription: data.improvedDescription
      });

      // Show the improvement to the user
      setDocInfoImprovement({
        improvedName: data.improvedName,
        improvedDescription: data.improvedDescription,
        originalName: data.originalName,
        originalDescription: data.originalDescription,
        showImprovement: true,
      });

      setIsImprovingDocInfo(false);

      toast({
        title: "Mejoras sugeridas por IA",
        description: "Revisa las mejoras sugeridas para el nombre y descripción del documento.",
      });

    } catch (error) {
      console.error('Error improving document info with AI:', error);
      setIsImprovingDocInfo(false);
      
      toast({
        title: "Error al mejorar información",
        description: error instanceof Error ? error.message : "No se pudo mejorar la información con IA. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const acceptDocumentInfo = () => {
    setFormData(prev => ({
      ...prev,
      docName: docInfoImprovement.improvedName,
      docDesc: docInfoImprovement.improvedDescription,
    }));
    setDocInfoImprovement(prev => ({ ...prev, showImprovement: false }));
    setCurrentStep(2);
    
    toast({
      title: "Mejoras aplicadas",
      description: "Se actualizó el nombre y descripción del documento.",
    });
  };

  const rejectDocumentInfo = () => {
    setDocInfoImprovement(prev => ({ ...prev, showImprovement: false }));
    setCurrentStep(2);
    
    toast({
      title: "Mejoras rechazadas",
      description: "Se mantuvieron los valores originales.",
    });
  };

  const handlePublish = async () => {
    try {
      // Convert suggested price to integer (remove $ and commas)
      const priceValue = parseInt(aiResults.suggestedPrice.replace(/[^0-9]/g, ''));
      
      const { data, error } = await supabase
        .from('legal_agents')
        .insert({
          name: formData.docName,
          description: formData.docDesc,
          category: formData.docCat,
          template_content: formData.docTemplate,
          ai_prompt: aiResults.enhancedPrompt,
          placeholder_fields: aiResults.extractedPlaceholders,
          suggested_price: priceValue,
          price_justification: aiResults.priceJustification,
          status: 'pending_review',
          created_by: lawyerData.id,
          sla_hours: formData.slaEnabled ? formData.slaHours : null,
          sla_enabled: formData.slaEnabled
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agent:', error);
        toast({
          title: "Error al enviar a revisión",
          description: "No se pudo crear el agente. Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Agente enviado a revisión exitosamente",
        description: `El agente "${formData.docName}" ha sido enviado para revisión del administrador.`,
      });

      // Reset form and go back
      setFormData({
        docName: "",
        docDesc: "",
        docCat: "",
        docTemplate: "",
        initialPrompt: "",
        slaHours: 4,
        slaEnabled: true,
      });
      setAiResults({
        enhancedPrompt: "",
        extractedPlaceholders: [],
        suggestedPrice: "",
        priceJustification: "",
      });
      setCurrentStep(1);
      onBack();
    } catch (error) {
      console.error('Error publishing agent:', error);
      toast({
        title: "Error al enviar a revisión",
        description: "No se pudo enviar el agente a revisión. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-primary">Creador de Agentes Legales</CardTitle>
            <CardDescription>
              Crea un nuevo servicio de documento legal para los clientes en 5 sencillos pasos.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Steps Indicator */}
            {isMobile ? (
              // Mobile stepper - current step indicator
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    Paso {currentStep} de {steps.length}
                  </div>
                  <div className="text-sm font-medium">
                    {steps[currentStep - 1]?.title}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {steps[currentStep - 1]?.description}
                </div>
              </div>
            ) : (
              // Desktop stepper - horizontal tabs
              <div className="flex border-b border-border mb-8">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    className={`flex-1 text-center py-4 font-semibold border-b-4 transition-colors ${
                      currentStep === step.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground'
                    }`}
                  >
                    Paso {step.id}: {step.title}
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Información Básica del Documento</h2>
                
                {/* Loading state while improving with AI */}
                {isImprovingDocInfo && (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-lg">Mejorando información con IA...</p>
                    <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
                  </div>
                )}
                
                {/* Show AI improvements */}
                {docInfoImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                        ✨ Mejoras Sugeridas por IA
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Name comparison */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Nombre del Documento</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Original:</p>
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                                {docInfoImprovement.originalName}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mejorado:</p>
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 text-sm">
                                {docInfoImprovement.improvedName}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Description comparison */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Descripción</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Original:</p>
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                                {docInfoImprovement.originalDescription}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mejorado:</p>
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 text-sm">
                                {docInfoImprovement.improvedDescription}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-end gap-3'} mt-6`}>
                        <Button 
                          variant="outline" 
                          onClick={rejectDocumentInfo}
                          className={isMobile ? "w-full" : ""}
                        >
                          Mantener Original
                        </Button>
                        <Button 
                          onClick={acceptDocumentInfo}
                          className={`bg-emerald-600 hover:bg-emerald-700 ${isMobile ? "w-full" : ""}`}
                        >
                          Aplicar Mejoras
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Regular form fields */}
                {!isImprovingDocInfo && !docInfoImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="docName">Nombre del Documento (para clientes)</Label>
                      <Input
                        id="docName"
                        value={formData.docName}
                        onChange={(e) => handleInputChange('docName', e.target.value)}
                        placeholder="Ej: Contrato de Promesa de Compraventa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docDesc">Descripción Corta (para clientes)</Label>
                      <Textarea
                        id="docDesc"
                        value={formData.docDesc}
                        onChange={(e) => handleInputChange('docDesc', e.target.value)}
                        placeholder="Ej: Asegura la compra de un inmueble mientras se completan los trámites."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docCat">Categoría</Label>
                      <Select value={formData.docCat} onValueChange={(value) => handleInputChange('docCat', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* ANS Configuration */}
                    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                      <h3 className="font-semibold text-sm">⏱️ Configuración de ANS (Acuerdo de Nivel de Servicio)</h3>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="slaEnabled"
                          checked={formData.slaEnabled}
                          onChange={(e) => handleInputChange('slaEnabled', e.target.checked.toString())}
                          className="rounded"
                        />
                        <Label htmlFor="slaEnabled" className="text-sm">
                          Habilitar ANS para este tipo de documento
                        </Label>
                      </div>
                      
                      {formData.slaEnabled && (
                        <div>
                          <Label htmlFor="slaHours" className="text-sm">
                            Tiempo límite de respuesta (horas)
                          </Label>
                          <Select 
                            value={formData.slaHours.toString()} 
                            onValueChange={(value) => handleInputChange('slaHours', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecciona el tiempo límite" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hora</SelectItem>
                              <SelectItem value="2">2 horas</SelectItem>
                              <SelectItem value="4">4 horas (recomendado)</SelectItem>
                              <SelectItem value="6">6 horas</SelectItem>
                              <SelectItem value="8">8 horas</SelectItem>
                              <SelectItem value="12">12 horas</SelectItem>
                              <SelectItem value="24">24 horas (máximo)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tiempo máximo para revisar y entregar documentos de este tipo
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>💡 Mejora automática:</strong> Al hacer clic en "Siguiente", nuestra IA optimizará automáticamente el nombre y descripción para que sean más atractivos y comprensibles para los usuarios finales.
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Button 
                        onClick={handleNext}
                        disabled={isImprovingDocInfo}
                        className={`${isImprovingDocInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isImprovingDocInfo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Mejorando con IA...
                          </>
                        ) : (
                          <>
                            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Template */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Plantilla del Documento</h2>
                <div className={`${isMobile ? 'space-y-4' : 'flex items-start justify-between'} mb-4`}>
                  <p className={`text-muted-foreground ${isMobile ? 'mb-2' : 'max-w-md'}`}>
                    Pega el texto completo de tu plantilla. Usa placeholders como `{"{{nombre_del_campo}}"}` para las variables.
                  </p>
                  <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex gap-3 flex-shrink-0'}`}>
                    {formData.docTemplate && (
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        onClick={copyTemplate}
                        className={isMobile ? "w-full justify-center" : "min-w-[140px]"}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    )}
                    {formData.docTemplate && formData.docName && (
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        onClick={improveTemplateWithAI}
                        disabled={isImprovingTemplate}
                        className={`bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-950/70 dark:border-purple-800 dark:text-purple-300 ${isMobile ? "w-full justify-center" : "min-w-[140px]"}`}
                      >
                        {isImprovingTemplate ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        {isImprovingTemplate ? (isMobile ? 'Mejorando...' : 'Mejorando...') : (isMobile ? 'Mejorar IA' : 'Mejorar IA')}
                      </Button>
                    )}
                  </div>
                </div>
                
                {formData.docTemplate && formData.docName && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>💡 Mejora con IA:</strong> Usa el botón "Mejorar con IA" para que OpenAI optimice tu plantilla, agregue cláusulas legales importantes y mejore la redacción manteniendo todos los placeholders existentes.
                    </p>
                  </div>
                )}

                <Textarea
                  value={formData.docTemplate}
                  onChange={(e) => handleInputChange('docTemplate', e.target.value)}
                  placeholder="Ej: CONTRATO DE PROMESA DE COMPRAVENTA... Entre los suscritos a saber: {{nombre_promitente_vendedor}}, mayor de edad..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                  <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button onClick={handleNext} className={isMobile ? "w-full" : ""}>
                    Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Initial Prompt */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Prompt Inicial para el Agente de IA</h2>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">📋 Guía para el Prompt</h3>
                  <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <p><strong>✅ Incluye:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Rol específico del agente (ej: "asistente legal especializado en...")</li>
                      <li>Objetivo claro del documento</li>
                      <li>Información que debe recopilar del usuario</li>
                      <li>Tono de conversación (profesional, amigable, etc.)</li>
                      <li>Validaciones especiales (si aplica)</li>
                    </ul>
                    <p className="pt-2"><strong>❌ Evita:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Instrucciones técnicas complejas</li>
                      <li>Referencias a herramientas específicas</li>
                      <li>Detalles de formato del documento final</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3">💡 Ejemplo de Prompt Efectivo</h3>
                  <div className="bg-white dark:bg-gray-800 border rounded p-4 text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
{`Eres un asistente legal especializado en contratos de arrendamiento residencial en Colombia.

TU OBJETIVO: Ayudar a propietarios e inquilinos a crear un contrato de arrendamiento completo y legalmente válido.

INFORMACIÓN A RECOPILAR:
1. Datos del arrendador (nombre, cédula, dirección)
2. Datos del arrendatario (nombre, cédula, teléfono, ocupación)
3. Información del inmueble (dirección completa, estrato, área)
4. Condiciones económicas (canon, depósito, incrementos)
5. Duración del contrato y fecha de inicio
6. Servicios incluidos/excluidos
7. Condiciones especiales (mascotas, huéspedes, etc.)

ESTILO DE CONVERSACIÓN:
- Mantén un tono profesional pero cercano
- Explica brevemente por qué necesitas cada dato
- Confirma información importante antes de continuar
- Haz una pregunta a la vez para no abrumar

VALIDACIONES:
- Asegúrate de que las cédulas tengan formato válido
- Confirma que las fechas sean coherentes
- Verifica que los montos estén en pesos colombianos`}
                    </pre>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4">
                  <strong>Instrucción:</strong> Escribe tu prompt inicial siguiendo la guía anterior. Nuestra IA lo optimizará automáticamente con estructura profesional y mejores prácticas.
                </p>
                
                <Textarea
                  value={formData.initialPrompt}
                  onChange={(e) => handleInputChange('initialPrompt', e.target.value)}
                  placeholder="Escribe aquí tu prompt inicial siguiendo la guía anterior..."
                  rows={12}
                  className="text-sm"
                />
                
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>💡 Tip:</strong> Un buen prompt inicial puede ahorrar tiempo en ajustes posteriores. 
                    La IA mejorará tu prompt pero una base sólida produce mejores resultados.
                  </p>
                </div>

                <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                  <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button onClick={processWithAI} className={`bg-emerald-600 hover:bg-emerald-700 ${isMobile ? "w-full" : ""}`}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Procesar con IA
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: AI Processing & Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Revisión y Mejora por IA</h2>
                <p className="text-muted-foreground mb-6">
                  Nuestra plataforma ha analizado tus insumos y ha generado una configuración optimizada para el nuevo agente. Por favor, revisa y aprueba.
                </p>

                {isProcessing ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-lg">Procesando con IA...</p>
                    <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
                  </div>
                 ) : aiProcessingSuccess ? (
                   <div className="space-y-8">
                      {/* Enhanced Prompt */}
                      <div>
                        <h3 className="text-xl font-bold mb-2">1. Prompt del Agente (Mejorado)</h3>
                        <Textarea
                          value={aiResults.enhancedPrompt}
                          onChange={(e) => setAiResults(prev => ({ ...prev, enhancedPrompt: e.target.value }))}
                          rows={15}
                          className="text-sm"
                          placeholder="Prompt del agente mejorado por IA..."
                        />
                      </div>

                     {/* Extracted Placeholders */}
                     <div>
                       <h3 className="text-xl font-bold mb-2">2. Variables Identificadas en la Plantilla</h3>
                       <div className="p-4 bg-muted rounded-md border">
                         <div className="flex flex-wrap gap-2">
                           {aiResults.extractedPlaceholders.map((item, index) => (
                             <Badge key={index} variant="secondary">
                               {item.placeholder}
                             </Badge>
                           ))}
                         </div>
                       </div>
                     </div>

                     {/* Price Suggestion */}
                     <div>
                       <h3 className="text-xl font-bold mb-2">3. Precio Sugerido (Basado en el Mercado)</h3>
                       <div className="p-4 bg-success/10 rounded-md border border-success/20">
                         <p className="text-3xl font-bold text-success">{aiResults.suggestedPrice}</p>
                         <p className="text-sm text-success/80 mt-1">{aiResults.priceJustification}</p>
                       </div>
                     </div>

                      <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                        <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <Button onClick={handleNext} className={isMobile ? "w-full" : ""}>
                          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center py-12">
                     <div className="mb-6">
                       <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                         <span className="text-2xl">⚠️</span>
                       </div>
                       <h3 className="text-xl font-bold mb-2">Error en el Procesamiento</h3>
                       <p className="text-muted-foreground mb-6">
                         No se pudo procesar la información con IA. Regresa al paso anterior e intenta nuevamente.
                       </p>
                       <Button onClick={() => setCurrentStep(3)} variant="outline">
                         <ArrowLeft className="h-4 w-4 mr-2" />
                         Volver a Intentar
                       </Button>
                     </div>
                   </div>
                )}
              </div>
            )}

            {/* Step 5: Publish */}
            {currentStep === 5 && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-24 w-24 text-success mb-6" />
                <h2 className="text-3xl font-bold mb-4">¡Todo Listo!</h2>
                 <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                   El nuevo agente para el documento <strong>"{formData.docName}"</strong> está configurado y listo para ser enviado a revisión. 
                   Una vez aprobado por el administrador, estará disponible para todos los clientes en el sitio web.
                 </p>
                 <Button onClick={handlePublish} size={isMobile ? "default" : "lg"} className={`${isMobile ? "w-full text-base px-6 py-3" : "text-xl px-10 py-4"}`}>
                   Enviar a Revisión
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}