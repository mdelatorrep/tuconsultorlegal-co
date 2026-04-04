

# Auditoría UI: Reducir bloques hero y optimizar espacio en módulos

## Problema

El módulo de **Investigación Legal** tiene un hero gigante (~50% de la pantalla) con título grande, descripción, y 3 stat cards decorativas antes de que el usuario llegue al input de trabajo. Otros módulos como **Estrategia** tienen cards con gradientes excesivos, sombras `shadow-2xl`, y tamaños de texto/botones sobredimensionados. Todo esto empuja el contenido funcional debajo del fold.

## Módulos afectados y diagnóstico

| Módulo | Problema |
|--------|----------|
| **ResearchModule** | Hero de ~300px con icono grande, título `text-3xl`, descripción `text-lg`, + 3 stat cards. El input real queda fuera de vista. |
| **StrategizeModule** | Card con gradiente púrpura, `shadow-2xl`, título `text-2xl`, textarea de 7 rows, botón `h-14`. Decorativo en exceso. |
| **SuinJuriscolModule** | Ya es compacto, no requiere cambios significativos. |
| **AnalyzeModule** | Ya es compacto (upload directo). Sin cambios. |
| **DraftModule** | Ya es compacto con tabs. Sin cambios. |
| **CasePredictorModule** | Header simple + grid. Aceptable. |
| **ProcessQueryModule** | Por revisar en detalle, pero estructura similar a SUIN. |

## Cambios propuestos

### 1. ResearchModule.tsx — Eliminar hero, compactar header

- **Eliminar** el bloque hero completo (líneas 553-602): el gradiente, el icono grande de 10x10, el título `text-3xl`, la descripción `text-lg`, y las 3 stat cards decorativas (investigaciones completadas, tiempo promedio, precisión IA).
- **Eliminar** la decoración excesiva de la card de búsqueda: quitar `border-0 shadow-2xl bg-gradient-to-br`, el icono con gradiente de 6x6, el título `text-2xl` con clip-text.
- **Reemplazar** con un `CardHeader` simple: icono pequeño + título `text-base` + descripción corta en una línea.
- El textarea y los controles quedan inmediatamente visibles al abrir el módulo.

### 2. StrategizeModule.tsx — Simplificar card de input

- **Eliminar** `border-0 shadow-2xl bg-gradient-to-br from-white via-white to-purple-500/5` y el overlay de gradiente absoluto.
- **Simplificar** el header: quitar gradiente púrpura del icono y del título `text-2xl`. Usar icono estándar + título `text-base`.
- **Reducir** textarea de `rows={7}` a `rows={4}`.
- **Reducir** botón de `h-14 text-lg` a tamaño estándar.
- **Eliminar** colores hardcodeados (`purple-500`, `purple-600`, `purple-700`) y usar tokens del sistema (`primary`).

### 3. Patrón general a aplicar

Todos los módulos con cards de input deberían seguir este patrón compacto:

```text
┌─────────────────────────────────────┐
│ 🔍 Título del módulo    [Costo: 3] │
│ Descripción breve en una línea      │
├─────────────────────────────────────┤
│ [textarea / input / upload]         │
│ [filtros en fila si aplica]         │
│ [Botón de acción]                   │
└─────────────────────────────────────┘
```

No hero sections. No stat cards decorativas. No gradientes ni sombras excesivas. El input funcional debe estar visible sin scroll.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `ResearchModule.tsx` | Eliminar hero + stat cards + decoración de card de búsqueda |
| `StrategizeModule.tsx` | Simplificar card, reducir textarea, normalizar colores |

## Sin cambios necesarios

- `AnalyzeModule.tsx` — ya compacto
- `DraftModule.tsx` — ya compacto con tabs
- `SuinJuriscolModule.tsx` — ya compacto
- `CasePredictorModule.tsx` — header simple aceptable
- `ProcessQueryModule.tsx` / `ProcessMonitorModule.tsx` — estructura funcional directa

