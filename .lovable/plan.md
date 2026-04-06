

## Plan: Funnel AARRR con Filtros Temporales y Estadisticas de Metricas

### Resumen
Crear un nuevo componente `AARRRFunnelDashboard` dentro de Inteligencia de Negocio que muestre el funnel AARRR (Acquisition, Activation, Revenue, Retention, Referral) con filtros de periodo (diario, semanal, mensual, trimestral) y estadisticas detalladas por cada etapa.

### Componente: `AARRRFunnelDashboard.tsx`

**Filtros temporales** (tabs o select):
- Hoy / Ultimos 7 dias / Ultimos 30 dias / Ultimos 90 dias / Custom range

**Funnel visual AARRR** con barras horizontales proporcionales mostrando:
1. **Acquisition**: Nuevos registros (lawyer_profiles created_at en periodo), leads generados (crm_leads)
2. **Activation**: Abogados que usaron al menos 1 herramienta IA (credit_transactions type=consumption), completaron perfil (phone_number/specialization no null)
3. **Revenue**: Documentos pagados (document_tokens status pagado/descargado), creditos comprados (credit_transactions type=purchase), valor total
4. **Retention**: Abogados activos vs at_risk vs churned (basado en ultima actividad), tasa de retencion por periodo
5. **Referral**: Referidos generados (lawyer_referrals), codigos usados

**Estadisticas por periodo** (cards comparativas):
- Cada metrica AARRR muestra valor actual vs periodo anterior con % cambio
- Tabla de tendencia con sparklines o mini-graficos
- Desglose diario/semanal segun filtro seleccionado

**Datos consultados** (todas tablas existentes, sin migracion):
- `lawyer_profiles` (registros, perfil completo)
- `credit_transactions` (consumo, compras)
- `document_tokens` (docs pagados)
- `crm_leads` (leads)
- `lawyer_referrals` (referidos)

### Cambios

| Archivo | Accion |
|---------|--------|
| `src/components/admin/AARRRFunnelDashboard.tsx` | Crear componente completo |
| `src/components/admin/AdminSidebar.tsx` | Agregar item "Funnel AARRR" en seccion BI |
| `src/components/AdminPage.tsx` | Agregar case 'aarrr-funnel' en renderCurrentView + import |

### Diseno del componente

- Header con selector de periodo (Tabs: Hoy / 7d / 30d / 90d)
- Funnel visual: 5 barras horizontales con degradado, mostrando conversion entre etapas
- Grid de KPI cards debajo: cada etapa AARRR con valor, cambio %, icono
- Seccion de estadisticas detalladas expandibles por etapa
- Comparativa periodo actual vs anterior (badge verde/rojo con %)

No requiere migracion de base de datos - usa tablas existentes.

