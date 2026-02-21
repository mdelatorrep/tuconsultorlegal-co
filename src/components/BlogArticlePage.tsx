import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, Calendar, Eye, Share2, Linkedin, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';

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
  const { toast } = useToast();

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
    
    // Headers (process from most specific to least specific)
    formatted = formatted.replace(/^##### (.*$)/gm, '<h5 class="text-lg font-bold mb-3 mt-6 text-foreground">$1</h5>');
    formatted = formatted.replace(/^#### (.*$)/gm, '<h4 class="text-xl font-bold mb-3 mt-6 text-foreground">$1</h4>');
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="text-2xl font-bold mb-4 mt-7 text-foreground">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="text-3xl font-bold mb-4 mt-8 text-foreground">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="text-4xl font-bold mb-6 mt-8 text-foreground">$1</h1>');
    
    // Bold and italic
    formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
    
    // Unordered lists
    formatted = formatted.replace(/^\* (.+)$/gm, '<li class="ml-6 mb-2">$1</li>');
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-6 mb-2">$1</li>');
    formatted = formatted.replace(/(<li class="ml-6 mb-2">.*<\/li>\n?)+/g, '<ul class="list-disc mb-4 text-muted-foreground">$&</ul>');
    
    // Ordered lists
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2">$1</li>');
    formatted = formatted.replace(/(<li class="ml-6 mb-2">.*<\/li>\n?)+/g, (match) => {
      if (!match.includes('list-disc')) {
        return `<ol class="list-decimal mb-4 text-muted-foreground">${match}</ol>`;
      }
      return match;
    });
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '<br/><br/>');
    
    // Paragraphs (must be last to avoid conflicts)
    formatted = formatted.replace(/^(?!<[ohl]|<li|<br)([^<\n].+)$/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>');
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  };

  // Generate correct URL for hash-based routing
  const shareUrl = `${window.location.origin}/#blog-articulo-${blog?.slug}`;
  const shareText = `${blog?.title} - ${blog?.excerpt || 'Artículo interesante sobre derecho'}`;

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace del artículo se ha copiado al portapapeles.",
      });
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace al portapapeles.",
        variant: "destructive",
      });
    }
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

        {/* Social Share Section */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Compartir artículo</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={shareOnLinkedIn}
              className="flex items-center gap-2"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareOnWhatsApp}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Copiar enlace
            </Button>
          </div>
        </div>

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