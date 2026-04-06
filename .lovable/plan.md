

## Plan: Integrar Retención con Journey Automatizado (Re-engagement Recurrente)

### Problema actual
El journey solo tiene pasos basados en **fecha de registro** (day_1 a day_30) y cada paso se ejecuta una sola vez. Si un abogado activo deja de usar la plataforma después de sus primeros 30 días, no recibe ninguna acción automatizada, aunque el dashboard de retención lo marque como "en riesgo" o "churned".

### Solución
Agregar **3 pasos recurrentes basados en inactividad real** al journey automatizado. A diferencia de los pasos de onboarding (que se ejecutan una vez), estos se pueden repetir cada N días usando un cooldown.

### Nuevos pasos del journey

| Paso | Trigger | Créditos | Cooldown | Prioridad |
|------|---------|----------|----------|-----------|
| `reengagement_at_risk` | 7-14 días sin uso de herramientas | 5 | 30 días | normal |
| `reengagement_critical` | 15-29 días sin uso | 10 | 45 días | high |
| `reengagement_churned` | 30+ días sin uso | 15 | 60 días | urgent |

### Cambios necesarios

**1. Migración de base de datos**
- Agregar columna `is_recurring` (boolean, default false) a `lawyer_journey_tracking` para distinguir pasos recurrentes de one-time.
- Agregar 3 templates de email en `email_templates` para los nuevos pasos.

**2. Edge Function `lawyer-journey-automation/index.ts`**
- Agregar interfaz extendida con campos `recurring: boolean` y `cooldownDays: number`.
- Agregar los 3 nuevos pasos recurrentes al array `JOURNEY_STEPS`.
- Para pasos recurrentes: en lugar de verificar si el paso ya existe en tracking, verificar si la última ejecución fue hace más de `cooldownDays` días.
- La condición de cada paso calcula `daysSinceLastUsage` (basado en transacciones de tipo `usage`/`consumption`) en vez de `daysSinceRegistration`.
- Crear alerta al admin cuando un abogado entra en estado `critical` o `churned`.

**3. Dashboard de Journey `LawyerJourneyDashboard.tsx`**
- Agregar los 3 nuevos pasos al `STEP_CONFIG` para que aparezcan en el funnel.
- Mostrar badge "Recurrente" en pasos que se repiten.
- Separar visualmente la sección de onboarding vs re-engagement en el funnel.

**4. Dashboard de Retención `RetentionDashboard.tsx`**
- Agregar indicador visual que muestre si un abogado en riesgo ya recibió una acción automatizada del journey (cruzando con `lawyer_journey_tracking`).
- Agregar badge "Journey activo" / "Sin acción" junto a cada usuario en riesgo.

### Flujo integrado

```text
Abogado deja de usar herramientas
        │
        ▼
  7 días inactivo ──► reengagement_at_risk
  (email + 5 créditos + notificación)
        │
        ▼ (sigue inactivo)
  15 días inactivo ──► reengagement_critical  
  (email + 10 créditos + alerta admin)
        │
        ▼ (sigue inactivo)
  30 días inactivo ──► reengagement_churned
  (email + 15 créditos + última oportunidad)
        │
        ▼ (cooldown cumplido, sigue inactivo)
  Se repite el ciclo
```

### Archivos a modificar/crear
1. **Migración SQL**: agregar `is_recurring` + insertar email templates
2. **`supabase/functions/lawyer-journey-automation/index.ts`**: agregar pasos recurrentes con lógica de cooldown e inactividad real
3. **`src/components/admin/LawyerJourneyDashboard.tsx`**: agregar nuevos pasos al dashboard con sección separada
4. **`src/components/admin/RetentionDashboard.tsx`**: cruzar datos con journey tracking para mostrar estado de acciones automatizadas

