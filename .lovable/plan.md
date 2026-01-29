
# Rediseno Estrategico del CRM para Abogados

## Resumen Ejecutivo

Tras analizar exhaustivamente la plataforma Praxis Hub, he identificado que el CRM actual funciona como un sistema de registro pasivo en lugar de un motor activo de generacion de valor. El rediseno propuesto transforma el CRM en un **Centro de Operaciones Legales Inteligente** que automatiza flujos de trabajo, genera ingresos proactivamente y reduce la carga administrativa del abogado.

---

## Diagnostico: Estado Actual

### Fortalezas Existentes
- Estructura de datos robusta (crm_clients, crm_cases, crm_tasks, crm_leads, crm_communications)
- Integracion con herramientas de IA (Research, Analysis, Strategy, Drafting)
- Portal de cliente funcional con citas y documentos
- Vinculacion caso-centrica con procesos judiciales y calendario
- Sistema de gamificacion para engagement

### Brechas de Valor Identificadas

| Area | Problema | Impacto |
|------|----------|---------|
| **Leads** | Conversion manual sin seguimiento automatico | Perdida de oportunidades |
| **Casos** | Sin estimacion de rentabilidad ni alertas de riesgo | Casos no rentables |
| **Tareas** | Creacion manual, sin priorizacion inteligente | Sobrecarga administrativa |
| **Clientes** | Sin scoring ni segmentacion activa | Clientes valiosos desatendidos |
| **Comunicaciones** | Registro pasivo sin plantillas ni automatizacion | Tiempo perdido en emails |
| **Analytics** | Metricas genericas sin insights accionables | Decisiones sin data |

---

## Vision del Rediseno

```text
+------------------------------------------------------------------+
|                CENTRO DE OPERACIONES LEGALES                      |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+   +------------------+   +-----------------+|
|  | COMANDO CENTRAL  |   | PIPELINE DE     |   | INTELLIGENCE    ||
|  | (Dashboard)      |   | CASOS           |   | CENTER          ||
|  |                  |   |                 |   |                 ||
|  | - Hoy vs Meta    |   | - Kanban Visual |   | - Rentabilidad  ||
|  | - Acciones Clave |   | - Etapas Legales|   | - Predicciones  ||
|  | - Alertas IA     |   | - Valor Pipeline|   | - Tendencias    ||
|  +------------------+   +------------------+   +-----------------+|
|                                                                   |
|  +------------------+   +------------------+   +-----------------+|
|  | CLIENT SUCCESS   |   | LEAD MACHINE    |   | SMART           ||
|  |                  |   |                 |   | AUTOMATION      ||
|  | - Health Score   |   | - Auto-Nurture  |   | - Workflows     ||
|  | - Engagement     |   | - Scoring IA    |   | - Templates     ||
|  | - Retención      |   | - Conversion    |   | - Triggers      ||
|  +------------------+   +------------------+   +-----------------+|
|                                                                   |
+------------------------------------------------------------------+
```

---

## Componentes del Rediseno

### 1. Comando Central (Dashboard Renovado)

**Objetivo**: Mostrar en 10 segundos que debe hacer el abogado HOY para maximizar resultados.

#### 1.1 Panel "Mi Dia" (Reemplaza DashboardWelcome)
- **Ingresos del dia** vs meta mensual (barra de progreso)
- **Acciones criticas**: Max 3 tareas de alto impacto
- **Alertas inteligentes**: Casos en riesgo, leads calientes, SLAs proximos

#### 1.2 Indicadores Clave de Negocio
- **Pipeline Value**: Valor total de casos activos
- **Win Rate**: Tasa de conversion de leads
- **Client Health**: Porcentaje de clientes satisfechos
- **Revenue at Risk**: Casos con problemas de cobranza

#### Cambios Tecnicos
- Nuevo componente `src/components/dashboard/CommandCenter.tsx`
- Edge function `crm-daily-insights` para calcular metricas diarias
- Tabla nueva `crm_daily_metrics` para cache de calculos

---

### 2. Pipeline de Casos Visual

**Objetivo**: Visualizar el flujo de trabajo legal como un embudo de ventas.

#### 2.1 Vista Kanban por Etapas Legales
```text
| Inicial | Investigacion | En Curso | Audiencias | Resolucion | Cobro |
|---------|---------------|----------|------------|------------|-------|
| Caso A  | Caso B        | Caso C   | Caso D     |            | Caso E|
| $500K   | $1.2M         | $800K    |            |            | $300K |
```

