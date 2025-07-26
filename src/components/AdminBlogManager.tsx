import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Eye, Check, X, Edit3, Trash2, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featured_image?: string | null;
  status: string;
  author_id: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  views_count: number | null;
  tags?: string[] | null;
  meta_title?: string | null;
  meta_description?: string | null;
  reading_time?: number | null;
  author?: {
    full_name: string;
    email: string;
  };
}

interface AdminBlogManagerProps {
  onBack: () => void;
  authHeaders: Record<string, string>;
}

export default function AdminBlogManager({ onBack, authHeaders }: AdminBlogManagerProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAllBlogs();
  }, []);

  const loadAllBlogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('manage-blog-posts?action=list', {
        method: 'GET',
        headers: authHeaders
      });

      if (error) {
        console.error('Error loading blogs:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los blogs.",
          variant: "destructive",
        });
        return;
      }

      setBlogs(data?.blogs || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los blogs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBlogStatus = async (blogId: string, newStatus: string) => {
    try {
      setProcessing(blogId);
      
      const { data, error } = await supabase.functions.invoke('manage-blog-posts', {
        body: {
          action: 'update',
          id: blogId,
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null
        },
        headers: authHeaders
      });

      if (error) {
        throw new Error(error.message || 'Error al actualizar el blog');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al actualizar el blog');
      }

      const statusText = newStatus === 'published' ? 'publicado' : 
                        newStatus === 'draft' ? 'enviado a borrador' : 
                        'archivado';

      toast({
        title: "Éxito",
        description: `Blog ${statusText} exitosamente`,
      });

      await loadAllBlogs();
    } catch (error: any) {
      console.error('Error updating blog status:', error);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del blog",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const deleteBlog = async (blogId: string) => {
    try {
      setProcessing(blogId);
      
      const { data, error } = await supabase.functions.invoke('manage-blog-posts', {
        body: {
          action: 'delete',
          id: blogId
        },
        headers: authHeaders
      });

      if (error) {
        throw new Error(error.message || 'Error al eliminar el blog');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al eliminar el blog');
      }

      toast({
        title: "Éxito",
        description: "Blog eliminado exitosamente",
      });

      await loadAllBlogs();
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el blog",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'en_revision':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">En Revisión</Badge>;
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBlogs = () => {
    return blogs.filter(blog => blog.status === 'en_revision');
  };

  const getStats = () => {
    const total = blogs.length;
    const published = blogs.filter(blog => blog.status === 'published').length;
    const inReview = blogs.filter(blog => blog.status === 'en_revision').length;
    const drafts = blogs.filter(blog => blog.status === 'draft').length;
    
    return { total, published, inReview, drafts };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando blogs...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();
  const priorityBlogs = getPriorityBlogs();

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-primary mb-2">
            Gestión de Blog - Administrador
          </h1>
          <p className="text-lg text-muted-foreground">
            Gestiona todos los blogs del sistema, aprueba publicaciones y modera contenido.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Blogs</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Publicados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                </div>
                <Check className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Revisión</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inReview}</p>
                </div>
                <Eye className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Borradores</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
                </div>
                <Edit3 className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Section - Blogs awaiting review */}
        {priorityBlogs.length > 0 && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Eye className="h-5 w-5" />
                Blogs Pendientes de Revisión ({priorityBlogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priorityBlogs.map((blog) => (
                  <div key={blog.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{blog.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {blog.author?.full_name || 'Sin autor'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(blog.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateBlogStatus(blog.id, 'published')}
                        disabled={processing === blog.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Publicar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBlogStatus(blog.id, 'draft')}
                        disabled={processing === blog.id}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Devolver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Blogs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Todos los Blogs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vistas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{blog.title}</div>
                        {blog.excerpt && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {blog.excerpt}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{blog.author?.full_name || 'Sin autor'}</div>
                        <div className="text-muted-foreground">{blog.author?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(blog.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(blog.created_at), 'dd/MM/yyyy', { locale: es })}</div>
                        <div className="text-muted-foreground">
                          {format(new Date(blog.created_at), 'HH:mm', { locale: es })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{blog.views_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {blog.status === 'en_revision' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBlogStatus(blog.id, 'published')}
                              disabled={processing === blog.id}
                              className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBlogStatus(blog.id, 'draft')}
                              disabled={processing === blog.id}
                              className="h-7 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        
                        {blog.status === 'published' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBlogStatus(blog.id, 'archived')}
                            disabled={processing === blog.id}
                            className="h-7 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            Archivar
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar blog?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el blog "{blog.title}". 
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteBlog(blog.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
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
            
            {blogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay blogs en el sistema</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}