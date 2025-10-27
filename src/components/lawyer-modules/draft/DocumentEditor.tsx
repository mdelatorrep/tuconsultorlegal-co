import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Download, X, DollarSign, Loader2 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { generatePDF } from "./pdfUtils";

interface DocumentEditorProps {
  open: boolean;
  onClose: () => void;
  initialContent: string;
  documentType: string;
  lawyerId: string;
  canCreateAgents: boolean;
  onSaved?: () => void;
}

export default function DocumentEditor({
  open,
  onClose,
  initialContent,
  documentType,
  lawyerId,
  canCreateAgents,
  onSaved
}: DocumentEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  };

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

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Título requerido",
        description: "Por favor ingresa un título para el documento.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("lawyer_documents").insert({
        lawyer_id: lawyerId,
        title: title.trim(),
        document_type: documentType,
        content: content,
        markdown_content: content,
      });

      if (error) throw error;

      toast({
        title: "Documento guardado",
        description: "El documento se ha guardado exitosamente.",
      });

      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el documento.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const documentTitle = title.trim() || documentType;
      await generatePDF(content, documentTitle);
      
      toast({
        title: "PDF generado",
        description: "El documento se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el documento PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Editor de Documento</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Edita y guarda tu documento legal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Título del Documento
            </label>
            <Input
              placeholder="Ej: Contrato de Colaboración - Cliente XYZ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Contenido
            </label>
            <div className="border rounded-md">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                className="h-96"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-12">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Documento
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
