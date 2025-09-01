import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { 
  Brain, 
  BookOpen, 
  Target, 
  CheckCircle, 
  Clock,
  Play,
  Award,
  MessageSquare,
  ChevronRight,
  Lightbulb,
  FileText,
  Users,
  Zap,
  Lock,
  Unlock,
  Star,
  Send,
  Bot,
  User
} from "lucide-react";

interface ModuleData {
  id: string;
  title: string;
  description: string;
  content: string[];
  learningObjectives: string[];
  estimatedTime: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  prerequisites?: string[];
  validationQuestions: ValidationQuestion[];
  practicalExercise: PracticalExercise;
}

interface ValidationQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'open_ended' | 'practical';
  options?: string[];
  correctAnswer?: number;
  rubric?: string;
  points: number;
}

interface PracticalExercise {
  title: string;
  description: string;
  prompt: string;
  expectedOutputs: string[];
  evaluationCriteria: string[];
}

interface ModuleProgress {
  moduleId: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'validated';
  score?: number;
  attempts: number;
  completedAt?: string;
  validationResults?: any;
}

interface LawyerTrainingSystemProps {
  lawyerId: string;
  lawyerData: any;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AILegalTrainingSystem({ lawyerId, lawyerData, onBack }: LawyerTrainingSystemProps) {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [currentModule, setCurrentModule] = useState<ModuleData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAnswers, setValidationAnswers] = useState<Record<string, any>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Definición de módulos de certificación
  const certificationModules: ModuleData[] = [
    {
      id: "foundations-ai-law",
      title: "Fundamentos de IA en el Derecho",
      description: "Conceptos esenciales de IA aplicados al ejercicio legal",
      content: [
        "¿Qué es la Inteligencia Artificial y por qué es relevante para los abogados?",
        "Historia y evolución de la IA en el sector legal",
        "Tipos de IA: Machine Learning, Deep Learning, LLM",
        "Diferencias entre IA tradicional e IA generativa",
        "Casos de uso actuales en firmas legales internacionales",
        "Beneficios y limitaciones de la IA en el derecho"
      ],
      learningObjectives: [
        "Comprender los conceptos fundamentales de IA",
        "Identificar aplicaciones prácticas en el ejercicio legal",
        "Reconocer oportunidades y limitaciones tecnológicas",
        "Evaluar el impacto de la IA en la profesión legal"
      ],
      estimatedTime: "45 minutos",
      difficulty: "Básico",
      validationQuestions: [
        {
          id: "q1",
          question: "¿Cuál es la principal diferencia entre Machine Learning y Deep Learning?",
          type: "multiple_choice",
          options: [
            "No hay diferencias significativas",
            "Deep Learning usa redes neuronales más complejas y profundas",
            "Machine Learning es más reciente que Deep Learning",
            "Deep Learning no se aplica al derecho"
          ],
          correctAnswer: 1,
          points: 10
        },
        {
          id: "q2",
          question: "Explique tres casos de uso específicos donde la IA puede mejorar la eficiencia en una firma legal, incluyendo beneficios y posibles riesgos de cada implementación.",
          type: "open_ended",
          rubric: "Debe mencionar casos específicos, explicar beneficios cuantificables y identificar riesgos éticos o prácticos",
          points: 20
        }
      ],
      practicalExercise: {
        title: "Análisis de Implementación de IA",
        description: "Evalúe la viabilidad de implementar IA en un departamento legal específico",
        prompt: "Usted es consultor en una empresa mediana con departamento legal de 5 abogados. Analice e identifique 3 procesos donde la IA podría generar mayor impacto, justifique su selección y proponga un plan de implementación gradual.",
        expectedOutputs: [
          "Identificación de procesos con mayor potencial de automatización",
          "Análisis costo-beneficio básico",
          "Plan de implementación por fases",
          "Consideraciones de gestión del cambio"
        ],
        evaluationCriteria: [
          "Claridad en la identificación de oportunidades",
          "Realismo en las propuestas de implementación",
          "Consideración de aspectos prácticos y éticos",
          "Estructura lógica del plan propuesto"
        ]
      }
    },
    {
      id: "prompt-engineering-legal",
      title: "Ingeniería de Prompts para Abogados",
      description: "Técnicas avanzadas para crear instrucciones efectivas de IA",
      content: [
        "Anatomía de un prompt legal efectivo",
        "Técnicas de prompt engineering: Chain of Thought, Few-Shot Learning",
        "Manejo de contexto y variables en documentos legales",
        "Optimización de resultados mediante iteración",
        "Prompts para diferentes tipos de documentos",
        "Evaluación y mejora continua de prompts"
      ],
      learningObjectives: [
        "Dominar técnicas avanzadas de prompt engineering",
        "Crear prompts específicos para documentos legales",
        "Optimizar resultados mediante técnicas iterativas",
        "Desarrollar una metodología de mejora continua"
      ],
      estimatedTime: "60 minutos",
      difficulty: "Intermedio",
      prerequisites: ["foundations-ai-law"],
      validationQuestions: [
        {
          id: "q3",
          question: "Redacte un prompt optimizado para generar un contrato de arrendamiento comercial que incluya variables específicas y consideraciones legales colombianas.",
          type: "practical",
          rubric: "Debe incluir contexto de rol, estructura específica, variables claramente definidas y referencias al marco legal aplicable",
          points: 25
        },
        {
          id: "q4",
          question: "¿Qué es la técnica 'Few-Shot Learning' y cuándo es más efectiva en contextos legales?",
          type: "multiple_choice",
          options: [
            "Proporcionar pocos ejemplos para que la IA aprenda el patrón deseado",
            "Hacer muchas preguntas seguidas para obtener mejor información",
            "Usar prompts muy cortos para ahorrar tokens",
            "Combinar múltiples modelos de IA simultáneamente"
          ],
          correctAnswer: 0,
          points: 15
        }
      ],
      practicalExercise: {
        title: "Desarrollo de Biblioteca de Prompts",
        description: "Cree una colección optimizada de prompts para diferentes tipos de documentos legales",
        prompt: "Desarrolle 5 prompts optimizados para: 1) Contrato laboral, 2) Demanda ejecutiva, 3) Análisis de riesgo contractual, 4) Carta de cobranza, 5) Derecho de petición. Cada prompt debe incluir estructura específica, variables y marco legal aplicable.",
        expectedOutputs: [
          "5 prompts completamente estructurados",
          "Variables claramente definidas para cada tipo",
          "Referencias al marco legal colombiano",
          "Ejemplos de uso para cada prompt"
        ],
        evaluationCriteria: [
          "Especificidad y claridad de instrucciones",
          "Uso apropiado de variables y contexto",
          "Aplicabilidad práctica en ejercicio real",
          "Consideración del marco legal relevante"
        ]
      }
    },
    {
      id: "document-automation",
      title: "Automatización de Documentos Legales",
      description: "Implementación práctica de sistemas de generación automática",
      content: [
        "Metodología para identificar documentos automatizables",
        "Diseño de plantillas dinámicas con variables",
        "Integración de validaciones legales automáticas",
        "Flujos de trabajo automatizados",
        "Control de calidad en documentos generados",
        "Mantenimiento y actualización de sistemas"
      ],
      learningObjectives: [
        "Identificar oportunidades de automatización documental",
        "Diseñar plantillas y flujos automatizados",
        "Implementar controles de calidad efectivos",
        "Desarrollar metodología de mantenimiento"
      ],
      estimatedTime: "75 minutos",
      difficulty: "Avanzado",
      prerequisites: ["foundations-ai-law", "prompt-engineering-legal"],
      validationQuestions: [
        {
          id: "q5",
          question: "Diseñe un flujo de automatización completo para contratos de compraventa de vehículos que incluya validaciones automáticas y control de calidad.",
          type: "practical",
          rubric: "Debe incluir identificación de inputs, proceso de validación, generación del documento, controles de calidad y flujo de aprobación",
          points: 30
        }
      ],
      practicalExercise: {
        title: "Sistema de Automatización Documental",
        description: "Implemente un sistema completo de automatización para un tipo específico de documento",
        prompt: "Diseñe e implemente un sistema de automatización para demandas ejecutivas que incluya: captura de datos, validaciones automáticas, generación del documento, revisión de calidad y flujo de aprobación. El sistema debe manejar al menos 5 variables críticas y 3 validaciones legales.",
        expectedOutputs: [
          "Diagrama de flujo del proceso completo",
          "Plantilla con variables y validaciones",
          "Protocolo de control de calidad",
          "Metodología de actualización y mantenimiento"
        ],
        evaluationCriteria: [
          "Completitud del sistema diseñado",
          "Efectividad de las validaciones propuestas",
          "Viabilidad práctica de implementación",
          "Consideración de aspectos de mantenimiento"
        ]
      }
    },
    {
      id: "ai-legal-ethics",
      title: "Ética y Responsabilidad en IA Legal",
      description: "Marco ético y legal para el uso responsable de IA",
      content: [
        "Responsabilidad profesional del abogado en era de IA",
        "Confidencialidad y protección de datos sensibles",
        "Transparencia con clientes sobre uso de IA",
        "Sesgos algorítmicos y sus implicaciones legales",
        "Validación y verificación de resultados de IA",
        "Marco regulatorio emergente para IA en derecho"
      ],
      learningObjectives: [
        "Comprender las implicaciones éticas del uso de IA",
        "Desarrollar protocolos de uso responsable",
        "Implementar medidas de protección de confidencialidad",
        "Establecer metodologías de validación de resultados"
      ],
      estimatedTime: "50 minutos",
      difficulty: "Intermedio",
      prerequisites: ["foundations-ai-law"],
      validationQuestions: [
        {
          id: "q6",
          question: "¿Cuáles son las principales consideraciones éticas al usar IA para análisis de documentos confidenciales de clientes?",
          type: "open_ended",
          rubric: "Debe abordar confidencialidad, responsabilidad profesional, transparencia con cliente y protocolos de seguridad",
          points: 20
        }
      ],
      practicalExercise: {
        title: "Protocolo de Uso Ético de IA",
        description: "Desarrolle un protocolo completo para el uso ético de IA en su práctica legal",
        prompt: "Cree un protocolo de uso ético de IA que incluya: políticas de confidencialidad, proceso de consentimiento informado del cliente, metodología de validación de resultados, manejo de sesgos y procedimientos de transparencia. El protocolo debe ser aplicable a una firma de 10+ abogados.",
        expectedOutputs: [
          "Documento de políticas de uso ético",
          "Formularios de consentimiento informado",
          "Checklist de validación de resultados",
          "Procedimientos de reporte y transparencia"
        ],
        evaluationCriteria: [
          "Completitud del marco ético propuesto",
          "Aplicabilidad práctica en contexto real",
          "Consideración de aspectos legales y deontológicos",
          "Claridad en procedimientos y responsabilidades"
        ]
      }
    },
    {
      id: "advanced-implementation",
      title: "Implementación Avanzada y ROI",
      description: "Estrategias de implementación escalable y medición de resultados",
      content: [
        "Metodología de implementación gradual en firmas",
        "Gestión del cambio y adopción tecnológica",
        "Métricas de ROI y eficiencia en IA legal",
        "Integración con sistemas existentes",
        "Escalabilidad y crecimiento sostenible",
        "Tendencias futuras y preparación estratégica"
      ],
      learningObjectives: [
        "Desarrollar estrategias de implementación escalable",
        "Establecer métricas de medición de ROI",
        "Gestionar efectivamente el cambio organizacional",
        "Planificar crecimiento sostenible con IA"
      ],
      estimatedTime: "80 minutos",
      difficulty: "Avanzado",
      prerequisites: ["foundations-ai-law", "prompt-engineering-legal", "document-automation", "ai-legal-ethics"],
      validationQuestions: [
        {
          id: "q7",
          question: "Desarrolle un plan de implementación de IA de 12 meses para una firma legal de tamaño medio, incluyendo fases, métricas de éxito y gestión de riesgos.",
          type: "practical",
          rubric: "Debe incluir cronograma detallado, métricas cuantificables, plan de gestión del cambio y análisis de riesgos",
          points: 35
        }
      ],
      practicalExercise: {
        title: "Plan Estratégico de Transformación Digital",
        description: "Cree un plan completo de transformación digital con IA para una firma legal",
        prompt: "Desarrolle un plan estratégico de 18 meses para implementar IA en una firma legal de 25 abogados especializados en derecho corporativo. Incluya análisis situacional, objetivos cuantificables, fases de implementación, presupuesto estimado, métricas de ROI, gestión de riesgos y plan de sostenibilidad.",
        expectedOutputs: [
          "Análisis situacional completo",
          "Plan de implementación por fases",
          "Presupuesto y análisis costo-beneficio",
          "Framework de métricas y KPIs",
          "Plan de gestión del cambio",
          "Estrategia de sostenibilidad a largo plazo"
        ],
        evaluationCriteria: [
          "Realismo y viabilidad del plan propuesto",
          "Consideración integral de factores organizacionales",
          "Claridad en métricas y objetivos cuantificables",
          "Robustez del análisis de riesgos y mitigación"
        ]
      }
    }
  ];

