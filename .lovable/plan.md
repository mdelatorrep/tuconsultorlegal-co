

# Plan: Mejoras de Usabilidad basadas en Pruebas de Usuario

## Resumen
8 ajustes concretos para mejorar la conversión y experiencia del usuario nuevo en la plataforma.

---

## Cambios

### 0. Propuesta de valor clara en HomePage + CTA directo
**Archivo:** `src/components/HomePage.tsx`
- Agregar un subtítulo concreto debajo del hero que liste 3-4 beneficios tangibles (ej: "Gestiona casos, investiga jurisprudencia, redacta documentos con IA")
- Agregar un segundo CTA directo: "Crear Cuenta Gratis" que lleve a `/auth-abogados`
- Hacer el CTA principal más descriptivo: "Conoce las herramientas" en vez de "Explorar Praxis Hub"

### 1. Registro por defecto en /auth-abogados
**Archivo:** `src/components/LawyerLogin.tsx` (linea 24)
- Cambiar `useState<ViewMode>('login')` a `useState<ViewMode>('register')`

### 2. Rediseñar onboarding coachmarks
**Archivo:** `src/components/LawyerOnboardingCoachmarks.tsx`
- Reducir los pasos de 6 a 4, enfocándose en: (1) Herramientas IA principales, (2) CRM para gestionar clientes, (3) Misiones diarias para ganar créditos, (4) Sidebar para explorar todo
- Usar descripciones orientadas a beneficio, no a ubicación del botón
- Posicionar el card del coachmark centrado en la pantalla (actualmente flota sin posición fija)

### 3. Clarificar rol de Lexi
**Archivo:** `src/components/dashboard/DashboardWelcome.tsx`
- Agregar una sección breve bajo el welcome: "Lexi, tu asistente IA, te ayuda a investigar, redactar y analizar documentos legales. Encuéntrala en cada herramienta."
- Alternativamente, agregar un chip/badge con tooltip en las herramientas que usan Lexi

### 4. Fix modales sin scroll
**Archivo:** `src/components/ui/alert-dialog.tsx` y/o `src/components/ui/dialog.tsx`
- Agregar `max-h-[85vh] overflow-y-auto` al `AlertDialogContent` y `DialogContent` para permitir scroll cuando el contenido excede la pantalla

### 5. Sidebar con scroll visible
**Archivo:** `src/components/UnifiedSidebar.tsx` (linea 297)
- El `overflow-y-auto` ya existe en el contenedor del menu, pero falta height constraint. Cambiar el div wrapper a usar `flex-1 min-h-0 overflow-y-auto` para que el contenedor calcule correctamente el espacio disponible y muestre scrollbar

### 6. QuickToolsGrid con feature flags y posición superior
**Archivo:** `src/components/dashboard/QuickToolsGrid.tsx`
- Importar y usar `useFeatureFlags` para filtrar tools por `isEnabled(tool.view)`
- Remover tools deshabilitadas del grid

**Archivo:** `src/components/LawyerDashboardPage.tsx` (linea ~960-1040)
- Mover `QuickToolsGrid` arriba en el dashboard, justo después del Welcome+DailyProgress, antes de SmartSearch

### 7. Fix botones CRMOnboarding
**Archivo:** `src/components/lawyer-modules/CRMModule.tsx` (lineas 96-101)
- Cambiar `onViewChange('profile')` a `onViewChange('public-profile')` (el view correcto)
- Implementar `onOpenClients` para cambiar al tab "clientes" del CRM
- Implementar `onOpenCases` para cambiar al tab "procesos" del CRM
- Esto requiere hacer el tab activo del CRM controlable via state, pasando un setter desde el Tabs component

---

## Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `src/components/HomePage.tsx` | CTAs claros y propuesta de valor concreta |
| `src/components/LawyerLogin.tsx` | Default a registro |
| `src/components/LawyerOnboardingCoachmarks.tsx` | Rediseño de pasos |
| `src/components/dashboard/DashboardWelcome.tsx` | Explicar Lexi |
| `src/components/ui/alert-dialog.tsx` | Scroll en modales |
| `src/components/ui/dialog.tsx` | Scroll en modales |
| `src/components/UnifiedSidebar.tsx` | Fix scroll sidebar |
| `src/components/dashboard/QuickToolsGrid.tsx` | Feature flags filter |
| `src/components/LawyerDashboardPage.tsx` | Reordenar dashboard, QuickTools arriba |
| `src/components/lawyer-modules/CRMModule.tsx` | Fix onboarding buttons |
| `src/components/lawyer-modules/crm/CRMOnboarding.tsx` | Sin cambios directos |

