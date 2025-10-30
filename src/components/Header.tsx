import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Menu, X, MessageCircle, FileText, Scale, Users, Phone, Newspaper, DollarSign, Shield, FileText as DocumentIcon, Gavel, User, LogIn, MoreHorizontal } from "lucide-react";
import { useAuthTypeDetection } from "@/hooks/useAuthTypeDetection";
import logoImage from "/logo-tcl.png";
interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenChat: (message?: string) => void;
}
export default function Header({
  currentPage,
  onNavigate,
  onOpenChat
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use the improved auth type detection
  const { userType, isAuthenticated, user, loading } = useAuthTypeDetection();
  const isLawyer = userType === 'lawyer';
  const navItems = [{
    id: "blog",
    label: "Recursos",
    description: "Guías y artículos",
    icon: Newspaper,
    color: "text-muted-foreground"
  }, {
    id: "contacto",
    label: "Ayuda",
    description: "Soporte directo",
    icon: Phone,
    color: "text-muted-foreground"
  }];
  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  // Navigation Dropdown Component
  const NavigationDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md border-border z-[100]">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentPage === item.id;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`cursor-pointer ${isActive ? "bg-primary/10 text-primary font-medium" : ""}`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return <header className="bg-background/95 backdrop-blur-md sticky top-0 z-50 shadow-soft border-b border-border">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <button onClick={() => handleNavClick("home")} className="flex items-center space-x-3 text-xl font-bold text-primary hover:text-primary-light transition-smooth">
          <img src={logoImage} alt="Tu Consultor Legal" className="w-10 h-10 object-contain" />
          <span className="text-foreground">tuconsultorlegal.co

        </span>
        </button>

        {/* Desktop Navigation - Simplified & Clean */}
        <div className="hidden lg:flex items-center space-x-6">
          {/* Service Tabs - Clean Design */}
          <div className="flex items-center space-x-2 bg-muted/30 rounded-xl p-1">
            <button onClick={() => handleNavClick("personas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth font-medium text-sm ${currentPage === "personas" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <User className="w-4 h-4" />
              <span>Personas</span>
            </button>
            <button onClick={() => handleNavClick("lawyer-landing")} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth font-medium text-sm ${currentPage === "lawyer-landing" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Shield className="w-4 h-4" />
              <span>Abogados</span>
            </button>
            <button onClick={() => window.location.hash = 'proximamente-empresas'} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-smooth font-medium text-sm ${currentPage === "empresas" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Users className="w-4 h-4" />
              <span>Empresas</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Próximamente</Badge>
            </button>
          </div>

          {/* More Options Dropdown */}
          <NavigationDropdown />
        </div>

        {/* Desktop CTA Buttons - Simplified */}
        <div className="hidden lg:flex items-center space-x-3">
          {isAuthenticated ? (
            <Button 
              onClick={() => {
                const targetPage = isLawyer ? "abogados" : "user-dashboard";
                onNavigate(targetPage);
              }} 
              variant="outline" 
              size="sm"
            >
              <User className="w-4 h-4 mr-2" />
              {isLawyer ? "Panel Abogado" : "Mi Panel"}
            </Button>
          ) : (
            <Button onClick={() => onNavigate("auth")} variant="outline" size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Acceder
            </Button>
          )}
          
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => onNavigate("user-dashboard")}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Consulta Gratuita
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-smooth" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menú de navegación">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && <div className="lg:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-50 max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-6 py-6">
            {/* Clear User Type Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                ¿Qué tipo de usuario eres?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Individual Users - Priority */}
                <button onClick={() => handleNavClick("personas")} className={`p-4 rounded-xl border-2 transition-smooth ${currentPage === "personas" ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">Persona Natural</div>
                      <div className="text-sm text-muted-foreground">Documentos personales y consultoría individual</div>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      Más Popular
                    </div>
                  </div>
                </button>
                
                {/* Business Users */}
                <button onClick={() => {
                  setMobileMenuOpen(false);
                  window.location.hash = 'proximamente-empresas';
                }} className={`p-4 rounded-xl border-2 transition-smooth ${currentPage === "empresas" ? "bg-success/10 border-success text-success" : "border-border hover:border-success/30 hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Users className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-base">Empresa</div>
                        <Badge variant="secondary" className="text-xs">Próximamente</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">Portal empresarial en desarrollo</div>
                    </div>
                  </div>
                </button>
                
                {/* Professional Portal */}
                <button onClick={() => handleNavClick("lawyer-landing")} className={`p-4 rounded-xl border-2 transition-smooth ${currentPage === "lawyer-landing" ? "bg-warning/10 border-warning text-warning" : "border-border hover:border-warning/30 hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Shield className="w-6 h-6 text-warning" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">Soy Abogado</div>
                      <div className="text-sm text-muted-foreground">Portal profesional - Panel de abogados</div>
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
                {navItems.map(item => {
              const IconComponent = item.icon;
              const isActive = currentPage === item.id;
              return <button key={item.id} onClick={() => handleNavClick(item.id)} className={`flex items-center w-full p-3 rounded-lg transition-smooth ${isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}>
                      <IconComponent className="w-5 h-5 mr-3" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </button>;
            })}
              </div>
            </div>
            
            
            {/* Clear Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-border">
              {isAuthenticated ? <div className="space-y-2">
                  <Button onClick={() => {
              setMobileMenuOpen(false);
              onNavigate(isLawyer ? "abogados" : "user-dashboard");
            }} variant="outline" className="w-full border-primary/30 text-primary" size="lg">
                    <User className="w-4 h-4 mr-2" />
                    {isLawyer ? "Panel de Abogado" : "Mi Panel Personal"}
                  </Button>
                  <Button onClick={() => {
              setMobileMenuOpen(false);
              onNavigate("documento");
            }} variant="ghost" className="w-full text-muted-foreground" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Seguimiento de Documentos
                  </Button>
                </div> : <div className="space-y-2">
                  <Button onClick={() => {
              setMobileMenuOpen(false);
              onNavigate("auth");
            }} variant="default" className="w-full bg-primary text-primary-foreground" size="lg">
                    <LogIn className="w-4 h-4 mr-2" />
                    Acceder / Registrarse
                  </Button>
                </div>}
              
              <Button variant="hero" size="lg" className="w-full" onClick={() => {
            onOpenChat("Quiero una consultoría legal");
            setMobileMenuOpen(false);
          }}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Consulta Legal Gratuita
              </Button>
            </div>
          </div>
        </div>}
    </header>;
}