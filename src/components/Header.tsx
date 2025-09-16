import { useState } from "react";
import { Button } from "./ui/button";
import { 
  Menu, 
  X, 
  MessageCircle, 
  FileText, 
  Scale, 
  Users, 
  Phone, 
  Newspaper,
  DollarSign,
  Shield,
  FileText as DocumentIcon,
  Gavel,
  User,
  LogIn
} from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";
import logoImage from "/logo-ai-legal.png";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenChat: (message?: string) => void;
}

export default function Header({ currentPage, onNavigate, onOpenChat }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useUserAuth();

  const navItems = [
    { id: "personas", label: "Personas", description: "Servicios legales individuales", icon: User, color: "text-primary" },
    { id: "empresas", label: "Empresas", description: "Soluciones corporativas", icon: Users, color: "text-success" },
    { id: "documento", label: "Mi Documento", description: "Seguimiento de documentos", icon: FileText, color: "text-muted-foreground" },
    { id: "precios", label: "Precios", description: "Planes y tarifas", icon: DollarSign, color: "text-muted-foreground" },
    { id: "blog", label: "Blog", description: "Artículos legales", icon: Newspaper, color: "text-muted-foreground" },
    { id: "contacto", label: "Contacto", description: "Atención al cliente", icon: Phone, color: "text-muted-foreground" },
    { id: "abogados", label: "Portal Abogados", description: "Acceso profesional", icon: Shield, color: "text-warning" },
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-soft border-b">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <button
          onClick={() => handleNavClick("home")}
          className="flex items-center space-x-3 text-xl font-bold text-primary hover:text-primary-light transition-smooth"
        >
          <img 
            src={logoImage} 
            alt="Tu Consultor Legal" 
            className="w-10 h-10 object-contain"
          />
          <span>Tu Consultor Legal</span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-4">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-smooth font-medium text-sm ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-sm"
                    : "text-foreground hover:text-primary hover:bg-muted/50"
                }`}
                title={item.description}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? "text-primary" : item.color}`} />
                <span className="hidden xl:inline">{item.label}</span>
                {item.id === "abogados" && !isActive && (
                  <div className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop CTA Buttons - Enhanced for Role Priority */}
        <div className="hidden lg:flex items-center space-x-2">
          {isAuthenticated ? (
            <Button 
              onClick={() => onNavigate("user-dashboard")}
              variant="outline"
              size="sm"
              className="bg-gradient-subtle border-primary/20 text-primary font-medium"
            >
              <User className="w-4 h-4 mr-2" />
              <span className="hidden xl:inline">Mi Panel</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => onNavigate("user-dashboard")}
                variant="outline"
                size="sm"
                className="hover:bg-primary/5 border-primary/30 text-primary font-medium"
              >
                <LogIn className="w-4 h-4 mr-1" />
                <span className="hidden xl:inline">Registrarse</span>
                <span className="xl:hidden">Registro</span>
              </Button>
              
              <div className="h-4 w-px bg-border mx-1"></div>
              
              <Button 
                onClick={() => handleNavClick("abogados")}
                variant="outline"
                size="sm"
                className="hover:bg-warning/5 border-warning/30 text-warning font-medium"
              >
                <Shield className="w-4 h-4 mr-1" />
                <span className="hidden xl:inline">Portal Pro</span>
                <span className="xl:hidden">Pro</span>
              </Button>
            </div>
          )}
          
          <Button
            variant="success"
            size="sm"
            className="shadow-elegant font-medium"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            <span className="hidden xl:inline">Consulta Gratis</span>
            <span className="xl:hidden">Consulta</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-smooth"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menú de navegación"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-card border-t shadow-lg z-50 max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-6 py-4">
            {/* User Type Selection - Priority Layout */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Elegir Perfil de Usuario
              </h3>
              <div className="space-y-3">
                {/* Priority: Individual Registration */}
                <button
                  onClick={() => handleNavClick("personas")}
                  className={`w-full p-4 rounded-lg border transition-smooth ${
                    currentPage === "personas"
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">Personas</div>
                      <div className="text-xs text-muted-foreground">Registro individual • Más popular</div>
                    </div>
                    <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Gratis</div>
                  </div>
                </button>
                
                {/* Business Registration */}
                <button
                  onClick={() => handleNavClick("empresas")}
                  className={`w-full p-4 rounded-lg border transition-smooth ${
                    currentPage === "empresas"
                      ? "bg-success/10 border-success text-success"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">Empresas</div>
                      <div className="text-xs text-muted-foreground">Soluciones corporativas</div>
                    </div>
                  </div>
                </button>
                
                {/* Professional Portal */}
                <button
                  onClick={() => handleNavClick("abogados")}
                  className={`w-full p-4 rounded-lg border transition-smooth ${
                    currentPage === "abogados"
                      ? "bg-warning/10 border-warning text-warning"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">Abogados</div>
                      <div className="text-xs text-muted-foreground">Portal profesional avanzado</div>
                    </div>
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="space-y-1 mb-6">
              {navItems.filter(item => !["personas", "empresas", "abogados"].includes(item.id)).map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center w-full p-3 rounded-lg transition-smooth ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Enhanced CTA Buttons */}
            <div className="space-y-3 pt-4 border-t border-border">
              {isAuthenticated ? (
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate("user-dashboard");
                  }}
                  variant="outline"
                  className="w-full bg-gradient-subtle border-primary/20 text-primary"
                  size="lg"
                >
                  <User className="w-4 h-4 mr-2" />
                  Mi Panel Personal
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate("user-dashboard");
                    }}
                    variant="outline"
                    className="w-full border-primary/30 text-primary"
                    size="lg"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Registrarse / Iniciar Sesión
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleNavClick("abogados");
                    }}
                    variant="outline"
                    className="w-full border-warning/30 text-warning"
                    size="sm"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Portal Profesional
                  </Button>
                </div>
              )}
              
              <Button
                variant="success"
                size="lg"
                className="w-full shadow-elegant"
                onClick={() => {
                  onOpenChat("Quiero una consultoría legal");
                  setMobileMenuOpen(false);
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Consulta Gratuita
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}