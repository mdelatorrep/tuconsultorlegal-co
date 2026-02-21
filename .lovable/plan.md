
# Analisis Estructural - Analisis de Documentos

## Proposito
Permite a abogados subir documentos legales (PDF, DOC, DOCX, TXT) y obtener un analisis automatizado por IA que identifica: tipo de documento, partes involucradas, clausulas/elementos, riesgos, fechas clave, referencias legales, y recomendaciones.

## Diagnostico

### Arquitectura Actual
- **Frontend**: `AnalyzeModule.tsx` (915 lineas) + `AnalysisResultsDisplay.tsx` (629 lineas) = ~1,544 lineas
- **Backend**: `legal-document-analysis/index.ts` (588 lineas) con extraccion manual de texto para PDF, DOC y DOCX
- **10 analisis reales** en produccion

### Problemas Criticos Identificados

#### 1. Extraccion de Texto DEFICIENTE (CRITICO)
Datos reales de produccion demuestran fallas graves:

| Archivo | Metodo | Chars extraidos | Veredicto |
|---------|--------|-----------------|-----------|
| WAFLERIA CONTRATO...docx | docx | **91** | FALLO TOTAL |
| SENTENCIA SC5324...docx | docx | 54,453 | OK |
| SENTENCIA 76001...doc | doc-binary | 8,275 | OK |
| SENTENCIA SC5324...doc | doc-binary | 11,452 | OK |
| SENTENCIA DEBER...doc | (antiguo) | nil | FALLO |
| CONCILIACION...doc | (antiguo) | nil | FALLO |

**El problema raiz**: La extraccion de DOCX usa JSZip + regex sobre XML (`<w:t>` tags), pero muchos DOCX modernos usan namespaces, `<w:t xml:space="preserve">`, o estructuras complejas que el regex simple no captura. El DOCX que extrajo solo 91 chars es un contrato real que fallo silenciosamente.

Para PDF: la extraccion manual por regex de streams BT/ET solo funciona en PDFs no comprimidos. La mayoria de PDFs modernos usan FlateDecode (compresion zlib) y el extractor actual NO descomprime streams, por lo que obtiene 0 texto en la mayoria de casos.

#### 2. Frontend Excesivamente Complejo
- **~400 lineas** dedicadas SOLO a normalizar respuestas de IA (lineas 88-426 en AnalyzeModule.tsx). La normalizacion esta DUPLICADA: una vez para el historial y otra vez para resultados nuevos.
- Tabs innecesarias (Nuevo Analisis / Historial) cuando podria ser una vista unica con el resultado mas reciente arriba y el historial abajo.
- `AnalysisResultsDisplay.tsx` tiene 629 lineas para lo que podria ser ~250 con componentes mas limpios.

#### 3. Limite de 15,000 Caracteres Arbitrario
El contenido se trunca a 15,000 chars antes de enviarlo a la IA (linea 506 del edge function). Para documentos legales largos (sentencias de 50K+ chars), esto significa que el analisis solo cubre las primeras paginas.

#### 4. No Hay Retroalimentacion al Usuario Sobre Calidad de Extraccion
Cuando la extraccion falla (91 chars de un contrato completo), el sistema envia ese contenido minimo a la IA y genera un "analisis" basado en casi nada. El usuario recibe resultados que parecen legitimos pero son inventados. No hay advertencia.

---

## Plan de Ajustes Estrategicos

### Fase 1: Arreglar Extraccion de Documentos (Backend - CRITICO)

**Reemplazar la extraccion manual con la libreria `pdf-parse` para PDFs y mejorar DOCX:**

Para **DOCX**: Reemplazar el regex `<w:t>` por un parseo XML correcto que maneje namespaces y `xml:space="preserve"`. Usar DOMParser disponible en Deno para parsear el XML de forma robusta en lugar de regex.

Para **PDF**: La extraccion manual actual es fundamentalmente limitada (no descomprime FlateDecode). La solucion es enviar el archivo completo como base64 directamente al modelo `gpt-4o` que tiene capacidad nativa de procesamiento de archivos/imagenes, evitando la extraccion manual completamente para PDFs problematicos. Cuando la extraccion manual falla (< 200 chars), usar el PDF como input directo via la API de archivos de OpenAI.

Para **DOC**: El sistema actual (mammoth + CFB fallback) funciona razonablemente. Mantener.

**Agregar indicador de calidad de extraccion:**
- Si chars extraidos < 200: advertir al usuario "Extraccion limitada, resultados pueden ser imprecisos"
- Incluir `extractionQuality: 'full' | 'partial' | 'minimal'` en la respuesta

### Fase 2: Simplificar Frontend

**Consolidar normalizacion:**
- Extraer las ~400 lineas de funciones de normalizacion a un archivo utilitario `analysisNormalizer.ts`
- Usar UNA SOLA funcion para ambos contextos (historial y resultado nuevo)

**Eliminar tabs, vista unica:**
- Resultado del analisis actual arriba (si existe)
- Boton de subir documento prominente
- Historial colapsable debajo
- Reducir AnalyzeModule de 915 a ~350 lineas

### Fase 3: Aumentar Limite de Contenido

- Subir el truncamiento de 15,000 a 30,000 caracteres para documentos largos
- Para documentos > 30,000 chars, implementar analisis por secciones (enviar primeros 15K + ultimos 15K con instruccion de que hay contenido intermedio)

---

## Detalles Tecnicos

### Archivos a Modificar
1. `supabase/functions/legal-document-analysis/index.ts` - Reescribir extractores PDF/DOCX, agregar calidad de extraccion
2. `src/components/lawyer-modules/AnalyzeModule.tsx` - Simplificar a vista unica, extraer normalizacion
3. `src/components/lawyer-modules/analysis/AnalysisResultsDisplay.tsx` - Mantener pero simplificar
4. **Nuevo**: `src/components/lawyer-modules/analysis/analysisNormalizer.ts` - Funciones de normalizacion consolidadas

### Cambios en Edge Function (extractTextFromDOCX mejorado)
```typescript
// Parseo XML correcto en lugar de regex
const parser = new DOMParser();
const doc = parser.parseFromString(xmlContent, 'text/xml');
const textNodes = doc.getElementsByTagNameNS(
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't'
);
let text = '';
for (let i = 0; i < textNodes.length; i++) {
  text += textNodes[i].textContent + ' ';
}
```

### Resultado Esperado
- De **1,544 lineas frontend** a **~900 lineas** (normalizacion extraida + tabs eliminadas)
- **0 extraccion de texto fallida silenciosamente** - siempre hay advertencia al usuario
- DOCX y PDF procesan correctamente documentos reales colombianos
- Mejor cobertura de documentos largos (30K chars vs 15K)
