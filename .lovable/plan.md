

# Ajustes al Dashboard: Progreso Diario compacto + Tooltips en herramientas

## Cambios

### 1. Compactar DailyProgress (`src/components/credits/DailyProgress.tsx`)
El componente actual ocupa demasiado espacio vertical con secciones separadas para balance, barra de progreso, lista de tareas, alerta de pendientes y botón CTA. Se rediseñará como una barra horizontal compacta:

- **Layout horizontal**: Una sola fila con balance, barra de progreso inline, streak y botón CTA.
- **Eliminar lista de tareas expandida**: Las misiones individuales se muestran solo como conteo (ej: "1/2 misiones") junto a la barra de progreso.
- **Eliminar bloques de alerta**: Los CTAs de "misión pendiente" y "recompensas disponibles" se comprimen a badges inline.
- **Resultado**: De ~300px de altura a ~60px.

### 2. Tooltips en QuickToolsGrid (`src/components/dashboard/QuickToolsGrid.tsx`)
- Agregar `title` attribute a cada card de herramienta con el nombre completo.
- Mejor aún: usar el componente `Tooltip` de shadcn para mostrar el nombre completo al hacer hover.
- Eliminar `truncate` del texto o mantenerlo con el tooltip como respaldo.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/credits/DailyProgress.tsx` | Rediseño a barra compacta horizontal |
| `src/components/dashboard/QuickToolsGrid.tsx` | Agregar Tooltip a cada herramienta |

