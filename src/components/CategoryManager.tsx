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
import { Tag, Plus, Edit, Trash2, Move, Palette, FileText, Building2, Users, Shield, BookOpen, Gavel, FileCheck, BookOpenCheck, Archive, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  description?: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category_type: 'document' | 'knowledge_base' | 'both';
  display_order: number;
  color_class: string;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'FileText',
    category_type: 'document' as 'document' | 'knowledge_base' | 'both',
    display_order: 1,
    color_class: 'bg-blue-100 text-blue-800',
    is_active: true
  });

  const availableIcons = [
    { value: 'FileText', label: 'Documento', icon: FileText },
    { value: 'Briefcase', label: 'Maletín', icon: Briefcase },
    { value: 'Building2', label: 'Edificio', icon: Building2 },
    { value: 'Users', label: 'Usuarios', icon: Users },
    { value: 'Shield', label: 'Escudo', icon: Shield },
    { value: 'BookOpen', label: 'Libro Abierto', icon: BookOpen },
    { value: 'Gavel', label: 'Martillo', icon: Gavel },
    { value: 'FileCheck', label: 'Archivo Verificado', icon: FileCheck },
    { value: 'BookOpenCheck', label: 'Libro Verificado', icon: BookOpenCheck },
    { value: 'Archive', label: 'Archivo', icon: Archive },
    { value: 'Tag', label: 'Etiqueta', icon: Tag }
  ];

  const colorOptions = [
    { value: 'bg-blue-100 text-blue-800', label: 'Azul', preview: 'bg-blue-100' },
    { value: 'bg-green-100 text-green-800', label: 'Verde', preview: 'bg-green-100' },
    { value: 'bg-purple-100 text-purple-800', label: 'Púrpura', preview: 'bg-purple-100' },
    { value: 'bg-orange-100 text-orange-800', label: 'Naranja', preview: 'bg-orange-100' },
    { value: 'bg-red-100 text-red-800', label: 'Rojo', preview: 'bg-red-100' },
    { value: 'bg-indigo-100 text-indigo-800', label: 'Índigo', preview: 'bg-indigo-100' },
    { value: 'bg-pink-100 text-pink-800', label: 'Rosa', preview: 'bg-pink-100' },
    { value: 'bg-teal-100 text-teal-800', label: 'Verde Azulado', preview: 'bg-teal-100' },
    { value: 'bg-yellow-100 text-yellow-800', label: 'Amarillo', preview: 'bg-yellow-100' },
    { value: 'bg-gray-100 text-gray-800', label: 'Gris', preview: 'bg-gray-100' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('display_order')
        .order('name');

      if (error) throw error;
      setCategories((data as Category[]) || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las categorías",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        category_type: category.category_type,
        display_order: category.display_order,
        color_class: category.color_class,
        is_active: category.is_active
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: 'FileText',
        category_type: 'document',
        display_order: Math.max(...categories.map(c => c.display_order), 0) + 1,
        color_class: 'bg-blue-100 text-blue-800',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        icon: formData.icon,
        category_type: formData.category_type,
        display_order: formData.display_order,
        color_class: formData.color_class,
        is_active: formData.is_active
      };

      let result;
      if (editingCategory) {
        result = await supabase
          .from('document_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
      } else {
        result = await supabase
          .from('document_categories')
          .insert([categoryData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Éxito",
        description: editingCategory ? "Categoría actualizada correctamente" : "Categoría creada exitosamente",
      });

      setIsDialogOpen(false);
      await loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la categoría",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada exitosamente",
      });

      await loadCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const toggleCategoryStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('document_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Categoría ${!currentStatus ? 'activada' : 'desactivada'} correctamente`,
      });

      await loadCategories();
    } catch (error: any) {
      console.error('Error updating category status:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = availableIcons.find(icon => icon.value === iconName);
    if (iconConfig) {
      const IconComponent = iconConfig.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getCategoryTypeBadge = (type: string) => {
    const typeConfig = {
      document: { label: "Documentos", color: "bg-blue-100 text-blue-800" },
      knowledge_base: { label: "Base Conocimiento", color: "bg-green-100 text-green-800" },
      both: { label: "Ambos", color: "bg-purple-100 text-purple-800" }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.document;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando categorías...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <CardTitle>Gestión de Categorías</CardTitle>
            </div>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Categoría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getIconComponent(category.icon)}
                        <div>
                          <Badge className={category.color_class}>
                            {category.name}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-sm">
                        <p className="text-sm text-muted-foreground">
                          {category.description || 'Sin descripción'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryTypeBadge(category.category_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Move className="w-3 h-3 text-muted-foreground" />
                        {category.display_order}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => toggleCategoryStatus(category.id, category.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(category.updated_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(category)}
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
                              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La categoría será removida permanentemente del sistema.
                                Los elementos asociados a esta categoría podrían verse afectados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCategory(category.id)}>
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

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay categorías configuradas</p>
              <p className="text-sm">Crea categorías para organizar documentos y fuentes de conocimiento</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Nombre de la categoría"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="icon">Icono</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map((icon) => {
                      const IconComponent = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción de la categoría"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category_type">Tipo</Label>
                <Select value={formData.category_type} onValueChange={(value: any) => setFormData({ ...formData, category_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Solo Documentos</SelectItem>
                    <SelectItem value="knowledge_base">Solo Base de Conocimiento</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="display_order">Orden</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <Label htmlFor="color_class">Color</Label>
                <Select value={formData.color_class} onValueChange={(value) => setFormData({ ...formData, color_class: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.preview}`}></div>
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Categoría activa</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveCategory} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  editingCategory ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}