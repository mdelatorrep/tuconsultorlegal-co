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

  // Module definitions and functions

  const certificationModules: ModuleData[] = [
    {
      id: "foundations-ai-law",
      title: "Fundamentos de IA en el Derecho",
      description: "Conceptos esenciales de IA aplicados al ejercicio legal con casos prácticos colombianos",
      content: [
        "**1. Introducción a la Inteligencia Artificial en el Contexto Legal**\n\nLa Inteligencia Artificial (IA) representa una transformación paradigmática en el ejercicio del derecho. No es simplemente una herramienta tecnológica, sino un conjunto de tecnologías que pueden automatizar, optimizar y revolucionar la práctica legal tradicional.\n\n**Definición técnica**: La IA es la capacidad de las máquinas para realizar tareas que tradicionalmente requieren inteligencia humana, como el reconocimiento de patrones, la toma de decisiones y el procesamiento de lenguaje natural.\n\n**Relevancia para abogados**: En Colombia, donde el sistema judicial maneja millones de procesos anuales, la IA puede reducir los tiempos de investigación legal en un 70%, automatizar la redacción de documentos rutinarios y mejorar la precisión en el análisis de precedentes jurisprudenciales.",
        
        "**2. Historia y Evolución de la IA en el Sector Legal**\n\n**Décadas de 1980-1990**: Primeros sistemas expertos legales como LEXIS y Westlaw para búsqueda de jurisprudencia.\n\n**Años 2000-2010**: Introducción de análisis predictivos y minería de datos en grandes firmas estadounidenses.\n\n**2010-2020**: Surgimiento de herramientas de revisión de contratos (Kira Systems, eBrevia) y análisis de due diligence.\n\n**2020-presente**: Era de IA generativa con GPT, Claude y herramientas especializadas como Harvey AI, que pueden redactar documentos legales completos.\n\n**En Colombia**: El Consejo Superior de la Judicatura ha implementado sistemas de gestión procesal digital, preparando el terreno para la adopción de IA en el sistema judicial.",
        
        "**3. Tipos de IA y Sus Aplicaciones Legales**\n\n**Machine Learning (Aprendizaje Automático)**:\n- Definición: Algoritmos que mejoran automáticamente a través de la experiencia\n- Aplicación legal: Análisis predictivo de sentencias, clasificación automática de documentos\n- Ejemplo práctico: Un algoritmo que analiza 10,000 sentencias de divorcio para predecir la probabilidad de concesión de custodia\n\n**Deep Learning (Aprendizaje Profundo)**:\n- Definición: Redes neuronales artificiales con múltiples capas\n- Aplicación legal: Reconocimiento de entidades en contratos, análisis de sentimientos en testimonios\n- Ejemplo práctico: Sistema que identifica automáticamente cláusulas abusivas en contratos de adhesión\n\n**Natural Language Processing (NLP)**:\n- Definición: Capacidad de las máquinas para entender y generar lenguaje humano\n- Aplicación legal: Traducción de documentos, resumen automático de expedientes\n- Ejemplo práctico: Herramienta que resume expedientes de 500 páginas en 5 páginas clave",
        
        "**4. IA Tradicional vs IA Generativa: Diferencias Fundamentales**\n\n**IA Tradicional**:\n- Funciona con reglas predefinidas y patrones específicos\n- Analiza y clasifica información existente\n- Ejemplos: Sistemas de búsqueda legal, clasificadores de documentos\n- Ventajas: Precisión en tareas específicas, resultados predecibles\n- Limitaciones: No puede crear contenido nuevo\n\n**IA Generativa**:\n- Crea contenido nuevo basado en patrones aprendidos\n- Puede generar texto, código, imágenes\n- Ejemplos: GPT-4 para redacción de contratos, Claude para análisis jurídico\n- Ventajas: Creatividad, versatilidad, capacidad de adaptación\n- Limitaciones: Posibles 'alucinaciones', necesidad de verificación\n\n**Caso práctico colombiano**: Un bufete en Bogotá usa IA tradicional para clasificar expedientes por área de derecho, e IA generativa para redactar borradores de derechos de petición.",
        
        "**5. Casos de Uso Reales en Firmas Legales Internacionales**\n\n**Baker McKenzie**: Implementó CERN (Contract Expression and Recognition) para análisis de contratos, reduciendo 90% el tiempo de revisión.\n\n**Allen & Overy**: Desarrolló MarginMatrix para análisis de documentos de financiación, procesando 1000+ documentos en minutos.\n\n**Clifford Chance**: Usa IA para due diligence, analizando 100,000 documentos en 24 horas vs. 3 meses manual.\n\n**En Colombia**: Firmas como Brigard Urrutia y Posse Herrera Ruiz han comenzado a implementar herramientas de IA para:\n- Análisis de grandes volúmenes de contratos en fusiones y adquisiciones\n- Monitoreo automatizado de cambios regulatorios\n- Generación de informes de due diligence",
        
        "**6. Beneficios Cuantificables de la IA en Derecho**\n\n**Eficiencia Temporal**:\n- Reducción del 60-80% en tiempo de investigación jurisprudencial\n- Automatización de documentos rutinarios: de 4 horas a 30 minutos\n- Análisis de due diligence: de 3 meses a 1 semana\n\n**Precisión y Calidad**:\n- Reducción del 45% en errores de transcripción\n- Identificación del 95% de cláusulas relevantes vs. 75% manual\n- Consistencia en redacción y formato de documentos\n\n**Beneficios Económicos**:\n- ROI promedio del 300% en el primer año\n- Reducción del 30% en costos operativos\n- Capacidad de manejar 40% más casos con el mismo personal",
        
        "**7. Limitaciones y Desafíos de la IA Legal**\n\n**Limitaciones Técnicas**:\n- 'Alucinaciones': Generación de información incorrecta con apariencia verosímil\n- Sesgo algorítmico: Perpetuación de prejuicios existentes en datos de entrenamiento\n- Opacidad: Dificultad para explicar cómo se llegó a una conclusión\n\n**Limitaciones Legales**:\n- Responsabilidad profesional: El abogado sigue siendo responsable del resultado final\n- Confidencialidad: Riesgo de filtración de información sensible\n- Regulación: Falta de marcos normativos específicos\n\n**Limitaciones Prácticas**:\n- Curva de aprendizaje: Necesidad de capacitación del personal\n- Costos iniciales: Inversión en tecnología y entrenamiento\n- Resistencia al cambio: Cultura conservadora del sector legal\n\n**Marco regulatorio colombiano**: Actualmente no existe regulación específica sobre IA en derecho, pero se aplican principios generales de responsabilidad profesional del Código Disciplinario del Abogado."
      ],
      learningObjectives: [
        "Comprender los conceptos fundamentales de IA y su aplicación específica en el contexto legal colombiano",
        "Diferenciar entre tipos de IA (Machine Learning, Deep Learning, NLP) y sus casos de uso en la práctica legal",
        "Analizar casos reales de implementación de IA en firmas internacionales y su aplicabilidad en Colombia",
        "Evaluar beneficios cuantificables y limitaciones de la IA para tomar decisiones informadas de adopción",
        "Identificar oportunidades específicas de implementación en su área de práctica legal"
      ],
      estimatedTime: "90 minutos",
      difficulty: "Básico",
      validationQuestions: [
        {
          id: "q1",
          question: "¿Cuál es la principal diferencia entre Machine Learning y Deep Learning en aplicaciones legales?",
          type: "multiple_choice",
          options: [
            "No hay diferencias significativas en el contexto legal",
            "Deep Learning usa redes neuronales más complejas y puede analizar patrones más sofisticados en documentos legales",
            "Machine Learning es más reciente y avanzado que Deep Learning",
            "Deep Learning solo se aplica a análisis de imágenes, no a documentos legales"
          ],
          correctAnswer: 1,
          points: 10
        },
        {
          id: "q2",
          question: "Explique tres casos de uso específicos donde la IA puede mejorar la eficiencia en una firma legal colombiana, incluyendo beneficios cuantificables y posibles riesgos éticos de cada implementación.",
          type: "open_ended",
          rubric: "Debe mencionar casos específicos aplicables al contexto colombiano, explicar beneficios cuantificables (porcentajes, tiempos), identificar riesgos éticos concretos y proponer medidas de mitigación",
          points: 25
        },
        {
          id: "q3",
          question: "Analice las limitaciones de la IA generativa en el contexto legal y proponga un protocolo de verificación para documentos generados por IA.",
          type: "practical",
          rubric: "Debe identificar al menos 3 limitaciones específicas, proponer un protocolo estructurado de verificación y considerar aspectos de responsabilidad profesional según el Código Disciplinario del Abogado",
          points: 20
        }
      ],
      practicalExercise: {
        title: "Análisis de Viabilidad de IA en Departamento Legal",
        description: "Evalúe la implementación de IA en un departamento legal específico con análisis detallado",
        prompt: "Usted es consultor en una empresa mediana colombiana con departamento legal de 8 abogados que maneja contratos corporativos, laborales y regulatorios. El departamento procesa 200 contratos/mes y 50 procesos regulatorios/año. Analice: 1) Identifique 3 procesos con mayor potencial de automatización, 2) Realice análisis costo-beneficio detallado, 3) Proponga plan de implementación de 12 meses, 4) Desarrolle protocolo de gestión de riesgos.",
        expectedOutputs: [
          "Matriz de priorización de procesos con criterios cuantitativos",
          "Análisis ROI con proyecciones financieras a 2 años",
          "Plan de implementación por fases con cronograma y recursos",
          "Protocolo de gestión de riesgos y compliance",
          "Estrategia de gestión del cambio para el equipo legal"
        ],
        evaluationCriteria: [
          "Precisión en identificación de oportunidades con criterios objetivos",
          "Solidez del análisis financiero y proyecciones realistas",
          "Viabilidad práctica del plan con consideración de recursos",
          "Completitud del análisis de riesgos y medidas de mitigación",
          "Consideración de aspectos humanos y organizacionales"
        ]
      }
    },
    {
      id: "advanced-ai-applications",
      title: "Aplicaciones Avanzadas de IA en Derecho",
      description: "Exploración de técnicas avanzadas y su impacto en la práctica legal moderna",
      content: [
        "**1. IA y Big Data en el Derecho**\n\nLa integración de IA con Big Data permite analizar grandes volúmenes de información legal para identificar patrones y tendencias que no son evidentes a simple vista.\n\n**2. Automatización de Contratos Inteligentes**\n\nUso de blockchain y IA para crear contratos autoejecutables que garantizan cumplimiento automático de cláusulas.\n\n**3. Análisis Predictivo y Toma de Decisiones**\n\nModelos que predicen resultados judiciales basados en datos históricos y variables contextuales.\n\n**4. Ética y Gobernanza en IA Legal**\n\nConsideraciones sobre transparencia, responsabilidad y equidad en sistemas automatizados."
      ],
      learningObjectives: [
        "Comprender la integración de IA con Big Data en el ámbito legal",
        "Analizar el funcionamiento y beneficios de contratos inteligentes",
        "Evaluar modelos predictivos y su aplicación en la toma de decisiones legales",
        "Reflexionar sobre aspectos éticos y de gobernanza en IA legal"
      ],
      estimatedTime: "120 minutos",
      difficulty: "Avanzado",
      validationQuestions: [
        {
          id: "q1",
          question: "¿Qué ventajas ofrece la combinación de IA y Big Data en el análisis legal?",
          type: "multiple_choice",
          options: [
            "Permite análisis manual más detallado",
            "Facilita la identificación de patrones y tendencias en grandes volúmenes de datos",
            "Reduce la necesidad de abogados en todos los casos",
            "Garantiza resultados judiciales exactos"
          ],
          correctAnswer: 1,
          points: 15
        },
        {
          id: "q2",
          question: "Describa cómo los contratos inteligentes pueden transformar la práctica legal y mencione posibles riesgos asociados.",
          type: "open_ended",
          rubric: "Debe explicar el concepto, beneficios y riesgos técnicos, legales y de seguridad",
          points: 30
        }
      ],
      practicalExercise: {
        title: "Diseño de Contrato Inteligente para una Firma Legal",
        description: "Desarrolle un prototipo de contrato inteligente que automatice cláusulas comunes en contratos laborales",
        prompt: "Imagine que debe diseñar un contrato inteligente para una firma legal que automatice pagos, renovaciones y penalizaciones. Describa las cláusulas automatizadas, tecnologías involucradas y plan de implementación.",
        expectedOutputs: [
          "Especificación de cláusulas automatizadas",
          "Diagrama de flujo del contrato inteligente",
          "Plan de integración tecnológica",
          "Análisis de riesgos y mitigaciones"
        ],
        evaluationCriteria: [
          "Claridad y precisión en la especificación",
          "Viabilidad técnica del diseño",
          "Consideración de aspectos legales y regulatorios",
          "Innovación y aplicabilidad práctica"
        ]
      }
    }
  ];

  useEffect(() => {
    // Load modules and progress from supabase or local data
    async function loadData() {
      setLoading(true);
      try {
        // For demo, we use the certificationModules as modules
        setModules(certificationModules);

        // Initialize progress with first module available, rest locked
        const initialProgress: ModuleProgress[] = certificationModules.map((mod, idx) => ({
          moduleId: mod.id,
          status: idx === 0 ? 'available' as const : 'locked' as const,
          attempts: 0
        }));
        setProgress(initialProgress);
      } catch (error) {
        toast.error("Error cargando datos del sistema de formación.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lawyerId]);

  const calculateProgress = () => {
    const completed = progress.filter(p => p.status === 'completed' || p.status === 'validated').length;
    const total = modules.length;
    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const averageScore = progress
      .filter(p => p.score !== undefined)
      .reduce((acc, p) => acc + (p.score || 0), 0) / Math.max(completed, 1);
    
    return {
      overallProgress,
      completedModules: completed,
      averageScore: Math.round(averageScore || 0),
      totalHours: completed * 1.5 // Estimated hours per module
    };
  };

  const { overallProgress, completedModules, averageScore, totalHours } = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-primary shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Sistema de Certificación en IA Legal
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Programa completo de formación para abogados en inteligencia artificial aplicada al derecho
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">+500 abogados certificados</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Certificación oficial</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Tecnología de vanguardia</span>
              </div>
            </div>
          </div>
          <Button onClick={onBack} variant="outline" size="lg" className="shadow-soft hover:shadow-lg transition-all">
            Volver al Dashboard
          </Button>
        </div>

        {/* Estadísticas de progreso */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Progreso Total</p>
                  <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                </div>
                <div className="p-4 bg-primary/20 rounded-xl shadow-inner">
                  <Target className="w-8 h-8 text-primary" />
                </div>
              </div>
              <Progress value={overallProgress} className="h-2 bg-primary/20" />
              <p className="text-xs text-muted-foreground mt-2">
                {overallProgress < 30 ? "¡Sigue adelante!" : overallProgress < 70 ? "¡Excelente progreso!" : "¡Casi lo logras!"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Módulos Completados</p>
                  <p className="text-3xl font-bold text-green-600">{completedModules}/{modules.length}</p>
                </div>
                <div className="p-4 bg-green-500/20 rounded-xl shadow-inner">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-green-200 dark:bg-green-800 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(completedModules / modules.length) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  {Math.round((completedModules / modules.length) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Puntuación Promedio</p>
                  <p className="text-3xl font-bold text-blue-600">{averageScore}%</p>
                </div>
                <div className="p-4 bg-blue-500/20 rounded-xl shadow-inner">
                  <Award className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-4 h-4 ${averageScore >= star * 20 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {averageScore >= 90 ? "Excelente" : averageScore >= 70 ? "Muy bien" : "En progreso"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Tiempo Invertido</p>
                  <p className="text-3xl font-bold text-purple-600">{totalHours}h</p>
                </div>
                <div className="p-4 bg-purple-500/20 rounded-xl shadow-inner">
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio: {Math.round(totalHours / Math.max(completedModules, 1))}h por módulo
              </p>
              <div className="mt-2 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1">
                <div 
                  className="bg-purple-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalHours / 20) * 100, 100)}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de módulos */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Módulos de Certificación</h2>
            <p className="text-muted-foreground">Completa cada módulo en orden para obtener tu certificación</p>
          </div>
          
          <div className="grid gap-8">
            {modules.map((module, index) => {
              const moduleProgress = progress.find(p => p.moduleId === module.id);
              const isLocked = moduleProgress?.status === 'locked';
              const isCompleted = moduleProgress?.status === 'completed' || moduleProgress?.status === 'validated';
              const isInProgress = moduleProgress?.status === 'in_progress';
              
              return (
                <Card key={module.id} className={`group relative border-0 shadow-elegant hover:shadow-2xl transition-all duration-500 overflow-hidden ${
                  isCompleted ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20' :
                  isInProgress ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20' :
                  isLocked ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20 opacity-60' :
                  'bg-gradient-to-r from-background to-background/50 hover:from-primary/5 hover:to-secondary/5'
                }`}>
                  
                  {/* Número del módulo */}
                  <div className="absolute top-6 left-6 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>
                  
                  {/* Indicador de progreso visual */}
                  <div className={`absolute top-0 left-0 h-2 w-full ${
                    isCompleted ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    isInProgress ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                    'bg-gradient-to-r from-primary/20 to-secondary/20'
                  }`}></div>
                  
                  <CardContent className="p-8 pl-24">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-3 rounded-xl shadow-inner ${
                            isCompleted ? 'bg-green-500/20 text-green-600' : 
                            isLocked ? 'bg-gray-300/20 text-gray-400' : 
                            'bg-primary/20 text-primary'
                          }`}>
                            {isCompleted ? <CheckCircle className="w-8 h-8" /> :
                             isLocked ? <Lock className="w-8 h-8" /> :
                             <BookOpen className="w-8 h-8" />}
                          </div>
                          
                          <div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">{module.title}</h3>
                            <div className="flex items-center gap-3">
                              <Badge variant={
                                module.difficulty === 'Básico' ? 'secondary' :
                                module.difficulty === 'Intermedio' ? 'default' : 'destructive'
                              } className="text-xs px-3 py-1">
                                {module.difficulty}
                              </Badge>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isCompleted ? 'bg-green-500/20 text-green-600' :
                                isInProgress ? 'bg-blue-500/20 text-blue-600' :
                                isLocked ? 'bg-gray-300/20 text-gray-500' :
                                'bg-primary/20 text-primary'
                              }`}>
                                {isCompleted ? 'Completado' :
                                 isInProgress ? 'En progreso' :
                                 isLocked ? 'Bloqueado' : 'Disponible'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground text-lg leading-relaxed mb-6 max-w-4xl">
                          {module.description}
                        </p>
                        
                        <div className="flex items-center gap-8 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-5 h-5 text-primary" />
                            <span className="font-medium">{module.estimatedTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-5 h-5 text-primary" />
                            <span className="font-medium">{module.learningObjectives.length} objetivos</span>
                          </div>
                          {moduleProgress?.score && (
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-yellow-500" />
                              <span className="font-bold text-yellow-600">Puntuación: {moduleProgress.score}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-4 ml-8">
                        {!isLocked && (
                          <Button
                            onClick={() => setShowAIAssistant(true)}
                            variant="outline"
                            size="lg"
                            className="flex items-center gap-3 px-6 py-3 hover:shadow-lg transition-all"
                          >
                            <Bot className="w-5 h-5" />
                            Asistente IA
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => setCurrentModule(module)}
                          disabled={isLocked}
                          size="lg"
                          className={`flex items-center gap-3 px-8 py-3 text-lg font-semibold transition-all ${
                            isCompleted ? 'bg-green-500 hover:bg-green-600' :
                            isInProgress ? 'bg-blue-500 hover:bg-blue-600' :
                            'bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Revisar Módulo
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              {isLocked ? 'Bloqueado' : isInProgress ? 'Continuar' : 'Comenzar'}
                            </>
                          )}
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Module Detail Dialog */}
        {currentModule && (
          <Dialog open={true} onOpenChange={() => setCurrentModule(null)}>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-subtle border-0 shadow-2xl">
              <DialogHeader className="pb-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-foreground">
                        {currentModule.title}
                      </DialogTitle>
                      <DialogDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {currentModule.estimatedTime}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {currentModule.difficulty}
                        </Badge>
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Progreso del módulo</div>
                    <div className="text-lg font-bold text-primary">0%</div>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="content" className="flex-1 h-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 rounded-lg">
                  <TabsTrigger value="content" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    📚 Contenido
                  </TabsTrigger>
                  <TabsTrigger value="objectives" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    🎯 Objetivos
                  </TabsTrigger>
                  <TabsTrigger value="assistant" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    🤖 Asistente IA
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="mt-6 h-[65vh]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-8">
                      {currentModule.content.map((section, index) => (
                        <Card key={index} className="border-l-4 border-l-primary/50 shadow-soft hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-8">
                            <div className="prose prose-lg max-w-none">
                              <div 
                                className="whitespace-pre-wrap leading-relaxed text-foreground/90"
                                style={{
                                  fontFamily: 'Inter, system-ui, sans-serif',
                                  lineHeight: '1.7'
                                }}
                              >
                                {section.split('\n').map((paragraph, pIndex) => {
                                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                    return (
                                      <h3 key={pIndex} className="text-xl font-bold text-primary mt-6 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-6 bg-gradient-primary rounded-full"></div>
                                        {paragraph.replace(/\*\*/g, '')}
                                      </h3>
                                    );
                                  }
                                  if (paragraph.trim().startsWith('-')) {
                                    return (
                                      <div key={pIndex} className="flex items-start gap-3 my-2">
                                        <div className="w-2 h-2 bg-primary/60 rounded-full mt-3 flex-shrink-0"></div>
                                        <span className="text-foreground/80">{paragraph.substring(1).trim()}</span>
                                      </div>
                                    );
                                  }
                                  if (paragraph.trim().startsWith('```')) {
                                    return (
                                      <div key={pIndex} className="bg-muted/50 border border-border/50 rounded-lg p-4 my-4 font-mono text-sm">
                                        <code className="text-foreground/90">{paragraph.replace(/```/g, '')}</code>
                                      </div>
                                    );
                                  }
                                  if (paragraph.trim()) {
                                    return (
                                      <p key={pIndex} className="text-foreground/80 mb-4 leading-relaxed">
                                        {paragraph}
                                      </p>
                                    );
                                  }
                                  return <br key={pIndex} />;
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="objectives" className="mt-6 h-[65vh]">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-8">
                      <Card className="border-0 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-soft">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Target className="w-5 h-5 text-primary" />
                            </div>
                            Objetivos de Aprendizaje
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            {currentModule.learningObjectives.map((objective, index) => (
                              <div key={index} className="flex items-start gap-4 p-4 bg-background/50 rounded-lg border border-border/30 hover:border-primary/30 transition-colors">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full flex-shrink-0 mt-1">
                                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                                </div>
                                <span className="text-foreground/80 leading-relaxed">{objective}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-0 bg-gradient-to-br from-secondary/5 to-accent/5 shadow-soft">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 rounded-lg bg-secondary/10">
                              <Lightbulb className="w-5 h-5 text-secondary" />
                            </div>
                            Ejercicio Práctico
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <h4 className="text-lg font-semibold text-primary mb-2">
                              {currentModule.practicalExercise.title}
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                              {currentModule.practicalExercise.description}
                            </p>
                          </div>
                          
                          <div className="p-6 bg-background/50 rounded-lg border border-border/30">
                            <h5 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Enunciado del Ejercicio:
                            </h5>
                            <p className="leading-relaxed text-foreground/80">
                              {currentModule.practicalExercise.prompt}
                            </p>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Resultados Esperados:
                              </h5>
                              <ul className="space-y-2">
                                {currentModule.practicalExercise.expectedOutputs.map((output, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 bg-green-500/60 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-foreground/70">{output}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500" />
                                Criterios de Evaluación:
                              </h5>
                              <ul className="space-y-2">
                                {currentModule.practicalExercise.evaluationCriteria.map((criteria, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 bg-yellow-500/60 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-foreground/70">{criteria}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Assistant tab content */}
                <TabsContent value="assistant" className="mt-6 h-[65vh] flex flex-col">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {chatMessages.length === 0 && (
                        <p className="text-muted-foreground text-center mt-10">Inicia una conversación con el asistente IA para resolver dudas.</p>
                      )}
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs p-3 rounded-lg shadow ${msg.type === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                            {msg.content}
                            <div className="text-xs text-muted-foreground mt-1 text-right">{msg.timestamp.toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!currentMessage.trim()) return;
                      const userMsg: ChatMessage = {
                        id: Date.now().toString(),
                        type: 'user',
                        content: currentMessage.trim(),
                        timestamp: new Date()
                      };
                      setChatMessages((prev) => [...prev, userMsg]);
                      setCurrentMessage('');
                      setIsAIResponding(true);

                      // Simulate AI response (replace with real API call)
                      setTimeout(() => {
                        const aiMsg: ChatMessage = {
                          id: (Date.now() + 1).toString(),
                          type: 'assistant',
                          content: "Esta es una respuesta simulada del asistente IA basada en tu consulta.",
                          timestamp: new Date()
                        };
                        setChatMessages((prev) => [...prev, aiMsg]);
                        setIsAIResponding(false);
                      }, 1500);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Escribe tu pregunta..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      disabled={isAIResponding}
                    />
                    <Button type="submit" disabled={isAIResponding || !currentMessage.trim()}>
                      <Send className="w-5 h-5" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}

        {/* Additional dialogs like validation, practical exercise submission, etc. could be here */}
      </div>
    </div>
  );
}
