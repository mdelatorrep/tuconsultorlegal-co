# Sistema de Auditoría de Términos y Condiciones

## 🔒 Importancia Legal y Regulatoria

Este sistema es **CRÍTICO** para el cumplimiento regulatorio y protección legal de la plataforma. Proporciona evidencia auditable de que los usuarios han aceptado los términos y condiciones antes de utilizar servicios.

## 📋 ¿Qué se Registra?

### Información del Usuario
- **user_id**: ID del usuario autenticado (si aplica)
- **user_type**: Tipo de usuario (user, lawyer, anonymous)
- **user_email**: Email del usuario
- **user_name**: Nombre completo del usuario

### Tipo de Aceptación
- **registration**: Aceptación durante el registro de cuenta
- **document_creation**: Aceptación al crear/solicitar un documento
- **subscription**: Aceptación al contratar una suscripción
- **profile_update**: Aceptación al actualizar perfil

### Consentimientos Específicos
- **data_processing_consent**: Tratamiento de datos personales (RGPD/LOPD)
- **intellectual_property_consent**: Términos de propiedad intelectual
- **marketing_consent**: Comunicaciones comerciales

### Información de Auditoría Técnica
- **ip_address**: Dirección IP del usuario
- **user_agent**: Navegador y sistema operativo
- **device_info**: Información adicional del dispositivo
- **accepted_at**: Timestamp de aceptación (con zona horaria)
- **terms_version**: Versión de términos aceptada
- **privacy_policy_version**: Versión de política de privacidad

## 🔧 Implementación Técnica

### Base de Datos

**Tabla**: `terms_acceptance_audit`

```sql
CREATE TABLE public.terms_acceptance_audit (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_type TEXT CHECK (user_type IN ('user', 'lawyer', 'anonymous')),
  user_email TEXT NOT NULL,
  acceptance_type TEXT CHECK (acceptance_type IN ('registration', 'document_creation', 'subscription', 'profile_update')),
  data_processing_consent BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ...
);
```

**Índices para Consultas Rápidas**:
- Por user_id
- Por user_email
- Por tipo de aceptación
- Por fecha (descendente)
- Por tipo de usuario

### Edge Function

**Función**: `log-terms-acceptance`

```typescript
// Registra una aceptación de términos
POST /functions/v1/log-terms-acceptance
Body: {
  user_email: string,
  user_type: 'user' | 'lawyer' | 'anonymous',
  acceptance_type: string,
  data_processing_consent: boolean,
  ...
}
```

### Hook React

**Hook**: `useTermsAudit`

```typescript
const { 
  logRegistrationTerms,
  logDocumentCreationTerms,
  logSubscriptionTerms 
} = useTermsAudit();
```

## 📍 Puntos de Integración

### 1. Registro de Usuarios
**Archivo**: `src/components/UserAuthPage.tsx`

Registra cuando un usuario persona crea su cuenta.

```typescript
await logRegistrationTerms(
  'user',
  email,
  fullName,
  userId,
  true, // data processing
  undefined, // IP consent
  false // marketing
);
```

### 2. Registro de Abogados
**Archivo**: `src/components/LawyerLogin.tsx`

Registra cuando un abogado crea su cuenta.

```typescript
await logRegistrationTerms(
  'lawyer',
  email,
  fullName,
  userId,
  dataProcessingConsent,
  intellectualPropertyConsent,
  false
);
```

### 3. Creación de Documentos (Chat)
**Archivo**: `src/components/DocumentChatFlow.tsx`

Registra cuando:
- Un usuario anónimo acepta términos para usar el chat
- Un usuario genera un documento desde el chat

```typescript
// Al aceptar términos (anónimo)
await logDocumentCreationTerms(
  'anonymous@session.local',
  documentName,
  agentId,
  undefined,
  'Usuario Anónimo'
);

// Al generar documento
await logDocumentCreationTerms(
  userEmail,
  documentName,
  agentId,
  userId,
  userName
);
```

### 4. Creación de Documentos (Formulario)
**Archivo**: `src/components/DocumentFormFlow.tsx`

Similar al chat, registra la aceptación al crear documentos vía formulario.

## 🔐 Seguridad y Privacidad

### Row Level Security (RLS)

1. **Administradores**: Pueden ver todos los registros
2. **Usuarios**: Solo pueden ver sus propios registros
3. **Service Role**: Acceso completo para edge functions

### Retención de Datos

- Los registros se mantienen **indefinidamente** por requisitos legales
- Solo se eliminan bajo solicitud legal explícita
- La información sensible está protegida por RLS

## 📊 Consultas Útiles

### Verificar Aceptación de Usuario
```sql
SELECT * FROM terms_acceptance_audit
WHERE user_email = 'usuario@ejemplo.com'
ORDER BY accepted_at DESC;
```

### Reportes de Cumplimiento
```sql
SELECT 
  acceptance_type,
  user_type,
  COUNT(*) as total,
  COUNT(DISTINCT user_email) as unique_users
FROM terms_acceptance_audit
WHERE accepted_at >= NOW() - INTERVAL '30 days'
GROUP BY acceptance_type, user_type;
```

### Auditoría por IP
```sql
SELECT 
  user_email,
  user_type,
  acceptance_type,
  ip_address,
  accepted_at
FROM terms_acceptance_audit
WHERE ip_address = '123.456.789.0'
ORDER BY accepted_at DESC;
```

## ⚠️ Consideraciones Importantes

### Legal
- ✅ Cumple con RGPD/GDPR
- ✅ Cumple con LOPD (España)
- ✅ Cumple con CCPA (California)
- ✅ Proporciona evidencia para reclamaciones
- ✅ Registro de IP para verificación

### Técnica
- ✅ Capturas timestamp con zona horaria
- ✅ Índices para consultas rápidas
- ✅ Almacenamiento de versión de términos
- ✅ Doble registro (terms_acceptance_audit + security_audit_log)

### Operativa
- 🔄 Los registros NO deben eliminarse
- 📧 Notificar al equipo legal de cambios
- 🔍 Revisar logs periódicamente
- 📝 Mantener versiones de términos actualizadas

## 🚨 Acciones ante Reclamación

1. **Identificar el usuario**: Por email, user_id o IP
2. **Consultar registros**: Verificar qué aceptó y cuándo
3. **Verificar versión**: Comprobar qué versión de términos aceptó
4. **Recopilar evidencia**: IP, user agent, timestamp
5. **Generar reporte**: Exportar datos relevantes

## 📞 Soporte

Para consultas sobre el sistema de auditoría:
- 📧 Email: contacto@praxis-hub.co
- 🔧 Técnico: contacto@praxis-hub.co
- 📝 Documentación: Este archivo

## 🔄 Historial de Cambios

- **2025-01-06**: Implementación inicial del sistema de auditoría
- **Versión 1.0**: Términos y política de privacidad inicial
