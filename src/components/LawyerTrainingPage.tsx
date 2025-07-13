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
            "La Inteligencia Artificial (IA) es la capacidad de las máquinas para simular procesos de inteligencia humana, incluyendo aprendizaje, razonamiento y autocorrección mediante algoritmos y modelos matemáticos complejos.",
            "En el contexto legal, la IA puede procesar grandes volúmenes de información jurídica, identificar patrones en jurisprudencia, analizar contratos, y asistir en la redacción automatizada de documentos legales.",
            "**Historia de la IA:** Desde los años 1950 con Alan Turing hasta los modelos actuales como GPT-4, Claude y Gemini.",
            "**Machine Learning vs Deep Learning:** El ML identifica patrones en datos, mientras que el DL usa redes neuronales profundas para procesamiento más sofisticado.",
            "**Recursos recomendados:**",
            "• OpenAI Learn: https://learn.openai.com/",
            "• Google AI Education: https://ai.google/education/",
            "• Anthropic Claude Documentation: https://docs.anthropic.com/"
          ]
        },
        {
          title: "Tipos de IA Relevantes para Abogados",
          content: [
            "**1. IA Generativa (Generative AI):**",
            "• Crea contenido nuevo como textos legales, contratos y análisis jurídicos",
            "• Ejemplos: GPT-4, Claude 3.5, Gemini Pro",
            "• Uso legal: Redacción de demandas, contratos, alegatos",
            "",
            "**2. Procesamiento de Lenguaje Natural (NLP):**",
            "• Comprende, interpreta y genera texto en lenguaje humano",
            "• Capacidades: análisis semántico, extracción de entidades, sentimientos",
            "• Ejemplo práctico: Análisis automático de términos contractuales",
            "",
            "**3. Modelos de Lenguaje Grande (LLM):**",
            "• GPT-4 (OpenAI): Excelente para redacción y razonamiento complejo",
            "• Claude 3.5 Sonnet (Anthropic): Superior en análisis de documentos largos",
            "• Gemini Pro (Google): Integración con herramientas de Google Workspace",
            "",
            "**4. IA de Análisis Documental:**",
            "• Extrae información clave de contratos y documentos legales",
            "• Identifica cláusulas problemáticas o faltantes",
            "• Compara versiones de documentos automáticamente",
            "",
            "**Comparación de modelos principales:**",
            "• **GPT-4:** Mejor para creatividad y redacción compleja",
            "• **Claude 3.5:** Superior en análisis crítico y documentos extensos",
            "• **Gemini Pro:** Mejor integración con ecosistema Google",
            "",
            "**Recursos para profundizar:**",
            "• OpenAI Model Documentation: https://platform.openai.com/docs/models",
            "• Anthropic Model Card: https://www.anthropic.com/claude",
            "• Google AI Model Garden: https://cloud.google.com/model-garden"
          ]
        },
        {
          title: "Aplicaciones Específicas en el Derecho",
          content: [
            "**📝 Redacción de Documentos Legales:**",
            "• **Contratos:** Compraventa, arrendamiento, laborales, de confidencialidad",
            "• **Demandas:** Civil, laboral, comercial, administrativa",
            "• **Escritos procesales:** Contestaciones, alegatos, recursos",
            "• **Ejemplo concreto:** Generar contrato de arrendamiento con variables específicas en 3 minutos vs 2 horas manualmente",
            "",
            "**🔍 Investigación Jurídica Automatizada:**",
            "• Búsqueda inteligente en bases jurisprudenciales",
            "• Análisis comparativo de precedentes relevantes",
            "• Identificación de tendencias en decisiones judiciales",
            "• **Herramientas recomendadas:** vLex AI, Westlaw Edge, Lexis+ AI",
            "",
            "**📋 Revisión y Análisis de Contratos:**",
            "• Identificación automática de cláusulas de riesgo",
            "• Verificación de cumplimiento normativo",
            "• Comparación entre versiones de contratos",
            "• **Caso de uso:** Revisar 50 contratos de proveedores en 1 hora vs 1 semana",
            "",
            "**⚡ Automatización de Procesos Administrativos:**",
            "• Generación automática de formularios DIAN, Cámara de Comercio",
            "• Creación de cartas de cobranza personalizadas",
            "• Sistematización de respuestas a derechos de petición",
            "",
            "**📊 Análisis Predictivo Legal:**",
            "• Probabilidad de éxito en litigios basada en datos históricos",
            "• Análisis de riesgos contractuales",
            "• Predicción de tiempos procesales",
            "",
            "**Ejemplos prácticos específicos:**",
            "• **Firma mediana:** Reduce tiempo de redacción contractual en 70%",
            "• **Departamento legal corporativo:** Procesa due diligence en 80% menos tiempo",
            "• **Abogado independiente:** Aumenta capacidad de atención de clientes en 300%"
          ]
        },
        {
          title: "Herramientas de IA para Abogados",
          content: [
            "**🏢 Plataformas Empresariales:**",
            "• **Microsoft Copilot for Law:** Integración con Office 365, análisis de documentos",
            "• **Thomson Reuters CoCounsel:** Especializado en investigación legal y redacción",
            "• **LexisNexis+ AI:** Búsqueda jurisprudencial inteligente",
            "",
            "**🤖 Modelos de IA Accesibles:**",
            "• **ChatGPT Plus (OpenAI):** $20/mes, excelente para redacción general",
            "• **Claude Pro (Anthropic):** $20/mes, superior para análisis de documentos largos",
            "• **Gemini Advanced (Google):** $20/mes, integración con Google Workspace",
            "",
            "**⚖️ Herramientas Especializadas en Derecho:**",
            "• **Harvey AI:** Específicamente entrenado para tareas legales",
            "• **Casetext CoCounsel:** Investigación jurídica automatizada",
            "• **ContractPodAi:** Gestión y análisis de contratos",
            "",
            "**🔧 APIs y Integraciones:**",
            "• **OpenAI API:** Para desarrollo de soluciones personalizadas",
            "• **Anthropic API:** Claude para análisis documental profundo",
            "• **Google Vertex AI:** Para empresas que prefieren Google Cloud",
            "",
            "**💡 Herramientas de Productividad:**",
            "• **Notion AI:** Para gestión de conocimiento legal",
            "• **Grammarly Business:** Corrección y estilo en documentos legales",
            "• **Otter.ai:** Transcripción automática de audiencias y reuniones",
            "",
            "**Recursos de formación oficial:**",
            "• OpenAI for Business: https://openai.com/business",
            "• Anthropic for Work: https://www.anthropic.com/claude-for-work",
            "• Google Cloud AI: https://cloud.google.com/ai"
          ]
        },
        {
          title: "Consideraciones Éticas y Legales",
          content: [
            "**⚖️ Responsabilidad Profesional:**",
            "• El abogado mantiene responsabilidad total sobre el trabajo final",
            "• Deber de revisión y validación de todo contenido generado por IA",
            "• Obligación de competencia tecnológica según códigos deontológicos modernos",
            "• **Marco normativo:** Código Disciplinario del Abogado (Ley 1123 de 2007)",
            "",
            "**🔒 Confidencialidad y Secreto Profesional:**",
            "• NUNCA incluir información sensible o confidencial en prompts públicos",
            "• Usar versiones empresariales con garantías de privacidad",
            "• Implementar protocolos de anonimización de datos",
            "• **Buenas prácticas:** Usar [CLIENTE_X] en lugar de nombres reales",
            "",
            "**📋 Precisión y Calidad:**",
            "• La IA es una herramienta de apoyo, no reemplazo del criterio legal",
            "• Verificar siempre referencias normativas y jurisprudenciales",
            "• Contrastar resultados con fuentes oficiales",
            "• **Ejemplo:** Validar fechas de vigencia de normas citadas",
            "",
            "**🌐 Transparencia con Clientes:**",
            "• Informar sobre el uso de IA en la prestación del servicio",
            "• Explicar cómo la IA mejora la eficiencia sin comprometer la calidad",
            "• Mantener la tarifa justa considerando la optimización de tiempos",
            "",
            "**⚡ Limitaciones Conocidas:**",
            "• **Alucinaciones:** La IA puede generar información falsa que parece verdadera",
            "• **Fecha de corte:** Los modelos tienen límites temporales de conocimiento",
            "• **Sesgo:** Pueden perpetuar sesgos presentes en datos de entrenamiento",
            "• **Ejemplo específico:** GPT-4 tiene corte de conocimiento en abril 2024",
            "",
            "**📚 Recursos éticos oficiales:**",
            "• ABA Model Rules on AI: https://www.americanbar.org/groups/professional_responsibility/",
            "• IEEE Standards for AI Ethics: https://standards.ieee.org/",
            "• European AI Act Guidelines: https://digital-strategy.ec.europa.eu/"
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
            "El prompt engineering es el arte y ciencia de diseñar instrucciones efectivas para que la IA genere resultados precisos, consistentes y útiles en el contexto legal.",
            "Un buen prompt debe ser claro, específico, contextual y estructurado para obtener la respuesta deseada, especialmente importante en derecho donde la precisión es crítica.",
            "**Historia y evolución:** Desde comandos simples hasta técnicas avanzadas como chain-of-thought y few-shot learning.",
            "**Diferencia con programación tradicional:** Los prompts son instrucciones en lenguaje natural que requieren comprensión semántica.",
            "",
            "**Recursos de aprendizaje:**",
            "• OpenAI Prompt Engineering Guide: https://platform.openai.com/docs/guides/prompt-engineering",
            "• Anthropic Claude Prompt Guide: https://docs.anthropic.com/claude/docs/prompt-engineering",
            "• Google Bard Prompting Best Practices: https://ai.google.dev/docs/prompt_best_practices"
          ]
        },
        {
          title: "Anatomía de un Prompt Legal Efectivo",
          content: [
            "**1. CONTEXTO (Setting the Stage):**",
            "• Rol profesional: 'Actúa como un abogado especialista en derecho civil colombiano'",
            "• Jurisdicción: 'Según la legislación colombiana vigente'",
            "• Audiencia objetivo: 'Para personas naturales/empresas'",
            "",
            "**2. TAREA (The Task):**",
            "• Acción específica: 'Redacta', 'Analiza', 'Revisa', 'Compara'",
            "• Tipo de documento: 'contrato de arrendamiento', 'demanda ejecutiva'",
            "• Propósito: 'para proteger los derechos del arrendador'",
            "",
            "**3. FORMATO (Output Structure):**",
            "• Estructura deseada: 'Incluye encabezado, considerandos, cláusulas numeradas'",
            "• Longitud aproximada: 'Entre 2-4 páginas'",
            "• Variables a usar: '[NOMBRE_ARRENDADOR], [DIRECCION_INMUEBLE]'",
            "",
            "**4. RESTRICCIONES (Constraints):**",
            "• Marco legal: 'Conforme a la Ley 820 de 2003'",
            "• Limitaciones: 'No incluir cláusulas abusivas'",
            "• Consideraciones especiales: 'Aplicable para Bogotá D.C.'",
            "",
            "**5. EJEMPLOS (Few-shot Learning):**",
            "• Proporcionar ejemplos de alta calidad cuando sea útil",
            "• Mostrar el estilo y estructura deseada",
            "• Ejemplar: 'Similar al siguiente formato: [ejemplo]'",
            "",
            "**Ejemplo completo de prompt estructurado:**",
            "'Actúa como un abogado especialista en derecho civil colombiano. Redacta un contrato de arrendamiento de vivienda urbana que cumpla con la Ley 820 de 2003 y el Código Civil. El contrato debe incluir: encabezado con identificación de partes, considerandos legales, cláusulas numeradas sobre obligaciones y derechos, y firmas. Usa las variables [NOMBRE_ARRENDADOR], [CEDULA_ARRENDADOR], [NOMBRE_ARRENDATARIO], [DIRECCION_INMUEBLE], [CANON_MENSUAL], [DURACION_MESES]. Asegúrate de incluir cláusulas sobre incrementos anuales según IPC y causales de terminación.'"
          ]
        },
        {
          title: "Técnicas Avanzadas de Prompting",
          content: [
            "**🎯 Chain of Thought (Cadena de Pensamiento):**",
            "• Solicita que la IA muestre su razonamiento paso a paso",
            "• Ejemplo: 'Explica tu razonamiento legal antes de redactar'",
            "• Útil para análisis complejos y verificación de lógica jurídica",
            "• Mejora significativamente la calidad en documentos complejos",
            "",
            "**🔄 Iterative Prompting (Prompting Iterativo):**",
            "• Refina resultados mediante múltiples interacciones",
            "• Primera iteración: Estructura general",
            "• Segunda iteración: Detalles específicos",
            "• Tercera iteración: Refinamiento y correcciones",
            "",
            "**📝 Few-Shot Learning:**",
            "• Proporciona 2-3 ejemplos de alta calidad",
            "• Formato: 'Ejemplo 1: [input] → [output deseado]'",
            "• Especialmente efectivo para formatos específicos",
            "• Ejemplo: Mostrar estructura de cláusulas contractuales",
            "",
            "**🧠 Role Prompting (Prompting de Rol):**",
            "• Define un rol específico y detallado",
            "• 'Actúa como un abogado senior con 15 años de experiencia en derecho comercial'",
            "• Incluye contexto de experiencia y especialización",
            "• Mejora la coherencia y nivel del contenido generado",
            "",
            "**⚡ Zero-Shot vs One-Shot vs Few-Shot:**",
            "• **Zero-shot:** Sin ejemplos, solo instrucciones",
            "• **One-shot:** Un ejemplo de referencia",
            "• **Few-shot:** Múltiples ejemplos para patrones complejos",
            "",
            "**🔧 Template Prompting:**",
            "• Crea plantillas reutilizables para casos similares",
            "• Variables intercambiables: [TIPO_CONTRATO], [NORMATIVA_APLICABLE]",
            "• Ejemplo de template para contratos:",
            "'Redacta un [TIPO_CONTRATO] entre [PARTE_1] y [PARTE_2], conforme a [NORMATIVA], incluyendo [CLAUSULAS_ESPECIFICAS]'",
            "",
            "**Recursos para técnicas avanzadas:**",
            "• Stanford CS224N NLP Course: https://web.stanford.edu/class/cs224n/",
            "• MIT Prompt Engineering: https://web.mit.edu/",
            "• Papers with Code Prompting: https://paperswithcode.com/task/prompt-engineering"
          ]
        },
        {
          title: "Patrones de Prompts para Documentos Legales",
          content: [
            "**📋 PATRÓN 1: Contratos Comerciales**",
            "• Estructura: 'Redacta un [TIPO_CONTRATO] entre [PARTE_A] y [PARTE_B]'",
            "• Variables comunes: [OBJETO_CONTRATO], [VALOR], [PLAZO], [GARANTIAS]",
            "• Marco legal: 'Conforme al Código de Comercio y [NORMA_ESPECIFICA]'",
            "• Ejemplo específico: Contratos de suministro, distribución, franquicia",
            "",
            "**📋 PATRÓN 2: Documentos Procesales**",
            "• Estructura: 'Elabora una [TIPO_DEMANDA] contra [DEMANDADO] por [CAUSA]'",
            "• Elementos: Hechos, pretensiones, fundamentos de derecho",
            "• Variables: [CUANTIA], [JURISDICCION], [PRUEBAS]",
            "• Marco procesal: CPC, CPL, CPACA según corresponda",
            "",
            "**📋 PATRÓN 3: Documentos Societarios**",
            "• Estructura: 'Redacta [DOCUMENTO_SOCIETARIO] para [TIPO_SOCIEDAD]'",
            "• Variables: [OBJETO_SOCIAL], [CAPITAL], [REPRESENTANTE_LEGAL]",
            "• Normativa: Código de Comercio, Ley 222/95, Decreto 1074/15",
            "• Ejemplos: Estatutos, actas, reformas societarias",
            "",
            "**📋 PATRÓN 4: Documentos Laborales**",
            "• Estructura: 'Elabora [DOCUMENTO_LABORAL] para [TIPO_VINCULACION]'",
            "• Variables: [CARGO], [SALARIO], [JORNADA], [BENEFICIOS]",
            "• Marco legal: CST, Ley 789/02, Ley 1429/10",
            "• Tipos: Contratos, reglamentos, liquidaciones",
            "",
            "**⚖️ PATRÓN 5: Análisis Jurídico**",
            "• Estructura: 'Analiza la viabilidad jurídica de [SITUACION] considerando [FACTORES]'",
            "• Metodología: Hechos → Normas → Análisis → Conclusión",
            "• Variables: [PRECEDENTES], [RIESGOS], [RECOMENDACIONES]",
            "• Resultado: Concepto fundamentado con alternativas",
            "",
            "**🔍 PATRÓN 6: Due Diligence**",
            "• Estructura: 'Revisa [TIPO_DOCUMENTO] identificando [ASPECTOS_CRITICOS]'",
            "• Variables: [RIESGOS_LEGALES], [INCONSISTENCIAS], [RECOMENDACIONES]",
            "• Enfoque: Cumplimiento normativo y riesgos comerciales",
            "• Output: Matriz de riesgos con recomendaciones específicas",
            "",
            "**Ejemplo práctico - Contrato de Trabajo:**",
            "'Actúa como abogado laboralista. Redacta un contrato de trabajo a término indefinido para el cargo de [CARGO] en [EMPRESA], ubicada en [CIUDAD]. Salario: [SALARIO_BASICO] más [AUXILIO_TRANSPORTE]. Incluye período de prueba de [PERIODO_PRUEBA] meses, jornada de [HORAS_SEMANALES] horas, cláusulas de confidencialidad y no competencia por [TIEMPO_RESTRICCION]. El contrato debe cumplir con el CST, Ley 789 de 2002 y normatividad vigente del MinTrabajo. Estructura: identificación de partes, objeto, obligaciones mutuas, causales de terminación, y firmas.'"
          ]
        },
        {
          title: "Optimización y Testing de Prompts",
          content: [
            "**🧪 Metodología de Testing:**",
            "• **A/B Testing:** Compara diferentes versiones del mismo prompt",
            "• **Casos límite:** Prueba con datos extremos o inusuales",
            "• **Variabilidad:** Ejecuta el mismo prompt múltiples veces",
            "• **Validación cruzada:** Usa diferentes modelos de IA",
            "",
            "**📊 Métricas de Evaluación:**",
            "• **Precisión legal:** ¿Cumple con normatividad aplicable?",
            "• **Completitud:** ¿Incluye todos los elementos requeridos?",
            "• **Consistencia:** ¿Produce resultados similares en ejecuciones repetidas?",
            "• **Tiempo de ejecución:** ¿Es eficiente en tiempo de respuesta?",
            "• **Usabilidad:** ¿Es fácil de personalizar con variables?",
            "",
            "**🔄 Proceso de Iteración:**",
            "• **Versión 1.0:** Prompt básico inicial",
            "• **Testing inicial:** Identificar problemas principales",
            "• **Versión 1.1:** Correcciones de errores críticos",
            "• **Testing intermedio:** Validar mejoras",
            "• **Versión 1.2:** Optimizaciones finas",
            "• **Testing final:** Validación completa antes de producción",
            "",
            "**🎯 Técnicas de Optimización:**",
            "• **Prompt Compression:** Reducir longitud manteniendo efectividad",
            "• **Context Optimization:** Mejor uso del contexto disponible",
            "• **Variable Refinement:** Mejorar definición de variables",
            "• **Output Formatting:** Optimizar estructura de salida",
            "",
            "**📋 Checklist de Calidad:**",
            "✅ **Contexto legal claro y específico**",
            "✅ **Variables bien definidas y nombradas descriptivamente**",
            "✅ **Normatividad aplicable mencionada explícitamente**",
            "✅ **Formato de salida estructurado**",
            "✅ **Restricciones y limitaciones claras**",
            "✅ **Ejemplos proporcionados cuando sea útil**",
            "✅ **Lenguaje técnico apropiado**",
            "✅ **Consideraciones éticas incluidas**",
            "",
            "**🛠️ Herramientas de Testing:**",
            "• **PromptPerfect:** Optimización automática de prompts",
            "• **LangSmith:** Tracking y evaluación de prompts",
            "• **Weights & Biases:** Experimentación con prompts",
            "• **Custom scripts:** Desarrollo de herramientas específicas",
            "",
            "**📚 Documentación y Versionado:**",
            "• Mantener historial de cambios en prompts",
            "• Documentar resultados de testing",
            "• Crear biblioteca de prompts efectivos",
            "• Establecer estándares de naming y estructura",
            "",
            "**Recursos especializados:**",
            "• Prompt Engineering Institute: https://promptengineering.org/",
            "• OpenAI Cookbook: https://github.com/openai/openai-cookbook",
            "• HuggingFace Prompt Engineering: https://huggingface.co/docs/transformers/tasks/prompting"
          ]
        },
        {
          title: "Errores Comunes y Mejores Prácticas",
          content: [
            "**❌ ERRORES FRECUENTES:**",
            "",
            "**1. Prompts Vagos e Imprecisos:**",
            "• ❌ Malo: 'Redacta un contrato'",
            "• ✅ Bueno: 'Redacta un contrato de arrendamiento comercial para local de 50m² en Bogotá, canon $2.000.000, plazo 3 años, conforme Ley 820/2003'",
            "",
            "**2. Falta de Contexto Legal:**",
            "• ❌ Malo: 'Crea una demanda por incumplimiento'",
            "• ✅ Bueno: 'Elabora demanda ejecutiva por incumplimiento contractual ante Juzgado Civil, cuantía $50.000.000, conforme CPC arts. 422-442'",
            "",
            "**3. Variables Mal Definidas:**",
            "• ❌ Malo: '[NOMBRE], [FECHA], [VALOR]'",
            "• ✅ Bueno: '[NOMBRE_COMPLETO_ARRENDADOR], [FECHA_INICIO_DD/MM/AAAA], [VALOR_CANON_NUMERICO]'",
            "",
            "**4. Sin Estructura de Salida:**",
            "• ❌ Malo: No especificar formato",
            "• ✅ Bueno: 'Estructura: I. Encabezado, II. Considerandos, III. Cláusulas (numeradas), IV. Firmas'",
            "",
            "**5. Ignorar Limitaciones del Modelo:**",
            "• ❌ Malo: Asumir conocimiento actualizado",
            "• ✅ Bueno: 'Según normatividad vigente a [FECHA_ESPECIFICA]'",
            "",
            "**✅ MEJORES PRÁCTICAS:**",
            "",
            "**🎯 Principio de Especificidad:**",
            "• Ser tan específico como sea posible sin ser verboso",
            "• Incluir jurisdicción, normativa y contexto relevante",
            "• Definir audiencia objetivo (P. naturales vs jurídicas)",
            "",
            "**📝 Principio de Estructura:**",
            "• Usar formato consistente: Contexto → Tarea → Formato → Restricciones",
            "• Separar claramente cada sección del prompt",
            "• Usar numeración o bullets para organizar información",
            "",
            "**⚖️ Principio de Legalidad:**",
            "• Siempre mencionar normatividad aplicable",
            "• Incluir referencias a códigos, leyes y decretos relevantes",
            "• Considerar jurisprudencia cuando sea pertinente",
            "",
            "**🔄 Principio de Iteración:**",
            "• Empezar simple y agregar complejidad gradualmente",
            "• Probar con casos reales antes de implementar",
            "• Refinar basándose en feedback y resultados",
            "",
            "**🎨 Principio de Consistencia:**",
            "• Usar naming conventions para variables",
            "• Mantener estilo y tono consistente",
            "• Estandarizar estructura entre prompts similares",
            "",
            "**⚡ Ejemplos de Transformación:**",
            "",
            "**ANTES (Prompt deficiente):**",
            "'Haz un contrato de trabajo'",
            "",
            "**DESPUÉS (Prompt optimizado):**",
            "'Actúa como abogado laboralista con experiencia en contratos. Redacta un contrato de trabajo a término [TIPO_TERMINO] para el cargo de [CARGO_ESPECIFICO] en [NOMBRE_EMPRESA], sector [SECTOR_ECONOMICO]. Incluye: identificación completa de partes, objeto del contrato, salario integral/ordinario de [VALOR_SALARIO], jornada de [HORAS_TRABAJO], período de prueba [DURACION_PRUEBA], obligaciones específicas del cargo, causales de terminación según CST, cláusulas de confidencialidad aplicables al sector. Estructura: encabezado, identificación, objeto, condiciones, obligaciones, terminación, firmas. Cumplir Código Sustantivo del Trabajo y Ley 789/2002.'",
            "",
            "**Recursos para mejores prácticas:**",
            "• Google AI Responsible Practices: https://ai.google/principles/",
            "• Microsoft Responsible AI: https://www.microsoft.com/ai/responsible-ai",
            "• Partnership on AI: https://partnershiponai.org/"
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
            "Un agente legal es un sistema de IA especializado y automatizado que combina un prompt maestro altamente específico, plantillas de documentos estructuradas y un conjunto de variables personalizables para generar documentos legales consistentes, precisos y de alta calidad.",
            "Cada agente está diseñado para una tarea jurídica específica (ej: contratos de arrendamiento, demandas ejecutivas, constitución de sociedades) y puede generar múltiples documentos manteniendo coherencia en estilo, estructura y cumplimiento normativo.",
            "",
            "**Componentes principales de un agente:**",
            "• **Prompt Maestro:** Instrucciones específicas y detalladas para la IA",
            "• **Template Engine:** Estructura base del documento con placeholders",
            "• **Variable System:** Campos personalizables con validaciones",
            "• **Legal Framework:** Referencias normativas y compliance automático",
            "• **Quality Control:** Validaciones y verificaciones integradas",
            "",
            "**Diferencia con herramientas tradicionales:**",
            "• **Plantillas estáticas:** Requieren edición manual completa",
            "• **Generadores simples:** Sin contexto legal profundo",
            "• **Agentes IA:** Adaptación inteligente + conocimiento legal + automatización",
            "",
            "**Casos de uso exitosos:**",
            "• **Bufete corporativo:** Agente de Due Diligence reduce tiempo de 40 horas a 4 horas",
            "• **Firma inmobiliaria:** Agente de contratos de arrendamiento procesa 150 contratos/mes",
            "• **Departamento legal:** Agente de compliance genera reportes automáticos"
          ]
        },
        {
          title: "Metodología de Desarrollo de Agentes",
          content: [
            "**FASE 1: Análisis y Definición (2-3 días)**",
            "",
            "**🎯 Identificación del Problema:**",
            "• Mapear proceso actual: ¿Cuánto tiempo toma? ¿Qué pasos involucra?",
            "• Identificar pain points: ¿Dónde ocurren errores? ¿Qué es repetitivo?",
            "• Cuantificar impacto: Volumen mensual, tiempo por documento, costo actual",
            "• Ejemplo: Contratos laborales toman 2 horas, se hacen 20/mes = 40 horas/mes",
            "",
            "**👥 Análisis de Audiencia:**",
            "• **Usuarios finales:** ¿Abogados senior, junior, asistentes, clientes?",
            "• **Nivel técnico:** ¿Conocimiento legal avanzado o básico?",
            "• **Contexto de uso:** ¿Urgencia alta, precisión crítica, volumen masivo?",
            "• **Output esperado:** ¿Borrador para revisión o documento final?",
            "",
            "**📋 Definición de Alcance:**",
            "• **Casos incluidos:** Situaciones que el agente debe manejar",
            "• **Casos excluidos:** Situaciones que requieren intervención humana",
            "• **Limitaciones técnicas:** Qué no puede automatizarse",
            "• **Ejemplo:** Agente de arrendamiento NO maneja propiedades rurales o contratos de más de 10 años",
            "",
            "**FASE 2: Diseño de Variables (1-2 días)**",
            "",
            "**🔧 Clasificación de Variables:**",
            "• **Obligatorias:** [NOMBRE_ARRENDADOR], [VALOR_CANON]",
            "• **Opcionales:** [CLAUSULA_MASCOTAS], [SERVICIOS_INCLUIDOS]",
            "• **Calculadas:** [VALOR_ADMINISTRACION] = [CANON] * 0.15",
            "• **Condicionales:** IF [TIPO_INMUEBLE] = 'comercial' THEN incluir [ACTIVIDAD_COMERCIAL]",
            "",
            "**📝 Naming Conventions:**",
            "• Descriptivo: [FECHA_INICIO_CONTRATO] vs [FECHA1]",
            "• Formato específico: [CEDULA_FORMATO_PUNTOS] vs [CEDULA_SIN_PUNTOS]",
            "• Tipo de dato: [CANON_SOLO_NUMEROS], [DIRECCION_COMPLETA_CON_CIUDAD]",
            "",
            "**FASE 3: Desarrollo del Prompt Maestro (3-5 días)**",
            "",
            "**⚖️ Estructura del Prompt:**",
            "1. **Contexto profesional y jurisdiccional**",
            "2. **Especificación de la tarea y documento objetivo**",
            "3. **Marco normativo detallado**",
            "4. **Instrucciones de estructura y formato**",
            "5. **Manejo de variables y casos especiales**",
            "6. **Validaciones y verificaciones finales**",
            "",
            "**FASE 4: Testing y Refinamiento (2-3 días)**",
            "",
            "**🧪 Tipos de Pruebas:**",
            "• **Casos estándar:** Situaciones típicas y frecuentes",
            "• **Casos límite:** Valores extremos o situaciones inusuales",
            "• **Casos de error:** Datos faltantes o incorrectos",
            "• **Casos complejos:** Múltiples variables opcionales activas"
          ]
        },
        {
          title: "Arquitectura Técnica de Agentes",
          content: [
            "**🏗️ Stack Tecnológico Recomendado:**",
            "",
            "**Frontend (Interfaz de Usuario):**",
            "• **React + TypeScript:** Base sólida y tipado seguro",
            "• **Tailwind CSS:** Diseño rápido y consistente",
            "• **React Hook Form:** Manejo eficiente de formularios",
            "• **Zod:** Validación de datos robusta",
            "",
            "**Backend (Procesamiento):**",
            "• **Supabase Edge Functions:** Serverless y escalable",
            "• **OpenAI API / Anthropic API:** Modelos de IA de calidad",
            "• **PostgreSQL:** Base de datos robusta para plantillas",
            "• **RLS Policies:** Seguridad a nivel de fila",
            "",
            "**🔄 Flujo de Procesamiento:**",
            "",
            "**1. Input Capture (Captura de Datos):**",
            "```typescript",
            "interface AgentInput {",
            "  variables: Record<string, any>;",
            "  agentId: string;",
            "  userId: string;",
            "  metadata?: Record<string, any>;",
            "}",
            "```",
            "",
            "**2. Validation Layer (Capa de Validación):**",
            "• Verificar campos obligatorios",
            "• Validar formatos (fechas, números, emails)",
            "• Aplicar reglas de negocio específicas",
            "• Sanitizar inputs para prevenir inyecciones",
            "",
            "**3. Prompt Assembly (Ensamblaje del Prompt):**",
            "• Cargar template del agente desde base de datos",
            "• Sustituir variables con valores proporcionados",
            "• Aplicar lógica condicional para secciones opcionales",
            "• Incorporar contexto normativo actualizado",
            "",
            "**4. AI Processing (Procesamiento de IA):**",
            "• Enviar prompt completo al modelo de IA",
            "• Configurar parámetros óptimos (temperature, max_tokens)",
            "• Implementar retry logic para fallos temporales",
            "• Monitorear calidad de respuesta",
            "",
            "**5. Post-Processing (Post-procesamiento):**",
            "• Validar estructura del documento generado",
            "• Aplicar formateo final (numeración, espaciado)",
            "• Insertar metadatos (fecha de generación, versión)",
            "• Preparar para descarga o visualización",
            "",
            "**🔒 Consideraciones de Seguridad:**",
            "",
            "**Autenticación y Autorización:**",
            "• JWT tokens para sesiones de usuario",
            "• Role-based access control (RBAC)",
            "• Rate limiting por usuario y agente",
            "• Audit logs para trazabilidad",
            "",
            "**Protección de Datos:**",
            "• Encriptación en tránsito (HTTPS/TLS)",
            "• Encriptación en reposo para datos sensibles",
            "• No almacenar información del cliente en logs",
            "• Compliance con GDPR y LPDA colombiana",
            "",
            "**📊 Monitoreo y Analytics:**",
            "• Tiempo de respuesta promedio por agente",
            "• Tasa de éxito de generación",
            "• Patrones de uso por tipo de usuario",
            "• Feedback de calidad de documentos generados"
          ]
        },
        {
          title: "Ejemplos Prácticos de Agentes Especializados",
          content: [
            "**🏠 AGENTE: Contrato de Arrendamiento Residencial**",
            "",
            "**Prompt Maestro (versión simplificada):**",
            "'Actúa como abogado especialista en derecho inmobiliario. Redacta un contrato de arrendamiento de vivienda urbana cumpliendo Ley 820/2003, Código Civil y normativa de arrendamientos. Estructura: I) Identificación partes, II) Objeto y descripción inmueble, III) Canon y forma de pago, IV) Plazo y renovación, V) Obligaciones arrendador/arrendatario, VI) Incrementos anuales, VII) Causales terminación, VIII) Entrega inmueble, IX) Firmas y fecha.'",
            "",
            "**Variables clave:**",
            "• [NOMBRE_ARRENDADOR] - Nombre completo propietario",
            "• [CEDULA_ARRENDADOR] - CC con formato de puntos",
            "• [DIRECCION_INMUEBLE] - Dirección completa incluye ciudad",
            "• [CANON_MENSUAL] - Valor numérico sin puntos ni comas",
            "• [FECHA_INICIO] - Formato DD/MM/AAAA",
            "• [DURACION_MESES] - Número entero de meses",
            "• [DEPOSITO_GARANTIA] - Múltiplo del canon (ej: 1, 2, 3)",
            "",
            "**Casos de uso:**",
            "• Inmobiliarias: 200+ contratos mensuales",
            "• Propietarios independientes: Contratos ocasionales",
            "• Administradores: Renovaciones masivas",
            "",
            "**⚖️ AGENTE: Demanda Ejecutiva por Pagaré**",
            "",
            "**Especialización:** Cobro judicial de títulos valores",
            "**Normativa base:** CPC Arts. 422-442, Código de Comercio",
            "**Complejidad:** Alta (requiere cálculos de intereses)",
            "",
            "**Variables especializadas:**",
            "• [VALOR_CAPITAL] - Monto original del pagaré",
            "• [TASA_INTERES_ANUAL] - Porcentaje acordado",
            "• [FECHA_VENCIMIENTO] - Cuándo debió pagarse",
            "• [INTERESES_CAUSADOS] - Cálculo automático hasta fecha demanda",
            "• [JUZGADO_COMPETENTE] - Según cuantía y territorio",
            "",
            "**Cálculos automáticos integrados:**",
            "• Intereses de mora desde vencimiento",
            "• Actualización monetaria (UVR/IPC)",
            "• Costas procesales estimadas",
            "• Agencias en derecho según tarifa",
            "",
            "**🏢 AGENTE: Constitución de SAS**",
            "",
            "**Especialización:** Creación de Sociedades por Acciones Simplificadas",
            "**Marco legal:** Ley 1258/2008, Código de Comercio",
            "**Output:** Documento listo para registro Cámara Comercio",
            "",
            "**Variables empresariales:**",
            "• [RAZON_SOCIAL] - Nombre completo incluyendo SAS",
            "• [OBJETO_SOCIAL] - Actividades específicas código CIIU",
            "• [CAPITAL_AUTORIZADO] - Monto total autorizado",
            "• [CAPITAL_SUSCRITO] - Monto inicial suscrito",
            "• [REPRESENTANTE_LEGAL] - Datos completos",
            "• [DURACION_SOCIEDAD] - Indefinida o plazo específico",
            "",
            "**Automatizaciones incluidas:**",
            "• Generación automática de cláusulas según objeto social",
            "• Ajuste de capital mínimo según actividad",
            "• Inclusión de órganos sociales requeridos",
            "• Verificación de incompatibilidades legales",
            "",
            "**💼 AGENTE: Contrato de Prestación de Servicios Profesionales**",
            "",
            "**Target:** Profesionales independientes y empresas",
            "**Modalidades:** Presencial, remoto, mixto",
            "**Duración típica:** 3-12 meses",
            "",
            "**Variables profesionales:**",
            "• [TIPO_PROFESIONAL] - Médico, ingeniero, abogado, etc.",
            "• [SERVICIOS_ESPECIFICOS] - Descripción detallada del alcance",
            "• [VALOR_HONORARIOS] - Fijo, por horas, por entregables",
            "• [FORMA_PAGO] - Mensual, quincenal, por hitos",
            "• [ENTREGABLES] - Lista específica de productos/servicios",
            "• [CLAUSULA_EXCLUSIVIDAD] - Si aplica o no",
            "",
            "**Características especiales:**",
            "• Adaptación automática según tipo de profesional",
            "• Cláusulas de propiedad intelectual contextualizadas",
            "• Manejo de confidencialidad según sector",
            "• Términos de terminación anticipada balanceados"
          ]
        },
        {
          title: "Optimización y Escalabilidad",
          content: [
            "**📈 Métricas de Performance:**",
            "",
            "**Velocidad de Procesamiento:**",
            "• Tiempo objetivo: < 30 segundos para documentos complejos",
            "• Tiempo promedio actual: 15-45 segundos según modelo",
            "• Factores de influencia: Longitud del prompt, complejidad del documento",
            "• Optimización: Usar GPT-4o-mini para casos simples, GPT-4o para complejos",
            "",
            "**Precisión y Calidad:**",
            "• Tasa de documentos sin errores críticos: > 95%",
            "• Cumplimiento normativo: 100% (verificación manual requerida)",
            "• Consistencia en múltiples ejecuciones: > 90% similaridad",
            "• Satisfacción de usuario final: Target > 4.5/5",
            "",
            "**Escalabilidad Técnica:**",
            "• Capacidad actual: 1000 documentos/hora por agente",
            "• Límites de API: Considerar rate limits de OpenAI/Anthropic",
            "• Costos variables: $0.05-$0.30 por documento según complejidad",
            "• Estrategia de cache: Resultados similares para optimizar costos",
            "",
            "**🔄 Mejora Continua:**",
            "",
            "**A/B Testing Sistemático:**",
            "• Versión A vs Versión B del mismo agente",
            "• Métricas: tiempo de generación, calidad percibida, satisfacción",
            "• Período de prueba: 2-4 semanas con muestra representativa",
            "• Implementación: Gradual rollout de versión ganadora",
            "",
            "**Feedback Loop Automatizado:**",
            "• Captura de feedback post-generación",
            "• Rating 1-5 estrellas + comentarios opcionales",
            "• Identificación automática de patrones en comentarios negativos",
            "• Alertas para calidad < 4.0 promedio en 24 horas",
            "",
            "**Versionado de Agentes:**",
            "• Semantic versioning: v1.0.0, v1.1.0, v2.0.0",
            "• Control de cambios: Qué se modificó y por qué",
            "• Rollback capability: Volver a versión anterior si hay problemas",
            "• Testing automatizado: Suite de pruebas para cada versión",
            "",
            "**📊 Analytics Avanzados:**",
            "",
            "**Patrones de Uso:**",
            "• Horarios pico: Identificar cuándo se usan más los agentes",
            "• Variables más utilizadas: Qué campos completan los usuarios",
            "• Casos de abandono: Dónde los usuarios dejan el proceso",
            "• Tiempo por paso: Optimizar formularios largos",
            "",
            "**Business Intelligence:**",
            "• ROI por agente: Ahorro de tiempo vs costo de operación",
            "• Adopción por usuario: Quién usa qué agentes y con qué frecuencia",
            "• Calidad por tipo de usuario: Abogados senior vs junior",
            "• Tendencias temporales: Cambios en uso a lo largo del tiempo",
            "",
            "**🚀 Estrategias de Escalamiento:**",
            "",
            "**Escalamiento Horizontal:**",
            "• Múltiples instancias de agentes para alta demanda",
            "• Load balancing entre diferentes APIs de IA",
            "• Distribución geográfica para menor latencia",
            "• Queue management para procesar picos de demanda",
            "",
            "**Escalamiento de Funcionalidades:**",
            "• Templates modulares: Componentes reutilizables",
            "• Agentes compuestos: Combinación de múltiples agentes simples",
            "• Integration APIs: Conectar con sistemas externos (CRM, ERP)",
            "• White-label solutions: Personalización para diferentes firmas",
            "",
            "**Recursos para escalabilidad:**",
            "• AWS/GCP Auto Scaling: https://aws.amazon.com/autoscaling/",
            "• Supabase Edge Functions: https://supabase.com/docs/guides/functions",
            "• OpenAI API Best Practices: https://platform.openai.com/docs/guides/production-best-practices"
          ]
        },
        {
          title: "Testing, QA y Deployment",
          content: [
            "**🧪 Estrategia de Testing Comprehensiva:**",
            "",
            "**Unit Testing (Pruebas Unitarias):**",
            "• **Variable validation:** Cada variable debe tener pruebas de formato",
            "• **Prompt assembly:** Verificar que el prompt se construye correctamente",
            "• **Conditional logic:** Probar todas las ramas condicionales",
            "• **Error handling:** Qué pasa con datos faltantes o incorrectos",
            "",
            "```typescript",
            "// Ejemplo de prueba unitaria",
            "describe('Agente Arrendamiento', () => {",
            "  test('valida formato de cédula', () => {",
            "    expect(validateCedula('12.345.678')).toBe(true);",
            "    expect(validateCedula('123456789')).toBe(false);",
            "  });",
            "});",
            "```",
            "",
            "**Integration Testing (Pruebas de Integración):**",
            "• **API calls:** Verificar comunicación con OpenAI/Anthropic",
            "• **Database operations:** Guardar y recuperar plantillas",
            "• **Authentication flow:** Login y permisos funcionando",
            "• **File generation:** PDF/Word generation working",
            "",
            "**End-to-End Testing (Pruebas E2E):**",
            "• **User journey completo:** Desde login hasta descarga de documento",
            "• **Cross-browser:** Chrome, Firefox, Safari, Edge",
            "• **Mobile responsiveness:** Testing en dispositivos móviles",
            "• **Performance:** Tiempo de carga y generación aceptables",
            "",
            "**🎯 Testing de Calidad Legal:**",
            "",
            "**Casos de Prueba Estándar:**",
            "• **Contratos simples:** Casos más comunes y directos",
            "• **Contratos complejos:** Múltiples variables opcionales",
            "• **Casos límite:** Valores máximos/mínimos permitidos",
            "• **Datos faltantes:** Comportamiento con campos vacíos",
            "",
            "**Validation Suite (Suite de Validación):**",
            "• **Compliance check:** ¿Cumple normativa aplicable?",
            "• **Completeness check:** ¿Incluye todos los elementos requeridos?",
            "• **Consistency check:** ¿Son coherentes todos los datos?",
            "• **Format check:** ¿Estructura y formato correctos?",
            "",
            "**Legal Review Process:**",
            "• **Senior lawyer review:** Abogado senior revisa cada nuevo agente",
            "• **Peer review:** Otro abogado independiente valida",
            "• **Compliance officer:** Verifica cumplimiento regulatorio",
            "• **Documentation:** Registro de todas las aprobaciones",
            "",
            "**🚀 Proceso de Deployment:**",
            "",
            "**Staging Environment:**",
            "• **Replica exacta de producción** para pruebas finales",
            "• **Data masking:** Datos de prueba que parecen reales",
            "• **User acceptance testing:** Usuarios reales prueban nueva versión",
            "• **Performance benchmarking:** Comparar con versión anterior",
            "",
            "**Production Deployment:**",
            "• **Blue-green deployment:** Zero downtime deployment",
            "• **Feature flags:** Activar gradualmente nueva funcionalidad",
            "• **Monitoring:** Métricas en tiempo real post-deployment",
            "• **Rollback plan:** Procedimiento para revertir si hay problemas",
            "",
            "**Post-Deployment Monitoring:**",
            "• **Error rate monitoring:** Alertas si errores > threshold",
            "• **Performance monitoring:** Tiempo de respuesta y throughput",
            "• **User feedback:** Canal para reportar problemas inmediatamente",
            "• **Usage analytics:** Verificar adoption de nuevas features",
            "",
            "**📋 Checklist Pre-Deployment:**",
            "",
            "**✅ Technical Checks:**",
            "• [ ] Todas las pruebas automatizadas pasan",
            "• [ ] Performance benchmarks dentro de límites aceptables",
            "• [ ] Security scan completado sin issues críticos",
            "• [ ] Database migrations ejecutadas exitosamente",
            "• [ ] Backup de producción actualizado",
            "",
            "**✅ Legal/Compliance Checks:**",
            "• [ ] Revisión legal completada y aprobada",
            "• [ ] Normatividad verificada y actualizada",
            "• [ ] Documentación de cambios actualizada",
            "• [ ] Training materials actualizados",
            "",
            "**✅ Business Checks:**",
            "• [ ] Stakeholder approval obtenido",
            "• [ ] Communication plan ejecutado",
            "• [ ] Support team informado de cambios",
            "• [ ] Pricing model validado si aplica",
            "",
            "**🔧 Herramientas Recomendadas:**",
            "",
            "**Testing Tools:**",
            "• **Jest + React Testing Library:** Unit testing para frontend",
            "• **Playwright:** E2E testing cross-browser",
            "• **Postman/Newman:** API testing automatizado",
            "• **Lighthouse:** Performance y accessibility testing",
            "",
            "**Deployment Tools:**",
            "• **GitHub Actions:** CI/CD pipeline automatizado",
            "• **Vercel/Netlify:** Frontend deployment",
            "• **Supabase:** Backend y database deployment",
            "• **Sentry:** Error monitoring y alerting",
            "",
            "**Recursos de best practices:**",
            "• Google Web Fundamentals: https://developers.google.com/web/fundamentals",
            "• React Testing Guide: https://testing-library.com/docs/react-testing-library/intro",
            "• CI/CD Best Practices: https://www.atlassian.com/continuous-delivery/principles/best-practices"
          ]
        }
      ]
    },
    "document-templates": {
      title: "Plantillas de Documentos Inteligentes",
      sections: [
        {
          title: "Arquitectura de Plantillas Avanzadas",
          content: [
            "Una plantilla inteligente combina estructura legal fija con campos dinámicos que se adaptan automáticamente al contexto específico, manteniendo solidez jurídica mientras permite personalización masiva.",
            "**Componentes esenciales:**",
            "• **Static Framework:** Estructura legal inmutable (encabezados, cláusulas obligatorias)",
            "• **Dynamic Variables:** Campos que se adaptan según contexto",
            "• **Conditional Logic:** Secciones que aparecen/desaparecen según variables",
            "• **Validation Rules:** Verificaciones automáticas de consistencia",
            "• **Legal References:** Citations automáticas a normatividad vigente",
            "",
            "**Ejemplo práctico - Template de Contrato Laboral:**",
            "```json",
            "{",
            "  \"static_sections\": [\"identificacion\", \"objeto\", \"firmas\"],",
            "  \"conditional_sections\": {",
            "    \"clausula_confidencialidad\": \"if cargo_nivel == 'directivo'\",",
            "    \"clausula_no_competencia\": \"if sector == 'tecnologia'\"",
            "  },",
            "  \"variables\": {",
            "    \"SALARIO_INTEGRAL\": \"if salario > 13_smmlv\"",
            "  }",
            "}",
            "```"
          ]
        },
        {
          title: "Variables Inteligentes y Validaciones",
          content: [
            "**🔧 Tipos de Variables Avanzadas:**",
            "",
            "**Variables Computadas:**",
            "• [VALOR_PRESTACIONES] = [SALARIO_BASE] * 0.2833",
            "• [INCREMENTO_ANUAL] = [CANON_ACTUAL] * [IPC_VIGENTE] / 100",
            "• [AGENCIAS_DERECHO] = [CUANTIA_PROCESO] * 0.15",
            "",
            "**Variables Condicionales:**",
            "• IF [TIPO_SOCIEDAD] = 'SAS' THEN [DURACION] = 'indefinida'",
            "• IF [SALARIO] > 13*SMMLV THEN incluir [CLAUSULA_SALARIO_INTEGRAL]",
            "• IF [ACTIVIDAD] = 'financiera' THEN aplicar [NORMATIVA_SUPERFINANCIERA]",
            "",
            "**Validaciones Automáticas:**",
            "• **Formato:** [CEDULA] debe tener formato ##.###.### o ########",
            "• **Rangos:** [CANON] debe estar entre $500.000 y $50.000.000",
            "• **Dependencias:** [FECHA_FIN] debe ser posterior a [FECHA_INICIO]",
            "• **Compliance:** [ACTIVIDAD_CIIU] debe estar en lista oficial DIAN",
            "",
            "**Recursos técnicos:**",
            "• JSON Schema Validation: https://json-schema.org/",
            "• Zod TypeScript Validation: https://zod.dev/",
            "• React Hook Form: https://react-hook-form.com/"
          ]
        },
        {
          title: "Compliance y Actualizaciones Normativas",
          content: [
            "**⚖️ Sistema de Compliance Automatizado:**",
            "",
            "**Monitoreo de Cambios Normativos:**",
            "• **APIs oficiales:** Conexión con DIAN, SuperSociedades, MinTrabajo",
            "• **Web scraping:** Gaceta Oficial, Corte Constitucional",
            "• **Alertas automáticas:** Cuando cambia normatividad relevante",
            "• **Impact analysis:** Qué templates se ven afectados",
            "",
            "**Versionado Legal:**",
            "• **Template v1.0:** Vigente hasta 31/12/2024",
            "• **Template v1.1:** Incorpora Ley XYZ del 01/01/2025",
            "• **Backward compatibility:** Documentos antiguos siguen válidos",
            "• **Migration paths:** Cómo actualizar documentos existentes",
            "",
            "**Control de Calidad Continuo:**",
            "• **Daily compliance check:** Verificación automática diaria",
            "• **Quarterly legal review:** Revisión trimestral por abogados",
            "• **Annual full audit:** Auditoría completa anual",
            "• **Immediate alerts:** Notificación de cambios críticos",
            "",
            "**Ejemplo - Sistema de Alertas:**",
            "```typescript",
            "interface ComplianceAlert {",
            "  normativa: string; // 'Decreto 1234/2024'",
            "  impacto: 'critico' | 'alto' | 'medio' | 'bajo';",
            "  templates_afectados: string[];",
            "  fecha_vigencia: Date;",
            "  accion_requerida: string;",
            "}",
            "```",
            "",
            "**Recursos oficiales:**",
            "• DIAN API: https://www.dian.gov.co/normatividad/",
            "• SuperSociedades: https://www.supersociedades.gov.co/",
            "• Gaceta Oficial: https://www.funcionpublica.gov.co/gaceta"
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