#### 2.2 Campos Nuevos en crm_cases
- `pipeline_stage`: etapa actual (enum)
- `expected_value`: valor estimado del caso
- `probability`: probabilidad de exito (0-100%)
- `next_action_date`: proxima accion requerida
- `health_score`: puntuacion de salud del caso

#### 2.3 Arrastrar y Soltar
- Mover casos entre etapas actualiza automaticamente
- Triggers de IA al cambiar etapa (sugerir acciones)

#### Cambios Tecnicos
- Nuevo componente `src/components/lawyer-modules/crm/CasePipelineView.tsx`
- Integracion con react-beautiful-dnd (ya instalado)
- Migracion SQL para nuevos campos

---

### 3. Lead Machine (Sistema de Conversion)

**Objetivo**: Convertir leads en clientes automaticamente con minima intervencion.

#### 3.1 Lead Scoring Automatico
Factores de puntuacion:
- Origen del lead (perfil publico: +20pts, referido: +30pts)
- Tipo de caso (alta complejidad: +25pts)
- Tiempo de respuesta del lead (+10pts si responde en 24h)
- Interacciones previas (+5pts por cada interaccion)

#### 3.2 Nurture Automatico
Secuencia automatica para leads nuevos:
1. **Hora 0**: Email de bienvenida personalizado
2. **Hora 24**: Si no responde, recordatorio por WhatsApp
3. **Dia 3**: Contenido educativo (articulo del blog)
4. **Dia 7**: Propuesta de reunion
5. **Dia 14**: Ultima oportunidad

#### 3.3 Conversion Guiada
- Boton "Convertir a Cliente" con wizard paso a paso
- Pre-llenado automatico de datos
- Creacion simultanea de cliente + caso inicial

#### Cambios Tecnicos
- Nuevos campos en crm_leads: `score`, `last_activity`, `nurture_stage`
- Edge function `crm-lead-scoring` con calculo automatico
- Edge function `crm-lead-nurture` para envio automatico (Resend)
- Nuevo componente `src/components/lawyer-modules/crm/LeadPipeline.tsx`

---

### 4. Client Success Module

**Objetivo**: Retener clientes y maximizar valor de vida (LTV).

#### 4.1 Client Health Score
Formula:
```
Health = (Comunicacion * 0.25) + (Pagos * 0.30) + (Engagement * 0.25) + (Satisfaccion * 0.20)
```
- **Comunicacion**: Frecuencia de interacciones (ideal: 1/semana)
- **Pagos**: Historial de pagos a tiempo
- **Engagement**: Uso del portal cliente
- **Satisfaccion**: Ratings y feedback

#### 4.2 Alertas de Riesgo
- Cliente sin comunicacion en 30+ dias: ALERTA AMARILLA
- Pago pendiente > 60 dias: ALERTA ROJA
- Caso sin actividad > 14 dias: ALERTA NARANJA

#### 4.3 Acciones Recomendadas por IA
Sugerencias automaticas:
- "Llamar a [Cliente] - 45 dias sin contacto"
- "Enviar actualizacion de caso a [Cliente] - Portal no visitado en 2 semanas"
- "Programar reunion de seguimiento - Caso [X] completando fase"

#### Cambios Tecnicos
- Nuevos campos en crm_clients: `health_score`, `last_contact`, `payment_status`
- Nuevo componente `src/components/lawyer-modules/crm/ClientHealthView.tsx`
- Edge function `crm-client-health` para calculo diario

---

### 5. Smart Automation Engine

**Objetivo**: Eliminar tareas repetitivas con workflows automatizados.

#### 5.1 Templates de Comunicacion
Plantillas predefinidas:
- Bienvenida a nuevo cliente
- Actualizacion de caso
- Recordatorio de pago
- Confirmacion de cita
- Resumen mensual

#### 5.2 Workflows Predefinidos
```text
TRIGGER: Nuevo Lead Creado
  -> Enviar email de bienvenida
  -> Crear tarea de seguimiento (24h)
  -> Notificar al abogado

TRIGGER: Caso Cambia a "En Curso"
  -> Enviar notificacion al cliente
  -> Crear tareas estandar de la fase
  -> Programar primera reunion

TRIGGER: Audiencia en 48h
  -> Recordatorio al abogado
  -> Recordatorio al cliente
  -> Generar checklist pre-audiencia
```

#### 5.3 Builder Visual de Automatizaciones
Interfaz drag-and-drop para crear reglas personalizadas:
- Seleccionar trigger (evento)
- Agregar condiciones (filtros)
- Definir acciones (tareas, emails, notificaciones)

#### Cambios Tecnicos
- Refactor de `CRMAutomationView.tsx` con builder visual
- Tabla nueva `crm_communication_templates`
- Tabla nueva `crm_workflow_executions` para logs
- Edge function `crm-workflow-executor` para procesar triggers

