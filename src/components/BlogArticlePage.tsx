import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, Calendar, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BlogArticlePageProps {
  articleId: string;
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
  published_at?: string | null;
  created_at: string;
  views_count: number | null;
  tags?: string[] | null;
}

export default function BlogArticlePage({ articleId, onOpenChat, onNavigate }: BlogArticlePageProps) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogArticle();
  }, [articleId]);

  const loadBlogArticle = async () => {
    try {
      setLoading(true);
      
      const { data: blogData, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', articleId)
        .eq('status', 'published')
        .single();

      if (!error && blogData) {
        setBlog(blogData);
        // Increment view count
        await supabase
          .from('blog_posts')
          .update({ views_count: (blogData.views_count || 0) + 1 })
          .eq('id', blogData.id);
      }
    } catch (error) {
      console.error('Error loading blog article:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">Cargando artículo...</div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Artículo no encontrado</h2>
          <Button onClick={() => onNavigate?.('blog')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Blog
          </Button>
        </div>
      </div>
    );
  }

  const formatContent = (content: string) => {
    let formatted = content;
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-6 text-foreground">$1</h1>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mb-4 mt-8 text-foreground">$1</h2>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    formatted = formatted.replace(/^([^#->\n].+)$/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>');
    return formatted;
  };

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => onNavigate?.('blog')}
          className="mb-8 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Blog
        </Button>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground leading-tight">
          {blog.title}
        </h1>

        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(blog.published_at || blog.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {(blog.views_count || 0) + 1} vistas
          </div>
        </div>

        {blog.featured_image && (
          <img
            src={blog.featured_image}
            alt={blog.title}
            className="w-full h-64 md:h-80 object-cover rounded-lg mb-8"
          />
        )}

        <div 
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: formatContent(blog.content) }}
        />

        <div className="mt-16 bg-success/10 border-l-4 border-success p-8 rounded-r-lg">
          <h3 className="text-2xl font-bold text-success mb-4">
            ¿Necesitas ayuda específica con tu caso?
          </h3>
          <p className="text-muted-foreground mb-6">
            Si tienes dudas sobre este tema, nuestro asistente con IA está listo para ayudarte.
          </p>
          <Button
            variant="success"
            size="lg"
            onClick={() => onOpenChat(`Hola Lexi, necesito ayuda con ${blog.title.toLowerCase()}`)}
          >
            Consultar con Lexi
          </Button>
        </div>
      </div>
    </div>
  );
}