  useEffect(() => {
    initializeTraining();
  }, [lawyerId]);

  const initializeTraining = async () => {
    setLoading(true);
    try {
      setModules(certificationModules);
      await loadProgress();
    } catch (error) {
      console.error('Error initializing training:', error);
      toast.error('Error al cargar el sistema de formación');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    // Inicializar progreso si no existe
    const initialProgress: ModuleProgress[] = certificationModules.map((module, index) => ({
      moduleId: module.id,
      status: index === 0 ? 'available' : 'locked',
      attempts: 0
    }));
    
    setProgress(initialProgress);
  };

  const startModule = (module: ModuleData) => {
    setCurrentModule(module);
    updateModuleStatus(module.id, 'in_progress');
    initializeAIAssistant(module);
  };

  const updateModuleStatus = (moduleId: string, status: ModuleProgress['status']) => {
    setProgress(prev => prev.map(p => 
      p.moduleId === moduleId ? { ...p, status } : p
    ));
  };

  const completeModule = (moduleId: string) => {
    setCurrentModule(null);
    updateModuleStatus(moduleId, 'completed');
    
    // Desbloquear siguiente módulo
    const currentIndex = modules.findIndex(m => m.id === moduleId);
    if (currentIndex < modules.length - 1) {
      const nextModuleId = modules[currentIndex + 1].id;
      updateModuleStatus(nextModuleId, 'available');
    }
    
    toast.success('Módulo completado. ¡Procede con la validación!');
  };

  const startValidation = (module: ModuleData) => {
    setCurrentModule(module);
    setShowValidation(true);
    setValidationAnswers({});
  };

  const submitValidation = async () => {
    if (!currentModule) return;
    
    setIsValidating(true);
    try {
      // Aquí llamaremos al agente de IA especializado en formación
      const validationResult = await validateModuleCompletion();
      
      if (validationResult.passed) {
        updateModuleStatus(currentModule.id, 'validated');
        toast.success(`¡Validación exitosa! Puntuación: ${validationResult.score}/100`);
        
        // Verificar si se completó toda la certificación
        checkCertificationCompletion();
      } else {
        toast.error('Validación no superada. Revisa el feedback y vuelve a intentar.');
      }
      
      setShowValidation(false);
      setCurrentModule(null);
    } catch (error) {
      console.error('Error in validation:', error);
      toast.error('Error durante la validación');
    } finally {
      setIsValidating(false);
    }
  };

  const validateModuleCompletion = async () => {
    // Simular llamada al agente de IA especializado
    // En implementación real, aquí se llamaría al edge function
    return new Promise<{passed: boolean, score: number, feedback: string}>((resolve) => {
      setTimeout(() => {
        resolve({
          passed: Math.random() > 0.3, // 70% de probabilidad de pasar
          score: Math.floor(Math.random() * 40) + 60, // Score entre 60-100
          feedback: "Evaluación completada por agente especializado en formación legal"
        });
      }, 2000);
    });
  };

  const checkCertificationCompletion = () => {
    const allValidated = progress.every(p => p.status === 'validated');
    if (allValidated) {
      toast.success('¡Felicitaciones! Has completado toda la certificación IA Lawyer Fundamentals');
      // Aquí se activaría la emisión del certificado
    }
  };

  const getModuleProgress = (moduleId: string) => {
    return progress.find(p => p.moduleId === moduleId);
  };

  const isModuleAccessible = (module: ModuleData) => {
    const moduleProgress = getModuleProgress(module.id);
    return moduleProgress?.status !== 'locked';
  };

  const getCompletionPercentage = () => {
    const validatedModules = progress.filter(p => p.status === 'validated').length;
    return Math.round((validatedModules / modules.length) * 100);
  };

  const initializeAIAssistant = (module: ModuleData) => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `¡Hola! Soy tu asistente especializado en IA Legal. Te acompañaré durante el módulo "${module.title}". 

Estoy aquí para:
• Explicarte conceptos complejos
• Responder preguntas específicas
• Ayudarte con ejemplos prácticos
• Prepararte para la validación

¿Tienes alguna pregunta antes de comenzar o te gustaría que te guíe a través del contenido?`,
      timestamp: new Date()
    };
    
