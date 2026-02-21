
# Asistente de Voz Avanzado con OpenAI Realtime API

## Resumen

Se actualizara el modulo de Asistente de Voz para ofrecer dos modos: **Basico** (el actual, basado en Whisper para transcripcion batch) y **Avanzado** (conversacion en tiempo real speech-to-speech usando la OpenAI Realtime API via WebRTC). El modo avanzado permite al abogado mantener una conversacion de voz bidireccional con un asistente legal IA especializado, con transcripcion en vivo, dictado inteligente y consultas legales por voz.

---

## Arquitectura

El modo avanzado usa WebRTC directamente desde el navegador hacia OpenAI. Para seguridad, se genera un **ephemeral client secret** desde un Edge Function (nunca se expone la API key al cliente).

```text
+------------------+     POST /realtime-session     +---------------------+
|   Navegador      | -----------------------------> | Edge Function       |
|   (WebRTC)       | <-- { client_secret }--------- | realtime-session    |
|                  |                                 | (genera ephemeral   |
|  RTCPeerConnection                                |  key via OpenAI)    |
|       |          |                                 +---------------------+
|       v          |
|  api.openai.com  |  <--- WebRTC bidireccional (audio in/out)
|  /v1/realtime/   |
|  calls           |
+------------------+
```

---

## Cambios planificados

### 1. Edge Function: `realtime-session` (nueva)

Genera un ephemeral client secret llamando a `POST https://api.openai.com/v1/realtime/client_secrets` con la configuracion del sistema (modelo, voz, instrucciones). Retorna el `client_secret.value` al frontend.

- Lee configuracion de `system_config`: modelo realtime, voz, instrucciones/prompt, idioma
- Usa `OPENAI_API_KEY` (ya configurada)
- Valida creditos del abogado antes de generar la sesion
- Consume creditos al iniciar sesion (`voice_realtime` tool type)

### 2. Hook: `useRealtimeVoice.ts` (nuevo)

Hook React que maneja toda la logica WebRTC:
- Solicita ephemeral key al edge function
- Crea `RTCPeerConnection` y configura tracks de audio
- Conecta a `https://api.openai.com/v1/realtime/calls` con SDP
- Maneja eventos del data channel (transcripciones en vivo, respuestas de texto)
- Expone estados: `isConnected`, `isListening`, `isSpeaking`, `transcript`, `aiResponse`
- Permite enviar mensajes de texto via data channel
- Control de desconexion limpia

### 3. Componente: `RealtimeVoiceAssistant.tsx` (nuevo)

UI del modo avanzado con:
- Indicador visual de conexion WebRTC (conectando, activo, hablando)
- Visualizacion de audio en tiempo real (waveform animada)
- Panel de transcripcion en vivo (lo que dice el abogado)
- Panel de respuesta IA (lo que responde el asistente)
- Historial de la conversacion con scroll
- Botones de accion: "Crear Documento" desde la transcripcion, "Copiar", "Guardar Nota"
- Selector de modo contextual: Dictado Legal, Consulta Juridica, Analisis de Caso

### 4. Componente actualizado: `VoiceAssistant.tsx`

- Agrega tabs/switch para alternar entre modo "Basico" y "Avanzado"
- Modo basico: funcionalidad actual sin cambios
- Modo avanzado: renderiza `RealtimeVoiceAssistant`
- Indicador visual de que el modo avanzado consume mas creditos
- Badge "Pro" o "Avanzado" para diferenciar

### 5. Configuracion del sistema (`system_config`)

Nuevas claves de configuracion (se agregan via `init-system-config` y migracion):

