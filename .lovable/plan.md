

## Plan: Automatizar Journey Completo de Abogados con Touchpoints Secuenciales

### Resumen
Crear un sistema automatizado que ejecute un journey de lifecycle para cada abogado registrado, con emails, notificaciones in-app y bonificaciones de creditos en momentos clave, basado en los datos de retention/engagement y las recomendaciones estrategicas del admin portal.

### Journey Touchpoints

```text
Dia 0  - Bienvenida (ya existe: lawyer_welcome)
Dia 1  - Tip de primer uso: "Usa tu primera herramienta IA"
         + 5 creditos bonus de activacion
Dia 3  - Si NO ha usado herramientas: nudge "Tu primer analisis gratis"
         + notificacion in-app
Dia 7  - Si NO ha completado perfil o usado herramientas: "Completa tu perfil"
         + 3 creditos bonus
Dia 14 - Si inactivo (at_risk): re-engagement existente mejorado
         + 10 creditos bonus reactivacion
         + notificacion in-app urgente
Dia 30 - Si sigue inactivo (churned): ultimo intento
         + 15 creditos bonus "ultima oportunidad"
```

### Cambios a Realizar

**1. Tabla `lawyer_journey_tracking`** (nueva)
- `lawyer_id`, `journey_step` (day_1, day_3, day_7, day_14, day_30), `sent_at`, `action_taken` (email/credits/notification), `metadata`
- Evita envios duplicados por step

**2. Templates de email nuevos** (4 plantillas)
- `lawyer_journey_day1_tip` - Primer tip de uso
- `lawyer_journey_day3_nudge` - Recordatorio herramientas IA
- `lawyer_journey_day7_profile` - Completar perfil
- `lawyer_journey_day30_lastchance` - Ultimo intento
- (El dia 14 reutiliza `lawyer_reengagement` existente)

**3. Edge Function `lawyer-journey-automation`** (nueva)
- Se ejecuta via pg_cron cada 6 horas
- Consulta `lawyer_profiles` + `credit_transactions` + `lawyer_journey_tracking`
- Para cada abogado calcula dias desde registro y nivel de engagement
- Ejecuta el step correspondiente si no se ha enviado antes:
  - Envia email via `send-email`
  - Crea notificacion in-app via `create_lawyer_notification()`
  - Otorga creditos bonus via insert en `credit_transactions` + update `lawyer_credits`
- Registra cada accion en `lawyer_journey_tracking`

**4. Cron job** (pg_cron)
- `lawyer-journey-cron` cada 6 horas invocando la edge function

**5. Dashboard de Journey en Admin** (nuevo componente)
- Vista en el portal admin mostrando:
  - Funnel visual del journey (cuantos abogados en cada step)
  - Tasa de conversion por step
  - Creditos otorgados automaticamente
  - Lista de abogados por etapa

### Archivos a Crear/Modificar

| Archivo | Accion |
|---------|--------|
| `supabase/migrations/...lawyer_journey.sql` | Crear tabla tracking + templates + cron |
| `supabase/functions/lawyer-journey-automation/index.ts` | Edge function del journey |
| `src/components/admin/LawyerJourneyDashboard.tsx` | Dashboard admin del journey |
| `src/components/AdminPage.tsx` | Agregar vista del journey al sidebar |
| `src/components/admin/RetentionDashboard.tsx` | Link al journey dashboard |

### Logica de Condiciones por Step

- **Day 1**: Siempre se envia (tip + creditos activacion)
- **Day 3**: Solo si `credit_transactions` con type=consumption es 0
- **Day 7**: Solo si perfil incompleto (sin especialidad/telefono) O sin consumo de creditos
- **Day 14**: Solo si ultima actividad > 14 dias (at_risk)
- **Day 30**: Solo si ultima actividad > 30 dias (churned)

### Seguridad
- La edge function usa `SUPABASE_SERVICE_ROLE_KEY` para operar
- Los creditos bonus se registran como `transaction_type = 'journey_bonus'`
- Notificaciones admin cuando se ejecuta el journey (resumen de acciones)

