import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Calendar, DollarSign, Save, CheckCircle } from "lucide-react";

interface DocumentToken {
  id: string;
  token: string;
  document_type: string;
  document_content: string;
  price: number;
  status: string;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
  updated_at: string;
}

interface LawyerDashboardPageProps {
  onOpenChat: (message: string) => void;
}

export default function LawyerDashboardPage({ onOpenChat }: LawyerDashboardPageProps) {
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .in('status', ['solicitado', 'en_revision_abogado'])
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error al cargar documentos",
          description: "No se pudieron cargar los documentos pendientes.",
          variant: "destructive",
        });
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDocument = (document: DocumentToken) => {
    setSelectedDocument(document);
    setEditedContent(document.document_content);
  };

  const handleSaveDocument = async () => {
    if (!selectedDocument) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          document_content: editedContent,
          status: 'en_revision_abogado',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error updating document:', error);
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar el documento.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento guardado",
        description: "Los cambios han sido guardados exitosamente.",
      });

      // Update local state
      setSelectedDocument({ ...selectedDocument, document_content: editedContent });
      await fetchPendingDocuments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          document_content: editedContent,
          status: 'revisado',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDocument.id);

      if (error) {
        console.error('Error approving document:', error);
        toast({
          title: "Error al aprobar",
          description: "No se pudo aprobar el documento.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento aprobado",
        description: "El documento ha sido revisado y aprobado.",
      });

      setSelectedDocument(null);
      setEditedContent("");
      await fetchPendingDocuments();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'solicitado':
        return <Badge variant="secondary">Solicitado</Badge>;
      case 'en_revision_abogado':
        return <Badge variant="default">En Revisión</Badge>;
      case 'revisado':
        return <Badge variant="outline">Revisado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando documentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Panel de Abogados
          </h1>
          <p className="text-lg text-muted-foreground">
            Revisa y ajusta los documentos pendientes
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Documents List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Documentos Pendientes</h2>
            
            {documents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos pendientes de revisión</p>
                </CardContent>
              </Card>
            ) : (
              documents.map((document) => (
                <Card 
                  key={document.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedDocument?.id === document.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectDocument(document)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{document.document_type}</CardTitle>
                      {getStatusBadge(document.status)}
                    </div>
                    <CardDescription>
                      Código: {document.token}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {document.user_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{document.user_name}</span>
                        </div>
                      )}
                      {document.user_email && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{document.user_email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>${document.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Document Editor */}
          <div className="space-y-4">
            {selectedDocument ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Editor de Documento</h2>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveDocument}
                      disabled={isSaving}
                      variant="outline"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                    <Button 
                      onClick={handleApproveDocument}
                      disabled={isSaving}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{selectedDocument.document_type}</CardTitle>
                    <CardDescription>
                      Código: {selectedDocument.token} | Estado: {getStatusBadge(selectedDocument.status)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Contenido del documento..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecciona un documento de la lista para comenzar a editarlo
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}