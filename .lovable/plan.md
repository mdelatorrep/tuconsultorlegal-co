

# Plan: Correcciones del Calendario Legal — 3 Hallazgos

## Diagnóstico

### 1. Sincronización en línea con Google Calendar
**Estado actual**: Solo existe exportación de archivos `.ics` — no hay integración con la API de Google Calendar. El abogado debe descargar un archivo, ir a Google Calendar, importarlo manualmente. No hay sincronización bidireccional ni en tiempo real.

**Solución**: Implementar integración OAuth2 con Google Calendar API a través de un Edge Function:
- El abogado conecta su cuenta Google una sola vez (OAuth2 consent flow)
- Los eventos se sincronizan automáticamente: al crear/editar/eliminar un evento en la plataforma, se replica en Google Calendar
- Los eventos existentes de Google Calendar se leen y muestran en el calendario de la plataforma
- Se usa el campo `external_calendar_id` (ya existe en la tabla) para mapear eventos

**Flujo técnico**:
1. Edge Function `google-calendar-auth` — maneja el OAuth2 flow (redirect a Google, recibe callback con tokens)
2. Tabla `lawyer_google_tokens` — almacena `access_token`, `refresh_token`, `expires_at` por abogado
3. Edge Function `google-calendar-sync` — CRUD de eventos vía Google Calendar API v3
4. El frontend reemplaza `CalendarSyncOptions.tsx` con un botón "Conectar Google Calendar" y estado de conexión
5. Al crear/editar eventos, se llama también a la API de Google Calendar

**Requiere**: Configurar un proyecto en Google Cloud Console con OAuth2 credentials. Se necesitará almacenar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` como secrets de Supabase.

### 2. Fechas de inicio no se pueden cambiar
**Causa raíz**: En `NewEventDialog.tsx` línea 36, `startDate` se inicializa con `selectedDate || new Date()`. El `Popover` con `Calendar` debería permitir cambiarla, pero hay un problema de estado: al abrir el diálogo desde `SmartLegalCalendar`, el `selectedDate` se pasa como prop inicial y se usa para inicializar `useState`. Pero `useState` solo usa el valor inicial una vez — si el diálogo se abre/cierra sin desmontar, el estado persiste con la fecha anterior.

**Solución**: Agregar un `useEffect` que actualice `startDate` cuando `selectedDate` prop cambie, y asegurar que el Popover funcione correctamente cerrándose al seleccionar una fecha.

### 3. Problemas de zona horaria (GMT)
**Causa raíz**: Múltiples problemas de timezone:
- `new Date('2024-03-15')` (formato YYYY-MM-DD) se interpreta como UTC midnight. En Colombia (GMT-5), esto muestra el día anterior.
- `format(startDate, 'yyyy-MM-dd')` al guardar está bien porque `format` usa la hora local, pero al leer con `new Date(event.start_date)` se vuelve a interpretar como UTC.
- `isSameDay(new Date(event.start_date), date)` compara una fecha UTC con una fecha local — falla.

**Solución**: 
- Crear helpers `parseDateLocal()` y `formatDateLocal()` para evitar conversiones UTC
- Usar `new Date(year, month-1, day)` al parsear strings YYYY-MM-DD
- Aplicar en `SmartLegalCalendar.tsx`, `NewEventDialog.tsx`, `DeadlineCalculator.tsx`, y `CalendarSyncOptions.tsx`

---

## Archivos a crear/modificar

| Archivo | Cambios |
|---|---|
| `src/lib/date-utils.ts` | **Nuevo** — helpers `parseDateLocal`, `formatDateLocal`, `isSameDayLocal` |
| `src/components/calendar/NewEventDialog.tsx` | Fix: `useEffect` para sync `selectedDate` prop, close Popover on select, usar date helpers, agregar campos de hora cuando `allDay=false` |
| `src/components/calendar/SmartLegalCalendar.tsx` | Usar `parseDateLocal` en `getEventsForDate`, `isHoliday`, comparaciones. Agregar estado de conexión Google Calendar. Reemplazar botón "Sincronizar" |
| `src/components/calendar/CalendarSyncOptions.tsx` | Reescribir: botón "Conectar Google Calendar" con OAuth flow, estado de conexión, opción de desconectar. Mantener export iCal como fallback |
| `src/components/calendar/DeadlineCalculator.tsx` | Usar `parseDateLocal` para fechas |
| `supabase/migrations/xxx.sql` | Crear tabla `lawyer_google_tokens` (lawyer_id, access_token, refresh_token, token_expires_at, calendar_id, connected_at) |
| `supabase/functions/google-calendar-auth/index.ts` | **Nuevo** — OAuth2 flow: genera URL de autorización, maneja callback, almacena tokens |
| `supabase/functions/google-calendar-sync/index.ts` | **Nuevo** — CRUD eventos: list, create, update, delete en Google Calendar. Refresh token automático |
| `supabase/config.toml` | Agregar config para las 2 nuevas edge functions |

## Secrets necesarios
- `GOOGLE_CLIENT_ID` — del proyecto Google Cloud
- `GOOGLE_CLIENT_SECRET` — del proyecto Google Cloud

**Nota importante**: Para la integración con Google Calendar, el usuario necesitará:
1. Crear un proyecto en Google Cloud Console
2. Habilitar la Google Calendar API
3. Configurar OAuth2 credentials con el redirect URI de Supabase
4. Proporcionar Client ID y Client Secret

## Alcance
- 2 archivos nuevos (edge functions) + 1 archivo nuevo (date-utils)
- 5 archivos modificados
- 1 migración de DB
- 2 secrets a configurar

