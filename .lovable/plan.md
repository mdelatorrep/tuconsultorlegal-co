
# Plan de Rebrand Completo: Tu Consultor Legal → Praxis Hub

## Resumen Ejecutivo

Este plan detalla la actualización integral de todo el sitio web para reflejar la nueva identidad de marca **Praxis Hub**. El rebrand afecta aproximadamente **30+ archivos** incluyendo componentes de React, plantillas de email, configuraciones SEO, y edge functions.

---

## Alcance del Cambio

### Archivos Identificados para Actualización

| Categoría | Archivos | Cambios Principales |
|-----------|----------|---------------------|
| **Páginas Públicas** | LawyerLandingPage, PricingPage, ContactPage, BlogPage, EmpresasPage | SEO, textos, structured data |
| **Autenticación** | UserAuthPage, LawyerAuthPage, LawyerLogin | Títulos, branding |
| **Dashboards** | UserDashboardPage, LawyerDashboardPage | Headers, referencias |
| **Páginas Legales** | PrivacyPolicyPage, TermsAndConditionsPage | Referencias a marca |
| **Widgets** | ChatWidget | Mensaje de bienvenida, referencias |
| **Utilidades** | emailTemplates.ts | Todas las plantillas de email |
| **Certificaciones** | CertificationBadge | Referencias a dominio |
| **Tracking** | useUserTracking | Referencias a fuente |
| **Edge Functions** | send-email, document-chat | Referencias en prompts |

---

## Cambios Detallados por Componente

### 1. Landing Page para Abogados (`LawyerLandingPage.tsx`)

**Cambios SEO:**
- Título: "Portal para Abogados - Praxis Hub"
- Descripción: Reflejar propósito de "elevar la práctica legal"
- Canonical: `https://praxishub.co/#abogados`
- Structured Data: Actualizar nombre y organización

**Cambios de Contenido:**
- Hero: "El entorno que eleva tu práctica legal"
- Subtítulo: Enfoque en infraestructura profesional, no en IA
- CTAs: "Sumarse a Praxis Hub", "Explorar el Entorno"
- Estadísticas: Mantener datos pero ajustar lenguaje
- Testimonios: Ajustar contenido para tono profesional, sin "revolucionado"

**Cambios de Diseño:**
- Aplicar paleta sobria (Deep Charcoal, Slate Teal, Muted Sage)
- Eliminar gradientes agresivos del hero
- Usar colores desaturados para las tarjetas de features

### 2. Página de Precios (`PricingPage.tsx`)

**Cambios SEO:**
- Título: "Planes y Precios | Praxis Hub"
- Canonical: `https://praxishub.co/#precios`
- Actualizar structured data

**Cambios de Contenido:**
- Eliminar lenguaje promocional exagerado
- Enfoque en "acceso al entorno profesional"
- Ajustar descripciones de planes con tono institucional

### 3. Página de Contacto (`ContactPage.tsx`)

**Cambios SEO:**
- Título: "Contacto | Praxis Hub"
- Descripción: Actualizar para reflejar nueva propuesta
- Canonical: `https://praxishub.co/#contacto`

**Cambios de Contenido:**
- Email de contacto: `contacto@praxishub.co` (o mantener el actual temporalmente)
- Mensajes y descripciones con tono profesional

### 4. Blog (`BlogPage.tsx`)

**Cambios:**
- Título: "Blog | Praxis Hub"
- SEO: Actualizar canonical y structured data
- Contenido: "Blog de Praxis Hub" en vez de "Blog de Tu Consultor Legal"

### 5. Página Empresas (`EmpresasPage.tsx`)

**Cambios SEO:**
- Título: "Soluciones Empresariales | Praxis Hub"
- Actualizar canonical y structured data

**Cambios de Contenido:**
- Hero con nueva identidad visual
- Textos alineados al tono institucional

### 6. Autenticación de Usuarios (`UserAuthPage.tsx`)

**Cambios:**
- Título de tarjeta: "Praxis Hub" en lugar de "Tu Consultor Legal"
- Subtítulo: "Entorno profesional integrado"

### 7. Autenticación de Abogados (`LawyerAuthPage.tsx`)

**Cambios:**
- Aplicar nuevo branding visual
- Actualizar beneficios listados con nuevo tono

### 8. Chat Widget (`ChatWidget.tsx`)

**Cambios Críticos:**
- Mensaje de bienvenida: Actualizar referencia a "praxishub.co"
- Header del chat: "Praxis Hub" en subtítulo
- Mantener "Lexi" como nombre del asistente (puede conservarse)

### 9. Dashboard de Usuario (`UserDashboardPage.tsx`)

**Cambios:**
- Referencias a la marca en headers
- Textos descriptivos con nuevo tono

