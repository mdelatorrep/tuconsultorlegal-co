
# Plan de Auditoría y Corrección del Rebrand: Praxis Hub

## Resumen Ejecutivo

Tras una revisión exhaustiva del codebase, he identificado **múltiples inconsistencias** en la implementación del rebrand de "Tu Consultor Legal" a **Praxis Hub**. Estas inconsistencias afectan la paleta de colores, el uso del logo, referencias de texto y gradientes no conformes con la nueva identidad visual.

---

## Hallazgos de la Auditoría

### 1. Uso del Icono `Scale` en lugar del Logo Real

El icono `Scale` de Lucide se usa como placeholder en varios lugares donde debería aparecer el logo oficial de Praxis Hub:

| Archivo | Línea | Problema |
|---------|-------|----------|
| `src/components/UserAuthPage.tsx` | 220 | `<Scale className="w-5 h-5 text-brand-primary" />` |
| `src/components/LawyerLogin.tsx` | 454 | `<Scale className="h-6 w-6 text-primary" />` |
| `src/components/ChatWidget.tsx` | 332 | `<Scale size={28} />` - botón flotante |
| `src/components/dashboard/DashboardWelcome.tsx` | 26 | `<Scale className="h-3 w-3" />` en Badge |
| `src/components/UnifiedSidebar.tsx` | 3 | Importa Scale pero no se usa el logo |
| Demos (`DemoResearchMockup.tsx`, etc.) | Varios | Uso decorativo de Scale |

**Solución**: Reemplazar con `<img src={logoIcon} alt="Praxis Hub" />` usando el asset `@/assets/favicon.png`.

---

### 2. Colores y Gradientes No Conformes a la Marca

**Paleta Oficial de Praxis Hub (definida en CSS):**
- `--brand-primary`: `hsl(200 25% 30%)` - Slate Teal (#3d5a5a aprox.)
- `--brand-dark`: `hsl(220 14% 10%)` - Deep Charcoal
- `--brand-accent`: `hsl(160 20% 45%)` - Muted Sage
- `--primary`: `hsl(200 25% 30%)`

**Problemas encontrados:**

| Archivo | Problema | Color incorrecto |
|---------|----------|------------------|
| `PersonasPage.tsx` L136 | Gradiente del hero | `from-[#010f24] via-[#011838] to-[#010f24]` (azul oscuro antiguo) |
| `PersonasPage.tsx` L156 | Texto gradiente | `from-[#f2bb31] to-[#ffd666]` (dorado vibrante) |
| `PersonasPage.tsx` L171 | Botón CTA | `from-[#f2bb31] to-[#ffd666]` (dorado vibrante) |
| `LawyerAuthPage.tsx` L68 | Background | `from-brand-gray-light` (variable inexistente) |
| `LawyerAuthPage.tsx` L133 | Gradiente | `to-brand-blue-light/5` (variable inexistente) |
| `PWAInstallPrompt.tsx` L104 | Icono container | `from-[#0372e8] to-[#0a8fff]` (azul vibrante) |
| `DashboardWelcome.tsx` L33 | Botón créditos | `from-amber-500 to-orange-500` (no alineado) |

**Solución**: Reemplazar con la paleta sobria de Praxis Hub:
- `from-brand-dark via-brand-primary/90 to-brand-dark`
- Usar `bg-brand-primary`, `bg-brand-accent` para botones
- Eliminar gradientes vibrantes y dorados

---

### 3. Referencias de Texto a la Marca Antigua

| Archivo | Problema |
|---------|----------|
| `PWAInstallPrompt.tsx` L107-114 | `alt="tuconsultorlegal.co"` y `"Instalar tuconsultorlegal.co"` |

**Solución**: Actualizar a "Praxis Hub" y "praxishub.co".

---

### 4. Archivos de Assets Obsoletos

En `/public/` existen múltiples archivos con referencias a la marca antigua:
- `favicon-tcl.png`
- `logo-tcl.png` 
- `logo_tcl.png`
- `favicon-ai-legal.png`
- `logo-ai-legal.png`

**Solución**: Estos archivos pueden eliminarse para evitar confusión (o mantenerse como respaldo histórico).

---

### 5. Variables CSS Inexistentes

Algunas clases de Tailwind hacen referencia a variables que no existen en el sistema de diseño:
- `brand-gray-light` - No definida
- `brand-blue-light` - No definida

**Solución**: Reemplazar con variables existentes (`muted`, `background`, `primary/5`).

---

## Archivos a Modificar

### Prioridad Alta (Afectan páginas visibles principales)

1. **`src/components/PersonasPage.tsx`**
   - Cambiar gradiente del hero a colores sobrios
   - Eliminar texto gradiente dorado
   - Actualizar botón CTA

2. **`src/components/UserAuthPage.tsx`**
   - Reemplazar `Scale` icon con logo real

3. **`src/components/LawyerLogin.tsx`**
   - Reemplazar `Scale` icon con logo real

4. **`src/components/ChatWidget.tsx`**
   - Reemplazar `Scale` icon en botón flotante con logo

5. **`src/components/LawyerAuthPage.tsx`**
   - Corregir clases CSS con variables inexistentes

6. **`src/components/PWAInstallPrompt.tsx`**
   - Actualizar texto y alt a "Praxis Hub"
   - Corregir gradiente del icono

### Prioridad Media (Dashboards y componentes internos)

7. **`src/components/dashboard/DashboardWelcome.tsx`**
   - Reemplazar `Scale` icon con logo
   - Ajustar color del botón de créditos

8. **`src/components/UnifiedSidebar.tsx`**
   - Verificar uso correcto del logo si aplica

### Prioridad Baja (Demos y mockups)

9. **Componentes de demo** (`DemoResearchMockup.tsx`, etc.)
   - El uso de `Scale` como icono decorativo en demos es aceptable
   - Podría ajustarse para consistencia visual

---

## Detalles Técnicos de Implementación

### Patrón de Reemplazo de Logo

```tsx
// Antes
import { Scale } from "lucide-react";
<Scale className="w-5 h-5 text-brand-primary" />

// Después
import logoIcon from "@/assets/favicon.png";
<img src={logoIcon} alt="Praxis Hub" className="w-5 h-5" />
```

### Patrón de Corrección de Gradientes

```tsx
// Antes (PersonasPage)
className="bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24]"

// Después
className="bg-gradient-to-br from-brand-dark via-brand-primary/90 to-brand-dark"
```

```tsx
// Antes (botones dorados)
className="bg-gradient-to-r from-[#f2bb31] to-[#ffd666]"

// Después
className="bg-brand-primary hover:bg-brand-primary/90"
```

### Patrón de Corrección de Variables CSS

```tsx
// Antes
className="from-brand-gray-light to-background"

// Después
className="from-muted to-background"
```

---

## Resumen de Cambios

| Categoría | Archivos | Cambios |
|-----------|----------|---------|
| Logo (Scale → img) | 5 archivos | Reemplazar icono con logo real |
| Gradientes vibrantes | 3 archivos | Convertir a paleta sobria |
| Variables inexistentes | 1 archivo | Usar variables definidas |
| Referencias de texto | 1 archivo | Actualizar a Praxis Hub |
| **Total** | **8-10 archivos** | ~25 cambios |

---

## Verificación Post-Implementación

Páginas a verificar visualmente tras los cambios:
1. `/` - HomePage
2. `/#personas` - PersonasPage (hero y botones)
3. `/#auth` - UserAuthPage (logo en card)
4. `/auth-abogados` - LawyerAuthPage (logo y background)
5. Chat widget flotante (logo del botón)
6. Dashboard de abogados (welcome section)

