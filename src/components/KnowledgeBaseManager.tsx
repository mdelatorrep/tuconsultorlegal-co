import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Globe, Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Star, Tag, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface KnowledgeBaseUrl {
  id: string;
  url: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_verified?: string;
  verification_status: 'pending' | 'verified' | 'failed';
  tags: string[];
  priority: number;
}

export default function KnowledgeBaseManager() {
  const [urls, setUrls] = useState<KnowledgeBaseUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<KnowledgeBaseUrl | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    url: '',
    description: '',
    category: 'general',
    tags: '',
    priority: 3,
    is_active: true
  });

  const categories = [
    { value: 'legislacion', label: 'Legislación' },
    { value: 'jurisprudencia', label: 'Jurisprudencia' },
    { value: 'normatividad', label: 'Normatividad' },
    { value: 'doctrina', label: 'Doctrina' },
    { value: 'general', label: 'General' }
  ];

  useEffect(() => {
    loadUrls();
  }, []);

  const loadUrls = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('knowledge_base_urls')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUrls((data as KnowledgeBaseUrl[]) || []);
    } catch (error) {
      console.error('Error loading knowledge base URLs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las URLs de la base de conocimiento",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (url?: KnowledgeBaseUrl) => {
    if (url) {
      setEditingUrl(url);
      setFormData({
        url: url.url,
        description: url.description || '',
        category: url.category,
        tags: url.tags.join(', '),
        priority: url.priority,
        is_active: url.is_active
      });
    } else {
      setEditingUrl(null);
      setFormData({
        url: '',
        description: '',
        category: 'general',
        tags: '',
        priority: 3,
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const saveUrl = async () => {
    if (!formData.url.trim()) {
      toast({
        title: "Error",
        description: "La URL es requerida",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const urlData = {
        url: formData.url.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        tags: tagsArray,
        priority: formData.priority,
        is_active: formData.is_active
      };

      let result;
      if (editingUrl) {
        result = await supabase
          .from('knowledge_base_urls')
          .update(urlData)
          .eq('id', editingUrl.id);
      } else {
        result = await supabase
          .from('knowledge_base_urls')
          .insert([urlData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Éxito",
        description: editingUrl ? "URL actualizada correctamente" : "URL agregada a la base de conocimiento",
      });

      setIsDialogOpen(false);
      await loadUrls();
    } catch (error: any) {
      console.error('Error saving URL:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la URL",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUrl = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_urls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "URL eliminada",
        description: "La URL ha sido removida de la base de conocimiento",
      });

      await loadUrls();
    } catch (error: any) {
      console.error('Error deleting URL:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la URL",
        variant: "destructive"
      });
    }
  };

  const toggleUrlStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_urls')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `URL ${!currentStatus ? 'activada' : 'desactivada'} correctamente`,
      });

      await loadUrls();
    } catch (error: any) {
      console.error('Error updating URL status:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      legislacion: { color: "bg-blue-100 text-blue-800", label: "Legislación" },
      jurisprudencia: { color: "bg-purple-100 text-purple-800", label: "Jurisprudencia" },
      normatividad: { color: "bg-green-100 text-green-800", label: "Normatividad" },
      doctrina: { color: "bg-orange-100 text-orange-800", label: "Doctrina" },
      general: { color: "bg-gray-100 text-gray-800", label: "General" }
    };

    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.general;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verificada</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falló</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pendiente</Badge>;
    }
  };

  const getPriorityStars = (priority: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < priority ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando base de conocimiento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Base de Conocimiento - URLs Permitidas</CardTitle>
            </div>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva URL
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Verificación</TableHead>
                  <TableHead>Actualizada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <a 
                          href={url.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {url.url}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-sm">
                        {url.description && (
                          <p className="text-sm text-muted-foreground truncate" title={url.description}>
                            {url.description}
                          </p>
                        )}
                        {url.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {url.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {url.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{url.tags.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(url.category)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getPriorityStars(url.priority)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={url.is_active}
                        onCheckedChange={() => toggleUrlStatus(url.id, url.is_active)}
                      />
                    </TableCell>
                    <TableCell>{getVerificationBadge(url.verification_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(url.updated_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(url)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar URL?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La URL será removida permanentemente de la base de conocimiento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUrl(url.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {urls.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay URLs configuradas en la base de conocimiento</p>
              <p className="text-sm">Agrega URLs para que los agentes de IA puedan consultarlas</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUrl ? 'Editar URL' : 'Nueva URL de Base de Conocimiento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://ejemplo.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del contenido de esta URL"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Prioridad (1-5)</Label>
                <Select value={formData.priority.toString()} onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((priority) => (
                      <SelectItem key={priority} value={priority.toString()}>
                        {priority} {priority === 5 ? '(Máxima)' : priority === 1 ? '(Mínima)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
              <Input
                id="tags"
                placeholder="legislacion, corte, suprema"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">URL activa</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveUrl} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingUrl ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}