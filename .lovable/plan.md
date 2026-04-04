

## Plan: Sistema de Reporte de Problemas para Abogados + Gestión Admin

### Concepto de UX

La mejor forma no intrusiva de implementar esto es un **botón flotante discreto** (estilo "feedback widget") en el dashboard del abogado, que abra un formulario simple tipo drawer/modal. No va en el sidebar para no agregar ruido visual permanente. El botón usa un icono sutil (como un bug o bandera) y se posiciona en la esquina inferior izquierda, opuesto al QuickActionsBar que ya está en la inferior derecha.

Desde el admin, se agrega una nueva sección "Reportes de Problemas" en la categoría "Comunicación" del sidebar.

### Flujo del Abogado

1. Ve un botón flotante discreto con icono de bandera/bug + tooltip "Reportar problema"
2. Al hacer clic, abre un dialog compacto con:
   - **Categoría** (select): Error en herramienta, Problema de rendimiento, Datos incorrectos, Sugerencia, Otro
   - **Herramienta afectada** (select opcional): lista de módulos (Consulta Jurídica, Redacción Asistida, etc.)
   - **Descripción** (textarea, requerido)
   - **Captura de pantalla** (upload opcional, usando el bucket existente)
3. Se envía y el abogado ve confirmación con un número de ticket
4. Puede ver sus reportes previos desde Configuración (cuenta) con estado actual

### Flujo del Admin

1. Nueva sección "Reportes" en AdminSidebar bajo "Comunicación"
2. Vista con tabla de reportes: fecha, abogado, categoría, herramienta, estado, prioridad
3. Puede cambiar estado (nuevo, en revisión, resuelto, cerrado) y agregar notas internas
4. Badge con conteo de reportes nuevos sin revisar

### Cambios a implementar

**1. Base de datos** - Nueva tabla `bug_reports`
```sql
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID REFERENCES public.lawyer_profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL, -- 'bug', 'performance', 'data', 'suggestion', 'other'
  affected_tool TEXT, -- módulo afectado
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'in_review', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Con RLS: abogados ven solo los suyos (SELECT, INSERT), admins ven todos (SELECT, UPDATE).

**2. Componente del abogado** - `src/components/lawyer-modules/BugReportButton.tsx`
- Botón flotante discreto en esquina inferior izquierda
- Dialog con formulario de reporte
- Solo visible cuando el usuario tiene sesión activa
- Se renderiza en `LawyerDashboardPage.tsx`

**3. Componente admin** - `src/components/admin/BugReportsManager.tsx`
- Tabla con filtros por estado, categoría y prioridad
- Acciones: cambiar estado, agregar notas, marcar prioridad
- Contador de reportes nuevos

**4. Integración en AdminSidebar**
- Nuevo item "Reportes" con icono `Bug` bajo "Comunicación"
- Badge con conteo de reportes nuevos

**5. Integración en AdminPage**
- Renderizar `BugReportsManager` cuando `currentView === 'bug-reports'`

**6. Integración en LawyerDashboardPage**
- Agregar `BugReportButton` como componente flotante

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/...bug_reports.sql` | Crear tabla + RLS |
| `src/components/lawyer-modules/BugReportButton.tsx` | Crear - widget flotante + formulario |
| `src/components/admin/BugReportsManager.tsx` | Crear - gestión admin |
| `src/components/LawyerDashboardPage.tsx` | Modificar - agregar BugReportButton |
| `src/components/AdminPage.tsx` | Modificar - agregar vista bug-reports |
| `src/components/admin/AdminSidebar.tsx` | Modificar - agregar item Reportes |

