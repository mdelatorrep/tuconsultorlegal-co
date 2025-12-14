import { useMemo, useCallback, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cleanWordHtml, isWordHtml } from "@/utils/wordHtmlSanitizer";
import DocumentPDFPreview from "@/components/DocumentPDFPreview";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Braces } from "lucide-react";

interface RichTextTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
  showPDFPreview?: boolean;
  documentName?: string;
  placeholders?: Array<{ placeholder: string; pregunta?: string }>;
}

/**
 * Componente de editor de texto enriquecido unificado para plantillas de documentos legales.
 * Usa ReactQuill para asegurar consistencia en el formato HTML entre:
 * - Creación de agentes (AgentCreatorPage)
 * - Edición de agentes (AgentManagerPage)  
 * - Editor de documentos (DocumentEditor)
 * - Vista previa de documentos
 * - Generación de PDF
 * 
 * Incluye sanitización automática de contenido pegado desde Microsoft Word/Office.
 */
export default function RichTextTemplateEditor({
  value,
  onChange,
  placeholder = "Escribe o pega tu plantilla aquí...",
  minHeight = "400px",
  className = "",
  readOnly = false,
  showPDFPreview = true,
  documentName,
  placeholders,
}: RichTextTemplateEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const [isPlaceholderOpen, setIsPlaceholderOpen] = useState(false);

  // Handler para insertar placeholder en la posición del cursor
  const handleInsertPlaceholder = useCallback((placeholderText: string) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      const formattedPlaceholder = `{{${placeholderText}}}`;
      quill.insertText(range.index, formattedPlaceholder, 'user');
      quill.setSelection(range.index + formattedPlaceholder.length, 0);
    }
    setIsPlaceholderOpen(false);
  }, []);

  // Handler para sanitizar contenido pegado desde Word
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Obtener HTML del clipboard
    const htmlContent = clipboardData.getData('text/html');
    
    // Si no hay HTML o no es de Word, dejar que Quill lo maneje normalmente
    if (!htmlContent || !isWordHtml(htmlContent)) {
      return;
    }

    // Prevenir el comportamiento por defecto
    e.preventDefault();

    // Limpiar el HTML de Word
    const cleanedHtml = cleanWordHtml(htmlContent);

    // Obtener la instancia del editor
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Obtener la posición actual del cursor
    const range = quill.getSelection(true);
    
    // Insertar el contenido limpio usando el clipboard de Quill
    if (range) {
      // Eliminar cualquier selección existente
      if (range.length > 0) {
        quill.deleteText(range.index, range.length);
      }
      
      // Usar dangerouslyPasteHTML para insertar el HTML limpio
      quill.clipboard.dangerouslyPasteHTML(range.index, cleanedHtml, 'user');
    }
  }, []);

  // Colores disponibles para el editor
  const colors = [
    '#000000', '#282828', '#666666', '#999999', '#cccccc',
    '#0372E8', '#1e40af', '#3b82f6', '#60a5fa',
    '#dc2626', '#ef4444', '#f87171',
    '#16a34a', '#22c55e', '#4ade80',
    '#ca8a04', '#eab308', '#facc15',
    '#7c3aed', '#8b5cf6', '#a78bfa',
  ];

  // Tamaños de fuente disponibles
  const fontSizes = ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

  // Configuración del módulo de toolbar - consistente en toda la aplicación
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: fontSizes }],
        ["bold", "italic", "underline", "strike"],
        [{ color: colors }, { background: colors }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
    },
    clipboard: {
      // Permitir solo formatos seguros
      matchVisual: false,
    },
  }), []);

  // Formatos permitidos
  const formats = [
    "header",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "indent",
    "align",
    "link",
  ];

  return (
    <div 
      className={`rich-text-template-editor ${className}`}
      onPaste={handlePaste}
    >
      {/* Barra de herramientas adicional con vista previa PDF y selector de placeholders */}
      {!readOnly && (
        <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
          {/* Selector de Placeholders */}
          {placeholders && placeholders.length > 0 && (
            <Popover open={isPlaceholderOpen} onOpenChange={setIsPlaceholderOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Braces className="h-4 w-4" />
                  Insertar Campo
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Campos Disponibles</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Haz clic en un campo para insertarlo en el documento
                  </p>
                </div>
                <ScrollArea className="h-64">
                  <div className="p-2 space-y-1">
                    {placeholders.map((p, index) => (
                      <button
                        key={index}
                        onClick={() => handleInsertPlaceholder(p.placeholder)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {`{{${p.placeholder}}}`}
                          </Badge>
                        </div>
                        {p.pregunta && (
                          <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                            {p.pregunta}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Vista previa PDF */}
          {showPDFPreview && (
            <DocumentPDFPreview
              templateContent={value}
              documentName={documentName}
              placeholders={placeholders}
              buttonVariant="outline"
              buttonSize="sm"
            />
          )}
        </div>
      )}
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ minHeight }}
      />
      <style>{`
        .rich-text-template-editor .ql-container {
          min-height: ${minHeight};
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.7;
        }
        .rich-text-template-editor .ql-editor {
          min-height: ${minHeight};
          padding: 1rem;
        }
        .rich-text-template-editor .ql-editor p {
          margin-bottom: 0.5em;
        }
        .rich-text-template-editor .ql-editor h1,
        .rich-text-template-editor .ql-editor h2,
        .rich-text-template-editor .ql-editor h3 {
          font-family: Helvetica, Arial, sans-serif;
          color: hsl(var(--primary));
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .rich-text-template-editor .ql-editor h1 { font-size: 1.5em; }
        .rich-text-template-editor .ql-editor h2 { font-size: 1.3em; }
        .rich-text-template-editor .ql-editor h3 { font-size: 1.15em; }
        .rich-text-template-editor .ql-editor ul,
        .rich-text-template-editor .ql-editor ol {
          padding-left: 1.5em;
        }
        .rich-text-template-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
          flex-wrap: wrap;
        }
        .rich-text-template-editor .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: hsl(var(--border));
        }
        /* Placeholder styling */
        .rich-text-template-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        /* ReadOnly state */
        .rich-text-template-editor .ql-disabled {
          background: hsl(var(--muted) / 0.3);
        }
        /* Color picker improvements */
        .rich-text-template-editor .ql-color-picker,
        .rich-text-template-editor .ql-background {
          width: 28px;
        }
        .rich-text-template-editor .ql-picker.ql-size {
          width: 70px;
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item::before {
          content: 'Normal';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="8px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="8px"]::before {
          content: '8px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
          content: '10px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="11px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="11px"]::before {
          content: '11px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
          content: '12px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
          content: '14px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
          content: '16px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
          content: '18px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
          content: '20px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
          content: '24px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
          content: '28px';
        }
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
        .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
          content: '32px';
        }
        /* Dropdown styling */
        .rich-text-template-editor .ql-picker-options {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .rich-text-template-editor .ql-picker-item:hover {
          background: hsl(var(--muted));
        }
      `}</style>
    </div>
  );
}
