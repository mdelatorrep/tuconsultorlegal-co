# Configuración de Autenticación de Supabase para Abogados

Este documento detalla la configuración necesaria para habilitar todas las funcionalidades de autenticación de Supabase en el sistema de abogados.

## ✅ Funcionalidades Implementadas

### 1. **Registro con Confirmación de Email**
- El registro de abogados ahora utiliza `supabase.auth.signUp()` con `emailRedirectTo`
- Los abogados recibirán un email de confirmación cuando se registren
- El link de confirmación los redirige a `/#abogados`

### 2. **Email de Bienvenida Automático**
- Sistema integrado con la infraestructura SMTP existente
- Plantilla `lawyer_welcome` en tabla `email_templates`
- Se envía automáticamente después del registro exitoso vía función `send-email`
- Email personalizado con información sobre funcionalidades y CTA para acceder al dashboard

### 3. **Cambio de Email**
- Componente `LawyerChangeEmailDialog` integrado en el dashboard
- Los abogados pueden cambiar su email desde el menú lateral
- Requiere confirmación en el nuevo email

### 4. **Recuperación de Contraseña**
- Funcionalidad `resetPassword` actualizada con redirect correcto
- Los abogados reciben un email con link para restablecer contraseña
- El link redirige a `/#abogados` después del cambio

## 🔧 Configuración Requerida en Supabase

### Paso 1: Habilitar Confirmación de Email

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/tkaezookvtpulfpaffes
2. Navega a **Authentication > Email Templates**
3. Asegúrate de que **"Enable email confirmations"** esté activado
4. Personaliza las plantillas de email:
   - **Confirm signup**: Plantilla para confirmar registro
   - **Magic Link**: Para login sin contraseña (opcional)
   - **Change Email Address**: Para confirmar cambio de email
   - **Reset Password**: Para restablecer contraseña

### Paso 2: Configurar URLs de Redirect

1. Ve a **Authentication > URL Configuration**
2. Configura las siguientes URLs:

   **Site URL:**
   ```
    https://praxis-hub.co
    ```

    **Redirect URLs (añadir todas estas):**
    ```
    https://praxis-hub.co/#abogados
    https://praxis-hub.co/
    http://localhost:5173/#abogados
    http://localhost:5173/
    ```

### Paso 3: Verificar Configuración SMTP

El sistema utiliza la configuración SMTP existente en la tabla `email_configuration`. No requiere configuración adicional de Resend.

**Verificar que existe:**
- Tabla `email_configuration` con configuración activa
- Secret `SMTP_PASSWORD` configurado en Supabase
- Plantilla `lawyer_welcome` en tabla `email_templates` (✅ Ya creada via migración)

### Paso 4: Personalizar Templates de Email (Opcional pero Recomendado)

Puedes personalizar las plantillas de email en **Authentication > Email Templates** para mantener la coherencia de marca:

#### Ejemplo de Template - Confirm Signup
```html
<h2>Confirma tu cuenta de abogado</h2>
<p>Hola,</p>
<p>¡Gracias por registrarte en Praxis Hub!</p>
<p>Haz clic en el siguiente enlace para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Email</a></p>
```

#### Ejemplo de Template - Reset Password
```html
<h2>Restablecer contraseña</h2>
<p>Hola,</p>
<p>Has solicitado restablecer tu contraseña en Praxis Hub.</p>
<p>Haz clic en el siguiente enlace para continuar:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a></p>
<p>Si no solicitaste este cambio, ignora este email.</p>
```

## 🧪 Testing

### Probar Registro con Confirmación:
1. Registra un nuevo abogado
2. Verifica que recibe 2 emails:
   - Email de confirmación de Supabase
   - Email de bienvenida personalizado
3. Confirma que al hacer clic en el link de confirmación se redirige a `/#abogados`

### Probar Cambio de Email:
1. Inicia sesión como abogado
2. En el dashboard, haz clic en "Cambiar Email"
3. Ingresa el nuevo email
4. Verifica que recibe un email de confirmación
5. Confirma el cambio

### Probar Recuperación de Contraseña:
1. En la página de login, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa el email del abogado
3. Verifica que recibe el email con el link
4. Haz clic en el link y cambia la contraseña
5. Verifica que se redirige correctamente

## 📊 Monitoreo

Puedes ver los logs de emails enviados en:
- **Tabla `email_notifications_log`**: Historial de todos los emails enviados
- **Función send-email logs**: https://supabase.com/dashboard/project/tkaezookvtpulfpaffes/functions/send-email/logs

## 🐛 Troubleshooting

### Los emails no llegan:
- Verifica que `SMTP_PASSWORD` esté configurado correctamente
- Verifica que la configuración en `email_configuration` esté activa
- Revisa los logs de la función `send-email`
- Verifica la tabla `email_notifications_log` para ver el estado de los envíos

### Error "requested path is invalid":
- Verifica que todas las URLs de redirect estén configuradas en Supabase
- Asegúrate de que las URLs coincidan exactamente (incluyendo `http://` o `https://`)

### El email de confirmación no redirige correctamente:
- Verifica que `emailRedirectTo` esté configurado en el código
- Asegúrate de que la URL esté en la lista de Redirect URLs permitidas

### El email de bienvenida no se envía:
- Verifica que la plantilla `lawyer_welcome` exista en `email_templates` y esté activa
- Revisa los logs del navegador para ver si hay errores
- Verifica la tabla `email_notifications_log` para ver intentos fallidos

## 📚 Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
