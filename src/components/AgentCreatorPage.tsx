import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

interface AgentCreatorPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function AgentCreatorPage({ onBack, lawyerData }: AgentCreatorPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    docName: "",
    docDesc: "",
    docCat: "",
    docTemplate: "",
    initialPrompt: "",
  });
  
  const [aiResults, setAiResults] = useState({
    enhancedPrompt: "",
    extractedPlaceholders: [] as Array<{ placeholder: string; pregunta: string }>,
    suggestedPrice: "",
    priceJustification: "",
  });

  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Info Básica", description: "Información del documento" },
    { id: 2, title: "Plantilla", description: "Texto del documento" },
    { id: 3, title: "Prompt", description: "Instrucciones iniciales" },
    { id: 4, title: "Magia IA", description: "Procesamiento automático" },
    { id: 5, title: "Publicar", description: "Revisión final" },
  ];

  const categories = [
    "Vivienda y Arriendos",
    "Trabajo y Empleo", 
    "Finanzas y Acuerdos Personales",
    "Comercial y Societario"
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
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
      // Simulate AI processing for now
      // In real implementation, this would call your n8n workflow
      setTimeout(() => {
        setAiResults({
          enhancedPrompt: `PROMPT MEJORADO POR IA:

## ROL Y OBJETIVO
Eres un asistente legal experto en la elaboración de ${formData.docName} en Colombia. Tu objetivo es recopilar toda la información necesaria del usuario de manera clara y profesional para generar un documento completo y legalmente válido.

## PROCESO DE RECOPILACIÓN
Debes solicitar la información de forma secuencial, validando cada respuesta antes de continuar. Mantén un tono profesional pero amigable, y explica brevemente por qué necesitas cada dato.

## CAMPOS A RECOPILAR
[Los campos se extraerán automáticamente de la plantilla]

## PROCESO DE REDACCIÓN
Una vez confirmados todos los datos, redacta el documento completo desde cero usando la plantilla como guía, reemplazando todos los placeholders con la información proporcionada.

## INSTRUCCIONES DE HERRAMIENTAS
Pasa el texto redactado final a la herramienta 'Google Docs - Crear Documento' para generar el archivo.

## FINALIZACIÓN
Al terminar, proporciona al usuario el ID del documento y confirma que el proceso se ha completado exitosamente.`,
          extractedPlaceholders: [
            { placeholder: "{{nombre_promitente_vendedor}}", pregunta: "¿Cuál es el nombre completo del vendedor?" },
            { placeholder: "{{cedula_promitente_vendedor}}", pregunta: "¿Cuál es el número de cédula del vendedor?" },
            { placeholder: "{{nombre_promitente_comprador}}", pregunta: "¿Cuál es el nombre completo del comprador?" },
            { placeholder: "{{direccion_inmueble}}", pregunta: "¿Cuál es la dirección completa del inmueble?" },
            { placeholder: "{{precio_venta}}", pregunta: "¿Cuál es el precio de venta acordado?" }
          ],
          suggestedPrice: "$ 95.000 COP",
          priceJustification: "Basado en la complejidad de 5 variables principales y el precio promedio de mercado para documentos similares."
        });
        setIsProcessing(false);
      }, 3000);
    } catch (error) {
      console.error('Error processing with AI:', error);
      toast({
        title: "Error en el procesamiento",
        description: "No se pudo procesar con IA. Intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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
          status: 'active',
          created_by: lawyerData.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating agent:', error);
        toast({
          title: "Error al publicar",
          description: "No se pudo crear el agente. Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Agente publicado exitosamente",
        description: `El agente "${formData.docName}" está ahora disponible para los clientes.`,
      });

      // Reset form and go back
      setFormData({
        docName: "",
        docDesc: "",
        docCat: "",
        docTemplate: "",
        initialPrompt: "",
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
        title: "Error al publicar",
        description: "No se pudo publicar el agente. Intenta nuevamente.",
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

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Información Básica del Documento</h2>
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
                </div>
                <div className="text-right">
                  <Button onClick={handleNext}>
                    Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Template */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Plantilla del Documento</h2>
                <p className="text-muted-foreground mb-4">
                  Pega el texto completo de tu plantilla. Usa placeholders como `{"{{nombre_del_campo}}"}` para las variables.
                </p>
                <Textarea
                  value={formData.docTemplate}
                  onChange={(e) => handleInputChange('docTemplate', e.target.value)}
                  placeholder="Ej: CONTRATO DE PROMESA DE COMPRAVENTA... Entre los suscritos a saber: {{nombre_promitente_vendedor}}, mayor de edad..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrev}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button onClick={handleNext}>
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

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handlePrev}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button onClick={processWithAI} className="bg-emerald-600 hover:bg-emerald-700">
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
                ) : (
                  <div className="space-y-8">
                    {/* Enhanced Prompt */}
                    <div>
                      <h3 className="text-xl font-bold mb-2">1. Prompt del Agente (Mejorado)</h3>
                      <div className="p-4 bg-muted rounded-md border text-sm whitespace-pre-wrap font-mono">
                        {aiResults.enhancedPrompt}
                      </div>
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

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handlePrev}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                      </Button>
                      <Button onClick={handleNext}>
                        Siguiente <ArrowRight className="h-4 w-4 ml-2" />
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
                  El nuevo agente para el documento <strong>"{formData.docName}"</strong> está configurado y listo para ser publicado. 
                  Una vez publicado, estará disponible para todos los clientes en el sitio web.
                </p>
                <Button onClick={handlePublish} size="lg" className="text-xl px-10 py-4">
                  Publicar Nuevo Servicio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}