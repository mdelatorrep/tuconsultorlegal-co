import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, FileText, Download, Eye, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Document {
  id: string;
  client_id: string;
  case_id?: string;
  name: string;
  description?: string;
  document_type: string;
  file_url?: string;
  file_size?: number;
  tags: string[];
  is_confidential: boolean;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
  case?: {
    title: string;
  };
}

interface CRMDocumentsViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMDocumentsView: React.FC<CRMDocumentsViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    case_id: '',
    name: '',
    description: '',
    document_type: '',
    file_url: '',
    tags: [] as string[],
    is_confidential: false
  });
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchDocuments();
      fetchClients();
      fetchCases();
    }
  }, [lawyerData?.id]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_documents')
        .select(`
          *,
          client:crm_clients(name, email),
          case:crm_cases(title)
        `)
        .eq('lawyer_id', lawyerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_clients')
        .select('id, name, email')
        .eq('lawyer_id', lawyerData.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_cases')
        .select('id, title, client_id')
        .eq('lawyer_id', lawyerData.id)
        .order('title');

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.client?.name && doc.client.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveDocument = async () => {
    try {
      const docData = {
        ...formData,
        lawyer_id: lawyerData.id,
        case_id: formData.case_id || null
      };

      if (editingDocument) {
        const { error } = await supabase
          .from('crm_documents')
          .update(docData)
          .eq('id', editingDocument.id);

        if (error) throw error;
        toast({
          title: "Documento actualizado",
          description: "El documento se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('crm_documents')
          .insert([docData]);

        if (error) throw error;
        toast({
          title: "Documento creado",
          description: "El nuevo documento se ha creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingDocument(null);
      resetForm();
      fetchDocuments();
      onRefresh();
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el documento",
        variant: "destructive",
      });
    }
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc);
    setFormData({
      client_id: doc.client_id,
      case_id: doc.case_id || '',
      name: doc.name,
      description: doc.description || '',
      document_type: doc.document_type,
      file_url: doc.file_url || '',
      tags: doc.tags,
      is_confidential: doc.is_confidential
    });
    setIsDialogOpen(true);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      const { error } = await supabase
        .from('crm_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente",
      });

      fetchDocuments();
      onRefresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      case_id: '',
      name: '',
      description: '',
      document_type: '',
      file_url: '',
      tags: [],
      is_confidential: false
    });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredCasesForClient = cases.filter(case_ => 
    !formData.client_id || case_.client_id === formData.client_id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestión de Documentos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingDocument(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDocument ? 'Editar Documento' : 'Nuevo Documento'}
              </DialogTitle>
              <DialogDescription>
                {editingDocument ? 'Modifica los datos del documento' : 'Registra un nuevo documento'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, case_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="case_id">Caso (Opcional)</Label>
                <Select
                  value={formData.case_id}
                  onValueChange={(value) => setFormData({ ...formData, case_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un caso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin caso específico</SelectItem>
                    {filteredCasesForClient.map((case_) => (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nombre del Documento *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre descriptivo del documento"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document_type">Tipo de Documento *</Label>
                <Input
                  id="document_type"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  placeholder="Ej: Contrato, Poder, Demanda"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file_url">URL del Archivo</Label>
                <Input
                  id="file_url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del documento"
                  rows={3}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Etiquetas</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Agregar etiqueta"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Agregar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="is_confidential"
                  checked={formData.is_confidential}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_confidential: checked })}
                />
                <Label htmlFor="is_confidential">Documento confidencial</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDocument}>
                {editingDocument ? 'Actualizar' : 'Crear'} Documento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron documentos que coincidan con la búsqueda' : 'No tienes documentos registrados aún'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar primer documento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{doc.name}</h3>
                      {doc.is_confidential ? (
                        <Lock className="h-4 w-4 text-red-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-500" />
                      )}
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground mb-2">
                      <p><strong>Cliente:</strong> {doc.client?.name}</p>
                      {doc.case && (
                        <p><strong>Caso:</strong> {doc.case.title}</p>
                      )}
                      <p><strong>Creado:</strong> {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}</p>
                      {doc.file_size && (
                        <p><strong>Tamaño:</strong> {formatFileSize(doc.file_size)}</p>
                      )}
                    </div>
                    
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {doc.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDocument(doc)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CRMDocumentsView;