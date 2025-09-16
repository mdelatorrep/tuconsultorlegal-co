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
    { id: "personas", label: "Para Personas" },
    { id: "empresas", label: "Para Empresas" },
    { id: "documento", label: "Mi Documento" },
    { id: "precios", label: "Precios" },
    { id: "blog", label: "Blog" },
    { id: "contacto", label: "Contacto" },
    { id: "abogados", label: "Panel Abogados" },
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
              className={`transition-smooth font-medium ${
                currentPage === item.id
                  ? "text-success font-bold"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <Button 
              onClick={() => onNavigate("user-dashboard")}
              variant="outline"
            >
              <User className="w-4 h-4 mr-2" />
              Mi Dashboard
            </Button>
          ) : (
            <Button 
              onClick={() => onNavigate("user-dashboard")}
              variant="outline"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Ingresar
            </Button>
          )}
          
          <Button
            variant="success"
            size="lg"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Asesoría Gratuita
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
              className={`block w-full text-left py-2 transition-smooth ${
                currentPage === item.id
                  ? "text-success font-bold"
                  : "text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
          
          <div className="space-y-2 mt-4">
            {isAuthenticated ? (
              <Button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("user-dashboard");
                }}
                variant="outline"
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                Mi Dashboard
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
                Ingresar
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
              Asesoría Gratuita
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}