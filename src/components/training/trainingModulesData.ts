import { BookOpen, MessageSquare, FileText, Target, Zap } from "lucide-react";

export interface ValidationQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'open_ended' | 'practical';
  options?: string[];
  correctAnswer?: number;
  rubric?: string;
  points: number;
}

export interface PracticalExercise {
  title: string;
  description: string;
  prompt: string;
  expectedOutputs: string[];
  evaluationCriteria: string[];
}

export interface TrainingModule {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  content: string[];
  learningObjectives: string[];
  estimatedTime: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  xpReward: number;
  badgeName: string;
  icon: typeof BookOpen;
  iconColor: string;
  validationQuestions: ValidationQuestion[];
  practicalExercise: PracticalExercise;
}

export const trainingModules: TrainingModule[] = [
  {
    id: "foundations-ai-law",
    title: "Fundamentos de IA en el Derecho",
    shortTitle: "Fundamentos",
    description: "Conceptos esenciales de IA aplicados al ejercicio legal con casos prácticos colombianos",
    estimatedTime: "45 min",
    difficulty: "Básico",
    xpReward: 25,
    badgeName: "Fundamentos IA",
    icon: BookOpen,
    iconColor: "text-blue-500",
    content: [
      `## 1. Introducción a la Inteligencia Artificial en el Contexto Legal

La Inteligencia Artificial (IA) representa una transformación paradigmática en el ejercicio del derecho. No es simplemente una herramienta tecnológica, sino un conjunto de tecnologías que pueden automatizar, optimizar y revolucionar la práctica legal tradicional.

**Definición técnica**: La IA es la capacidad de las máquinas para realizar tareas que tradicionalmente requieren inteligencia humana, como el reconocimiento de patrones, la toma de decisiones y el procesamiento de lenguaje natural.

**Relevancia para abogados en Colombia**: El sistema judicial colombiano maneja millones de procesos anuales. La IA puede:
- Reducir tiempos de investigación legal en un 70%
- Automatizar la redacción de documentos rutinarios
- Mejorar la precisión en el análisis de precedentes jurisprudenciales`,

      `## 2. Tipos de IA y Sus Aplicaciones Legales

### Machine Learning (Aprendizaje Automático)
- **Definición**: Algoritmos que mejoran automáticamente a través de la experiencia
- **Aplicación legal**: Análisis predictivo de sentencias, clasificación automática de documentos
- **Ejemplo**: Un algoritmo que analiza 10,000 sentencias de divorcio para predecir custodia

### Deep Learning (Aprendizaje Profundo)
- **Definición**: Redes neuronales artificiales con múltiples capas
- **Aplicación legal**: Reconocimiento de entidades en contratos, análisis de sentimientos
- **Ejemplo**: Sistema que identifica automáticamente cláusulas abusivas

### Natural Language Processing (NLP)
- **Definición**: Capacidad de las máquinas para entender y generar lenguaje humano
- **Aplicación legal**: Traducción de documentos, resumen automático de expedientes
- **Ejemplo**: Herramienta que resume expedientes de 500 páginas en 5 páginas clave`,

      `## 3. IA Generativa vs IA Tradicional

### IA Tradicional
- Funciona con reglas predefinidas y patrones específicos
- Analiza y clasifica información existente
- Ejemplos: Sistemas de búsqueda legal, clasificadores de documentos
- **Ventajas**: Precisión en tareas específicas, resultados predecibles
- **Limitaciones**: No puede crear contenido nuevo

### IA Generativa (GPT, Claude, etc.)
- Crea contenido nuevo basado en patrones aprendidos
- Puede generar texto, código, imágenes
- Ejemplos: Redacción de contratos, análisis jurídico
- **Ventajas**: Creatividad, versatilidad, capacidad de adaptación
- **Limitaciones**: Posibles "alucinaciones", necesidad de verificación

**Caso práctico colombiano**: Un bufete en Bogotá usa IA tradicional para clasificar expedientes por área de derecho, e IA generativa para redactar borradores de derechos de petición.`,

      `## 4. Beneficios Cuantificables de la IA en Derecho

### Eficiencia Temporal
- Reducción del 60-80% en tiempo de investigación jurisprudencial
- Automatización de documentos rutinarios: de 4 horas a 30 minutos
- Análisis de due diligence: de 3 meses a 1 semana

### Precisión y Calidad
- Reducción del 45% en errores de transcripción
- Identificación del 95% de cláusulas relevantes vs. 75% manual
- Consistencia en redacción y formato de documentos

### Beneficios Económicos
- ROI promedio del 300% en el primer año
- Reducción del 30% en costos operativos
- Capacidad de manejar 40% más casos con el mismo personal`,

      `## 5. Limitaciones y Riesgos de la IA Legal

### Limitaciones Técnicas
- **"Alucinaciones"**: Generación de información incorrecta con apariencia verosímil
- **Sesgo algorítmico**: Perpetuación de prejuicios existentes en datos de entrenamiento
- **Opacidad**: Dificultad para explicar cómo se llegó a una conclusión

### Limitaciones Legales y Éticas
- **Responsabilidad profesional**: El abogado sigue siendo responsable del resultado final
- **Confidencialidad**: Riesgo de filtración de información sensible
- **Regulación**: Falta de marcos normativos específicos en Colombia

### Marco Regulatorio Colombiano
Actualmente no existe regulación específica sobre IA en derecho, pero se aplican:
- Código Disciplinario del Abogado
- Ley de Protección de Datos Personales (Ley 1581 de 2012)
- Principios generales de responsabilidad profesional`
    ],
    learningObjectives: [
      "Comprender los conceptos fundamentales de IA y su aplicación específica en el contexto legal colombiano",
      "Diferenciar entre tipos de IA (Machine Learning, Deep Learning, NLP) y sus casos de uso",
      "Analizar casos reales de implementación de IA en firmas internacionales",
      "Evaluar beneficios cuantificables y limitaciones de la IA para tomar decisiones informadas",
      "Identificar oportunidades específicas de implementación en su área de práctica"
    ],
    validationQuestions: [
      {
        id: "q1",
        question: "¿Cuál es la principal diferencia entre Machine Learning y Deep Learning en aplicaciones legales?",
        type: "multiple_choice",
        options: [
          "No hay diferencias significativas en el contexto legal",
          "Deep Learning usa redes neuronales más complejas para analizar patrones sofisticados",
          "Machine Learning es más reciente y avanzado que Deep Learning",
          "Deep Learning solo se aplica a análisis de imágenes"
        ],
        correctAnswer: 1,
        points: 10
      },
      {
        id: "q2",
        question: "Explique tres casos de uso específicos donde la IA puede mejorar la eficiencia en una firma legal colombiana, incluyendo beneficios cuantificables.",
        type: "open_ended",
        rubric: "Debe mencionar casos específicos aplicables al contexto colombiano, explicar beneficios cuantificables (porcentajes, tiempos), e identificar posibles riesgos",
        points: 25
      },
      {
        id: "q3",
        question: "¿Qué es una 'alucinación' en el contexto de IA generativa y cómo puede un abogado mitigar este riesgo?",
        type: "multiple_choice",
        options: [
          "Un error del hardware que genera resultados aleatorios",
          "La generación de información falsa pero plausible que requiere verificación humana",
          "Un problema de privacidad que expone datos confidenciales",
          "Una limitación de velocidad en el procesamiento de documentos"
        ],
        correctAnswer: 1,
        points: 10
      }
    ],
    practicalExercise: {
      title: "Análisis de Viabilidad de IA en Departamento Legal",
      description: "Evalúe la implementación de IA en un departamento legal específico",
      prompt: "Usted es consultor en una empresa mediana colombiana con un departamento legal de 5 abogados que maneja contratos comerciales y laborales. El departamento procesa 150 contratos/mes. Desarrolle un análisis que incluya: 1) Identifique 2 procesos con mayor potencial de automatización, 2) Proponga una herramienta de IA específica para cada uno, 3) Estime el ahorro de tiempo esperado.",
      expectedOutputs: [
        "Identificación de procesos automatizables con justificación",
        "Propuesta de herramientas específicas",
        "Estimación de ahorro de tiempo con métricas"
      ],
      evaluationCriteria: [
        "Precisión en identificación de oportunidades",
        "Viabilidad práctica de las propuestas",
        "Solidez del análisis de beneficios"
      ]
    }
  },
  {
    id: "prompt-engineering",
    title: "Ingeniería de Prompts para Abogados",
    shortTitle: "Prompts",
    description: "Técnicas avanzadas para crear instrucciones efectivas a sistemas de IA legal",
    estimatedTime: "60 min",
    difficulty: "Intermedio",
    xpReward: 30,
    badgeName: "Prompt Master",
    icon: MessageSquare,
    iconColor: "text-green-500",
    content: [
      `## 1. ¿Qué es la Ingeniería de Prompts?

La ingeniería de prompts es el arte y la ciencia de diseñar instrucciones efectivas para sistemas de IA. Para los abogados, dominar esta habilidad es crucial para obtener resultados precisos y útiles.

### Principios Fundamentales
- **Claridad**: Instrucciones específicas y sin ambigüedades
- **Contexto**: Proporcionar información relevante sobre el caso o situación
- **Estructura**: Organizar la solicitud de manera lógica
- **Restricciones**: Definir límites y formato esperado de respuesta

### ¿Por qué es importante para abogados?
- La calidad del prompt determina directamente la calidad de la respuesta
- Un buen prompt puede ahorrar horas de trabajo
- Permite obtener análisis más profundos y relevantes`,

      `## 2. Anatomía de un Prompt Legal Efectivo

### Estructura Recomendada

\`\`\`
[ROL] Eres un abogado especializado en [área]

[CONTEXTO] El caso involucra [descripción breve del caso]

[TAREA ESPECÍFICA] Necesito que [acción concreta]

[RESTRICCIONES] La respuesta debe [formato, longitud, estilo]

[EJEMPLO] Similar a [referencia si aplica]
\`\`\`

### Ejemplo Práctico

**Prompt débil**: "Dame un contrato de arrendamiento"

**Prompt efectivo**:
"Eres un abogado especializado en derecho inmobiliario colombiano. Necesito redactar un contrato de arrendamiento de vivienda urbana para un apartamento en Bogotá, con las siguientes características:
- Arrendador: persona natural
- Arrendatario: persona natural
- Canon mensual: $2.500.000 COP
- Plazo: 12 meses con renovación automática

Incluye: cláusulas de incremento anual según IPC, depósito de 1 mes, y condiciones de terminación anticipada. Formato formal con numeración de cláusulas."`,

      `## 3. Técnicas Avanzadas de Prompting

### Chain of Thought (Cadena de Pensamiento)
Solicitar que la IA explique su razonamiento paso a paso.

**Ejemplo**: "Analiza este contrato laboral paso a paso, identificando primero las cláusulas estándar, luego las cláusulas atípicas, y finalmente los riesgos potenciales para el empleador."

### Few-Shot Learning
Proporcionar ejemplos del tipo de respuesta esperada.

**Ejemplo**: "Analiza las siguientes cláusulas de confidencialidad como se muestra en estos ejemplos:
Ejemplo 1: 'El trabajador se obliga a...' → Riesgo: Bajo, alcance demasiado amplio
Ejemplo 2: [...]
Ahora analiza: '[cláusula del cliente]'"

### Role-Playing (Juego de Roles)
Asignar un rol específico a la IA para obtener respuestas más contextualizadas.

**Ejemplo**: "Actúa como un juez de la Corte Constitucional colombiana. Analiza si la siguiente cláusula contractual podría considerarse abusiva según la jurisprudencia de la Corte."`,

      `## 4. Prompts para Tareas Legales Específicas

### Análisis de Contratos
\`\`\`
Analiza el siguiente contrato de [tipo] identificando:
1. Partes involucradas y sus obligaciones principales
2. Cláusulas que podrían ser cuestionables bajo la ley colombiana
3. Términos que deberían renegociarse a favor de [cliente]
4. Riesgos legales potenciales ordenados por gravedad

Formato: Tabla con columnas [Cláusula | Análisis | Recomendación | Prioridad]
\`\`\`

### Investigación Jurisprudencial
\`\`\`
Sobre el tema de [tema específico], necesito:
1. Los principios jurisprudenciales aplicables según la Corte Constitucional
2. Sentencias hito que definan la línea jurisprudencial
3. Cambios recientes en la interpretación
4. Aplicación práctica al caso donde [descripción breve]

Cita las sentencias en formato: [Tribunal-Número-Año]
\`\`\`

### Redacción de Documentos
\`\`\`
Redacta un [tipo de documento] para el siguiente caso:
[Descripción del caso]

Requisitos:
- Cumplir con la Ley [número] de [año]
- Tono formal y técnico
- Extensión: [número] páginas aproximadamente
- Incluir fundamentos de hecho y de derecho separados
\`\`\``,

      `## 5. Errores Comunes y Cómo Evitarlos

### Error 1: Prompts Vagos
❌ "Revisa este contrato"
✅ "Revisa este contrato de distribución identificando cláusulas de exclusividad, territorio, y condiciones de terminación. Resalta cualquier cláusula que limite la responsabilidad del distribuidor."

### Error 2: Falta de Contexto Jurisdiccional
❌ "¿Esta cláusula es legal?"
✅ "Bajo el derecho comercial colombiano, específicamente el Código de Comercio y la jurisprudencia de la Superintendencia de Industria y Comercio, ¿esta cláusula de no competencia de 5 años sería ejecutable?"

### Error 3: No Especificar el Formato de Salida
❌ "Dame un análisis del caso"
✅ "Dame un análisis del caso en formato de memorando legal con: I. Hechos relevantes, II. Cuestiones jurídicas, III. Análisis, IV. Conclusiones y recomendaciones"

### Error 4: No Iterar
La primera respuesta rara vez es perfecta. Use prompts de seguimiento:
- "Profundiza en el punto 3"
- "Reformula considerando la Ley 1564 de 2012"
- "Agrega jurisprudencia relevante de los últimos 5 años"`
    ],
    learningObjectives: [
      "Comprender los principios fundamentales de la ingeniería de prompts",
      "Aplicar técnicas avanzadas como Chain of Thought y Few-Shot Learning",
      "Diseñar prompts efectivos para diferentes tareas legales",
      "Identificar y corregir errores comunes en la formulación de prompts",
      "Optimizar la interacción con herramientas de IA para maximizar productividad"
    ],
    validationQuestions: [
      {
        id: "q1",
        question: "¿Cuál de los siguientes es el mejor prompt para analizar un contrato?",
        type: "multiple_choice",
        options: [
          "Revisa este contrato y dime si está bien",
          "Analiza este contrato de arrendamiento comercial identificando cláusulas de incremento, terminación anticipada y penalidades, con formato de tabla que incluya riesgo y recomendación",
          "Eres un abogado, revisa el contrato",
          "Dame un análisis completo del contrato adjunto"
        ],
        correctAnswer: 1,
        points: 15
      },
      {
        id: "q2",
        question: "Diseñe un prompt efectivo para solicitar a una IA que redacte un derecho de petición ante la DIAN para solicitar información tributaria de un cliente. Aplique al menos 3 técnicas vistas en el módulo.",
        type: "practical",
        rubric: "Debe incluir: rol específico, contexto del caso, formato esperado, restricciones legales, y aplicar técnicas como Chain of Thought o especificación de estructura",
        points: 30
      },
      {
        id: "q3",
        question: "¿Qué técnica de prompting es más efectiva cuando necesitas que la IA analice un problema complejo paso a paso?",
        type: "multiple_choice",
        options: [
          "Role-Playing",
          "Few-Shot Learning",
          "Chain of Thought",
          "Zero-Shot Prompting"
        ],
        correctAnswer: 2,
        points: 10
      }
    ],
    practicalExercise: {
      title: "Creación de Biblioteca de Prompts Legales",
      description: "Desarrolle 3 prompts optimizados para su práctica diaria",
      prompt: "Cree 3 prompts detallados para las siguientes tareas legales de su práctica: 1) Análisis de riesgos en un contrato, 2) Investigación de jurisprudencia sobre un tema específico, 3) Redacción de un concepto jurídico. Cada prompt debe seguir la estructura vista en el módulo e incluir rol, contexto, tarea, restricciones y formato esperado.",
      expectedOutputs: [
        "3 prompts estructurados y detallados",
        "Justificación de las técnicas usadas en cada uno",
        "Ejemplo de uso práctico de cada prompt"
      ],
      evaluationCriteria: [
        "Aplicación correcta de la estructura de prompts",
        "Uso de técnicas avanzadas de prompting",
        "Relevancia y aplicabilidad práctica"
      ]
    }
  },
  {
    id: "document-automation",
    title: "Automatización de Documentos Legales",
    shortTitle: "Automatización",
    description: "Implementación práctica de sistemas automáticos de generación de documentos",
    estimatedTime: "75 min",
    difficulty: "Avanzado",
    xpReward: 35,
    badgeName: "Automatizador",
    icon: FileText,
    iconColor: "text-purple-500",
    content: [
      `## 1. Fundamentos de la Automatización Documental

La automatización de documentos legales representa una de las aplicaciones más prácticas y de mayor impacto de la IA en el ejercicio del derecho. Permite reducir drásticamente el tiempo de creación de documentos mientras se mantiene la calidad y consistencia.

### ¿Qué se puede automatizar?
- **Contratos estándar**: Arrendamientos, compraventas, prestación de servicios
- **Documentos procesales**: Derechos de petición, demandas tipo, contestaciones
- **Comunicaciones**: Oficios, cartas, notificaciones formales
- **Análisis**: Due diligence, revisión de contratos, informes periódicos

### Beneficios cuantificables
- Reducción del 80% en tiempo de generación de documentos estándar
- Eliminación del 95% de errores tipográficos y de formato
- Consistencia del 100% en la estructura y estilo de documentos`,

      `## 2. Componentes de un Sistema de Automatización

### Variables y Placeholders
Las variables son los elementos dinámicos que cambian en cada documento:

\`\`\`
{{nombre_arrendador}} → "María García López"
{{direccion_inmueble}} → "Calle 100 #15-20, Bogotá"
{{canon_mensual}} → "$2.500.000"
{{fecha_inicio}} → "1 de febrero de 2025"
\`\`\`

### Lógica Condicional
Permite incluir o excluir secciones según las circunstancias:

\`\`\`
{{#si tiene_codeudor}}
CLÁUSULA DÉCIMA - CODEUDOR
El señor {{nombre_codeudor}}, identificado con {{tipo_documento}} 
No. {{numero_documento_codeudor}}, se constituye en codeudor 
solidario de todas las obligaciones del arrendatario.
{{/si}}
\`\`\`

### Plantillas Base
Documentos modelo que contienen la estructura fija y los placeholders para variables:

- Encabezado institucional
- Cláusulas estándar
- Espacios para firmas
- Anexos cuando aplique`,

      `## 3. Herramientas para Automatización Legal

### tuconsultorlegal.co - Agentes de IA
Nuestra plataforma permite crear agentes especializados que:
- Recopilan información mediante conversación natural
- Generan documentos personalizados automáticamente
- Aplican lógica condicional según el caso
- Verifican consistencia de datos

### Flujo de Trabajo Típico

1. **Diseño de la plantilla**
   - Identificar cláusulas fijas y variables
   - Definir condiciones lógicas
   - Establecer validaciones de datos

2. **Configuración del agente**
   - Crear guía de conversación
   - Definir preguntas por bloque temático
   - Establecer orden de recopilación

3. **Generación automática**
   - El usuario responde las preguntas
   - El sistema valida las respuestas
   - Se genera el documento personalizado

4. **Revisión y ajuste**
   - Revisión final por el abogado
   - Ajustes manuales si es necesario
   - Aprobación y entrega`,

      `## 4. Mejores Prácticas en Automatización

### Diseño de Plantillas
- **Modularidad**: Crear bloques reutilizables
- **Nomenclatura clara**: Usar nombres de variables descriptivos
- **Documentación**: Mantener registro de cada plantilla y sus variables

### Validación de Datos
\`\`\`
Tipo de validación          Ejemplo
─────────────────────────────────────────
Formato de cédula           12.345.678 ✓
Valores numéricos           $1.000.000 ✓  
Fechas válidas              31/02/2025 ✗
Campos obligatorios         Nombre: ___ ✗
\`\`\`

### Control de Calidad
- **Revisión de primera generación**: Siempre revisar los primeros documentos
- **Actualización periódica**: Mantener plantillas al día con cambios normativos
- **Feedback loop**: Incorporar correcciones a la plantilla base`,

      `## 5. Implementación Práctica

### Caso de Estudio: Automatización de Contratos de Arrendamiento

**Situación inicial**: Una inmobiliaria genera 50 contratos de arrendamiento mensuales. Cada contrato toma 2 horas de redacción manual.

**Implementación**:
1. Análisis de contratos existentes para identificar patrones
2. Creación de plantilla maestra con 45 variables
3. Diseño de guía de conversación con 6 bloques temáticos
4. Integración de lógica condicional para casos especiales

**Resultados**:
- Tiempo por contrato: de 2 horas a 15 minutos (87% reducción)
- Errores: de 12% a 0.5% (96% reducción)
- Satisfacción del cliente: 95% reporta mejor experiencia
- ROI: 400% en el primer año

### Checklist de Implementación
☐ Identificar documentos de alto volumen
☐ Analizar estructura y variables recurrentes
☐ Diseñar plantilla con lógica condicional
☐ Crear guía de conversación para recopilación de datos
☐ Probar con casos reales
☐ Capacitar al equipo
☐ Monitorear y optimizar continuamente`
    ],
    learningObjectives: [
      "Comprender los fundamentos y beneficios de la automatización documental",
      "Identificar documentos candidatos para automatización en su práctica",
      "Diseñar plantillas efectivas con variables y lógica condicional",
      "Implementar un sistema de automatización paso a paso",
      "Aplicar mejores prácticas para control de calidad y mantenimiento"
    ],
    validationQuestions: [
      {
        id: "q1",
        question: "¿Cuál es el principal beneficio de usar lógica condicional en plantillas de documentos?",
        type: "multiple_choice",
        options: [
          "Hacer los documentos más largos y completos",
          "Adaptar el contenido del documento según las circunstancias específicas de cada caso",
          "Reducir el tamaño de los archivos generados",
          "Mejorar la velocidad de impresión de documentos"
        ],
        correctAnswer: 1,
        points: 10
      },
      {
        id: "q2",
        question: "Diseñe la estructura de variables para automatizar un contrato de prestación de servicios profesionales. Incluya al menos 10 variables organizadas por categoría.",
        type: "practical",
        rubric: "Debe incluir variables para: partes contratantes, objeto del contrato, honorarios, plazo, obligaciones, y cláusulas especiales. Organizar por categorías lógicas.",
        points: 25
      },
      {
        id: "q3",
        question: "En un sistema de automatización, ¿qué paso es MÁS crítico para garantizar la calidad de los documentos generados?",
        type: "multiple_choice",
        options: [
          "Usar la mayor cantidad de variables posible",
          "Validar los datos de entrada antes de generar el documento",
          "Generar documentos en formato PDF únicamente",
          "Incluir marcas de agua en todos los documentos"
        ],
        correctAnswer: 1,
        points: 10
      }
    ],
    practicalExercise: {
      title: "Diseño de Sistema de Automatización",
      description: "Diseñe un sistema completo para automatizar un documento de su práctica",
      prompt: "Seleccione un documento que genera frecuentemente en su práctica (contrato, demanda, concepto, etc.) y diseñe un sistema de automatización que incluya: 1) Análisis del documento identificando partes fijas y variables, 2) Lista completa de variables con tipos de datos y validaciones, 3) Lógica condicional para casos especiales, 4) Guía de preguntas para recopilar la información.",
      expectedOutputs: [
        "Análisis estructurado del documento seleccionado",
        "Lista de 15+ variables con especificaciones",
        "Al menos 2 condiciones lógicas para secciones opcionales",
        "Guía de conversación con preguntas organizadas por tema"
      ],
      evaluationCriteria: [
        "Selección apropiada de documento para automatización",
        "Completitud en identificación de variables",
        "Aplicación correcta de lógica condicional",
        "Practicidad de la guía de conversación"
      ]
    }
  },
  {
    id: "ai-ethics",
    title: "Ética y Responsabilidad en IA Legal",
    shortTitle: "Ética",
    description: "Marco ético y legal para uso responsable de IA en la práctica jurídica",
    estimatedTime: "50 min",
    difficulty: "Intermedio",
    xpReward: 25,
    badgeName: "Ético Digital",
    icon: Target,
    iconColor: "text-orange-500",
    content: [
      `## 1. Marco Ético para el Uso de IA en Derecho

El uso de IA en la práctica legal plantea desafíos éticos significativos que todo abogado debe comprender y abordar. La tecnología es una herramienta poderosa, pero su uso responsable requiere un marco ético sólido.

### Principios Fundamentales
- **Beneficencia**: La IA debe usarse para beneficio del cliente y la justicia
- **No maleficencia**: Evitar daños derivados del uso inadecuado de IA
- **Autonomía**: Mantener el juicio profesional independiente
- **Justicia**: Asegurar acceso equitativo y evitar discriminación algorítmica
- **Transparencia**: Ser honesto sobre el uso de IA en el trabajo legal

### El Rol del Abogado en la Era de la IA
El abogado sigue siendo el profesional responsable. La IA es un asistente, no un reemplazo. El criterio humano, la empatía y el juicio ético son insustituibles.`,

      `## 2. Responsabilidad Profesional y IA

### Marco Normativo Colombiano
El Código Disciplinario del Abogado (Ley 1123 de 2007) establece deberes que aplican al uso de IA:

**Artículo 28 - Deberes Profesionales**:
- Deber de competencia: Conocer las herramientas que usa
- Deber de diligencia: Verificar los resultados de la IA
- Deber de lealtad: No delegar responsabilidades en máquinas
- Deber de secreto profesional: Proteger información del cliente

### ¿Quién es responsable cuando la IA comete un error?

**Siempre el abogado**. La IA no tiene personalidad jurídica ni puede ser sujeto de responsabilidad profesional.

**Escenarios de responsabilidad**:
| Situación | Responsabilidad |
|-----------|-----------------|
| IA genera cláusula ilegal | Abogado que no verificó |
| IA pierde información del cliente | Abogado por falta de diligencia |
| IA genera documento con errores | Abogado que lo entregó sin revisar |`,

      `## 3. Confidencialidad y Protección de Datos

### Riesgos de Confidencialidad con IA
- **Datos en la nube**: ¿Dónde se procesan los datos del cliente?
- **Retención de información**: ¿La IA "aprende" de los datos del cliente?
- **Accesos no autorizados**: ¿Quién puede ver la información procesada?

### Mejores Prácticas

**Antes de usar cualquier herramienta de IA**:
1. Revisar términos de servicio y política de privacidad
2. Verificar cumplimiento con Ley 1581 de 2012
3. Evaluar si los datos son anonimizables
4. Confirmar ubicación de servidores y jurisdicción aplicable

**Consentimiento del Cliente**:
Se recomienda informar al cliente cuando se usan herramientas de IA significativas en su caso y obtener consentimiento explícito, especialmente para:
- Análisis de documentos confidenciales
- Uso de plataformas cloud
- Procesamiento de datos sensibles`,

      `## 4. Sesgo Algorítmico y Justicia

### ¿Qué es el sesgo algorítmico?
Los sistemas de IA pueden perpetuar o amplificar prejuicios existentes en los datos de entrenamiento.

**Ejemplos documentados en contextos legales**:
- Sistemas de predicción de reincidencia con sesgos raciales (COMPAS, EE.UU.)
- Algoritmos de contratación que discriminan por género
- Modelos de crédito que penalizan ciertas zonas geográficas

### Impacto en la Práctica Legal

**En análisis predictivo de sentencias**:
Si un modelo se entrena con sentencias históricas que reflejan sesgos, las predicciones perpetuarán esos sesgos.

**En revisión de contratos**:
Modelos entrenados principalmente con contratos de grandes corporaciones pueden no identificar correctamente riesgos relevantes para pequeños empresarios.

### Mitigación del Sesgo
- Cuestionar siempre los resultados de la IA
- Diversificar las fuentes de análisis
- Validar con jurisprudencia y doctrina actualizada
- Considerar el contexto específico del cliente`,

      `## 5. Transparencia y Uso Ético en la Práctica

### Deber de Transparencia

**¿Debe el abogado informar que usa IA?**
- A clientes: Recomendado, especialmente en trabajos significativos
- A tribunales: Depende de la jurisdicción, pero la honestidad es principio fundamental
- A contrapartes: No requerido, pero no puede inducir a error

### Casos Problemáticos

**Caso real (EE.UU., 2023)**: Abogados citaron jurisprudencia inexistente generada por ChatGPT. Resultado: Sanciones disciplinarias.

**Lección**: 
- NUNCA entregar información de IA sin verificar
- Las "alucinaciones" son frecuentes en citaciones legales
- El abogado es responsable de la veracidad de todo documento que firma

### Checklist Ético para Uso de IA

☐ ¿Entiendo cómo funciona esta herramienta?
☐ ¿He verificado su política de privacidad?
☐ ¿El cliente está informado/ha consentido?
☐ ¿He revisado y verificado todos los resultados?
☐ ¿Puedo explicar y defender el proceso ante un tribunal?
☐ ¿Mantuve mi juicio profesional independiente?`
    ],
    learningObjectives: [
      "Comprender los principios éticos fundamentales aplicables al uso de IA en derecho",
      "Identificar las implicaciones de responsabilidad profesional en el uso de herramientas de IA",
      "Aplicar mejores prácticas para proteger la confidencialidad del cliente",
      "Reconocer y mitigar riesgos de sesgo algorítmico",
      "Desarrollar un marco de transparencia para el uso ético de IA en la práctica"
    ],
    validationQuestions: [
      {
        id: "q1",
        question: "Cuando una herramienta de IA genera un error en un documento legal entregado al cliente, ¿quién es legalmente responsable?",
        type: "multiple_choice",
        options: [
          "La empresa desarrolladora de la IA",
          "Nadie, fue un error de la máquina",
          "El abogado que usó la herramienta y entregó el documento",
          "El cliente por no verificar el documento"
        ],
        correctAnswer: 2,
        points: 15
      },
      {
        id: "q2",
        question: "Desarrolle un protocolo ético para el uso de IA en su firma que aborde: confidencialidad, verificación de resultados, consentimiento del cliente, y transparencia.",
        type: "practical",
        rubric: "Debe incluir políticas específicas para cada área mencionada, con procedimientos claros y responsables designados",
        points: 30
      },
      {
        id: "q3",
        question: "¿Cuál es la principal preocupación ética relacionada con el sesgo algorítmico en herramientas de IA para predicción de sentencias?",
        type: "open_ended",
        rubric: "Debe explicar cómo los sesgos históricos pueden perpetuarse, el impacto en la justicia, y proponer medidas de mitigación",
        points: 20
      }
    ],
    practicalExercise: {
      title: "Desarrollo de Política de IA Ética",
      description: "Cree una política de uso ético de IA para su práctica legal",
      prompt: "Desarrolle una política completa de uso ético de IA para una firma de abogados de tamaño mediano (10-15 abogados) que incluya: 1) Principios rectores, 2) Procedimientos de verificación, 3) Política de confidencialidad y manejo de datos, 4) Protocolo de consentimiento del cliente, 5) Proceso de supervisión y auditoría.",
      expectedOutputs: [
        "Documento de política con secciones claras",
        "Formulario de consentimiento para clientes",
        "Checklist de verificación para uso de IA",
        "Procedimiento de respuesta ante incidentes"
      ],
      evaluationCriteria: [
        "Alineación con normativa colombiana",
        "Practicidad y aplicabilidad",
        "Completitud de los procedimientos",
        "Consideración de diferentes escenarios de riesgo"
      ]
    }
  },
  {
    id: "advanced-implementation",
    title: "Implementación Avanzada y ROI",
    shortTitle: "Avanzado",
    description: "Estrategias de implementación escalable y medición de retorno de inversión",
    estimatedTime: "60 min",
    difficulty: "Avanzado",
    xpReward: 40,
    badgeName: "Implementador Experto",
    icon: Zap,
    iconColor: "text-red-500",
    content: [
      `## 1. Estrategia de Implementación de IA Legal

La implementación exitosa de IA en una práctica legal requiere una estrategia bien planificada que considere personas, procesos y tecnología.

### Fases de Implementación

**Fase 1: Evaluación (2-4 semanas)**
- Auditar procesos actuales
- Identificar oportunidades de automatización
- Evaluar madurez tecnológica del equipo
- Definir objetivos medibles

**Fase 2: Piloto (4-8 semanas)**
- Seleccionar 1-2 casos de uso de alto impacto
- Implementación controlada con grupo pequeño
- Medición de métricas iniciales
- Iteración basada en feedback

**Fase 3: Expansión (2-3 meses)**
- Ampliar a otros casos de uso
- Capacitación del equipo completo
- Integración con flujos de trabajo existentes
- Establecer procesos de mejora continua

**Fase 4: Optimización (continuo)**
- Refinamiento basado en datos
- Exploración de nuevas aplicaciones
- Actualización tecnológica periódica`,

      `## 2. Análisis de Retorno de Inversión (ROI)

### Cálculo del ROI en IA Legal

\`\`\`
ROI = (Beneficio Neto / Inversión Total) × 100

Donde:
- Beneficio Neto = Ahorro de costos + Ingresos adicionales - Costos de implementación
- Inversión Total = Licencias + Capacitación + Tiempo de implementación
\`\`\`

### Ejemplo Práctico

**Firma de 5 abogados implementando automatización de contratos**

**Inversión**:
- Licencia plataforma: $500.000/mes = $6.000.000/año
- Capacitación inicial: $2.000.000
- Tiempo de configuración (40 horas): $2.000.000
- **Total inversión año 1**: $10.000.000

**Beneficios**:
- Tiempo ahorrado: 400 horas/año × $80.000/hora = $32.000.000
- Reducción de errores: $5.000.000/año
- Capacidad adicional: 20% más casos = $15.000.000
- **Total beneficios año 1**: $52.000.000

**ROI año 1**: (52M - 10M) / 10M × 100 = **420%**`,

      `## 3. Métricas Clave de Desempeño (KPIs)

### Métricas de Eficiencia
| Métrica | Fórmula | Meta |
|---------|---------|------|
| Tiempo de generación de documentos | Tiempo con IA / Tiempo manual | <25% |
| Tasa de errores | Errores con IA / Errores manual | <10% |
| Documentos procesados/hora | Docs/hora actual vs. anterior | +200% |

### Métricas de Calidad
| Métrica | Fórmula | Meta |
|---------|---------|------|
| Satisfacción del cliente | Encuesta NPS | >8/10 |
| Revisiones requeridas | Revisiones/documento | <1.5 |
| Precisión de análisis | Hallazgos correctos / Total | >95% |

### Métricas de Adopción
| Métrica | Fórmula | Meta |
|---------|---------|------|
| Tasa de uso | Usuarios activos / Total usuarios | >80% |
| Funciones utilizadas | Features usados / Total features | >60% |
| Consultas al sistema | Consultas/usuario/mes | Creciente |`,

      `## 4. Gestión del Cambio Organizacional

### Resistencia al Cambio
Los abogados pueden ser reacios a adoptar nuevas tecnologías. Las preocupaciones comunes incluyen:

- "La IA va a reemplazar mi trabajo"
- "No tengo tiempo para aprender nuevas herramientas"
- "El toque personal se va a perder"
- "¿Y si la IA comete errores graves?"

### Estrategias de Adopción

**1. Comunicación clara del propósito**
- Enfatizar que la IA es asistente, no reemplazo
- Mostrar cómo liberará tiempo para trabajo de mayor valor
- Compartir casos de éxito de otras firmas

**2. Capacitación progresiva**
- Empezar con funciones simples de alto impacto
- Mentorías entre usuarios avanzados y principiantes
- Sesiones prácticas, no solo teóricas

**3. Quick wins**
- Seleccionar primeros casos de uso con éxito casi garantizado
- Celebrar y comunicar los logros
- Permitir que los escépticos vean resultados reales

**4. Soporte continuo**
- Canales de ayuda dedicados
- Sesiones periódicas de optimización
- Feedback loop para mejoras`,

      `## 5. Tendencias Futuras y Preparación

### Tendencias en IA Legal (2025-2030)
- **Agentes autónomos**: IAs que ejecutan secuencias complejas de tareas
- **Análisis multimodal**: Procesamiento de audio, video, imágenes en casos legales
- **Integración profunda**: IA integrada en cada herramienta de trabajo
- **Personalización extrema**: IAs entrenadas específicamente para cada firma

### Preparándose para el Futuro

**Inversión en competencias**:
1. Pensamiento crítico sobre outputs de IA
2. Ingeniería de prompts avanzada
3. Comprensión básica de cómo funcionan los modelos
4. Ética y regulación de IA

**Infraestructura necesaria**:
- Datos organizados y accesibles
- Procesos documentados
- Cultura de innovación
- Presupuesto para experimentación

### Conclusión: El Abogado del Futuro

El abogado exitoso del futuro será aquel que:
✓ Domina las herramientas de IA como extensión de su práctica
✓ Mantiene su juicio profesional y ético como diferenciador
✓ Se adapta continuamente a nuevas tecnologías
✓ Usa la IA para ofrecer mejor servicio, no solo más barato
✓ Combina expertise legal con competencia tecnológica

**¡Felicidades por completar esta certificación! Ahora tienes las herramientas para liderar la transformación digital de tu práctica legal.**`
    ],
    learningObjectives: [
      "Diseñar una estrategia de implementación de IA por fases para una práctica legal",
      "Calcular y proyectar el ROI de inversiones en tecnología de IA",
      "Definir y monitorear KPIs relevantes para medir el éxito de la implementación",
      "Aplicar técnicas de gestión del cambio para facilitar la adopción de IA",
      "Identificar tendencias futuras y preparar la práctica para la evolución tecnológica"
    ],
    validationQuestions: [
      {
        id: "q1",
        question: "En una implementación de IA legal, ¿cuál es el orden correcto de las fases?",
        type: "multiple_choice",
        options: [
          "Piloto → Evaluación → Expansión → Optimización",
          "Evaluación → Piloto → Expansión → Optimización",
          "Expansión → Piloto → Evaluación → Optimización",
          "Optimización → Evaluación → Piloto → Expansión"
        ],
        correctAnswer: 1,
        points: 10
      },
      {
        id: "q2",
        question: "Calcule el ROI para el siguiente escenario: Inversión total de $15.000.000, ahorro de tiempo valorado en $40.000.000/año, reducción de errores $8.000.000/año, ingresos adicionales $12.000.000/año. Muestre su cálculo.",
        type: "practical",
        rubric: "Debe aplicar correctamente la fórmula de ROI, mostrar el cálculo paso a paso, y interpretar el resultado",
        points: 20
      },
      {
        id: "q3",
        question: "Desarrolle un plan de implementación de 6 meses para introducir IA de análisis de contratos en una firma de 8 abogados, incluyendo cronograma, métricas, y estrategia de gestión del cambio.",
        type: "practical",
        rubric: "Debe incluir cronograma detallado con hitos, métricas específicas para cada fase, y al menos 3 estrategias concretas de gestión del cambio",
        points: 35
      }
    ],
    practicalExercise: {
      title: "Plan Estratégico de Transformación Digital",
      description: "Desarrolle un plan completo de implementación de IA para su firma o departamento",
      prompt: "Cree un plan estratégico de 12 meses para la implementación de IA en su práctica legal que incluya: 1) Diagnóstico de situación actual, 2) Objetivos SMART para el año, 3) Cronograma de implementación por fases, 4) Presupuesto estimado y proyección de ROI, 5) KPIs de seguimiento, 6) Plan de gestión del cambio, 7) Riesgos identificados y mitigación.",
      expectedOutputs: [
        "Documento estratégico de 5-7 páginas",
        "Cronograma visual (Gantt o similar)",
        "Presupuesto con cálculo de ROI",
        "Dashboard de KPIs propuestos"
      ],
      evaluationCriteria: [
        "Alineación con objetivos de negocio",
        "Realismo del plan y presupuesto",
        "Completitud de los elementos requeridos",
        "Consideración de factores humanos y organizacionales"
      ]
    }
  }
];
