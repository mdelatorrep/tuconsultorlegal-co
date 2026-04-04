import { Button } from "./ui/button";
import { Linkedin, MessageCircle, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface BlogShareButtonsProps {
  blog: {
    title: string;
    slug: string;
    excerpt?: string | null;
    featured_image?: string | null;
  };
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "ghost" | "default";
  showLabels?: boolean;
}

const SITE_URL = "https://praxis-hub.co";

function getShareUrl(slug: string): string {
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${SITE_URL}/blog/${encodeURIComponent(normalizedSlug)}`;
}

export default function BlogShareButtons({ blog, size = "sm", variant = "outline", showLabels = true }: BlogShareButtonsProps) {
  const { toast } = useToast();

  const shareUrl = getShareUrl(blog.slug);
  const shareText = `${blog.title}${blog.excerpt ? ` - ${blog.excerpt}` : ''}`;

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=500');
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(url, '_blank', 'width=600,height=500');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace del artículo se ha copiado al portapapeles.",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} size={size} onClick={shareOnLinkedIn} className="flex items-center gap-1.5">
              <Linkedin className="h-3.5 w-3.5" />
              {showLabels && "LinkedIn"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">Compartir en LinkedIn con vista previa optimizada</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} size={size} onClick={shareOnWhatsApp} className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {showLabels && "WhatsApp"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">Enviar por WhatsApp con título y enlace</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} size={size} onClick={copyToClipboard} className="flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              {showLabels && "Copiar"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">Copiar enlace optimizado para redes sociales</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