### 10. Dashboard de Abogados (`LawyerDashboardPage.tsx`)

**Cambios:**
- Headers y welcome messages
- Referencias a la plataforma

### 11. Páginas Legales

**PrivacyPolicyPage.tsx y TermsAndConditionsPage.tsx:**
- Cambiar "TUCONSULTORLEGAL.CO" por "PRAXISHUB.CO"
- Botón de consulta: "Consultar con soporte" (más neutral)

### 12. Plantillas de Email (`emailTemplates.ts`)

**Cambios Masivos:**
- `getConfirmSignupTemplate`: 
  - platformName: "Praxis Hub" para usuarios, "Portal del Abogado - Praxis Hub" para abogados
  - Footer: "© Praxis Hub. Todos los derechos reservados."
- `getMagicLinkTemplate`: Mismos cambios
- `getResetPasswordTemplate`: Mismos cambios
- `getChangeEmailTemplate`: Mismos cambios
- `getInvitationTemplate`: Mismos cambios

**Colores de Email:**
- Actualizar gradientes a paleta sobria (Slate Teal: #3d5a5a)

### 13. Otros Componentes

| Componente | Cambio |
|------------|--------|
| `CertificationBadge.tsx` | "praxishub.co" en referencias |
| `useUserTracking.ts` | source: 'praxishub' |
| `CustomDocumentRequestDialog.tsx` | site_url, emails de fallback |
| `IntellectualPropertyPage.tsx` | Referencia a marca |
| `DocumentChatFlow.tsx` | Prompts de Lexi con nueva referencia |

### 14. Edge Functions (Supabase)

**Archivos a revisar:**
- `send-email/index.ts`: Nombre de remitente
- `document-chat/index.ts`: Referencias en prompts

### 15. Admin Components

**AdminPage.tsx:**
- Template de respuesta de email: Actualizar header y footer

**EmailConfigManager.tsx:**
- Subject de prueba: "Email de Prueba - Praxis Hub"

---

## Sección Técnica

### Patrón de Cambios de Marca

Para cada archivo, aplicar estas transformaciones de texto:

```text
"Tu Consultor Legal" → "Praxis Hub"
"tuconsultorlegal.co" → "praxishub.co"
"tuconsultorlegal" → "praxishub"
"TCL" → "Praxis Hub"
"consultor legal" → "Praxis Hub" (donde aplique)
```

### Cambios de Paleta CSS

Los colores ya fueron actualizados en `index.css` y `tailwind.config.ts`. Los componentes deben usar:

```css
/* Colores primarios */
--brand-primary: hsl(200 25% 30%)    /* Slate Teal */
--brand-dark: hsl(220 14% 10%)       /* Deep Charcoal */
--brand-accent: hsl(160 20% 45%)     /* Muted Sage */
```

### Cambios de Gradientes

Reemplazar gradientes agresivos:
```css
/* Antes */
from-[#010f24] via-[#011838] to-[#010f24]

/* Después */
from-brand-dark via-background to-muted
```

### SEO y Structured Data

Todos los hooks `useSEO` deben actualizarse con:
- Nuevo dominio canónico
- Nueva organización en structured data
- Nuevas keywords alineadas al posicionamiento

---

## Orden de Implementación

1. **Componentes de UI base** (ya completados: HomePage, Header, Footer, index.html)
2. **Landing de Abogados** (LawyerLandingPage)
3. **Páginas de autenticación** (UserAuthPage, LawyerAuthPage)
4. **Chat Widget** (mensaje de bienvenida crítico)
5. **Plantillas de Email** (afecta comunicación con usuarios)
6. **Páginas secundarias** (Pricing, Contact, Blog, Empresas)
7. **Dashboards** (User, Lawyer)
8. **Páginas legales** (Privacy, Terms)
9. **Utilidades y hooks** (tracking, certificaciones)
10. **Edge functions** (prompts, emails)
11. **Admin components** (respuestas de email)

---

## Notas Importantes

1. **Dominio**: El plan asume que el nuevo dominio será `praxishub.co`. Si el dominio es diferente, ajustar todas las referencias.

2. **Base de datos**: Las migraciones previas con contenido de "Tu Consultor Legal" (como `legal_content`, `email_configuration`) pueden requerir actualización manual en la base de datos.

3. **Lexi**: El nombre del asistente "Lexi" puede mantenerse ya que no está vinculado a la marca anterior.

4. **Consistencia de tono**: Todo el contenido debe reflejar los valores de Praxis Hub:
   - Profesional, no promocional
   - Institucional contemporáneo
   - Evitar: "revolución", "disrupción", "instantáneo"
   - Usar: "entorno", "práctica", "estándares", "confianza"
