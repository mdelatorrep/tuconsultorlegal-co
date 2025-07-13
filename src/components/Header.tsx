import { useState } from "react";
import { Button } from "./ui/button";
import { Menu, X, Scale } from "lucide-react";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenChat: (message?: string) => void;
}

export default function Header({ currentPage, onNavigate, onOpenChat }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          className="flex items-center space-x-2 text-2xl font-bold text-primary hover:text-primary-light transition-smooth"
        >
          <Scale className="w-8 h-8" />
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

        {/* Desktop CTA Button */}
        <Button
          variant="success"
          size="lg"
          className="hidden md:block"
          onClick={() => onOpenChat("Quiero una consultoría legal")}
        >
          Asesoría Gratuita
        </Button>

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
          <Button
            variant="success"
            size="lg"
            className="mt-4 w-full"
            onClick={() => {
              onOpenChat("Quiero una consultoría legal");
              setMobileMenuOpen(false);
            }}
          >
            Asesoría Gratuita
          </Button>
        </div>
      )}
    </header>
  );
}