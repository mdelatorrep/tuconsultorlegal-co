

# Rediseño completo del módulo de Redacción

## Problemas identificados

1. **Flujo confuso**: El usuario debe llenar un formulario, generar un borrador, y luego se abre un Dialog separado con el editor + copilot. No es intuitivo.
2. **El resultado muestra markdown/HTML crudo**: `DraftResultDisplay` usa `dangerouslySetInnerHTML` pero el contenido viene como markdown plano, mostrando asteriscos y pipes sin formatear.
3. **Copilot sin input visible**: El chat del copilot dentro del Dialog no tiene campo de texto visible/prominente (está al fondo del panel lateral).
4. **Editor es un Textarea plano**: El contenido se edita en un `<Textarea>` sin formato, mientras que "Mis Documentos" usa ReactQuill.
5. **Dos sistemas de copilot duplicados**: Existe `src/components/copilot/` (LegalCopilot, CopilotChat) y el copilot integrado en `DocumentEditorWithCopilot.tsx`, causando confusión.

## Diseño propuesto

Reemplazar el flujo actual de 3 pasos (formulario -> resultado -> dialog editor) por una experiencia unificada de **estudio de redacción** en una sola vista:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Estudio de Redacción                              [Mis Documentos]    │
├────────────────────────────────────────────┬─────────────────────────────┤
│                                            │  Copilot Legal             │
│  [Tipo documento ▾]  [Título...]           │  ─────────────────────     │
│  ─────────────────────────────             │  Bienvenida contextual     │
│  ┌──────────────────────────┐              │                            │
│  │                          │              │  [mensajes del chat]       │
│  │   ReactQuill Editor      │              │                            │
│  │   (rich text, formateado)│              │  ─── Acciones rápidas ──   │
│  │                          │              │  [Cláusulas] [Riesgos]     │
│  │                          │              │  [Mejorar]   [Marco legal] │
│  │                          │              │  ─────────────────────     │
│  │                          │              │  [Input del chat......] 📤 │
│  └──────────────────────────┘              │                            │
│  ─────────────────────────────             ├─────────────────────────────┤
│  [Generar con IA ✨ 5cr]  [Guardar]  [PDF] │  [Ocultar Copilot]         │
└────────────────────────────────────────────┴─────────────────────────────┘
```

## Cambios técnicos

### 1. Reescribir `DraftModule.tsx`
- Eliminar el formulario separado + Dialog. Todo en una sola vista.
- Layout de 2 columnas: editor (2/3) + copilot (1/3), toggle para ocultar copilot.
- Tabs solo para "Redactar" y "Mis Documentos" (se mantiene).

### 2. Reemplazar Textarea por ReactQuill en el editor principal
- Usar ReactQuill con toolbar completo (consistente con MyDocuments y el editor de agentes).
- El contenido generado por IA se inserta como HTML formateado en el editor.

### 3. Unificar el Copilot
- Integrar `CopilotChat` de `src/components/copilot/` directamente en la vista (no en un Dialog).
- El copilot tiene: chat con input visible, acciones rápidas contextuales, detección de placeholders.
- Botón "Insertar en documento" que inserta HTML formateado en el editor ReactQuill.

### 4. Flujo de generación con IA
- El botón "Generar con IA" toma el tipo de documento + descripción del usuario y genera contenido.
- El resultado se inserta directamente en el editor ReactQuill (no en un componente de preview separado).
- Si el editor ya tiene contenido, preguntar si reemplazar o agregar al final.

### 5. Eliminar `DraftResultDisplay.tsx`
- Ya no se necesita un componente de preview separado. El editor ES el preview.

### 6. Eliminar `DocumentEditorWithCopilot.tsx`
- Su funcionalidad se fusiona en el nuevo `DraftModule.tsx`.

### 7. Renderizado del Copilot
- Los mensajes del asistente se renderizan con `MarkdownRenderer` (ya existe y soporta tablas, negritas, etc.) en lugar de `whitespace-pre-wrap` que muestra markdown crudo.

### Archivos a modificar/crear
- **Reescribir**: `src/components/lawyer-modules/DraftModule.tsx` - nueva experiencia unificada
- **Eliminar**: `src/components/lawyer-modules/draft/DraftResultDisplay.tsx`
- **Eliminar**: `src/components/lawyer-modules/draft/DocumentEditorWithCopilot.tsx`
- **Mantener**: `src/components/lawyer-modules/draft/MyDocuments.tsx`, `pdfUtils.ts`
- **Reutilizar**: `src/components/copilot/CopilotChat.tsx` (o integrar su lógica)
- **Reutilizar**: `src/components/ui/MarkdownRenderer.tsx` para mensajes del chat

