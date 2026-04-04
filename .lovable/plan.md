

# Rediseño del Header y Dashboard del Portal de Abogados

## Problema
Actualmente hay **dos headers** cuando el abogado está autenticado: el Header público (Praxis Hub, Para Abogados, Para Ciudadanos, Explorar) y el header interno del dashboard (Inicio, Investigación, Documentos, CRM, Análisis). Esto desperdicia ~100px verticales y confunde la navegación. Además, el dashboard tiene demasiado espacio muerto entre secciones.

## Solución

### 1. Header unificado para abogados autenticados
Cuando el usuario está en el portal de abogados (`currentPage === 'abogados'`), **ocultar el Header público** y usar solo el header interno del dashboard. Esto ya ocurre parcialmente porque `LawyerDashboardPage` tiene su propio layout con sidebar, pero el `Header` de `Index.tsx` sigue renderizándose encima.

**Archivo: `src/pages/Index.tsx`**
- Condicionar el render de `<Header>` para que NO se muestre cuando `currentPage === 'abogados'` y el usuario esté autenticado como abogado.

### 2. Header interno del dashboard con menús desplegables
Reemplazar los botones planos (Investigación, Documentos, CRM, Análisis) por **menús desplegables** agrupados por categoría usando `DropdownMenu`:

- **Investigación** → Investigación Legal, SUIN-Juriscol, Consulta Procesos, Monitor Procesos
- **Documentos** → Redacción, Análisis, Voz
- **CRM** → Clientes y Procesos, Calendario
- **IA** → Predictor, Agentes Especializados, Capacitación

**Archivo: `src/components/LawyerDashboardPage.tsx`** (ambas secciones de header, líneas ~798-838 y ~888-930)
- Reemplazar los `<Button>` individuales por `<DropdownMenu>` con `<DropdownMenuTrigger>` y `<DropdownMenuContent>` que listen las sub-herramientas.
- Cada item del dropdown navega a su vista correspondiente con `setCurrentView()`.
- Indicar visualmente el menú activo cuando cualquiera de sus sub-vistas esté seleccionada.

### 3. Dashboard más compacto
**Archivo: `src/components/LawyerDashboardPage.tsx`** (líneas ~986-1050)
- Reducir spacing de `space-y-4 md:space-y-6 lg:space-y-8` a `space-y-3 md:space-y-4`.
- Combinar Welcome + DailyProgress en una sola fila más compacta con `gap-3` en lugar de `gap-4`.

### 4. Eliminar redundancia del sidebar en dashboard
Dado que el header ahora tiene navegación completa con dropdowns, el sidebar se mantiene pero el header se convierte en el punto de acceso principal.

---

## Estructura del Header resultante (desktop)

```text
[☰] [Logo] [Inicio] [Investigación ▾] [Documentos ▾] [CRM ▾] [IA ▾]     [🔔] [⚡ Tasks]
```

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Index.tsx` | Ocultar Header público cuando está en portal abogados |
| `src/components/LawyerDashboardPage.tsx` | Menús desplegables en header, reducir spacing dashboard |

