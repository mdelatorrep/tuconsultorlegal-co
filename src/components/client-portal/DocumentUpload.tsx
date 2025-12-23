import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SharedDocument {
  id: string;
  document_name: string;
  document_type: string | null;
  document_url: string | null;
  notes: string | null;
  is_from_client: boolean;
  viewed_at: string | null;
  created_at: string;
}

interface DocumentUploadProps {
  clientId: string;
  lawyerId: string;
}

export function DocumentUpload({ clientId, lawyerId }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [clientId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_shared_documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentName.trim()) {
      toast.error('Por favor selecciona un archivo y proporciona un nombre');
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { error: insertError } = await supabase
        .from('client_shared_documents')
        .insert({
          client_id: clientId,
          lawyer_id: lawyerId,
          document_name: documentName,
          document_type: fileExt?.toUpperCase(),
          document_url: urlData.publicUrl,
          notes,
          is_from_client: true,
          file_size: file.size
        });

      if (insertError) throw insertError;

      toast.success('Documento subido correctamente');
      setShowUploadDialog(false);
      setFile(null);
      setDocumentName('');
      setNotes('');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  const markAsViewed = async (docId: string) => {
    try {
      await supabase
        .from('client_shared_documents')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', docId);
      
      loadDocuments();
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const fromLawyer = documents.filter(d => !d.is_from_client);
  const fromClient = documents.filter(d => d.is_from_client);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex justify-end">
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos permitidos: PDF, Word, imágenes. Máx 10MB.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Nombre del Documento</Label>
                <Input
                  value={documentName}
                  onChange={e => setDocumentName(e.target.value)}
                  placeholder="Ej: Contrato de arrendamiento"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Información adicional sobre el documento..."
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleUpload}
                disabled={uploading || !file || !documentName.trim()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Documento
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents from Lawyer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Del Abogado
            </CardTitle>
            <CardDescription>Documentos compartidos por tu abogado</CardDescription>
          </CardHeader>
          <CardContent>
            {fromLawyer.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay documentos compartidos
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {fromLawyer.map(doc => (
                    <div 
                      key={doc.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.document_type && (
                              <Badge variant="outline" className="text-xs">
                                {doc.document_type}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.viewed_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          {doc.document_url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                window.open(doc.document_url!, '_blank');
                                markAsViewed(doc.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {doc.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{doc.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Documents from Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-500" />
              Mis Documentos
            </CardTitle>
            <CardDescription>Documentos que has subido</CardDescription>
          </CardHeader>
          <CardContent>
            {fromClient.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No has subido documentos
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {fromClient.map(doc => (
                    <div 
                      key={doc.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.document_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.document_type && (
                              <Badge variant="outline" className="text-xs">
                                {doc.document_type}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>
                        {doc.document_url && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(doc.document_url!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {doc.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{doc.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
