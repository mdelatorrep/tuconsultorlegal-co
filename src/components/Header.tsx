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
    { id: "personas", label: "Personas", description: "Servicios legales individuales" },
    { id: "empresas", label: "Empresas", description: "Soluciones corporativas" },
    { id: "documento", label: "Mi Documento", description: "Seguimiento de documentos" },
    { id: "precios", label: "Precios", description: "Planes y tarifas" },
    { id: "blog", label: "Blog", description: "Artículos legales" },
    { id: "contacto", label: "Contacto", description: "Atención al cliente" },
    { id: "abogados", label: "Portal Abogados", description: "Acceso profesional" },
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
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`group transition-smooth font-medium relative ${
                currentPage === item.id
                  ? "text-success font-bold"
                  : "text-foreground hover:text-primary"
              }`}
              title={item.description}
            >
              {item.label}
              {item.id === "abogados" && (
                <Shield className="w-3 h-3 ml-1 inline text-warning" />
              )}
            </button>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated ? (
            <Button 
              onClick={() => onNavigate("user-dashboard")}
              variant="outline"
              className="bg-gradient-to-r from-primary/5 to-success/5 border-primary/20"
            >
              <User className="w-4 h-4 mr-2" />
              Mi Panel Personal
            </Button>
          ) : (
            <Button 
              onClick={() => onNavigate("user-dashboard")}
              variant="outline"
              className="hover:bg-primary/5"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Acceder
            </Button>
          )}
          
          <Button
            variant="success"
            size="lg"
            className="shadow-glow"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Consulta Gratuita
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 pb-4 bg-card border-t">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left py-3 px-2 rounded transition-smooth ${
                currentPage === item.id
                  ? "text-success font-bold bg-success/5"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{item.label}</span>
                {item.id === "abogados" && (
                  <Shield className="w-4 h-4 text-warning" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.description}
              </div>
            </button>
          ))}
          
          <div className="space-y-2 mt-4 pt-4 border-t border-border">
            {isAuthenticated ? (
              <Button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("user-dashboard");
                }}
                variant="outline"
                className="w-full bg-gradient-to-r from-primary/5 to-success/5 border-primary/20"
              >
                <User className="w-4 h-4 mr-2" />
                Mi Panel Personal
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("user-dashboard");
                }}
                variant="outline"
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Acceder como Usuario
              </Button>
            )}
            
            <Button
              variant="success"
              size="lg"
              className="w-full"
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
      )}
    </header>
  );
}