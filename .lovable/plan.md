

# Plan: Reestructuración del CRM Legal

## Problema
1. **Demasiadas secciones colapsables confusas** -- pipeline, clientes, leads, tareas, casos, documentos, entidades = 7 secciones donde el abogado se pierde
2. **Conceptos duplicados** -- "Pipeline de Casos" y "Casos" son lo mismo; "Clientes" y "Entidades" se solapan
3. **IA sin valor real** -- "Segmentación IA" no aporta; el abogado necesita consultar/analizar su CRM con IA
4. **Sin feed de novedades** -- las actividades del portal del cliente y del sistema están enterradas

## Solución: CRM con Tabs principales

Reemplazar las 7 secciones colapsables por **5 tabs claros**:

```text
┌─────────────────────────────────────────────────────┐
│ [Stats bar]  [Buscar...]  [🤖 Consultar IA]        │
├─────────────────────────────────────────────────────┤
│ Novedades │ Procesos │ Clientes │ Tareas │ Más ▾   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  (contenido del tab activo)                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab 1: Novedades (default)
- Feed cronológico unificado con actividades recientes:
  - Documentos subidos por clientes desde el portal
  - Documentos vistos por clientes
  - Citas agendadas por clientes
  - Cambios de estado en procesos
  - Tareas próximas a vencer
- Queries: `client_shared_documents`, `client_appointments`, `crm_tasks` (due_date próximo)

### Tab 2: Procesos (unifica "Pipeline" + "Casos")
- Vista dual: Kanban pipeline (actual `CasePipelineView`) + Lista/tabla (`CRMCasesView`)
- Toggle entre vistas con botones
- Terminología unificada: siempre "Procesos"

### Tab 3: Clientes (unifica "Clientes" + "Entidades" + "Leads")
- Sub-tabs internos: Clientes | Empresas | Contactos Potenciales
- Reutiliza `CRMClientsView`, `CRMEntitiesView`, `LeadPipeline` existentes

### Tab 4: Tareas
- Contenido actual de `CRMTasksView` + `CRMDocumentsView` (sub-tabs: Tareas | Documentos)

### Tab 5: Más (dropdown o sub-tabs)
- Documentos (si no va en Tareas)
- Cualquier funcionalidad futura

### IA Conversacional del CRM
Reemplazar "Segmentación IA" por un **diálogo de consulta IA**:
- Botón "Consultar IA" abre un panel/dialog de chat
- El abogado pregunta en lenguaje natural sobre su CRM: "¿Cuántos procesos tengo en juzgados de Bogotá?", "¿Qué clientes no tienen procesos activos?", "Resume mis tareas pendientes por prioridad"
- Edge function `crm-ai-assistant` que recibe la pregunta, consulta datos del CRM del abogado, y responde con análisis
- Usa el modelo configurado en `system_config` vía la arquitectura centralizada existente

## Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/components/lawyer-modules/CRMModule.tsx` | **Reescribir** -- reemplazar collapsibles por Tabs de Radix. Stats + search + AI button en toolbar. 5 tabs |
| `src/components/lawyer-modules/crm/CRMNewsFeed.tsx` | **Nuevo** -- feed de novedades unificado (portal activity + system events) |
| `src/components/lawyer-modules/crm/CRMAIChat.tsx` | **Nuevo** -- diálogo de chat IA para consultar el CRM |
| `supabase/functions/crm-ai-assistant/index.ts` | **Nuevo** -- edge function que recibe pregunta, consulta datos CRM del abogado, genera respuesta con IA |
| `src/components/lawyer-modules/crm/CasePipelineView.tsx` | Renombrar labels a "Procesos" |
| `src/components/lawyer-modules/crm/CRMCasesView.tsx` | Renombrar labels a "Procesos" |

## Edge Function: `crm-ai-assistant`
- Recibe: `{ lawyerId, question }`
- Consulta `crm_cases`, `crm_clients`, `crm_tasks`, `crm_leads`, `crm_entities` del abogado
- Construye contexto JSON con resumen de datos
- Envía a Lovable AI Gateway con prompt de sistema: "Eres un asistente de CRM legal. Analiza los datos y responde la pregunta del abogado."
- Retorna respuesta en texto
- Costo: usa `crm_ai` credit tool type existente

## Detalles técnicos
- Tabs con `@radix-ui/react-tabs` (ya instalado)
- No se eliminan componentes existentes, solo se reorganizan dentro de tabs
- El feed de novedades reutiliza la lógica de `ClientPortalActivity` pero a nivel global (todos los clientes del abogado)
- No requiere cambios de esquema DB

