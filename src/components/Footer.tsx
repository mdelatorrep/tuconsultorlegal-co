import logoIcon from "@/assets/favicon.png";
import { Linkedin } from "lucide-react";

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const navigate = (pageId: string) => {
    if (onNavigate) {
      onNavigate(pageId);
    } else {
      window.location.href = `/#${pageId}`;
    }
  };

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src={logoIcon} alt="Praxis Hub" className="w-5 h-5 brightness-0 invert opacity-80" />
              <span className="text-lg font-semibold">Praxis Hub</span>
            </div>
            <p className="text-background/60 font-light leading-relaxed max-w-md">
              El entorno que eleva la práctica legal. Infraestructura profesional 
              para abogados independientes y estudios jurídicos.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-medium text-background/80 uppercase tracking-wider mb-4">
              Plataforma
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#lawyer-landing"
                  onClick={(e) => { e.preventDefault(); navigate("lawyer-landing"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Para Abogados
                </a>
              </li>
              <li>
                <a
                  href="/#personas"
                  onClick={(e) => { e.preventDefault(); navigate("personas"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Para Ciudadanos
                </a>
              </li>
              <li>
                <a
                  href="/#blog"
                  onClick={(e) => { e.preventDefault(); navigate("blog"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Recursos
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="text-sm font-medium text-background/80 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#terminos"
                  onClick={(e) => { e.preventDefault(); navigate("terminos"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Términos de uso
                </a>
              </li>
              <li>
                <a
                  href="/#privacidad"
                  onClick={(e) => { e.preventDefault(); navigate("privacidad"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Privacidad
                </a>
              </li>
              <li>
                <a
                  href="/#contacto"
                  onClick={(e) => { e.preventDefault(); navigate("contacto"); }}
                  className="text-background/60 hover:text-background transition-colors font-light"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/40 text-sm font-light">
            © 2025 Praxis Hub. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/company/praxis-hub-co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-background/40 hover:text-background transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <span className="text-background/40 text-sm font-light">Colombia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
