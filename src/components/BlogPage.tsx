import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, Calendar, User, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

interface BlogPageProps {
  onOpenChat: (message?: string) => void;
  onNavigate?: (page: string) => void;
}

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

export default function BlogPage({ onOpenChat, onNavigate }: BlogPageProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Blog Legal - Artículos de Derecho e IA | Tu Consultor Legal",
    description: "Blog de derecho colombiano. Artículos sobre legislación, herramientas IA para abogados, contratos, normativa legal. Actualizado por expertos jurídicos.",
    keywords: "blog legal Colombia, artículos derecho, noticias jurídicas, legislación colombiana, IA legal, herramientas abogados, contratos legales",
    canonical: "https://tuconsultorlegal.co/#blog",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "Blog Tu Consultor Legal",
      "description": "Artículos sobre derecho colombiano e inteligencia artificial legal",
      "url": "https://tuconsultorlegal.co/#blog",
      "publisher": {
        "@type": "Organization",
        "name": "Tu Consultor Legal"
      }
    }
  });

  useEffect(() => {
    loadPublishedBlogs();
  }, []);

  const loadPublishedBlogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:admin_accounts(full_name, email)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error loading blogs:', error);
        return;
      }

      setBlogs(data || []);
    } catch (error) {
      console.error('Error loading blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadArticle = (slug: string) => {
    if (onNavigate) {
      onNavigate(`blog-articulo-${slug}`);
    }
  };

  const getCategoryFromTags = (tags?: string[]) => {
    if (!tags || tags.length === 0) return { name: "GENERAL", color: "text-gray-600" };
    
    const tag = tags[0].toLowerCase();
    const categoryMap: Record<string, { name: string; color: string }> = {
      'vivienda': { name: "VIVIENDA Y ARRIENDOS", color: "text-blue-600" },
      'arriendo': { name: "VIVIENDA Y ARRIENDOS", color: "text-blue-600" },
      'trabajo': { name: "TRABAJO Y EMPLEO", color: "text-rose-600" },
      'empleo': { name: "TRABAJO Y EMPLEO", color: "text-rose-600" },
      'laboral': { name: "TRABAJO Y EMPLEO", color: "text-rose-600" },
      'finanzas': { name: "FINANZAS Y ACUERDOS", color: "text-orange-600" },
      'contratos': { name: "FINANZAS Y ACUERDOS", color: "text-orange-600" },
      'vehiculo': { name: "FINANZAS Y ACUERDOS", color: "text-orange-600" },
      'civil': { name: "DERECHO CIVIL", color: "text-purple-600" },
      'penal': { name: "DERECHO PENAL", color: "text-red-600" },
      'familia': { name: "DERECHO DE FAMILIA", color: "text-pink-600" },
    };

    return categoryMap[tag] || { name: tags[0].toUpperCase(), color: "text-gray-600" };
  };

  const getDefaultImage = (category: string) => {
    const imageMap: Record<string, string> = {
      'VIVIENDA Y ARRIENDOS': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&auto=format',
      'TRABAJO Y EMPLEO': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&auto=format',
      'FINANZAS Y ACUERDOS': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop&auto=format',
      'DERECHO CIVIL': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop&auto=format',
      'DERECHO PENAL': 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=400&h=250&fit=crop&auto=format',
      'DERECHO DE FAMILIA': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=250&fit=crop&auto=format',
    };
    
    return imageMap[category] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&auto=format';
  };

  const featuredBlog = blogs.length > 0 ? blogs[0] : null;
  const otherBlogs = blogs.slice(1);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
            Blog de Tu Consultor Legal
          </h1>
          <p className="text-lg text-muted-foreground">Cargando artículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
          Blog de Tu Consultor Legal
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Resolvemos tus dudas legales con explicaciones claras y sencillas. 
          Empodérate con información para tu día a día.
        </p>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">
            No hay artículos publicados aún
          </h2>
          <p className="text-muted-foreground mb-8">
            Estamos trabajando en contenido de calidad para ti. Vuelve pronto.
          </p>
          <Button
            variant="success"
            onClick={() => onNavigate("user-dashboard")}
          >
            Hablar con Lexi
          </Button>
        </div>
      ) : (
        <>
          {/* Featured Article */}
          {featuredBlog && (
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16 bg-card p-8 rounded-lg shadow-card">
              <img 
                src={featuredBlog.featured_image || getDefaultImage(getCategoryFromTags(featuredBlog.tags).name)} 
                alt={featuredBlog.title}
                className="rounded-lg w-full h-full object-cover"
              />
              <div>
                <p className={`font-bold ${getCategoryFromTags(featuredBlog.tags).color} mb-2`}>
                  {getCategoryFromTags(featuredBlog.tags).name}
                </p>
                <h2 className="text-3xl font-bold mb-3 text-foreground">
                  {featuredBlog.title}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {featuredBlog.excerpt || featuredBlog.content.substring(0, 200) + '...'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  {featuredBlog.author?.full_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {featuredBlog.author.full_name}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(featuredBlog.published_at || featuredBlog.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {featuredBlog.views_count || 0} vistas
                  </div>
                </div>
                <Button
                  variant="success"
                  onClick={() => handleReadArticle(featuredBlog.slug)}
                >
                  Leer más →
                </Button>
              </div>
            </div>
          )}

          {/* Other Articles */}
          {otherBlogs.length > 0 && (
            <>
              <h3 className="text-2xl font-bold mb-8 border-l-4 border-success pl-4">
                Otros Artículos de Interés
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherBlogs.map((blog) => {
                  const category = getCategoryFromTags(blog.tags);
                  return (
                    <div 
                      key={blog.id}
                      className="bg-card rounded-lg shadow-card overflow-hidden transform hover:-translate-y-2 transition-smooth"
                    >
                      <img 
                        src={blog.featured_image || getDefaultImage(category.name)} 
                        alt={blog.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-6">
                        <p className={`text-sm font-bold mb-1 ${category.color}`}>
                          {category.name}
                        </p>
                        <h4 className="text-xl font-bold mb-2 text-foreground">
                          {blog.title}
                        </h4>
                        <p className="text-muted-foreground text-sm mb-4">
                          {blog.excerpt || blog.content.substring(0, 150) + '...'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                          {blog.author?.full_name && (
                            <>
                              <User className="h-3 w-3" />
                              {blog.author.full_name}
                            </>
                          )}
                          <Calendar className="h-3 w-3" />
                          {new Date(blog.published_at || blog.created_at).toLocaleDateString()}
                          <Eye className="h-3 w-3 ml-2" />
                          {blog.views_count || 0}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadArticle(blog.slug)}
                        >
                          Leer más →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* CTA Section */}
      <div className="mt-16 bg-success/10 border-l-4 border-success p-8 rounded-r-lg">
        <h3 className="text-2xl font-bold text-success mb-4">
          ¿Necesitas ayuda con tu caso específico?
        </h3>
        <p className="text-muted-foreground mb-6">
          Ya sea para crear tu contrato o resolver una duda específica, nuestro asistente con IA está listo para ayudarte.
        </p>
        <Button
          variant="success"
          size="lg"
          onClick={() => onNavigate("user-dashboard")}
        >
          Hablar con Lexi
        </Button>
      </div>
    </div>
  );
}