    setChatMessages([welcomeMessage]);
    setShowAIAssistant(true);
  };

  const sendMessageToAI = async () => {
    if (!currentMessage.trim() || !currentModule) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAIResponding(true);

    try {
      const response = await supabase.functions.invoke('legal-training-assistant', {
        body: {
          message: currentMessage,
          moduleId: currentModule.id,
          moduleContent: currentModule,
          lawyerId: lawyerId,
          chatHistory: chatMessages
        }
      });

      if (response.error) {
        throw response.error;
      }

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '_ai',
        type: 'assistant',
        content: response.data?.response || 'Lo siento, hubo un error al procesar tu consulta.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: 'Disculpa, estoy experimentando dificultades técnicas. Por favor, intenta de nuevo en unos momentos.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAIResponding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageToAI();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando sistema de formación...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Volver al Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Centro de Formación IA Legal
          </h1>
          <p className="text-muted-foreground">
            Certificación IA Lawyer Fundamentals - {lawyerData?.full_name || 'Abogado'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{getCompletionPercentage()}%</div>
          <div className="text-sm text-muted-foreground">Progreso Total</div>
          <Progress value={getCompletionPercentage()} className="w-32 mt-2" />
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid gap-6">
        {modules.map((module, index) => {
          const moduleProgress = getModuleProgress(module.id);
          const isAccessible = isModuleAccessible(module);
          
          return (
            <Card key={module.id} className={`transition-all ${!isAccessible ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {moduleProgress?.status === 'locked' && <Lock className="w-4 h-4 text-muted-foreground" />}
                      {moduleProgress?.status === 'available' && <Unlock className="w-4 h-4 text-blue-500" />}
                      {moduleProgress?.status === 'in_progress' && <Clock className="w-4 h-4 text-orange-500" />}
                      {moduleProgress?.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {moduleProgress?.status === 'validated' && <Star className="w-4 h-4 text-yellow-500" />}
                      
                      {module.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">{module.description}</p>
                    
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{module.difficulty}</Badge>
                      <Badge variant="secondary">{module.estimatedTime}</Badge>
                      {module.prerequisites && (
                        <Badge variant="outline">
                          Prerequisitos: {module.prerequisites.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                   <div className="flex flex-col gap-2">
                     {moduleProgress?.status === 'available' && (
                       <>
                         <Button onClick={() => startModule(module)}>
                           <Play className="w-4 h-4 mr-2" />
                           Comenzar
                         </Button>
                         <Button 
                           variant="outline" 
                           size="sm"
                           className="text-blue-600 border-blue-200 hover:bg-blue-50"
                         >
                           <Brain className="w-3 h-3 mr-1" />
                           Vista Previa IA
                         </Button>
                       </>
                     )}
                     
                     {moduleProgress?.status === 'in_progress' && (
                       <>
                         <Button onClick={() => startModule(module)} variant="outline">
                           <BookOpen className="w-4 h-4 mr-2" />
                           Continuar
                         </Button>
                         <Button 
                           onClick={() => {
                             setCurrentModule(module);
                             initializeAIAssistant(module);
                           }}
                           variant="secondary"
                           size="sm"
                           className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                         >
                           <Bot className="w-3 h-3 mr-1" />
                           Asistente IA
                         </Button>
                       </>
                     )}
                     
                     {moduleProgress?.status === 'completed' && (
                       <>
                         <Button onClick={() => startValidation(module)} className="bg-green-600 hover:bg-green-700">
                           <Target className="w-4 h-4 mr-2" />
                           Validar Conocimientos
                         </Button>
                         <Button 
                           onClick={() => {
                             setCurrentModule(module);
                             initializeAIAssistant(module);
                           }}
                           variant="outline"
                           size="sm"
                           className="text-blue-600 border-blue-200 hover:bg-blue-50"
                         >
                           <Brain className="w-3 h-3 mr-1" />
                           Revisar con IA
                         </Button>
                       </>
                     )}
                     
                     {moduleProgress?.status === 'validated' && (
                       <Badge className="bg-yellow-500 text-yellow-50">
                         <Award className="w-3 h-3 mr-1" />
                         Validado
                       </Badge>
                     )}
                   </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Objetivos de Aprendizaje:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {module.learningObjectives.slice(0, 2).map((objective, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                          {objective}
                        </li>
                      ))}
                      {module.learningObjectives.length > 2 && (
                        <li className="text-xs text-muted-foreground">
                          +{module.learningObjectives.length - 2} objetivos más...
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {moduleProgress?.score && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Puntuación: {moduleProgress.score}/100
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Module Content Dialog */}
      <Dialog open={!!currentModule && !showValidation} onOpenChange={() => setCurrentModule(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {currentModule && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {currentModule.title}
                </DialogTitle>
                <DialogDescription>
                  {currentModule.description} • {currentModule.estimatedTime}
                </DialogDescription>
              </DialogHeader>
              
               <Tabs defaultValue="content" className="w-full">
                 <TabsList className="grid w-full grid-cols-4">
                   <TabsTrigger value="content">Contenido</TabsTrigger>
                   <TabsTrigger value="objectives">Objetivos</TabsTrigger>
                   <TabsTrigger value="exercise">Ejercicio Práctico</TabsTrigger>
                   <TabsTrigger value="assistant">Asistente IA</TabsTrigger>
                 </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    {currentModule.content.map((section, index) => (
                      <div key={index} className="mb-4">
                        <p className="text-sm leading-relaxed">{section}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="objectives" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Al completar este módulo, podrás:</h4>
                    <ul className="space-y-2">
                      {currentModule.learningObjectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
                
                 <TabsContent value="exercise" className="space-y-4">
                   <div>
                     <h4 className="font-medium mb-2">{currentModule.practicalExercise.title}</h4>
                     <p className="text-sm text-muted-foreground mb-4">
                       {currentModule.practicalExercise.description}
                     </p>
                     
                     <div className="bg-blue-50 p-4 rounded border border-blue-200">
                       <h5 className="font-medium text-blue-800 mb-2">Ejercicio:</h5>
                       <p className="text-sm text-blue-700">
                         {currentModule.practicalExercise.prompt}
                       </p>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-4 mt-4">
                       <div>
                         <h5 className="font-medium mb-2">Resultados Esperados:</h5>
                         <ul className="text-sm space-y-1">
                           {currentModule.practicalExercise.expectedOutputs.map((output, index) => (
                             <li key={index} className="flex items-start gap-2">
                               <CheckCircle className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                               {output}
                             </li>
                           ))}
                         </ul>
                       </div>
                       
                       <div>
                         <h5 className="font-medium mb-2">Criterios de Evaluación:</h5>
                         <ul className="text-sm space-y-1">
                           {currentModule.practicalExercise.evaluationCriteria.map((criteria, index) => (
                             <li key={index} className="flex items-start gap-2">
                               <Star className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                               {criteria}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>
                   </div>
                 </TabsContent>
                 
                 <TabsContent value="assistant" className="space-y-4">
                   <div className="h-96 flex flex-col">
                     <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                       <Bot className="w-5 h-5 text-blue-600" />
                       <div>
                         <h4 className="font-medium text-blue-800">Asistente IA Legal</h4>
                         <p className="text-sm text-blue-600">Especializado en {currentModule.title}</p>
                       </div>
                     </div>
                     
                     <ScrollArea className="flex-1 p-3 border rounded bg-background">
                       <div className="space-y-3">
                         {chatMessages.map((message) => (
                           <div key={message.id} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`flex gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-blue-100 text-blue-600'}`}>
                                 {message.type === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                               </div>
                               <div className={`p-3 rounded-lg ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                 <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                 <p className="text-xs opacity-70 mt-1">
                                   {message.timestamp.toLocaleTimeString()}
                                 </p>
                               </div>
                             </div>
                           </div>
                         ))}
                         {isAIResponding && (
                           <div className="flex gap-2 justify-start">
                             <div className="flex gap-2 max-w-[85%]">
                               <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                                 <Bot className="w-3 h-3" />
                               </div>
                               <div className="p-3 rounded-lg bg-muted">
                                 <div className="flex items-center gap-2">
                                   <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                   <p className="text-sm">El asistente está escribiendo...</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>
                     </ScrollArea>
                     
                     <div className="flex gap-2 mt-3">
                       <Input
                         placeholder="Escribe tu pregunta sobre el módulo..."
                         value={currentMessage}
                         onChange={(e) => setCurrentMessage(e.target.value)}
                         onKeyPress={handleKeyPress}
                         disabled={isAIResponding}
                         className="flex-1"
                       />
                       <Button 
                         onClick={sendMessageToAI} 
                         disabled={!currentMessage.trim() || isAIResponding}
                         size="sm"
                       >
                         <Send className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 </TabsContent>
              </Tabs>
              
               <div className="flex justify-between gap-2 pt-4 border-t">
                 <div className="flex gap-2">
                   <Button variant="outline" onClick={() => setCurrentModule(null)}>
                     Cerrar
                   </Button>
                   <Button onClick={() => completeModule(currentModule.id)}>
                     <CheckCircle className="w-4 h-4 mr-2" />
                     Marcar como Completado
                   </Button>
                 </div>
                 <Button 
                   onClick={() => setShowAIAssistant(true)} 
                   variant="secondary"
                   className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                 >
                   <Bot className="w-4 h-4 mr-2" />
                   Consultar Asistente IA
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={showValidation} onOpenChange={() => setShowValidation(false)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {currentModule && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Validación de Conocimientos - {currentModule.title}
                </DialogTitle>
                <DialogDescription>
                  Responde todas las preguntas para validar tu comprensión del módulo
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {currentModule.validationQuestions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">
                            Pregunta {index + 1} ({question.points} puntos)
                          </h4>
                          <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                        </div>
                        
                        <p className="text-sm">{question.question}</p>
                        
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={optIndex}
                                  onChange={(e) => setValidationAnswers(prev => ({
                                    ...prev,
                                    [question.id]: Number(e.target.value)
                                  }))}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {(question.type === 'open_ended' || question.type === 'practical') && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Escribe tu respuesta aquí..."
                              value={validationAnswers[question.id] || ''}
                              onChange={(e) => setValidationAnswers(prev => ({
                                ...prev,
                                [question.id]: e.target.value
                              }))}
                              className="min-h-[120px]"
                            />
                            {question.rubric && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Criterios de evaluación:</strong> {question.rubric}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowValidation(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={submitValidation} 
                  disabled={isValidating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validando con IA...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Enviar para Validación
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}