| Clave | Valor Default | Descripcion |
|---|---|---|
| `voice_realtime_enabled` | `false` | Habilitar modo realtime |
| `voice_realtime_model` | `gpt-realtime` | Modelo para Realtime API |
| `voice_realtime_voice` | `coral` | Voz del asistente realtime |
| `voice_realtime_instructions` | (prompt legal completo) | System prompt para el asistente |
| `voice_realtime_max_duration_seconds` | `300` | Duracion maxima de sesion (5 min) |
| `voice_realtime_vad_threshold` | `0.5` | Umbral de deteccion de voz |
| `voice_realtime_transcription_model` | `gpt-4o-mini-transcribe` | Modelo de transcripcion en tiempo real |

### 6. Panel de administracion: `VoiceConfigSection.tsx`

Se agrega nueva seccion "Modo Avanzado (Realtime)" con:
- Toggle para habilitar/deshabilitar el modo realtime
- Selector de modelo realtime
- Selector de voz realtime (coral, alloy, echo, sage, etc.)
- Editor de instrucciones/prompt del asistente
- Duracion maxima de sesion
- Configuracion de VAD

### 7. Pricing y creditos

- Nueva entrada en `credit_tool_costs` para `voice_realtime` con `base_cost` mayor (ej: 5) dado el costo significativamente mayor de la API Realtime vs Whisper
- Se configura `is_billable_voice_realtime` en `system_config`
- Se integra con el sistema de calculo de costos existente (model_key, auto_calculate, etc.)
- Gamificacion: tarea `first_voice_realtime` (one-time) y `use_voice_realtime_tool` (daily)

### 8. Migracion SQL

Una migracion que:
- Inserta las nuevas claves de `system_config` para realtime voice
- Inserta `voice_realtime` en `credit_tool_costs` con base_cost = 5
- Inserta `is_billable_voice_realtime = true` en `system_config`
- Inserta tareas de gamificacion correspondientes

### 9. Edge Function: `init-system-config` (actualizar)

Agregar las nuevas claves de configuracion de voz realtime al array de configuraciones iniciales para que nuevas instalaciones las tengan.

---

## Detalles tecnicos clave

### WebRTC Flow (modo avanzado)

1. Frontend llama `POST /functions/v1/realtime-session` con `lawyerId`
2. Edge function valida creditos, lee config de `system_config`, llama `POST https://api.openai.com/v1/realtime/client_secrets` con session config
3. Retorna `{ client_secret, expires_at }` al frontend
4. Frontend crea `RTCPeerConnection`, agrega audio track del microfono
5. Crea offer SDP, envia a `https://api.openai.com/v1/realtime/calls` con el ephemeral key
6. Recibe answer SDP, establece conexion
7. Abre data channel para enviar/recibir eventos JSON (transcripciones, respuestas texto)
8. Al desconectar, cierra peer connection y consume creditos

### Prompt del asistente realtime

Especializado para abogados colombianos:
- Responde en espanol colombiano formal
- Modos: dictado (repite/mejora lo dictado), consulta (responde preguntas legales), analisis (analiza un caso descrito verbalmente)
- Cita normas colombianas cuando aplique
- Puede generar resumenes estructurados de lo dictado

### Seguridad

- Ephemeral keys expiran en 1 minuto (manejo de OpenAI)
- OPENAI_API_KEY nunca llega al cliente
- Validacion de creditos antes de generar sesion
- Duracion maxima de sesion configurable para control de costos

---

## Archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `supabase/functions/realtime-session/index.ts` | Crear |
| `src/hooks/useRealtimeVoice.ts` | Crear |
| `src/components/voice/RealtimeVoiceAssistant.tsx` | Crear |
| `src/components/voice/VoiceAssistant.tsx` | Modificar (agregar tabs basico/avanzado) |
| `src/components/voice/index.ts` | Modificar (exportar nuevo componente) |
| `src/components/admin/VoiceConfigSection.tsx` | Modificar (agregar seccion realtime) |
| `supabase/functions/init-system-config/index.ts` | Modificar (agregar configs) |
| Migracion SQL | Crear (configs + credit_tool_costs + gamification) |
| `src/integrations/supabase/types.ts` | Auto-actualizado |
| `supabase/config.toml` | Agregar entry para `realtime-session` |
