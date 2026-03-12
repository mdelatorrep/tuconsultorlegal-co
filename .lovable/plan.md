

# Soporte Multi-Formato via Code Interpreter de OpenAI

## Descubrimiento Clave

La herramienta **Code Interpreter** de OpenAI soporta nativamente estos formatos relevantes para documentos legales:

| Formato | MIME type |
|---------|-----------|
| .pdf | application/pdf |
| .doc | application/msword |
| .docx | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| .txt | text/plain |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |

Ademas, los archivos enviados en el `input` del modelo se suben automaticamente al container de Code Interpreter. No se requiere subida manual previa.

## Estrategia de Procesamiento

```text
PDF --> input_file (procesamiento nativo, mas rapido, sin container)
DOCX/DOC/TXT/XLSX --> code_interpreter tool (OpenAI extrae el contenido via Python)
```

- Para **PDF**: seguir usando `input_file` como esta ahora (funciona perfecto)
- Para **DOCX/DOC y otros**: agregar `code_interpreter` como tool en la request, enviar el archivo como `input_file` en el input, y OpenAI usara Python para leer el contenido y analizarlo

## Cambios a Realizar

### 1. Edge Function (`legal-document-analysis/index.ts`)

- Eliminar la funcion `extractTextFromDocx` (regex fragil, ya no se necesita)
- Para archivos no-PDF (DOCX, DOC, TXT, XLSX): enviar el archivo como `input_file` en el input + agregar `tools: [{ type: "code_interpreter", container: { type: "auto" } }]` en la request
- Mantener la ruta actual de PDF sin cambios (ya funciona con `input_file` directo)
- Mantener la ruta de texto plano sin cambios

### 2. Frontend (`AnalyzeModule.tsx`)

- Restaurar el `accept` del input de archivos para incluir `.pdf,.doc,.docx,.txt`
- Restaurar la validacion para aceptar estos tipos de archivo
- Mantener la codificacion base64 via `FileReader.readAsDataURL()`

### 3. Formato de la Request con Code Interpreter

```text
{
  model: "gpt-4o",
  tools: [{ type: "code_interpreter", container: { type: "auto" } }],
  input: [
    {
      role: "user",
      content: [
        { type: "input_file", filename: "contrato.docx", file_data: "data:application/...;base64,..." },
        { type: "input_text", text: "Analiza este documento legal..." }
      ]
    }
  ],
  instructions: "...",
  text: { format: { type: "json_object" } }
}
```

## Archivos a Modificar

1. `supabase/functions/legal-document-analysis/index.ts` - Agregar ruta con code_interpreter para DOCX/DOC, eliminar extractTextFromDocx
2. `src/components/lawyer-modules/AnalyzeModule.tsx` - Restaurar aceptacion de PDF, DOC, DOCX, TXT

## Resultado Esperado

- Procesamiento confiable de PDF, DOC, DOCX y TXT sin extraccion manual
- OpenAI maneja toda la complejidad de parseo via Code Interpreter (Python sandbox)
- El regex fragil de DOCX se elimina completamente
- Codigo mas simple: ~200 lineas en el edge function

