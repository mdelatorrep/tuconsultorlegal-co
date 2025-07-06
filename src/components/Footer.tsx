interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
  };

  return (
    <footer className="bg-brand-blue text-primary-foreground">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4">Tu Consultor Legal</h3>
            <p className="text-primary-foreground/80">
              Democratizando el acceso a servicios legales de alta calidad en Colombia con tecnología.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-4">Servicios</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavClick("personas")}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Para Personas
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick("empresas")}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Para Empresas
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick("precios")}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Precios
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleNavClick("terminos")}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Términos y Condiciones
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavClick("privacidad")}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-smooth"
                >
                  Política de Privacidad
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Contacto</h3>
            <p className="text-primary-foreground/80">soporte@tuconsultorlegal.com.co</p>
            <p className="text-primary-foreground/80">Envigado, Antioquia, Colombia</p>
          </div>
        </div>

        <div className="mt-10 border-t border-primary-foreground/20 pt-6 text-center text-primary-foreground/60 text-sm">
          <p>&copy; 2025 Tu Consultor Legal SAS. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}