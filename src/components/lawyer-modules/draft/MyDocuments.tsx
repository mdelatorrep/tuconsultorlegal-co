import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Download,
  Edit,
  Trash2,
  DollarSign,
  Loader2,
  Eye,
  Search,
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { generatePDF } from "./pdfUtils";

interface Document {
  id: string;
  title: string;
  document_type: string;
  content: string;
  is_monetized: boolean;
  price: number;
  created_at: string;
  updated_at: string;
}

interface MyDocumentsProps {
  lawyerId: string;
  canCreateAgents: boolean;
}

export default function MyDocuments({ lawyerId, canCreateAgents }: MyDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
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

  useEffect(() => {
    loadDocuments();
  }, [lawyerId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("lawyer_documents")
        .select("*")
        .eq("lawyer_id", lawyerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error al cargar documentos",
        description: "No se pudieron cargar los documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setEditContent(doc.content);
    setEditTitle(doc.title);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;

    try {
      const { error } = await supabase
        .from("lawyer_documents")
        .update({
          title: editTitle,
          content: editContent,
        })
        .eq("id", editingDoc.id);

      if (error) throw error;

      toast({
        title: "Documento actualizado",
        description: "Los cambios se han guardado exitosamente.",
      });

      setEditingDoc(null);
      loadDocuments();
    } catch (error) {
      console.error("Error updating document:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el documento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;

    try {
      const { error } = await supabase
        .from("lawyer_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado.",
      });

      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc: Document) => {
    setIsDownloading(true);
    try {
      await generatePDF(doc.content, doc.title);
      toast({
        title: "PDF descargado",
        description: "El documento se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error al descargar",
        description: "No se pudo generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMonetize = async (doc: Document) => {
    if (!canCreateAgents) {
      toast({
        title: "Permiso requerido",
        description: "Necesitas permiso para crear agentes IA para monetizar documentos.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Función en desarrollo",
      description: "La monetización de documentos estará disponible próximamente.",
    });
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "No se encontraron documentos con ese término de búsqueda."
                : "Genera y guarda tu primer documento legal."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{doc.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {doc.document_type}
                    </CardDescription>
                  </div>
                  {doc.is_monetized && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      <DollarSign className="h-3 w-3 mr-1" />
                      ${doc.price}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Creado: {new Date(doc.created_at).toLocaleDateString()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingDoc(doc)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  {canCreateAgents && !doc.is_monetized && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMonetize(doc)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Monetizar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Modifica el contenido de tu documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Contenido</label>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={editContent}
                  onChange={setEditContent}
                  modules={modules}
                  formats={formats}
                  className="h-96"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-12">
              <Button onClick={handleSaveEdit} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
              <Button variant="outline" onClick={() => setEditingDoc(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.title}</DialogTitle>
            <DialogDescription>{viewingDoc?.document_type}</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingDoc?.content || "" }}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => viewingDoc && handleDownload(viewingDoc)}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
