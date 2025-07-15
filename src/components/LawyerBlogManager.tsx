import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Edit3, Trash2, Eye, Calendar, User, Sparkles } from "lucide-react";

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

interface LawyerBlogManagerProps {
  onBack: () => void;
  lawyerData: any;
}

export default function LawyerBlogManager({ onBack, lawyerData }: LawyerBlogManagerProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    meta_title: "",
    meta_description: "",
    tags: [] as string[],
  });

  useEffect(() => {
    loadMyBlogs();
  }, []);

  const loadMyBlogs = async () => {
    try {
      setLoading(true);
      
      // First, get the admin account ID for this lawyer
      const { data: adminAccount, error: adminError } = await supabase
        .from('admin_accounts')
        .select('id')
        .eq('email', lawyerData.email)
        .single();

      if (adminError || !adminAccount) {
        console.log('No admin account found for lawyer, no blogs to show');
        setBlogs([]);
        setLoading(false);
        return;
      }

      // Get only blogs created by this lawyer using their admin account ID
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:admin_accounts(full_name, email)
        `)
        .eq('author_id', adminAccount.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading blogs:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los blogs.",
          variant: "destructive",
        });
        return;
      }

      setBlogs(data || []);
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

  const openEditor = (blog?: BlogPost) => {
    if (blog) {
      setSelectedBlog(blog);
      setBlogForm({
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt || "",
        featured_image: blog.featured_image || "",
        meta_title: blog.meta_title || "",
        meta_description: blog.meta_description || "",
        tags: blog.tags || [],
      });
    } else {
      setSelectedBlog(null);
      // Create blog with standard template for lawyers
      const standardTemplate = `
# Introducción

Explicar brevemente el tema legal que se va a tratar y por qué es importante para el lector.

## ¿Qué es [concepto legal]?

Definir claramente el concepto legal principal del artículo en términos sencillos.

## Marco Legal en Colombia

Explicar la legislación colombiana aplicable y referencias normativas relevantes.

## Casos Prácticos

### Ejemplo 1: [Situación común]
Describir un caso práctico real y cómo se resuelve legalmente.

### Ejemplo 2: [Otra situación]
Otro ejemplo que ilustre diferentes aspectos del tema.

## Pasos a Seguir

1. **Primer paso**: Explicación clara
2. **Segundo paso**: Más detalles
3. **Tercer paso**: Conclusión

## Documentos Necesarios

- Documento 1
- Documento 2
- Documento 3

## Consejos Importantes

> **⚠️ Advertencia**: Puntos críticos que el lector debe tener en cuenta.

> **💡 Consejo**: Recomendaciones útiles para el lector.

## Conclusión

Resumir los puntos clave y proporcionar recomendaciones finales.

---

*¿Necesitas ayuda específica con tu caso? Consulta con nuestro asistente legal Lexi para obtener orientación personalizada.*
      `.trim();

      setBlogForm({
        title: "",
        slug: "",
        content: standardTemplate,
        excerpt: "",
        featured_image: "",
        meta_title: "",
        meta_description: "",
        tags: [],
      });
    }
    setShowEditor(true);
  };

  const openEditorBlank = () => {
    setSelectedBlog(null);
    setBlogForm({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featured_image: "",
      meta_title: "",
      meta_description: "",
      tags: [],
    });
    setShowEditor(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[áéíóú]/g, (match) => {
        const accents: { [key: string]: string } = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
        return accents[match];
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const saveBlog = async () => {
    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      toast({
        title: "Error",
        description: "El título y contenido son requeridos.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const blogData = {
        ...blogForm,
        slug: blogForm.slug || generateSlug(blogForm.title),
        status: selectedBlog ? selectedBlog.status : 'en_revision', // Nuevo blog va a revisión, editado mantiene estado
      };

      // Don't set author_id here - let the edge function handle it
      const { data, error } = await supabase.functions.invoke('manage-blog-posts', {
        body: {
          action: selectedBlog ? 'update' : 'create',
          id: selectedBlog?.id,
          ...blogData
        }
      });

      if (error) {
        console.error('Error saving blog:', error);
        throw new Error(error.message || 'Error al guardar el blog');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al guardar el blog');
      }

      toast({
        title: "Éxito",
        description: selectedBlog ? "Blog actualizado exitosamente" : "Blog creado exitosamente",
      });

      setShowEditor(false);
      setSelectedBlog(null);
      setBlogForm({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        featured_image: "",
        meta_title: "",
        meta_description: "",
        tags: [],
      });
      await loadMyBlogs();
    } catch (error: any) {
      console.error('Error saving blog:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el blog",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteBlog = async (blogId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este blog?')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-blog-posts', {
        body: {
          action: 'delete',
          id: blogId
        }
      });

      if (error) {
        console.error('Error deleting blog:', error);
        throw new Error(error.message || 'Error al eliminar el blog');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al eliminar el blog');
      }

      toast({
        title: "Éxito",
        description: "Blog eliminado exitosamente",
      });

      await loadMyBlogs();
    } catch (error: any) {
      console.error('Error deleting blog:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el blog",
        variant: "destructive",
      });
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

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setBlogForm({ ...blogForm, tags });
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

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Button
                onClick={onBack}
                variant="outline"
                className="mb-4 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
              <h1 className="text-4xl font-bold text-primary mb-2">
                Gestión de Blog
              </h1>
              <p className="text-lg text-muted-foreground">
                Crea y gestiona tus artículos de blog con plantilla profesional incluida. Solo los administradores pueden publicarlos.
              </p>
              {lawyerData?.name && (
                <div className="flex items-center gap-2 mt-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Autor: {lawyerData.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Dialog open={showEditor} onOpenChange={setShowEditor}>
                <DialogTrigger asChild>
                  <Button onClick={() => openEditor()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Blog (con plantilla)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedBlog ? 'Editar Blog' : 'Nuevo Blog'}
                    </DialogTitle>
                  </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Título</label>
                      <Input
                        value={blogForm.title}
                        onChange={(e) => {
                          setBlogForm({ 
                            ...blogForm, 
                            title: e.target.value,
                            slug: blogForm.slug || generateSlug(e.target.value)
                          });
                        }}
                        placeholder="Título del blog"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Slug</label>
                      <Input
                        value={blogForm.slug}
                        onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                        placeholder="url-del-blog"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Extracto</label>
                    <Textarea
                      value={blogForm.excerpt}
                      onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                      placeholder="Breve descripción del artículo..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Contenido</label>
                    <Textarea
                      value={blogForm.content}
                      onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                      placeholder="Contenido del blog..."
                      className="min-h-[300px]"
                    />
                  </div>
                  
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium">Imagen destacada (URL)</label>
                       <div className="flex gap-2">
                         <Input
                           value={blogForm.featured_image}
                           onChange={(e) => setBlogForm({ ...blogForm, featured_image: e.target.value })}
                           placeholder="https://ejemplo.com/imagen.jpg"
                         />
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={async () => {
                             if (!blogForm.title) {
                               toast({
                                 title: "Error",
                                 description: "Primero agrega un título para generar la imagen",
                                 variant: "destructive"
                               });
                               return;
                             }

                             try {
                               toast({
                                 title: "Generando imagen...",
                                 description: "Esto puede tomar unos segundos",
                               });

                               const { data, error } = await supabase.functions.invoke('generate-blog-image', {
                                 body: {
                                   blogId: selectedBlog?.id || 'preview',
                                   title: blogForm.title,
                                   content: blogForm.content,
                                   tags: blogForm.tags
                                 }
                               });

                               if (error) throw error;

                               if (data?.imageUrl) {
                                 setBlogForm(prev => ({ ...prev, featured_image: data.imageUrl }));
                                 toast({
                                   title: "Imagen generada",
                                   description: "Se ha generado una imagen automáticamente",
                                 });
                               }
                             } catch (error: any) {
                               console.error('Error generating image:', error);
                               toast({
                                 title: "Error",
                                 description: "No se pudo generar la imagen automáticamente",
                                 variant: "destructive"
                               });
                             }
                           }}
                         >
                           <Sparkles className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                    <div>
                      <label className="text-sm font-medium">Tags (separados por comas)</label>
                      <Input
                        value={blogForm.tags.join(', ')}
                        onChange={(e) => handleTagsChange(e.target.value)}
                        placeholder="derecho, legal, contratos"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Meta Título</label>
                      <Input
                        value={blogForm.meta_title}
                        onChange={(e) => setBlogForm({ ...blogForm, meta_title: e.target.value })}
                        placeholder="Título para SEO"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Meta Descripción</label>
                      <Input
                        value={blogForm.meta_description}
                        onChange={(e) => setBlogForm({ ...blogForm, meta_description: e.target.value })}
                        placeholder="Descripción para SEO"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditor(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={saveBlog}
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : (selectedBlog ? 'Actualizar' : 'Crear Borrador')}
                    </Button>
                  </div>
                </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline"
                onClick={() => openEditorBlank()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Blog en blanco
              </Button>
            </div>
          </div>
        </div>

        {/* Blog List */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Artículos</CardTitle>
          </CardHeader>
          <CardContent>
            {blogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No tienes blogs creados aún.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => openEditor()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear con plantilla
                  </Button>
                  <Button variant="outline" onClick={() => openEditorBlank()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear en blanco
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
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
                          <div className="font-semibold">{blog.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {blog.excerpt || blog.content.substring(0, 100) + '...'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(blog.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(blog.created_at).toLocaleDateString()}
                        </div>
                        {blog.published_at && (
                          <div className="text-xs text-muted-foreground">
                            Publicado: {new Date(blog.published_at).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {blog.views_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditor(blog)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBlog(blog.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Información importante
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Los blogs se crean con una <strong>plantilla profesional</strong> que incluye estructura estándar para contenido legal</li>
              <li>• Puedes <strong>generar imágenes con IA</strong> automáticamente basadas en el contenido de tu blog</li>
              <li>• Los blogs nuevos van a <strong>estado "En Revisión"</strong> para ser aprobados por un administrador</li>
              <li>• Puedes editar tus blogs mientras estén en estado borrador o en revisión</li>
              <li>• Una vez publicados, solo los administradores pueden modificarlos</li>
              <li>• Los tags ayudan a categorizar tu contenido y mejorar la generación de imágenes</li>
              <li>• La plantilla incluye secciones para: introducción, marco legal, casos prácticos, documentos necesarios y consejos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}