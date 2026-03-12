

# Insights del Control de Procesos Real vs Nuestro CRM

## Hallazgos Clave del Excel

El abogado gestiona **~160+ procesos** organizados por juzgado. Su Excel tiene estas columnas críticas que **no existen en nuestro CRM**:

| Campo del Excel | ¿Existe en nuestro CRM? | Impacto |
|---|---|---|
| **Radicado** (número 23 dígitos) | Parcial — `case_number` con placeholder genérico | Alto |
| **Juzgado de Conocimiento** | No existe | Crítico |
| **Clase de Proceso** (Pertenencia, Ejecutivo, etc.) | `case_type` como texto libre | Alto |
| **Demandante** | No existe | Crítico |
| **Demandado** | No existe | Crítico |
| **Cliente** (diferente al demandante) | Solo `client_id` | Medio |
| **Tarea Pendiente** (nota rápida en la fila) | No existe en la tarjeta | Alto |
| **Asignado A** (MIGUEL, DIANA, LADY) | No existe | Alto |
| **Enlace Hoja de Ruta** (Google Sheet por caso) | No existe | Medio |
| **Expediente Digital** (OneDrive del juzgado) | Ya se agregó parcialmente | Bajo |
| **Agrupación por Juzgado** | No existe — solo lista plana | Alto |
| **Vista tipo tabla/spreadsheet** | No existe — solo tarjetas | Crítico |

## Problemas Principales

1. **El formulario de caso no habla el idioma del abogado**: Pide "Título del Caso" y "Tipo" como texto libre, cuando el abogado piensa en Radicado + Juzgado + Clase de Proceso + Demandante vs Demandado.

2. **No hay campos para las partes procesales**: Demandante y Demandado son datos fundamentales que el abogado consulta constantemente. Nuestro CRM solo tiene "Cliente".

3. **No hay asignación de equipo**: El despacho tiene al menos 3 personas (Miguel, Diana, Lady Patricia). No pueden saber quién lleva cada caso.

4. **La "Tarea Pendiente" no es una tarea formal**: Es una nota rápida/urgente pegada al caso (ej: "URGENTE/PENDIENTE CUMPLIR CON REQUERIMIENTOS", "OJO PREGUNTAR POR EL TRÁMITE"). Nuestro sistema de tareas es demasiado formal para esto.

5. **160+ casos no se pueden ver en tarjetas**: Necesitan una vista de tabla tipo spreadsheet para escanear rápidamente, filtrar por juzgado o asignado.

6. **Los tipos de proceso son específicos**: Pertenencia, Ejecutivo, Reivindicatorio, Responsabilidad Civil Extracontractual, Servidumbre Petrolera, Unión Marital de Hecho, Sucesión, Nulidad y Restablecimiento, Ordinario Laboral, etc.

## Plan de Implementación

### 1. Reestructurar el formulario de Casos
**Archivo**: `CRMCasesView.tsx`

- Reemplazar campo "Título del Caso" por campos estructurados:
  - **Radicado** (input con placeholder de formato: `500064089001-2024-00096-00`)
  - **Juzgado** (input con texto libre, ya que hay decenas de juzgados)
  - **Clase de Proceso** (Select con tipos colombianos: Pertenencia, Ejecutivo, Ejecutivo Singular, Ejecutivo Laboral, Ejecutivo de Alimentos, Reivindicatorio, Responsabilidad Civil Extracontractual, Ordinario Laboral, Sucesión, Unión Marital de Hecho, Nulidad y Restablecimiento del Derecho, Reparación Directa, Divisorio, Simulación, Servidumbre Petrolera, Pertenencia, Designación de Apoyo, Acción Popular, Acción de Tutela, Acción de Cumplimiento, Acción Contractual, Otro)
  - **Demandante** (input texto)
  - **Demandado** (input texto)
  - **Nota Rápida / Tarea Pendiente** (textarea corto, visible en la tarjeta del caso)
  - **Asignado A** (input texto — nombre del miembro del equipo)
  - **Enlace Hoja de Ruta** (URL, opcional)
  - **Enlace Expediente Digital** (URL, opcional)
- El "Título" se auto-genera como: `{Clase de Proceso} - {Demandante} vs {Demandado}`
- Mantener: Cliente, Estado, Prioridad, Fechas

### 2. Agregar vista de tabla
**Archivo**: `CRMCasesView.tsx`

- Agregar toggle entre vista de tarjetas y vista de tabla
- La tabla muestra: Radicado, Juzgado, Clase, Demandante, Demandado, Cliente, Asignado, Nota Pendiente, Estado
- Filtros por: Juzgado, Asignado A, Clase de Proceso, Estado
- Ordenable por columnas
- Esto replica la experiencia del Excel que ya conocen

### 3. Nota rápida visible en tarjeta
**Archivo**: `CRMCasesView.tsx`

- En la vista de tarjetas, mostrar la "Nota Pendiente" con estilo destacado (fondo amarillo/warning si contiene "URGENTE" o "OJO")
- Editable inline sin abrir modal

### 4. Actualizar interface y formData
- Agregar campos: `juzgado`, `clase_proceso`, `demandante`, `demandado`, `asignado_a`, `nota_pendiente`, `enlace_hoja_ruta`, `enlace_expediente`
- Estos campos se guardarán en las columnas existentes de la DB o como metadata JSON si no existen las columnas

## Archivos a Modificar

| Archivo | Cambios |
|---|---|
| `CRMCasesView.tsx` | Reestructurar formulario completo, agregar vista tabla, filtros, nota rápida |
| `CasePipelineView.tsx` | Mostrar radicado y demandante/demandado en las tarjetas del pipeline |
| `CaseTraceabilityModal.tsx` | Mostrar datos procesales en el encabezado |

## Alcance
- 3 archivos modificados
- Se requiere verificar schema de `crm_cases` en Supabase para agregar columnas si es necesario
- Sin dependencias nuevas

