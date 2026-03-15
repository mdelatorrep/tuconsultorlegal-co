

# Plan: Sistema de UTM Tracking para Lanzamiento de Plataforma

## Objetivo
Crear un sistema completo de generación, captura y análisis de UTMs desde el admin portal, enfocado en atribuir correctamente los registros de abogados a las campañas de marketing.

## Flujo completo

```text
Admin genera UTM → URL con params → Abogado llega a /auth-abogados?utm_source=...
→ Frontend captura UTMs al cargar → Se guardan en sessionStorage
→ Al hacer signUp, UTMs se adjuntan como metadata del usuario
→ Se registran en tabla utm_tracking_events
→ Admin ve dashboard con métricas de atribución por campaña
```

## Componentes

### 1. Tabla `utm_campaigns` (campañas creadas desde admin)
- `id`, `name`, `platform` (google, facebook, linkedin, instagram, tiktok, email, whatsapp, referral, other)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `generated_url`, `short_description`, `is_active`, `created_by`, `created_at`
- RLS: solo lectura para service role (se accede vía edge functions desde admin)

### 2. Tabla `utm_tracking_events` (eventos capturados)
- `id`, `session_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `landing_page`, `referrer`, `user_agent`, `ip_address`
- `lawyer_id` (nullable, se llena al registrarse)
- `event_type` (visit, signup, login)
- `created_at`
- RLS: insert para anon (tracking), select para service role

### 3. Frontend: Captura automática de UTMs
- **Archivo**: `src/hooks/useUTMTracking.ts`
- Al cargar cualquier página con `?utm_source=...`, parsear y guardar en `sessionStorage`
- Llamar edge function para registrar evento "visit"
- Integrar en `LawyerLogin.tsx` y `LawyerAuthPage.tsx`

### 4. Frontend: UTMs en signup
- **Modificar**: `src/hooks/useLawyerAuth.ts`
- Al hacer `signUp`, incluir UTMs del sessionStorage en `options.data` (metadata del usuario)
- Después del signup, registrar evento "signup" con `lawyer_id`

### 5. Admin: Generador de UTMs
- **Nuevo componente**: `src/components/admin/UTMCampaignManager.tsx`
- Formulario para crear campañas: nombre, plataforma, parámetros UTM
- Generación automática de URL completa (`/auth-abogados?utm_source=...&utm_medium=...`)
- Botón copiar URL
- Lista de campañas activas con métricas inline (visitas, registros, conversión)

### 6. Admin: Dashboard de Atribución
- Integrado en el mismo componente como tabs: "Campañas" | "Análisis"
- Métricas: visitas por campaña, registros, tasa de conversión, top plataformas
- Gráfico de barras simple por plataforma
- Tabla con desglose por campaña

### 7. Edge Function: `utm-track-event`
- Recibe: `{ sessionId, utmParams, eventType, lawyerId?, landingPage, referrer }`
- Inserta en `utm_tracking_events`
- No requiere JWT (visitantes anónimos)

### 8. Sidebar Admin
- Agregar "UTM & Campañas" en sección "Inteligencia de Negocio" con icono `Link`
- Registrar vista `utm-campaigns` en `AdminPage.tsx`

## Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| **Migration SQL** | Crear tablas `utm_campaigns` y `utm_tracking_events` con RLS |
| `src/hooks/useUTMTracking.ts` | **Nuevo** -- captura y persistencia de UTMs |
| `src/components/admin/UTMCampaignManager.tsx` | **Nuevo** -- generador + dashboard de UTMs |
| `supabase/functions/utm-track-event/index.ts` | **Nuevo** -- edge function para registrar eventos |
| `src/hooks/useLawyerAuth.ts` | Adjuntar UTMs al metadata en signUp |
| `src/components/LawyerAuthPage.tsx` | Integrar `useUTMTracking` |
| `src/components/admin/AdminSidebar.tsx` | Agregar entrada "UTM & Campañas" |
| `src/components/AdminPage.tsx` | Agregar case para vista utm-campaigns |
| `supabase/config.toml` | Registrar `utm-track-event` |

