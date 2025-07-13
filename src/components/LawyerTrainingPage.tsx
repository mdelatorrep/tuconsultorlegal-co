import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Brain, 
  BookOpen, 
  Target, 
  CheckCircle, 
  PlayCircle,
  FileText,
  Lightbulb,
  Users,
  Zap,
  MessageSquare,
  Award,
  Video,
  Download
} from "lucide-react";

interface LawyerTrainingPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function LawyerTrainingPage({ onBack, lawyerData }: LawyerTrainingPageProps) {
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      const newCompleted = [...completedModules, moduleId];
      setCompletedModules(newCompleted);
      setCurrentProgress((newCompleted.length / totalModules) * 100);
    }
  };

  const totalModules = 8;

  const trainingModules = [
    {
      id: "ia-basics",
      title: "Fundamentos de Inteligencia Artificial",
      description: "Conceptos básicos de IA aplicados al derecho",
      duration: "20 min",
      level: "Básico"
    },
    {
      id: "prompt-engineering",
      title: "Ingeniería de Prompts",
      description: "Cómo escribir instrucciones efectivas para la IA",
      duration: "30 min",
      level: "Intermedio"
    },
    {
      id: "legal-agents",
      title: "Creación de Agentes Legales",
      description: "Mejores prácticas para desarrollar agentes especializados",
      duration: "25 min",
      level: "Intermedio"
    },
    {
      id: "document-templates",
      title: "Plantillas de Documentos Inteligentes",
      description: "Diseño de plantillas dinámicas y variables",
      duration: "35 min",
      level: "Avanzado"
    }
  ];

  const promptExamples = [
    {
      category: "Contrato Laboral",
      bad: "Crea un contrato de trabajo",
      good: "Redacta un contrato de trabajo a término fijo para un cargo de [CARGO] en [EMPRESA], con salario de [SALARIO], duración de [DURACION], incluyendo cláusulas de confidencialidad, no competencia y beneficios específicos del sector [SECTOR]. El contrato debe cumplir con la legislación laboral colombiana vigente.",
      explanation: "El prompt bueno es específico, incluye variables claras y contexto legal relevante."
    },
    {
      category: "Arrendamiento",
      bad: "Haz un contrato de arriendo",
      good: "Elabora un contrato de arrendamiento de vivienda urbana para el inmueble ubicado en [DIRECCION], [CIUDAD], con canon mensual de [VALOR_CANON], depósito de [DEPOSITO], plazo de [PLAZO_MESES] meses. Incluye cláusulas sobre servicios públicos, reparaciones, incrementos anuales según IPC, y causales de terminación conforme a la Ley 820 de 2003.",
      explanation: "Incluye detalles específicos del inmueble, términos financieros y marco legal aplicable."
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Centro de Formación en IA Legal
              </h1>
              <p className="text-lg text-muted-foreground">
                Desarrolla tus habilidades en inteligencia artificial aplicada al derecho
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Progreso General</span>
                <span className="text-sm text-muted-foreground">
                  {completedModules.length} de {totalModules} módulos completados
                </span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Módulos
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ejemplos
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Recursos
            </TabsTrigger>
          </TabsList>

          {/* Módulos de Formación */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {trainingModules.map((module, index) => (
                <Card key={module.id} className="relative group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2">
                          {completedModules.includes(module.id) ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                          )}
                          {module.title}
                        </CardTitle>
                        <CardDescription className="mb-3">
                          {module.description}
                        </CardDescription>
                        <div className="flex gap-2">
                          <Badge variant="outline">{module.duration}</Badge>
                          <Badge variant={module.level === 'Básico' ? 'default' : module.level === 'Intermedio' ? 'secondary' : 'destructive'}>
                            {module.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      variant={completedModules.includes(module.id) ? "outline" : "default"}
                      onClick={() => markModuleComplete(module.id)}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {completedModules.includes(module.id) ? "Revisar Módulo" : "Iniciar Módulo"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Guía de Prompts */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Principios de Prompts Efectivos
                </CardTitle>
                <CardDescription>
                  Aprende a crear instrucciones claras y específicas para obtener mejores resultados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-4">
                  <AccordionItem value="clarity">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        1. Claridad y Especificidad
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Principios Clave:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Sé específico sobre qué tipo de documento necesitas</li>
                          <li>Incluye el contexto legal relevante (leyes, códigos)</li>
                          <li>Define claramente las variables que deben ser reemplazadas</li>
                          <li>Especifica el formato y estructura deseada</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="structure">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        2. Estructura del Prompt
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Estructura Recomendada:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li><strong>Contexto:</strong> Tipo de documento y propósito</li>
                          <li><strong>Requisitos Legales:</strong> Normatividad aplicable</li>
                          <li><strong>Variables:</strong> Campos que deben personalizarse</li>
                          <li><strong>Formato:</strong> Estructura y presentación</li>
                          <li><strong>Instrucciones Especiales:</strong> Consideraciones adicionales</li>
                        </ol>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="variables">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        3. Uso de Variables
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Mejores Prácticas:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Usa nombres descriptivos: [NOMBRE_EMPRESA] en lugar de [NOMBRE]</li>
                          <li>Incluye el tipo de dato esperado: [FECHA_NACIMIENTO] (DD/MM/AAAA)</li>
                          <li>Agrupa variables relacionadas: [DIRECCION_COMPLETA]</li>
                          <li>Proporciona ejemplos cuando sea necesario</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="testing">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        4. Pruebas y Refinamiento
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Proceso de Mejora:</h4>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Prueba el prompt con diferentes escenarios</li>
                          <li>Verifica la consistencia de los resultados</li>
                          <li>Refina basándote en la retroalimentación</li>
                          <li>Documenta las mejores versiones</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ejemplos Prácticos */}
          <TabsContent value="examples" className="space-y-6">
            <div className="space-y-6">
              {promptExamples.map((example, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {example.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">❌ Prompt Deficiente</Badge>
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                          <p className="text-sm">{example.bad}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-success text-success-foreground">✅ Prompt Efectivo</Badge>
                        </div>
                        <div className="bg-success/10 border border-success/20 p-3 rounded-lg">
                          <p className="text-sm">{example.good}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm"><strong>Explicación:</strong> {example.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recursos */}
          <TabsContent value="resources" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Videos Tutoriales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium">Introducción a la IA Legal</p>
                    <p className="text-sm text-muted-foreground">Conceptos fundamentales - 15 min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Creación de Prompts Avanzados</p>
                    <p className="text-sm text-muted-foreground">Técnicas especializadas - 25 min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Casos de Uso Prácticos</p>
                    <p className="text-sm text-muted-foreground">Ejemplos reales - 30 min</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Documentos de Referencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium">Guía de Prompts PDF</p>
                    <p className="text-sm text-muted-foreground">Manual completo descargable</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Plantillas de Variables</p>
                    <p className="text-sm text-muted-foreground">Formatos estandarizados</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Checklist de Calidad</p>
                    <p className="text-sm text-muted-foreground">Verificación de prompts</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Comunidad y Soporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium">Foro de Abogados</p>
                    <p className="text-sm text-muted-foreground">Intercambio de experiencias</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Sesiones Q&A</p>
                    <p className="text-sm text-muted-foreground">Webinars mensuales</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Soporte Técnico</p>
                    <p className="text-sm text-muted-foreground">Asistencia especializada</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certificaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="font-medium">IA Legal Básico</p>
                    <p className="text-sm text-muted-foreground">Fundamentos certificados</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Especialista en Prompts</p>
                    <p className="text-sm text-muted-foreground">Nivel avanzado</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Maestría en Agentes</p>
                    <p className="text-sm text-muted-foreground">Experto certificado</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}