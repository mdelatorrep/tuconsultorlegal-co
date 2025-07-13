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
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

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

  // Contenido detallado de cada módulo
  const moduleContents = {
    "ia-basics": {
      title: "Fundamentos de Inteligencia Artificial",
      sections: [
        {
          title: "¿Qué es la Inteligencia Artificial?",
          content: [
            "La Inteligencia Artificial (IA) es la capacidad de las máquinas para simular procesos de inteligencia humana, incluyendo aprendizaje, razonamiento y autocorrección.",
            "En el contexto legal, la IA puede procesar grandes volúmenes de información legal, identificar patrones en jurisprudencia, y asistir en la redacción de documentos."
          ]
        },
        {
          title: "Tipos de IA Relevantes para Abogados",
          content: [
            "**IA Generativa:** Crea contenido nuevo como textos legales, contratos y análisis.",
            "**Procesamiento de Lenguaje Natural (NLP):** Comprende y genera texto en lenguaje humano.",
            "**Modelos de Lenguaje:** Como GPT, que pueden entender contexto legal y generar documentos coherentes."
          ]
        },
        {
          title: "Aplicaciones en el Derecho",
          content: [
            "• **Redacción de documentos:** Contratos, demandas, escritos legales",
            "• **Investigación jurídica:** Búsqueda y análisis de precedentes",
            "• **Revisión de contratos:** Identificación de cláusulas problemáticas",
            "• **Automatización de procesos:** Generación de formularios y plantillas"
          ]
        },
        {
          title: "Consideraciones Éticas y Legales",
          content: [
            "⚖️ **Responsabilidad profesional:** El abogado siempre debe revisar y validar el contenido generado",
            "🔒 **Confidencialidad:** Nunca incluir información sensible en prompts públicos",
            "📋 **Precisión:** La IA debe ser una herramienta de apoyo, no un reemplazo del criterio legal"
          ]
        }
      ]
    },
    "prompt-engineering": {
      title: "Ingeniería de Prompts",
      sections: [
        {
          title: "Fundamentos del Prompt Engineering",
          content: [
            "El prompt engineering es el arte y ciencia de diseñar instrucciones efectivas para que la IA genere resultados precisos y útiles.",
            "Un buen prompt debe ser claro, específico, contextual y estructurado para obtener la respuesta deseada."
          ]
        },
        {
          title: "Anatomía de un Prompt Efectivo",
          content: [
            "**1. Contexto:** Define el rol y la situación",
            "**2. Tarea:** Especifica qué debe hacer exactamente",
            "**3. Formato:** Indica cómo debe estructurar la respuesta",
            "**4. Restricciones:** Establece límites y consideraciones",
            "**5. Ejemplos:** Proporciona referencias cuando sea útil"
          ]
        },
        {
          title: "Técnicas Avanzadas",
          content: [
            "🎯 **Prompting por pasos:** Divide tareas complejas en pasos simples",
            "🔄 **Prompting iterativo:** Refina el resultado mediante múltiples interacciones",
            "📝 **Few-shot prompting:** Proporciona ejemplos para guiar el comportamiento",
            "🧠 **Chain of thought:** Solicita que muestre el razonamiento paso a paso"
          ]
        },
        {
          title: "Errores Comunes y Cómo Evitarlos",
          content: [
            "❌ **Prompts vagos:** 'Redacta un contrato' → ✅ 'Redacta un contrato de compraventa de inmueble con [variables específicas]'",
            "❌ **Falta de contexto legal:** No mencionar normatividad aplicable",
            "❌ **Variables mal definidas:** Usar [NOMBRE] en lugar de [NOMBRE_COMPRADOR]",
            "❌ **Sin estructura:** No especificar formato de salida deseado"
          ]
        }
      ]
    },
    "legal-agents": {
      title: "Creación de Agentes Legales",
      sections: [
        {
          title: "¿Qué es un Agente Legal?",
          content: [
            "Un agente legal es un sistema de IA especializado en una tarea jurídica específica, diseñado para generar documentos consistentes y de alta calidad.",
            "Cada agente combina un prompt maestro, plantillas de documentos y variables personalizables para crear soluciones automatizadas."
          ]
        },
        {
          title: "Planificación del Agente",
          content: [
            "**1. Identificación del problema:** ¿Qué documento o proceso se va a automatizar?",
            "**2. Análisis de audiencia:** ¿Para personas naturales, empresas o ambos?",
            "**3. Definición de variables:** ¿Qué información específica se necesita?",
            "**4. Marco legal:** ¿Qué leyes, códigos o normativas aplican?",
            "**5. Casos de uso:** ¿En qué situaciones se utilizará?"
          ]
        },
        {
          title: "Desarrollo del Prompt Maestro",
          content: [
            "El prompt maestro es el cerebro del agente. Debe incluir:",
            "• **Rol profesional:** 'Actúa como un abogado especialista en...'",
            "• **Contexto normativo:** Referencias a leyes colombianas específicas",
            "• **Instrucciones detalladas:** Qué debe generar y cómo",
            "• **Estilo y tono:** Formal, técnico, acorde al documento",
            "• **Validaciones:** Qué verificar antes de entregar el resultado"
          ]
        },
        {
          title: "Diseño de Variables Inteligentes",
          content: [
            "📋 **Nombres descriptivos:** [CEDULA_ARRENDADOR] vs [CEDULA]",
            "📅 **Tipos de datos:** [FECHA_NACIMIENTO] (DD/MM/AAAA)",
            "💰 **Formatos específicos:** [VALOR_CANON] (solo número, sin puntos ni comas)",
            "📍 **Datos compuestos:** [DIRECCION_COMPLETA] incluye calle, número, ciudad",
            "⚡ **Variables opcionales:** [CLAUSULA_ESPECIAL] (opcional)"
          ]
        },
        {
          title: "Pruebas y Optimización",
          content: [
            "🧪 **Casos de prueba:** Diferentes escenarios reales",
            "🔍 **Revisión legal:** Verificar cumplimiento normativo",
            "📊 **Métricas de calidad:** Consistencia, precisión, completitud",
            "🔄 **Iteración:** Refinar basándose en retroalimentación",
            "📚 **Documentación:** Mantener registro de cambios y mejoras"
          ]
        }
      ]
    },
    "document-templates": {
      title: "Plantillas de Documentos Inteligentes",
      sections: [
        {
          title: "Arquitectura de Plantillas",
          content: [
            "Una plantilla inteligente combina estructura legal fija con campos dinámicos que se adaptan al contexto específico.",
            "Debe mantener la solidez jurídica mientras permite personalización automática."
          ]
        },
        {
          title: "Elementos de una Plantilla Efectiva",
          content: [
            "**📜 Encabezado:** Identificación del tipo de documento y partes",
            "**⚖️ Considerandos:** Marco legal y justificación",
            "**📋 Clausulado:** Obligaciones, derechos y condiciones",
            "**📝 Variables dinámicas:** Campos que se completan automáticamente",
            "**🔒 Cláusulas de cierre:** Firmas, fechas y formalidades"
          ]
        },
        {
          title: "Diseño de Variables Complejas",
          content: [
            "**Variables condicionales:** Si [TIPO_PERSONA] = 'natural' entonces incluir cédula, si 'jurídica' entonces NIT",
            "**Variables calculadas:** [VALOR_INCREMENTO] = [CANON_ACTUAL] * [PORCENTAJE_IPC]",
            "**Variables de lista:** [OBLIGACIONES_ARRENDADOR] puede incluir múltiples elementos",
            "**Variables anidadas:** [DATOS_REPRESENTANTE] solo si [TIPO_CONTRATANTE] = 'empresa'"
          ]
        },
        {
          title: "Estructura Legal Colombiana",
          content: [
            "🏛️ **Jerarquía normativa:** Constitución → Leyes → Decretos → Resoluciones",
            "📚 **Códigos aplicables:** Civil, Comercial, Laboral, Penal según el documento",
            "⚖️ **Jurisprudencia:** Considerar precedentes de Corte Constitucional y Suprema",
            "🏢 **Entidades reguladoras:** SuperSociedades, SuperFinanciera, MinTrabajo",
            "📋 **Formalidades:** Requisitos específicos por tipo de documento"
          ]
        },
        {
          title: "Control de Calidad",
          content: [
            "✅ **Revisión jurídica:** Verificar cumplimiento de requisitos legales",
            "🔍 **Consistencia interna:** Variables coherentes en todo el documento",
            "📏 **Estándares de formato:** Numeración, espaciado, fuentes",
            "🧪 **Pruebas de estrés:** Valores extremos y casos límite",
            "📊 **Métricas de éxito:** Tiempo de generación, precisión, satisfacción del usuario"
          ]
        },
        {
          title: "Mantenimiento y Actualización",
          content: [
            "📅 **Revisión periódica:** Cambios en normatividad",
            "🔄 **Versionado:** Control de cambios en plantillas",
            "📈 **Análisis de uso:** Qué variables se usan más",
            "💡 **Mejora continua:** Feedback de usuarios finales",
            "🚀 **Actualizaciones automáticas:** Notificar cambios importantes"
          ]
        }
      ]
    }
  };

  // Si hay un módulo seleccionado, mostrar su contenido
  if (selectedModule && moduleContents[selectedModule as keyof typeof moduleContents]) {
    const module = moduleContents[selectedModule as keyof typeof moduleContents];
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setSelectedModule(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Módulos
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {module.title}
                </h1>
                <p className="text-lg text-muted-foreground">
                  Contenido del módulo de formación
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {module.sections.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground text-sm px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.content.map((paragraph, pIndex) => (
                    <div key={pIndex} className="prose prose-sm max-w-none">
                      {paragraph.includes('**') ? (
                        <div dangerouslySetInnerHTML={{
                          __html: paragraph
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/• /g, '<br/>• ')
                            .replace(/\n/g, '<br/>')
                        }} />
                      ) : (
                        <p className="text-muted-foreground leading-relaxed">
                          {paragraph}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={() => setSelectedModule(null)}>
              Volver a Módulos
            </Button>
            <Button 
              onClick={() => {
                markModuleComplete(selectedModule);
                setSelectedModule(null);
              }}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Completado
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                      onClick={() => setSelectedModule(module.id)}
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
                    <p className="font-medium">Introducción a la IA Legal (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Conceptos fundamentales - 15 min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Creación de Prompts Avanzados (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Técnicas especializadas - 25 min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Casos de Uso Prácticos (próximamente)</p>
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
                    <p className="font-medium">Guía de Prompts PDF (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Manual completo descargable</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Plantillas de Variables (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Formatos estandarizados</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Checklist de Calidad (próximamente)</p>
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
                    <p className="font-medium">Foro de Abogados (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Intercambio de experiencias</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Sesiones Q&A (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Webinars mensuales</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Soporte Técnico (próximamente)</p>
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
                    <p className="font-medium">IA Legal Básico (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Fundamentos certificados</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Especialista en Prompts (próximamente)</p>
                    <p className="text-sm text-muted-foreground">Nivel avanzado</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Maestría en Agentes (próximamente)</p>
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