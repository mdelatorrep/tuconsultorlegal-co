import { useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface RichTextTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
}

/**
 * Componente de editor de texto enriquecido unificado para plantillas de documentos legales.
 * Usa ReactQuill para asegurar consistencia en el formato HTML entre:
 * - Creación de agentes (AgentCreatorPage)
 * - Edición de agentes (AgentManagerPage)  
 * - Editor de documentos (DocumentEditor)
 * - Vista previa de documentos
 * - Generación de PDF
 */
export default function RichTextTemplateEditor({
  value,
  onChange,
  placeholder = "Escribe o pega tu plantilla aquí...",
  minHeight = "400px",
  className = "",
  readOnly = false,
}: RichTextTemplateEditorProps) {
  // Configuración del módulo de toolbar - consistente en toda la aplicación
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  }), []);

  // Formatos permitidos
  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "indent",
    "align",
    "link",
  ];

  return (
    <div className={`rich-text-template-editor ${className}`}>
      <ReactQuill
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
      `}</style>
    </div>
  );
}
