
# Cambio de Enfoque: Enviar Archivos Directamente a OpenAI

## Diagnostico del Fallo Actual

Los logs muestran exactamente por que falla:

```
OpenAI Responses API error: 400 
"Invalid value: 'text'. Supported values are: 'input_text', 'input_image', 
'output_text', 'refusal', 'input_file'..."
```

El fallback de vision usa formatos de Chat Completions (`type: 'text'`, `type: 'image_url'`) pero el sistema usa la Responses API que requiere `type: 'input_text'` y `type: 'input_file'`. Ademas, las ~400 lineas de extraccion manual de texto (ZIP, regex, CFB) son fragiles y fallan con documentos reales.

## Nuevo Enfoque: OpenAI Procesa el Archivo Directamente

Segun la documentacion oficial de OpenAI, la Responses API soporta `input_file` con `file_data` en base64. OpenAI extrae el texto internamente y ademas genera imagenes de cada pagina para mejor comprension. Esto elimina completamente la necesidad de extraccion manual.

Formato correcto segun la documentacion:
```text
{
  type: "input_file",
  filename: "contrato.pdf",
  file_data: "data:application/pdf;base64,..."
}
```

## Cambios a Realizar

### 1. Reescribir el Edge Function (reduccion drastica)

**Eliminar** las ~450 lineas de extractores manuales:
- `extractTextFromPDF` (regex BT/ET) 
- `extractTextFromDOCX` (4 estrategias ZIP)
- `extractTextFromDOC` (mammoth + CFB parser)
- `extractFileFromZip`, `extractFileFromZipAsync`, `extractTextFromXML`
- `analyzeWithVision` (usa formato incorrecto)

**Reemplazar** con una sola funcion que:
1. Para archivos binarios (PDF, DOCX, DOC): enviar directamente a OpenAI via `input_file` con `file_data` en base64
2. Para archivos de texto (TXT, RTF): enviar como `input_text` directamente
3. Mantener un intento de extraccion de texto simple SOLO como contexto adicional, no como requisito

### 2. Logica simplificada del handler principal

```text
SI tiene fileBase64 Y es archivo binario (PDF/DOCX/DOC):
  -> Enviar a OpenAI Responses API con type: "input_file" + file_data
  -> OpenAI procesa el archivo internamente
SI es texto plano:
  -> Enviar como input_text directamente
```

### 3. Frontend sin cambios

El frontend ya envia `fileBase64` correctamente (arreglado en la iteracion anterior con `FileReader.readAsDataURL`). Solo necesita recibir la respuesta como antes.

## Detalles Tecnicos

### Archivo a modificar
- `supabase/functions/legal-document-analysis/index.ts` - Reescritura del 70% del archivo

### Resultado esperado
- De ~873 lineas a ~250 lineas
- Procesamiento confiable de PDF, DOCX y DOC sin extraccion manual
- OpenAI maneja toda la complejidad de parseo de archivos
- Eliminacion del error 400 por formatos incompatibles
