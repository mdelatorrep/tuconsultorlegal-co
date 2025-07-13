import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminLogin from "./AdminLogin";
import LawyerStatsAdmin from "./LawyerStatsAdmin";
import { Users, FileText, Shield, Plus, BarChart3, LogOut, RefreshCw, Trash2, Settings, AlertTriangle, BookOpen, Globe, Save, Eye, Edit } from "lucide-react";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  can_create_agents: boolean;
  created_at: string;
  failed_login_attempts?: number;
  locked_until?: string;
  last_login_at?: string;
  access_token?: string;
  phone_number?: string;
}

interface TokenRequest {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  law_firm?: string;
  specialization?: string;
  years_of_experience?: number;
  reason_for_request?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  meta_title?: string;
  meta_description?: string;
  tags?: string[];
  author_id: string;
  created_at: string;
  published_at?: string;
  views_count?: number;
}

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

const AdminPage = () => {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user, logout, getAuthHeaders, checkAuthStatus } = useAdminAuth();
  
  // Estados principales
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
  
  // Estados de configuración
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(null);
  
  // Nuevo abogado form
  const [newLawyer, setNewLawyer] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    can_create_agents: false
  });

  // Blog form
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    status: "draft" as "draft" | "published" | "archived",
    meta_title: "",
    meta_description: "",
    tags: [] as string[],
  });

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "FileText",
    is_active: true
  });

  // Cargar datos
  const loadData = async () => {
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.authorization) return;

      // Cargar abogados
      const { data: lawyersData } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: authHeaders
      });
      setLawyers(lawyersData || []);

      // Cargar solicitudes de tokens
      const { data: requestsData } = await supabase.functions.invoke('get-token-requests', {
        headers: authHeaders
      });
      setTokenRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Crear abogado
  const createLawyer = async () => {
    if (!newLawyer.email || !newLawyer.full_name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('create-lawyer', {
        body: JSON.stringify(newLawyer),
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al crear el abogado');
      }

      toast({
        title: "Éxito",
        description: `Abogado ${newLawyer.full_name} creado exitosamente`,
      });

      setNewLawyer({ email: "", full_name: "", phone_number: "", can_create_agents: false });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al crear el abogado",
        variant: "destructive"
      });
    }
  };

  // Eliminar abogado
  const deleteLawyer = async (lawyerId: string, lawyerName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${lawyerName}?`)) return;

    try {
      const authHeaders = getAuthHeaders();
      const { data, error } = await supabase.functions.invoke('delete-lawyer', {
        body: JSON.stringify({ lawyer_id: lawyerId }),
        headers: { ...authHeaders, 'Content-Type': 'application/json' }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al eliminar el abogado');
      }

      toast({
        title: "Éxito",
        description: data.message || `Abogado ${lawyerName} eliminado exitosamente`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el abogado",
        variant: "destructive"
      });
    }
  };

  // Badge de estado de seguridad
  const getLockStatusBadge = (lawyer: Lawyer) => {
    const isLocked = lawyer.locked_until && new Date(lawyer.locked_until) > new Date();
    
    if (isLocked) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Bloqueada
        </Badge>
      );
    }
    if (lawyer.failed_login_attempts && lawyer.failed_login_attempts > 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {lawyer.failed_login_attempts} intentos
        </Badge>
      );
    }
    return <Badge variant="secondary">Normal</Badge>;
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Admin Panel
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={checkAuthStatus} className="p-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="p-2 text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-7xl">
        <Tabs defaultValue="lawyers" className="space-y-3 sm:space-y-6">
          {/* Mobile-Optimized Tab Navigation */}
          <div className="bg-white rounded-lg border shadow-sm p-2">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto bg-slate-50 p-1 rounded-md">
              <TabsTrigger value="lawyers" className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Abogados</span>
              </TabsTrigger>
              <TabsTrigger value="token-requests" className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                {tokenRequests.filter(req => req.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {tokenRequests.filter(req => req.status === 'pending').length}
                  </Badge>
                )}
                <span className="font-medium">Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex flex-col items-center gap-1 p-3 text-xs sm:text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Gestión de Abogados */}
          <TabsContent value="lawyers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5" />
                  Crear Nuevo Abogado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newLawyer.email}
                      onChange={(e) => setNewLawyer({ ...newLawyer, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Nombre Completo</Label>
                    <Input
                      value={newLawyer.full_name}
                      onChange={(e) => setNewLawyer({ ...newLawyer, full_name: e.target.value })}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Teléfono</Label>
                    <PhoneInput
                      value={newLawyer.phone_number}
                      onChange={(value) => setNewLawyer({ ...newLawyer, phone_number: value || "" })}
                      defaultCountry="CO"
                      international
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <Label>Puede crear agentes</Label>
                  <Switch
                    checked={newLawyer.can_create_agents}
                    onCheckedChange={(checked) => setNewLawyer({ ...newLawyer, can_create_agents: checked })}
                  />
                </div>
                <Button onClick={createLawyer} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Abogado
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Abogados Mobile-First */}
            <Card>
              <CardHeader>
                <CardTitle>Abogados Registrados ({lawyers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {lawyers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay abogados registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lawyers.map((lawyer) => (
                      <Card key={lawyer.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate">{lawyer.full_name}</h3>
                              <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                              {lawyer.phone_number && (
                                <p className="text-xs text-muted-foreground">{lawyer.phone_number}</p>
                              )}
                            </div>
                            <Badge variant={lawyer.active ? "default" : "secondary"}>
                              {lawyer.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {getLockStatusBadge(lawyer)}
                            <Badge variant={lawyer.can_create_agents ? "default" : "outline"}>
                              {lawyer.can_create_agents ? "Crea Agentes" : "Sin Agentes"}
                            </Badge>
                          </div>
                          {lawyer.last_login_at && (
                            <div className="text-xs text-muted-foreground">
                              Último acceso: {new Date(lawyer.last_login_at).toLocaleDateString('es-ES')}
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteLawyer(lawyer.id, lawyer.full_name)}
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Solicitudes de Token */}
          <TabsContent value="token-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Solicitudes de Token ({tokenRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tokenRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenRequests.map((request) => (
                      <Card key={request.id} className="border">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">{request.full_name}</h3>
                              <Badge variant={
                                request.status === 'pending' ? 'default' :
                                request.status === 'approved' ? 'secondary' :
                                'destructive'
                              }>
                                {request.status === 'pending' ? 'Pendiente' :
                                 request.status === 'approved' ? 'Aprobado' :
                                 'Rechazado'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.email}</p>
                            {request.law_firm && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Firma:</strong> {request.law_firm}
                              </p>
                            )}
                            {request.specialization && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Especialización:</strong> {request.specialization}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Solicitado: {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estadísticas */}
          <TabsContent value="stats" className="space-y-4">
            <LawyerStatsAdmin authHeaders={getAuthHeaders()} viewMode="global" />
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="config" className="space-y-4">
            {/* Gestión de Blog */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5" />
                  Gestión de Blog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Gestiona los artículos del blog del sitio web
                  </p>
                  <Button 
                    onClick={() => {
                      setSelectedBlog(null);
                      setBlogForm({
                        title: "",
                        slug: "",
                        content: "",
                        excerpt: "",
                        featured_image: "",
                        status: "draft",
                        meta_title: "",
                        meta_description: "",
                        tags: [],
                      });
                      setShowBlogEditor(true);
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Artículo
                  </Button>
                </div>

                {/* Lista de blogs mobile-first */}
                <div className="space-y-3">
                  {blogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay artículos de blog</p>
                    </div>
                  ) : (
                    blogs.map((blog) => (
                      <Card key={blog.id} className="border">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold truncate">{blog.title}</h3>
                              <Badge variant={
                                blog.status === 'published' ? 'default' :
                                blog.status === 'draft' ? 'secondary' :
                                'outline'
                              }>
                                {blog.status === 'published' ? 'Publicado' :
                                 blog.status === 'draft' ? 'Borrador' :
                                 'Archivado'}
                              </Badge>
                            </div>
                            {blog.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {blog.excerpt}
                              </p>
                            )}
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(blog.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBlog(blog);
                                    setBlogForm({
                                      title: blog.title,
                                      slug: blog.slug,
                                      content: blog.content,
                                      excerpt: blog.excerpt || "",
                                      featured_image: blog.featured_image || "",
                                      status: blog.status,
                                      meta_title: blog.meta_title || "",
                                      meta_description: blog.meta_description || "",
                                      tags: blog.tags || [],
                                    });
                                    setShowBlogEditor(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {blog.status === 'published' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gestión de Categorías de Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Categorías de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Gestiona las categorías disponibles para documentos legales
                  </p>
                  <Button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setCategoryForm({
                        name: "",
                        description: "",
                        icon: "FileText",
                        is_active: true
                      });
                      setShowCategoryEditor(true);
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Categoría
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documentCategories.map((category) => (
                    <Card key={category.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold truncate">{category.name}</h3>
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(category);
                              setCategoryForm({
                                name: category.name,
                                description: category.description || "",
                                icon: category.icon || "FileText",
                                is_active: category.is_active
                              });
                              setShowCategoryEditor(true);
                            }}
                            className="w-full"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configuración del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre del Sitio</Label>
                      <Input placeholder="Tu Consultor Legal" />
                    </div>
                    <div>
                      <Label>Email de Contacto</Label>
                      <Input type="email" placeholder="contacto@tuconsultorlegal.co" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Descripción del Sitio</Label>
                      <Textarea placeholder="Descripción del sitio web" />
                    </div>
                  </div>
                  <Button className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;