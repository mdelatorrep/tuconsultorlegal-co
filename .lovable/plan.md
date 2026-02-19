
## Diagnóstico del Problema: Extracción Incorrecta de Archivos .DOC

### Hallazgo Principal

Los logs y la base de datos revelan el problema con total claridad:

**El edge function SÍ extrae texto de los archivos .doc (11.452 y 8.275 caracteres respectivamente), pero el texto extraído es basura binaria, no texto legible.** La muestra de `input_data` guardada en la BD lo confirma:

```
>  ž Ɩ Ż ż Ž ƀ Á ¿  · | X 8 Ť Č Ƥ $ " l þ Ā , Ǘ Ī 0 ¨ ^ 0 t ĺ Ē Ȱ ȩ ȍ ȍ ȍ...
```

Esto no es texto del documento. Es el resultado de leer el archivo binario CFB e interpretar **bytes de datos estructurales del contenedor** (tablas FAT, metadatos del sector) como si fueran texto UTF-16LE. El algoritmo actual mezcla el contenido real de texto con la infraestructura binaria del formato DOC.

La IA confirma exactamente esto en su resumen: *"El archivo provisto está gravemente corrupto/ilegible. El contenido textual es irreconocible (caracteres binarios/ruido)"*.

### Causa Raíz Técnica

El formato `.doc` (Word 97-2003) es un archivo **Compound File Binary (CFB)**. Contiene múltiples streams internos:
- `WordDocument` → contiene el texto real
- `1Table` o `0Table` → tabla de piezas de texto (FIB + piece table)
- Streams FAT, DIFAT, directorios → infraestructura del contenedor

La implementación actual escanea **todos los bytes del archivo** buscando secuencias UTF-16LE imprimibles, pero el 70-80% de un archivo DOC son datos binarios del contenedor (sectores FAT, offsets, campos numéricos) que, al interpretarse como UTF-16LE, generan exactamente ese "basura" que se ve.

### Tecnología Adecuada

La tecnología manual de parseo binario CFB es extremadamente compleja de implementar correctamente en Deno. La solución más robusta y probada en producción es usar **LibreOffice/antiword vía API externa**, pero dado que ya se tiene Firecrawl disponible, la mejor estrategia es usar la **API de File Parsing de Firecrawl** que convierte documentos .doc nativamente a texto limpio.

Sin embargo, Firecrawl no tiene endpoint de conversión de archivos directamente. La alternativa más confiable disponible es usar la **API de conversión de documentos de una librería Deno** correctamente o cambiar la estrategia de extracción:

### Solución: Reemplazar el Motor de Extracción DOC

**Usar `cfb` + parseo correcto del stream `WordDocument`**, que es la única forma correcta de leer archivos .doc en JavaScript/TypeScript sin herramientas externas. La implementación correcta requiere:

1. **Parsear el directorio CFB** para localizar el stream `WordDocument` específicamente (no escanear todos los bytes)
2. **Leer el FIB (File Information Block)** al inicio del stream WordDocument para obtener los offsets del texto
3. **Extraer solo los bytes del texto** desde las posiciones indicadas por el FIB
4. **Decodificar correctamente** como UTF-16LE o CP1252 según el flag del FIB

Adicionalmente, como alternativa más simple y robusta, se puede usar la librería **`mammoth`** disponible en esm.sh que hace exactamente esto de forma confiable.

### Plan de Implementación

**Cambio 1: Edge Function `legal-document-analysis/index.ts`**

Reemplazar la función `extractTextFromDOC` con dos estrategias en cascada:

- **Estrategia A (Principal):** Usar `mammoth` desde esm.sh (`https://esm.sh/mammoth@1.8.0`) que convierte archivos .doc a texto plano correctamente. Es la librería estándar para esto en Node/Deno.
- **Estrategia B (Fallback):** Parseo CFB correcto que localice específicamente el stream `WordDocument` en el directorio del contenedor y extraiga solo esos bytes, en lugar de escanear el archivo completo.

El flujo sería:
```
archivo .doc base64
    → mammoth.extractRawText() 
    → texto limpio y legible
    → si falla → parseo CFB directo del stream WordDocument
    → análisis con OpenAI
```

**Cambio 2: Verificación del frontend**

Revisar si hay algún problema en cómo se muestra el estado de error cuando el backend devuelve datos válidos (el análisis SÍ llega completo pero la UI podría estar mostrando "error" o pantalla en blanco). Esto se revisará directamente al leer los logs de consola del browser durante una sesión activa.

### Archivos a Modificar

- `supabase/functions/legal-document-analysis/index.ts` — Reemplazar `extractTextFromDOC` con implementación basada en `mammoth` + fallback CFB correcto

### Resultado Esperado

- Los archivos `.doc` creados en Microsoft Word serán leídos y su contenido real (sentencias, contratos, escritos) será extraído correctamente
- La IA recibirá el texto legal real y podrá hacer un análisis de alta confianza
- El resumen ya no dirá "archivo corrupto" sino que analizará el contenido real de la sentencia
