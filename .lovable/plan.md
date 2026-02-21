

# Ajustes Estrategicos - SUIN-Juriscol

## Diagnostico Actual

### Proposito
SUIN-Juriscol es una herramienta de busqueda normativa colombiana que utiliza GPT-5-mini con web search para consultar leyes, decretos, jurisprudencia y normativa. Presenta resultados en formato conversacional con seguimiento de preguntas.

### Problemas Criticos Identificados

#### 1. Fuga de Creditos en Mensajes de Seguimiento (CRITICO)
La funcion `handleSendFollowUp` **nunca cobra creditos**. Solo la busqueda inicial cobra 1 credito. Un abogado puede hacer una busqueda inicial y luego enviar infinitos mensajes de seguimiento sin costo alguno. Esto es una perdida economica directa.

#### 2. Pricing Demasiado Bajo
- Costo actual: **1 credito** (base_cost: 1, auto_calculate: true)
- El modelo `gpt-5-mini` con `web_search_preview` tiene un costo real significativo por consulta
- Comparado con otras herramientas del sistema, 1 credito es inconsistente

#### 3. Calidad Inconsistente de Citaciones
Datos reales de la base de datos muestran:
- Algunas consultas devuelven **33 citaciones** (excelente)
- Otras devuelven **0 citaciones** (inaceptable)
- El `reasoning_effort: low` puede ser la causa de esta inconsistencia

#### 4. Dominios de Knowledge Base Cargados pero No Utilizados
El sistema carga URLs verificadas de `knowledge_base_urls` (suin-juriscol.gov.co, corteconstitucional.gov.co, etc.), pero `buildWebSearchTool()` ignora todos los parametros y solo retorna `{ type: 'web_search_preview' }`. Los dominios se mencionan en el prompt como instrucciones textuales, lo cual es menos efectivo.

#### 5. Contexto Conversacional sin Control de Tokens
Los follow-ups envian todo el historial de conversacion como texto plano concatenado. No hay limite de tokens ni truncamiento, lo que puede causar errores de contexto excedido en conversaciones largas.

---

## Plan de Ajustes

### Ajuste 1: Cobro de Creditos en Follow-ups
**Archivo:** `src/components/lawyer-modules/SuinJuriscolModule.tsx`
- Agregar validacion y consumo de creditos en `handleSendFollowUp`
- Usar un costo diferenciado: follow-ups cuestan menos que busqueda inicial
- Crear entrada `suin_juriscol_followup` en `credit_tool_costs` con base_cost: 1

### Ajuste 2: Reestructurar Pricing
**Base de datos:** `credit_tool_costs`
- Busqueda inicial (`suin_juriscol`): subir a **base_cost: 3** (incluye web search + procesamiento IA)
- Follow-up (`suin_juriscol_followup`): **base_cost: 1** (reutiliza contexto existente)
- Mantener `auto_calculate: false` en ambos para control predecible

### Ajuste 3: Subir Reasoning Effort
**Base de datos:** `system_config`
- Cambiar `suin_juriscol_reasoning_effort` de `low` a `medium`
- Esto mejorara la consistencia de citaciones web sin aumentar drasticamente el costo
- Los resultados con 0 citaciones probablemente se deben a que el modelo no "piensa" lo suficiente para decidir buscar en la web

### Ajuste 4: Limitar Contexto Conversacional
**Archivo:** `supabase/functions/suin-juriscol-search/index.ts`
- Truncar `conversationContext` a los ultimos 3 intercambios (6 mensajes)
- Agregar un resumen del primer mensaje en lugar de todo el historial
- Prevenir errores de tokens excedidos

### Ajuste 5: Indicador de Costo en Follow-ups
**Archivo:** `src/components/lawyer-modules/SuinJuriscolModule.tsx`
- Mostrar costo del follow-up junto al boton de enviar
- Deshabilitar envio si no hay creditos suficientes
- Agregar `ToolCostIndicator` para `suin_juriscol_followup`

---

## Detalles Tecnicos

### Migracion SQL
```sql
-- Nuevo costo para follow-ups
INSERT INTO credit_tool_costs (tool_type, base_cost, auto_calculate)
VALUES ('suin_juriscol_followup', 1, false)
ON CONFLICT (tool_type) DO UPDATE SET base_cost = 1, auto_calculate = false;

-- Actualizar costo de busqueda inicial
UPDATE credit_tool_costs 
SET base_cost = 3, auto_calculate = false 
WHERE tool_type = 'suin_juriscol';

-- Subir reasoning effort
UPDATE system_config 
SET config_value = 'medium' 
WHERE config_key = 'suin_juriscol_reasoning_effort';
```

### Cambios en Frontend (SuinJuriscolModule.tsx)
- En `handleSendFollowUp`: agregar `consumeCredits('suin_juriscol_followup', ...)` antes de invocar la edge function
- Deshabilitar input de follow-up si `!hasEnoughCredits('suin_juriscol_followup')`
- Mostrar costo junto al boton Send

### Cambios en Edge Function (suin-juriscol-search/index.ts)
- Truncar `conversationContext` a maximo ~2000 caracteres o ultimos 3 intercambios
- Registrar `tool_type` como `suin_juriscol_followup` cuando `isFollowUp: true`

### Archivos a Modificar
1. `src/components/lawyer-modules/SuinJuriscolModule.tsx` - cobro follow-ups + UI indicadores
2. `supabase/functions/suin-juriscol-search/index.ts` - truncamiento contexto + tool_type diferenciado
3. Migracion SQL - pricing + reasoning effort

