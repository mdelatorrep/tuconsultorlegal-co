
# Simplificación Radical del CRM

## Diagnóstico
- 12 sub-vistas en 4 categorías para 3 clientes y 3 casos
- Navegación de 2 niveles (tabs + pills) excesivamente compleja
- Funcionalidades fantasma: Comunicaciones (0 datos), Automatización (sin motor real)
- Analytics y Salud sin valor con volumen actual (<20 clientes)
- Leads duplicados en 2 vistas distintas

## Decisiones del Usuario
- **Navegación**: Vista única con secciones (sin tabs ni sub-navegación)
- **Eliminar**: Comunicaciones, Automatización, Analytics, Salud de Clientes
- **Mantener**: Pipeline, Clientes, Casos, Tareas, Leads (pipeline), Documentos, Entidades B2B

## Plan de Implementación

### Fase 1: Reescribir CRMModule.tsx como vista única
**Archivo:** `src/components/lawyer-modules/CRMModule.tsx`

Estructura nueva (scrolleable, sin tabs):
1. **Barra superior**: búsqueda + botón "Nuevo Cliente"
2. **Sección Pipeline**: kanban de casos (colapsable si no hay casos)
3. **Sección Clientes**: lista compacta con acciones rápidas
4. **Sección Leads**: pipeline simplificado (solo si hay leads)
5. **Sección Tareas**: lista de tareas pendientes
6. **Sección Casos**: tabla/lista de casos
7. **Sección Documentos**: acceso rápido (colapsable)
8. **Sección Entidades**: acceso rápido (colapsable)

Cada sección es un `Collapsible` que se puede expandir/colapsar.
Las secciones vacías muestran un CTA minimal en lugar de toda la UI.

### Fase 2: Eliminar archivos muertos
- `CRMCommunicationsView.tsx` → eliminar
- `CRMAutomationView.tsx` → eliminar
- `CRMAnalyticsView.tsx` → eliminar
- `ClientHealthView.tsx` → eliminar
- `CRMLeadsView.tsx` → eliminar (duplicado; mantener LeadPipeline)

### Fase 3: Eliminar stats redundantes
- Quitar cards de stats de cada sub-vista
- Un solo resumen compacto en el header del CRM

### No tocar
- `CasePipelineView.tsx` (kanban funcional)
- `LeadPipeline.tsx` (scoring funcional)
- `CRMClientsView.tsx` (CRUD funcional, simplificar stats)
- `CRMCasesView.tsx` (CRUD funcional)
- `CRMTasksView.tsx` (CRUD funcional)
- `CRMDocumentsView.tsx` (CRUD funcional)
- `CRMEntitiesView.tsx` (CRUD funcional)
- Todos los archivos de detalle: CaseDetailPage, EntityDetailPage, etc.
