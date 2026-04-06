

## Plan: Actualizar credenciales de correo SMTP de Praxis Hub

### Situación actual

- **SMTP Host**: `smtpout.secureserver.net` (GoDaddy) ✅
- **SMTP User**: `contacto@praxis-hub.co` ✅
- **SMTP From Email**: `no-reply@praxis-hub.co` → cambiar a `contacto@praxis-hub.co`
- **SMTP Password**: necesita actualizarse con la nueva clave

### Cambios a realizar

**1. Actualizar el secreto SMTP_PASSWORD**
Usar la herramienta de secretos para actualizar `SMTP_PASSWORD` con la nueva contraseña proporcionada.

**2. Actualizar la tabla `email_configuration`**
Migración SQL para cambiar `smtp_from_email` de `no-reply@praxis-hub.co` a `contacto@praxis-hub.co` y ajustar `smtp_from_name` a `Praxis Hub`.

**3. Re-desplegar la edge function `send-email`**
Para que tome el nuevo secreto correctamente.

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| Secret `SMTP_PASSWORD` | Actualizar valor |
| `supabase/migrations/...update_email_config.sql` | Crear - actualizar from_email |
| Edge function `send-email` | Re-desplegar |

### Nota de seguridad
La contraseña se almacenará como secreto encriptado (nunca en código). No se hará ningún cambio en archivos de código fuente con la clave.

