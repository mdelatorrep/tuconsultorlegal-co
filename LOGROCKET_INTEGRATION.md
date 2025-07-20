# 📊 Integración LogRocket - Tu Consultor Legal

## 🎯 Visión General

LogRocket está integrado para monitorear la experiencia de usuario, capturar errores, y analizar el comportamiento de los usuarios en la plataforma legal. Esta integración ayuda a:

- **Detectar problemas** en tiempo real
- **Mejorar la UX** basado en datos reales
- **Debugging remoto** de issues reportados por usuarios
- **Análisis de conversión** en el flujo de pagos
- **Monitoreo de interacciones** con IA legal

## 🔧 Configuración

### 1. Obtener App ID de LogRocket

1. Ve a [LogRocket Dashboard](https://app.logrocket.com)
2. Crea una nueva aplicación o selecciona una existente
3. Ve a Settings → Application
4. Copia tu App ID (formato: `abc123/tu-app-id`)

### 2. Configurar la Aplicación

La integración está configurada para funcionar automáticamente en producción. Para configurar:

1. Ve a `/admin` en tu aplicación
2. Busca la sección "LogRocket Configuration" 
3. Ingresa tu App ID
4. Configura las opciones de captura según tus necesidades

### 3. Variables de Entorno (Opcional)

Puedes configurar el App ID como variable de entorno:
```bash
VITE_LOGROCKET_APP_ID=tu_app_id_aqui
```

## 📈 Funcionalidades Implementadas

### Tracking Automático de Eventos Legales

#### 1. **Seguimiento de Documentos**
```typescript
// Se ejecuta automáticamente cuando:
trackDocumentGeneration('contrato_arrendamiento', true, {
  price: 25000,
  paymentMethod: 'bold'
});
```

#### 2. **Consultas Legales**
```typescript
// Se ejecuta cuando el usuario inicia chat
trackConsultationStart('business', 'asesor_comercial');
```

#### 3. **Interacciones con IA**
```typescript
// Se ejecuta en cada interacción con advisors
trackAgentInteraction('civil', 'legal_advice', {
  messageLength: 150,
  isComplex: true
});
```

#### 4. **Flujo de Pagos**
```typescript
// Se ejecuta en pagos exitosos
trackPayment(25000, 'COP', 'bold', 'contrato_laboral');
```

### Captura de Errores

Los errores se capturan automáticamente y se envían a LogRocket con contexto adicional:

```typescript
// Captura automática de errores no manejados
// También puedes capturar errores manualmente:
captureException(new Error('Error específico'), {
  section: 'payment_flow',
  documentType: 'contrato'
});
```

### Identificación de Usuarios

Los usuarios se identifican automáticamente cuando:
- Completan el proceso de pago
- Interactúan con el sistema de admin
- Usan funciones avanzadas

```typescript
identifyUser({
  id: 'user123',
  email: 'usuario@email.com',
  role: 'premium_user',
  subscriptionType: 'business'
});
```

## 🔒 Privacidad y Seguridad

### Sanitización Automática

La integración incluye sanitización automática de datos sensibles:

**Requests HTTP:**
- `authorization` headers → `[HIDDEN]`
- `password` fields → `[HIDDEN]`
- `token` fields → `[HIDDEN]`
- `api_key` fields → `[HIDDEN]`

**URLs:**
- Parámetros sensibles (token, key, secret) → `[HIDDEN]`

**Respuestas:**
- `access_token` → `[HIDDEN]`
- `refresh_token` → `[HIDDEN]`
- `password` → `[HIDDEN]`

### Configuración GDPR

- **IP Capture:** Deshabilitado por defecto
- **Input Sanitization:** Habilitado automáticamente
- **Text Sanitization:** Habilitado automáticamente

## 🎛️ Uso Programático

### Hook Principal

```typescript
import { useLogRocket } from '@/hooks/useLogRocket';

const { identifyUser, trackEvent, captureException } = useLogRocket();
```

### Hook Específico para Legal

```typescript
import { useLegalTracking } from '@/hooks/useLogRocket';

const { 
  trackDocumentGeneration,
  trackConsultationStart,
  trackPayment,
  trackAgentInteraction 
} = useLegalTracking();
```

### Context Provider

```typescript
import { LogRocketProvider, useLogRocketContext } from '@/components/LogRocketProvider';

// En tu componente raíz
<LogRocketProvider>
  <App />
</LogRocketProvider>

// En cualquier componente hijo
const { trackEvent } = useLogRocketContext();
```

## 📊 Eventos Disponibles

### Eventos de Usuario
- `chat_opened` - Usuario abre el chat
- `tracking_code_verified` - Código de seguimiento verificado
- `document_verified` - Documento verificado para descarga

### Eventos de Negocio
- `legal_document_generated` - Documento legal generado
- `legal_consultation_started` - Consulta legal iniciada
- `legal_payment_completed` - Pago completado
- `legal_agent_interaction` - Interacción con agente de IA

### Eventos de Sistema
- Errores JavaScript automáticos
- Network requests (sanitizados)
- Console logs y warnings

## 🎯 Mejores Prácticas

### 1. **Identificación de Usuarios**
- Identifica usuarios después de acciones importantes (pago, registro)
- Incluye metadata relevante (tipo de suscripción, rol)

### 2. **Tracking de Eventos**
- Usa nombres consistentes para eventos
- Incluye contexto útil en las propiedades
- No incluyas información sensible

### 3. **Captura de Errores**
- Captura errores críticos manualmente con contexto
- Revisa errores regularmente en el dashboard

### 4. **Performance**
- LogRocket se inicializa solo en producción por defecto
- La captura es asíncrona y no bloquea la UI

## 🔍 Debugging

### Dashboard de LogRocket

1. **Sessions:** Ve grabaciones completas de sesiones de usuario
2. **Errors:** Analiza errores con contexto completo
3. **Performance:** Monitorea métricas de rendimiento
4. **Funnels:** Analiza conversiones en flujos críticos

### Filtros Útiles

- **Por evento:** `legal_payment_completed`
- **Por error:** JavaScript errors en páginas específicas
- **Por URL:** `/payment`, `/admin`, `/chat`
- **Por usuario:** Usuarios específicos con problemas

## 🚀 Próximos Pasos

1. **Configurar App ID** en la aplicación
2. **Configurar dominio** en LogRocket dashboard
3. **Definir alertas** para errores críticos
4. **Crear dashboards** personalizados para métricas legales
5. **Configurar integraciones** con Slack/email para notificaciones

## 📚 Recursos

- [Documentación LogRocket](https://docs.logrocket.com/)
- [Dashboard LogRocket](https://app.logrocket.com)
- [Best Practices](https://docs.logrocket.com/docs/best-practices)
- [Privacy Settings](https://docs.logrocket.com/docs/privacy)

---

**Nota:** Esta integración cumple con GDPR y mejores prácticas de privacidad. Todos los datos sensibles se sanitizan automáticamente antes del envío a LogRocket.