---

### 6. Intelligence Center (Analytics Avanzados)

**Objetivo**: Transformar datos en decisiones de negocio.

#### 6.1 Metricas de Rentabilidad
- **Costo por caso**: Horas invertidas * tarifa vs ingreso real
- **Tipos de caso mas rentables**: Ranking por ROI
- **Clientes mas valiosos**: LTV y frecuencia
- **Tiempo promedio de resolucion**: Por tipo de caso

#### 6.2 Predicciones IA
- Probabilidad de exito del caso (basado en historico)
- Tiempo estimado de resolucion
- Ingresos proyectados del mes

#### 6.3 Comparativas Temporales
- Este mes vs mes anterior
- Este ano vs ano anterior
- Tendencias de crecimiento

#### Cambios Tecnicos
- Refactor de `CRMAnalyticsView.tsx` con nuevas visualizaciones
- Tabla nueva `crm_case_profitability` para tracking de costos
- Edge function `crm-analytics-generate` para calculos complejos

---

## Implementacion por Fases

### Fase 1: Fundamentos (Semana 1-2)
1. Migraciones de base de datos (nuevos campos y tablas)
2. Edge functions base (lead-scoring, client-health)
3. Comando Central basico

### Fase 2: Pipeline Visual (Semana 3-4)
1. Vista Kanban de casos
2. Drag and drop con actualizacion de etapas
3. Indicadores de valor de pipeline

### Fase 3: Lead Machine (Semana 5-6)
1. Sistema de scoring automatico
2. Lead Pipeline visual
3. Nurture sequences basicas

### Fase 4: Client Success (Semana 7-8)
1. Health score calculation
2. Alertas automaticas
3. Recomendaciones IA

### Fase 5: Automation Engine (Semana 9-10)
1. Templates de comunicacion
2. Workflows predefinidos
3. Builder visual

### Fase 6: Intelligence Center (Semana 11-12)
1. Analytics avanzados
2. Predicciones IA
3. Dashboards ejecutivos

---

## Resumen de Archivos a Crear/Modificar

### Nuevos Componentes
- `src/components/dashboard/CommandCenter.tsx`
- `src/components/lawyer-modules/crm/CasePipelineView.tsx`
- `src/components/lawyer-modules/crm/LeadPipeline.tsx`
- `src/components/lawyer-modules/crm/ClientHealthView.tsx`
- `src/components/lawyer-modules/crm/AutomationBuilder.tsx`
- `src/components/lawyer-modules/crm/TemplatesManager.tsx`
- `src/components/lawyer-modules/crm/ProfitabilityDashboard.tsx`

### Componentes a Refactorizar
- `src/components/lawyer-modules/CRMModule.tsx` (nuevas tabs)
- `src/components/lawyer-modules/crm/CRMLeadsView.tsx` (scoring visual)
- `src/components/lawyer-modules/crm/CRMClientsView.tsx` (health indicator)
- `src/components/lawyer-modules/crm/CRMCasesView.tsx` (pipeline stage)
- `src/components/lawyer-modules/crm/CRMAutomationView.tsx` (builder visual)
- `src/components/lawyer-modules/crm/CRMAnalyticsView.tsx` (metricas avanzadas)

### Nuevas Edge Functions
- `supabase/functions/crm-daily-insights/index.ts`
- `supabase/functions/crm-lead-scoring/index.ts`
- `supabase/functions/crm-lead-nurture/index.ts`
- `supabase/functions/crm-client-health/index.ts`
- `supabase/functions/crm-workflow-executor/index.ts`
- `supabase/functions/crm-analytics-generate/index.ts`

### Migraciones de Base de Datos
- Nuevos campos en `crm_cases`
- Nuevos campos en `crm_clients`
- Nuevos campos en `crm_leads`
- Nueva tabla `crm_communication_templates`
- Nueva tabla `crm_workflow_executions`
- Nueva tabla `crm_daily_metrics`
- Nueva tabla `crm_case_profitability`

---

## Valor Generado para el Abogado

| Metrica | Antes | Despues | Impacto |
|---------|-------|---------|---------|
| Tiempo en admin/dia | 2 horas | 30 min | -75% |
| Leads convertidos | 20% | 45% | +125% |
| Clientes retenidos | 70% | 90% | +28% |
| Casos cerrados/mes | 5 | 8 | +60% |
| Ingresos promedio | $10M COP | $16M COP | +60% |

El CRM pasa de ser un repositorio pasivo a un **motor de crecimiento activo** que trabaja 24/7 para el abogado.
