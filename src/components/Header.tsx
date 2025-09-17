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
    { id: "precios", label: "Precios", description: "Transparencia total", icon: DollarSign, color: "text-muted-foreground" },
    { id: "blog", label: "Recursos", description: "Guías y artículos", icon: Newspaper, color: "text-muted-foreground" },
    { id: "contacto", label: "Ayuda", description: "Soporte directo", icon: Phone, color: "text-muted-foreground" },
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

        {/* Desktop Navigation - Simplified */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Main User Type Selector */}
          <div className="flex items-center space-x-1 bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => handleNavClick("personas")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-smooth font-medium text-sm ${
                currentPage === "personas"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Personas</span>
            </button>
            <button
              onClick={() => handleNavClick("empresas")}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-smooth font-medium text-sm ${
                currentPage === "empresas"
                  ? "bg-card text-success shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Empresas</span>
            </button>
          </div>

          {/* Secondary Navigation */}
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-smooth font-medium text-sm ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={item.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop CTA Buttons - Clear Priority */}
        <div className="hidden lg:flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => onNavigate("user-dashboard")}
                variant="outline"
                size="sm"
                className="text-foreground border-border"
              >
                <User className="w-4 h-4 mr-2" />
                Mi Panel
              </Button>
              <Button
                onClick={() => onNavigate("documento")}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <FileText className="w-4 h-4 mr-2" />
                Seguimiento
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* Professional Portal */}
              <Button 
                onClick={() => handleNavClick("abogados")}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-warning"
              >
                <Shield className="w-4 h-4 mr-2" />
                <span className="hidden xl:inline">Soy Abogado</span>
                <span className="xl:hidden">Abogado</span>
              </Button>
              
              <div className="h-4 w-px bg-border"></div>
              
              {/* Main Registration CTA */}
              <Button 
                onClick={() => onNavigate("user-dashboard")}
                variant="outline"
                size="sm"
                className="border-primary/20 text-primary hover:bg-primary/5"
              >
                <LogIn className="w-4 h-4 mr-2" />
                <span className="hidden xl:inline">Acceder</span>
                <span className="xl:hidden">Entrar</span>
              </Button>
            </div>
          )}
          
          {/* Primary CTA */}
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-elegant shadow-elegant font-medium"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            <span className="hidden xl:inline">Consulta Gratuita</span>
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
        <div className="lg:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-sm border-t shadow-lg z-50 max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-6 py-6">
            {/* Clear User Type Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                ¿Qué tipo de usuario eres?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Individual Users - Priority */}
                <button
                  onClick={() => handleNavClick("personas")}
                  className={`p-4 rounded-xl border-2 transition-smooth ${
                    currentPage === "personas"
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">Persona Natural</div>
                      <div className="text-sm text-muted-foreground">Documentos personales y asesoría individual</div>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      Más Popular
                    </div>
                  </div>
                </button>
                
                {/* Business Users */}
                <button
                  onClick={() => handleNavClick("empresas")}
                  className={`p-4 rounded-xl border-2 transition-smooth ${
                    currentPage === "empresas"
                      ? "bg-success/10 border-success text-success"
                      : "border-border hover:border-success/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Users className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">Empresa</div>
                      <div className="text-sm text-muted-foreground">Soluciones corporativas y contratos</div>
                    </div>
                  </div>
                </button>
                
                {/* Professional Portal */}
                <button
                  onClick={() => handleNavClick("abogados")}
                  className={`p-4 rounded-xl border-2 transition-smooth ${
                    currentPage === "abogados"
                      ? "bg-warning/10 border-warning text-warning"
                      : "border-border hover:border-warning/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Shield className="w-6 h-6 text-warning" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">Soy Abogado</div>
                      <div className="text-sm text-muted-foreground">Portal profesional avanzado</div>
                    </div>
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  </div>
                </button>
              </div>
            </div>

            {/* Additional Navigation */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Información
              </h4>
              <div className="space-y-2">
                {navItems.map((item) => {
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
            </div>
            
            
            {/* Clear Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-border">
              {isAuthenticated ? (
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
                    <User className="w-4 h-4 mr-2" />
                    Mi Panel Personal
                  </Button>
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate("documento");
                    }}
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Seguimiento de Documentos
                  </Button>
                </div>
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
                    Acceder a Mi Cuenta
                  </Button>
                </div>
              )}
              
              <Button
                variant="default"
                size="lg"
                className="w-full bg-gradient-elegant shadow-elegant"
                onClick={() => {
                  onOpenChat("Quiero una consultoría legal");
                  setMobileMenuOpen(false);
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Consulta Legal Gratuita
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}