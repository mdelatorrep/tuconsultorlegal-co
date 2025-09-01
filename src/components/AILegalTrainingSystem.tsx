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

  // Definición de módulos de certificación con contenido profundo
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
    // Agregar más módulos con contenido expandido...
    {
      id: "prompt-engineering-legal",
      title: "Ingeniería de Prompts para Abogados",
      description: "Técnicas avanzadas para crear instrucciones efectivas de IA en contextos legales",
      content: [
        "**1. Anatomía de un Prompt Legal Efectivo**\n\nUn prompt legal efectivo debe contener elementos específicos que garanticen resultados precisos y útiles:\n\n**Estructura fundamental**:\n- **Contexto de rol**: Definir claramente el rol de la IA ('Eres un abogado especialista en derecho comercial colombiano')\n- **Contexto situacional**: Describir el escenario específico\n- **Tarea específica**: Instrucción clara y precisa de lo que se requiere\n- **Formato de salida**: Especificar cómo debe presentarse el resultado\n- **Restricciones**: Límites y consideraciones especiales\n\n**Ejemplo de prompt bien estructurado**:\n```\nRol: Eres un abogado especialista en derecho laboral colombiano con 15 años de experiencia.\n\nContexto: Una empresa de tecnología en Bogotá necesita actualizar sus contratos de trabajo para incluir modalidades de teletrabajo según la Ley 2088 de 2021.\n\nTarea: Redacta una cláusula específica sobre teletrabajo que incluya:\n- Modalidades permitidas (autónomo, suplementario)\n- Obligaciones del empleador\n- Derechos del trabajador\n- Medidas de desconexión digital\n\nFormato: Cláusula contractual numerada con subcláusulas\n\nRestricciones: Debe cumplir con la legislación colombiana vigente y ser aplicable para empresas de tecnología\n```",
        
        "**2. Técnicas Avanzadas de Prompt Engineering**\n\n**Chain of Thought (Cadena de Pensamiento)**:\nTécnica que instruye a la IA a mostrar su razonamiento paso a paso.\n\n*Ejemplo práctico*:\n```\n'Analiza este contrato de arrendamiento paso a paso:\n1. Identifica las partes involucradas\n2. Revisa las cláusulas de duración y renovación\n3. Evalúa las condiciones de terminación\n4. Analiza las obligaciones de cada parte\n5. Identifica posibles cláusulas abusivas\n6. Propón mejoras específicas'\n```\n\n**Few-Shot Learning (Aprendizaje con Pocos Ejemplos)**:\nProporcionar ejemplos específicos para que la IA entienda el patrón deseado.\n\n*Ejemplo con contratos*:\n```\n'Genera cláusulas de confidencialidad siguiendo estos ejemplos:\n\nEjemplo 1: Para consultoría tecnológica:\n\"El CONSULTOR se obliga a mantener...\"\n\nEjemplo 2: Para fusión empresarial:\n\"Las partes acuerdan que toda información...\"\n\nAhora genera una cláusula similar para un contrato de distribución comercial.'\n```\n\n**Role Playing avanzado**:\nAsignar roles específicos y contextuales a la IA.\n\n*Ejemplo*:\n```\n'Actúa como un magistrado de la Corte Constitucional colombiana revisando una tutela sobre derecho a la educación. Analiza:\n- Procedencia de la acción\n- Derechos fundamentales involucrados\n- Precedentes constitucionales aplicables\n- Decisión motivada'\n```",
        
        "**3. Manejo de Contexto y Variables en Documentos Legales**\n\n**Variables dinámicas**: Elementos que cambian según el caso específico.\n\n**Sistema de variables estructurado**:\n```\n{{TIPO_CONTRATO}} - Naturaleza del acuerdo\n{{PARTES_CONTRACTUALES}} - Identificación completa\n{{LEGISLACION_APLICABLE}} - Marco normativo específico\n{{JURISDICCION}} - Competencia territorial\n{{VALOR_CONTRACTUAL}} - Cuantía y forma de pago\n{{VIGENCIA}} - Duración y renovación\n{{CAUSALES_TERMINACION}} - Condiciones de finalización\n```\n\n**Contexto jurisprudencial**:\n```\n'Considera estos precedentes del Consejo de Estado:\nSentencia 12345 de 2023: Sobre contratos de obra pública\nSentencia 67890 de 2022: Sobre responsabilidad estatal\n\nBasa tu análisis en estos precedentes para evaluar el siguiente caso...'\n```\n\n**Contexto regulatorio dinámico**:\n```\n'Teniendo en cuenta las siguientes normas vigentes:\n- Ley 2088 de 2021 (Teletrabajo)\n- Decreto 1072 de 2015 (Trabajo)\n- Circular 021 de 2020 del Mintrabajo\n\nAnaliza la legalidad de esta política de trabajo remoto...'\n```",
        
        "**4. Optimización de Resultados Mediante Iteración**\n\n**Metodología de refinamiento iterativo**:\n\n**Iteración 1 - Prompt básico**:\n```\n'Redacta un contrato de compraventa de vehículo'\n```\n*Resultado*: Contrato genérico, poco específico\n\n**Iteración 2 - Contexto específico**:\n```\n'Redacta un contrato de compraventa de vehículo usado en Colombia, incluyendo garantías legales y responsabilidades del vendedor según el Código de Comercio'\n```\n*Resultado*: Mejor especificidad legal\n\n**Iteración 3 - Detalles técnicos**:\n```\n'Redacta un contrato de compraventa de vehículo usado en Colombia para un automóvil particular (no comercial), incluyendo:\n- Cláusulas de garantía según Art. 932 del Código de Comercio\n- Responsabilidad por vicios ocultos\n- Transferencia de seguros\n- Procedimiento de traspaso en tránsito\n- Cláusula de saneamiento por evicción'\n```\n*Resultado*: Contrato específico y completo\n\n**Técnicas de refinamiento**:\n- **Feedback específico**: 'Mejora la cláusula de garantía incluyendo plazos específicos'\n- **Expansión selectiva**: 'Desarrolla más la sección de obligaciones del comprador'\n- **Corrección dirigida**: 'Ajusta la terminología para cumplir con la Ley 1480 de 2011'",
        
        "**5. Prompts Especializados por Tipo de Documento**\n\n**Para Contratos Comerciales**:\n```\nRol: Abogado especialista en derecho comercial colombiano\nContexto: Empresa exportadora necesita contrato con distribuidor internacional\nEstructura requerida:\n1. Identificación de partes con domicilios\n2. Objeto del contrato y productos específicos\n3. Territorio de distribución exclusiva/no exclusiva\n4. Obligaciones de cada parte\n5. Condiciones comerciales (precios, pagos, garantías)\n6. Duración y renovación\n7. Causales de terminación\n8. Solución de controversias (arbitraje/jurisdicción)\n9. Ley aplicable y jurisdicción\n10. Cláusulas especiales (fuerza mayor, hardship)\n\nConsideraciones: Incluir protección cambiaria, repatriación de divisas (DECEX), y compliance con regulación antilavado\n```\n\n**Para Demandas Ejecutivas**:\n```\nRol: Abogado litigante especializado en cobro ejecutivo\nContexto: Cobro de pagaré vencido y no pagado\nEstructura de demanda:\n1. Encabezado con identificación del juzgado competente\n2. Identificación de partes (demandante/deudor y codeudores)\n3. Fundamentos de hecho cronológicamente ordenados\n4. Fundamentos de derecho con citas normativas precisas\n5. Pretensiones específicas y cuantificadas\n6. Anexos (título ejecutivo, cuenta de cobro)\n\nConsideraciones: Verificar prescripción (3 años), competencia territorial, capacidad procesal\n```\n\n**Para Derechos de Petición**:\n```\nRol: Abogado constitucionalista experto en derecho administrativo\nContexto: Ciudadano requiere información de entidad pública\nEstructura:\n1. Identificación del peticionario\n2. Identificación de la entidad\n3. Fundamento constitucional (Art. 23 CN)\n4. Solicitud específica y clara\n5. Fundamentos normativos\n6. Solicitud de respuesta en término legal (15 días)\n\nConsideraciones: Ley 1755 de 2015, excepciones de reserva, habeas data si aplica\n```"
      ],
      learningObjectives: [
        "Dominar la estructura y componentes de prompts legales efectivos",
        "Aplicar técnicas avanzadas de prompt engineering en contextos jurídicos específicos",
        "Desarrollar metodologías de optimización iterativa para mejores resultados",
        "Crear bibliotecas especializadas de prompts por área de práctica legal",
        "Implementar sistemas de variables dinámicas para automatización de documentos"
      ],
      estimatedTime: "120 minutos",
      difficulty: "Intermedio",
      prerequisites: ["foundations-ai-law"],
      validationQuestions: [
        {
          id: "q3",
          question: "Redacte un prompt optimizado para generar un contrato de arrendamiento comercial que incluya variables específicas y consideraciones legales colombianas.",
          type: "practical",
          rubric: "Debe incluir estructura de rol clara, contexto específico colombiano, variables claramente definidas, referencias al marco legal aplicable (Código de Comercio, Ley de Arrendamientos), y formato de salida estructurado",
          points: 30
        },
        {
          id: "q4",
          question: "¿Qué es la técnica 'Few-Shot Learning' y cuándo es más efectiva en contextos legales colombianos?",
          type: "multiple_choice",
          options: [
            "Proporcionar pocos ejemplos específicos para que la IA aprenda el patrón deseado, efectiva para documentos con formato estándar",
            "Hacer muchas preguntas seguidas para obtener mejor información legal",
            "Usar prompts muy cortos para ahorrar tokens y reducir costos",
            "Combinar múltiples modelos de IA simultáneamente para mejor precisión"
          ],
          correctAnswer: 0,
          points: 15
        },
        {
          id: "q5",
          question: "Desarrolle un sistema de variables dinámicas para automatizar contratos laborales en Colombia, considerando las reformas recientes.",
          type: "open_ended",
          rubric: "Debe incluir variables específicas del derecho laboral colombiano, considerar Ley 2088 de 2021, modalidades de contratación, y sistema de validación de variables",
          points: 25
        }
      ],
      practicalExercise: {
        title: "Biblioteca Especializada de Prompts Legales",
        description: "Desarrolle una colección completa de prompts optimizados para diferentes documentos legales colombianos",
        prompt: "Cree una biblioteca de prompts especializados para un bufete que maneja derecho corporativo, laboral y civil. Desarrolle 8 prompts optimizados para: 1) Contrato de sociedad SAS, 2) Contrato laboral indefinido, 3) Demanda de responsabilidad civil contractual, 4) Análisis de due diligence, 5) Carta de cobranza pre-jurídica, 6) Derecho de petición administrativo, 7) Tutela por protección de datos, 8) Contrato de prestación de servicios profesionales. Cada prompt debe incluir estructura completa, variables dinámicas, marco legal específico y ejemplos de uso.",
        expectedOutputs: [
          "8 prompts completamente estructurados con metodología clara",
          "Sistema de variables dinámicas con validaciones",
          "Referencias específicas al marco legal colombiano vigente",
          "Ejemplos prácticos de aplicación para cada prompt",
          "Metodología de optimización y mejora continua",
          "Protocolo de verificación y control de calidad"
        ],
        evaluationCriteria: [
          "Especificidad técnica y claridad de instrucciones en cada prompt",
          "Uso apropiado de variables dinámicas y contexto legal colombiano",
          "Aplicabilidad práctica inmediata en ejercicio profesional real",
          "Consideración exhaustiva del marco legal y jurisprudencial relevante",
          "Innovación en técnicas de prompt engineering aplicadas al derecho",
          "Completitud del sistema de control de calidad propuesto"
        ]
      }
    }
    // Continuar con los otros módulos...
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
      content: `¡Hola! Soy tu **Asistente Especializado en IA Legal** para el módulo "${module.title}". 

🎯 **Mi función es guiarte y evaluarte durante todo el proceso de aprendizaje.**

**¿Cómo funciona el sistema de evaluación?**
• Te acompañaré mientras estudias el contenido
• Responderé todas tus consultas y dudas
• Al final, realizaré un **examen interactivo** para validar tu comprensión
• Solo yo puedo marcar el módulo como completado una vez que demuestres dominio del tema
• Si no apruebas, te ayudaré a reforzar los conceptos que necesites

**Estoy aquí para:**
• Explicarte conceptos complejos con ejemplos prácticos
• Resolver dudas específicas sobre el contenido
• Proporcionarte casos de uso del contexto legal colombiano
• Prepararte para la evaluación final
• Reforzar áreas donde necesites más práctica

**¿Estás listo para comenzar? Puedes:**
1. Preguntarme sobre cualquier concepto del módulo
2. Solicitar ejemplos prácticos específicos
3. Pedirme que te guíe paso a paso por el contenido
4. Cuando te sientas preparado, solicitar la **evaluación final**

¿Cómo te gustaría empezar tu aprendizaje?`,
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
          chatHistory: chatMessages,
          moduleProgress: getModuleProgress(currentModule.id)
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

      // Si el asistente aprobó el módulo, actualizar el estado
      if (response.data?.moduleCompleted) {
        updateModuleStatus(currentModule.id, 'validated');
        toast.success(`¡Felicitaciones! Has completado exitosamente el módulo "${currentModule.title}"`);
        
        // Desbloquear siguiente módulo
        const currentIndex = modules.findIndex(m => m.id === currentModule.id);
        if (currentIndex < modules.length - 1) {
          const nextModuleId = modules[currentIndex + 1].id;
          updateModuleStatus(nextModuleId, 'available');
        }
        
        checkCertificationCompletion();
      }
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
                 </div>
                 <div className="flex gap-2">
                   <Button 
                     onClick={() => {
                       setCurrentModule(currentModule);
                       initializeAIAssistant(currentModule);
                     }}
                     variant="secondary"
                     className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                   >
                     <Bot className="w-4 h-4 mr-2" />
                     Consultar Asistente IA
                   </Button>
                   <div className="text-sm text-muted-foreground flex items-center">
                     <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                       ⚠️ Solo el Asistente IA puede completar módulos
                     </span>
                   </div>
                 </div>
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