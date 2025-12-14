import { useMemo, useCallback, useRef, useState, useEffect } from "react";
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
import { Braces, SeparatorHorizontal, Table } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Registrar tamaños de fuente personalizados
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
Quill.register(Size, true);

// Registrar blot para salto de página
const BlockEmbed = Quill.import('blots/block/embed');
class PageBreakBlot extends BlockEmbed {
  static blotName = 'pageBreak';
  static tagName = 'div';
  static className = 'page-break';
  
  static create() {
    const node = super.create();
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-page-break', 'true');
    node.innerHTML = '<hr class="page-break-line"><span class="page-break-label">— Salto de página —</span>';
    return node;
  }
  
  static value() {
    return true;
  }
}
Quill.register(PageBreakBlot, true);

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

  // Handler para insertar salto de página
  const handleInsertPageBreak = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      quill.insertEmbed(range.index, 'pageBreak', true, 'user');
      quill.setSelection(range.index + 1, 0);
    }
  }, []);

  // Handler para insertar tabla
  const handleInsertTable = useCallback((rows: number, cols: number) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      // Crear tabla HTML
      let tableHtml = '<table class="legal-table"><tbody>';
      for (let r = 0; r < rows; r++) {
        tableHtml += '<tr>';
        for (let c = 0; c < cols; c++) {
          tableHtml += `<td>${r === 0 ? `Columna ${c + 1}` : '&nbsp;'}</td>`;
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table><p><br></p>';
      
      quill.clipboard.dangerouslyPasteHTML(range.index, tableHtml, 'user');
    }
  }, []);

  // Handler para sanitizar contenido pegado desde Word
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const htmlContent = clipboardData.getData('text/html');
    
    if (!htmlContent || !isWordHtml(htmlContent)) {
      return;
    }

    e.preventDefault();
    const cleanedHtml = cleanWordHtml(htmlContent);
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection(true);
    if (range) {
      if (range.length > 0) {
        quill.deleteText(range.index, range.length);
      }
      quill.clipboard.dangerouslyPasteHTML(range.index, cleanedHtml, 'user');
    }
  }, []);

  // Colores disponibles para el editor
  const colors = [
    '#000000', '#282828', '#666666', '#999999', '#cccccc', '#ffffff',
    '#0372E8', '#1e40af', '#3b82f6', '#60a5fa', '#dbeafe',
    '#dc2626', '#ef4444', '#f87171', '#fecaca',
    '#16a34a', '#22c55e', '#4ade80', '#dcfce7',
    '#ca8a04', '#eab308', '#facc15', '#fef9c3',
    '#7c3aed', '#8b5cf6', '#a78bfa', '#ede9fe',
  ];

  // Tamaños de fuente disponibles
  const fontSizes = ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

  // Configuración del módulo de toolbar
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: fontSizes }],
        ["bold", "italic", "underline", "strike"],
        [{ script: "sub" }, { script: "super" }],
        [{ color: colors }, { background: colors }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    },
    clipboard: {
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
    "script",
    "color",
    "background",
    "list",
    "bullet",
    "indent",
    "align",
    "blockquote",
    "code-block",
    "link",
    "pageBreak",
  ];

  // Agregar tooltips a los iconos del toolbar después del montaje
  useEffect(() => {
    const tooltips: Record<string, string> = {
      '.ql-bold': 'Negrita (Ctrl+B)',
      '.ql-italic': 'Cursiva (Ctrl+I)',
      '.ql-underline': 'Subrayado (Ctrl+U)',
      '.ql-strike': 'Tachado',
      '.ql-blockquote': 'Cita/Bloque destacado',
      '.ql-code-block': 'Bloque de código',
      '.ql-list[value="ordered"]': 'Lista numerada',
      '.ql-list[value="bullet"]': 'Lista con viñetas',
      '.ql-indent[value="-1"]': 'Reducir sangría',
      '.ql-indent[value="+1"]': 'Aumentar sangría',
      '.ql-link': 'Insertar enlace',
      '.ql-clean': 'Limpiar formato',
      '.ql-script[value="sub"]': 'Subíndice',
      '.ql-script[value="super"]': 'Superíndice',
      '.ql-color': 'Color de texto',
      '.ql-background': 'Color de fondo',
      '.ql-align': 'Alineación',
      '.ql-header': 'Encabezado',
      '.ql-size': 'Tamaño de fuente',
    };

    const timer = setTimeout(() => {
      Object.entries(tooltips).forEach(([selector, title]) => {
        const elements = document.querySelectorAll(`.rich-text-template-editor ${selector}`);
        elements.forEach(el => {
          el.setAttribute('title', title);
        });
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TooltipProvider>
      <div 
        className={`rich-text-template-editor ${className}`}
        onPaste={handlePaste}
      >
        {/* Barra de herramientas adicional */}
        {!readOnly && (
          <div className="flex justify-between items-center mb-2 gap-2 flex-wrap bg-muted/50 p-2 rounded-lg border border-border">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector de Placeholders */}
              {placeholders && placeholders.length > 0 && (
                <Popover open={isPlaceholderOpen} onOpenChange={setIsPlaceholderOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 bg-background">
                          <Braces className="h-4 w-4" />
                          <span className="hidden sm:inline">Insertar Campo</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Insertar campo dinámico</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-80 p-0 z-50 bg-background" align="start">
                    <div className="p-3 border-b bg-muted/50">
                      <h4 className="font-medium text-sm">Campos Disponibles</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Haz clic en un campo para insertarlo
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

              {/* Insertar Tabla */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-background">
                        <Table className="h-4 w-4" />
                        <span className="hidden sm:inline">Tabla</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Insertar tabla</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-48 p-3 z-50 bg-background" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Seleccionar tamaño</p>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 3, 4, 5].map(rows => (
                        [2, 3, 4, 5].map(cols => (
                          <button
                            key={`${rows}-${cols}`}
                            onClick={() => handleInsertTable(rows, cols)}
                            className="w-8 h-8 border rounded text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                            title={`${rows}×${cols}`}
                          >
                            {rows}×{cols}
                          </button>
                        ))
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Salto de Página */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-background"
                    onClick={handleInsertPageBreak}
                  >
                    <SeparatorHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Salto de Página</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insertar salto de página para PDF</TooltipContent>
              </Tooltip>
            </div>
            
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
            margin-bottom: 0.75em;
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
            margin-bottom: 0.75em;
          }
          /* Blockquote - Cita destacada */
          .rich-text-template-editor .ql-editor blockquote {
            border-left: 4px solid hsl(var(--primary));
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            background: hsl(var(--muted) / 0.5);
            border-radius: 0 0.375rem 0.375rem 0;
            font-style: italic;
            color: hsl(var(--foreground) / 0.9);
          }
          /* Code block - para cláusulas especiales */
          .rich-text-template-editor .ql-editor pre.ql-syntax {
            background: hsl(var(--muted));
            border: 1px solid hsl(var(--border));
            border-radius: 0.375rem;
            padding: 1rem;
            margin: 1rem 0;
            font-family: "Times New Roman", Times, serif;
            font-size: 11pt;
            white-space: pre-wrap;
            color: hsl(var(--foreground));
          }
          /* Tablas */
          .rich-text-template-editor .ql-editor table.legal-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }
          .rich-text-template-editor .ql-editor table.legal-table td,
          .rich-text-template-editor .ql-editor table.legal-table th {
            border: 1px solid hsl(var(--border));
            padding: 0.5rem;
            min-width: 80px;
          }
          .rich-text-template-editor .ql-editor table.legal-table tr:first-child td {
            background: hsl(var(--muted));
            font-weight: 600;
          }
          /* Salto de página */
          .rich-text-template-editor .ql-editor .page-break {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 1.5rem 0;
            user-select: none;
          }
          .rich-text-template-editor .ql-editor .page-break-line {
            width: 100%;
            border: none;
            border-top: 2px dashed hsl(var(--primary) / 0.5);
            margin: 0;
          }
          .rich-text-template-editor .ql-editor .page-break-label {
            background: hsl(var(--background));
            color: hsl(var(--muted-foreground));
            font-size: 0.75rem;
            padding: 0.25rem 0.75rem;
            margin-top: -0.75rem;
            border-radius: 1rem;
            border: 1px solid hsl(var(--border));
          }
          /* Superíndice y subíndice */
          .rich-text-template-editor .ql-editor sup {
            font-size: 0.7em;
            vertical-align: super;
          }
          .rich-text-template-editor .ql-editor sub {
            font-size: 0.7em;
            vertical-align: sub;
          }
          /* Toolbar styling */
          .rich-text-template-editor .ql-toolbar {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            background: hsl(var(--muted));
            border-color: hsl(var(--border));
            flex-wrap: wrap;
            padding: 8px;
          }
          .rich-text-template-editor .ql-toolbar button {
            width: 28px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.25rem;
            transition: all 0.15s;
          }
          .rich-text-template-editor .ql-toolbar button:hover {
            background: hsl(var(--background));
          }
          .rich-text-template-editor .ql-toolbar button.ql-active {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
          }
          .rich-text-template-editor .ql-toolbar .ql-formats {
            margin-right: 8px;
            padding-right: 8px;
            border-right: 1px solid hsl(var(--border));
          }
          .rich-text-template-editor .ql-toolbar .ql-formats:last-child {
            border-right: none;
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
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="8px"]::before { content: '8px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before { content: '10px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="11px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="11px"]::before { content: '11px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before { content: '12px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before { content: '14px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before { content: '16px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before { content: '18px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before { content: '20px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before { content: '24px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before { content: '28px'; }
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
          .rich-text-template-editor .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before { content: '32px'; }
          /* Dropdown styling */
          .rich-text-template-editor .ql-picker-options {
            background: hsl(var(--background));
            border-color: hsl(var(--border));
            border-radius: 0.375rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            z-index: 50;
            max-height: 200px;
            overflow-y: auto;
          }
          .rich-text-template-editor .ql-picker-item:hover {
            background: hsl(var(--muted));
          }
          /* Color picker grid */
          .rich-text-template-editor .ql-color-picker .ql-picker-options,
          .rich-text-template-editor .ql-background .ql-picker-options {
            width: 168px;
            padding: 4px;
          }
          .rich-text-template-editor .ql-color-picker .ql-picker-item,
          .rich-text-template-editor .ql-background .ql-picker-item {
            width: 20px;
            height: 20px;
            border-radius: 2px;
            margin: 2px;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
