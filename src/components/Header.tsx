import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Menu, X, User, LogIn, MoreHorizontal, Phone, Newspaper } from "lucide-react";
import logoIcon from "@/assets/favicon.png";
import { useAuthTypeDetection } from "@/hooks/useAuthTypeDetection";

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
  
  const { userType, isAuthenticated } = useAuthTypeDetection();
  const isLawyer = userType === 'lawyer';
  
  const navItems = [
    {
      id: "blog",
      label: "Recursos",
      icon: Newspaper,
    },
    {
      id: "contacto",
      label: "Contacto",
      icon: Phone,
    }
  ];
  
  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  const NavigationDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border-border">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentPage === item.id;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`cursor-pointer ${isActive ? "bg-muted text-foreground" : ""}`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="bg-background/95 backdrop-blur-sm sticky top-0 z-50 border-b border-border">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <button 
          onClick={() => handleNavClick("home")} 
          className="flex items-center space-x-2 text-foreground hover:opacity-80 transition-opacity"
        >
          <img src={logoIcon} alt="Praxis Hub" className="w-6 h-6" />
          <span className="text-lg font-semibold tracking-tight">Praxis Hub</span>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => handleNavClick("lawyer-landing")} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === "lawyer-landing" 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Para Abogados
            </button>
            <button 
              onClick={() => handleNavClick("personas")} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === "personas" 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Para Ciudadanos
            </button>
          </div>
          
          <NavigationDropdown />
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center space-x-3">
          {isAuthenticated ? (
            <Button 
              onClick={() => {
                const targetPage = isLawyer ? "abogados" : "user-dashboard";
                onNavigate(targetPage);
              }} 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <User className="w-4 h-4 mr-2" />
              {isLawyer ? "Mi Panel" : "Mi Cuenta"}
            </Button>
          ) : (
            <Button 
              onClick={() => window.location.href = '/auth-abogados'} 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Acceder
            </Button>
          )}
          
          <Button 
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onNavigate("lawyer-landing")}
          >
            Explorar
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          aria-label="Menú de navegación"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border">
          <div className="container mx-auto px-6 py-6 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-2">
              <button 
                onClick={() => handleNavClick("lawyer-landing")} 
                className={`flex items-center w-full p-3 rounded-md text-left transition-colors ${
                  currentPage === "lawyer-landing" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <img src={logoIcon} alt="" className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Para Abogados</div>
                  <div className="text-xs text-muted-foreground">Entorno profesional integrado</div>
                </div>
              </button>
              
              <button 
                onClick={() => handleNavClick("personas")} 
                className={`flex items-center w-full p-3 rounded-md text-left transition-colors ${
                  currentPage === "personas" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">Para Ciudadanos</div>
                  <div className="text-xs text-muted-foreground">Servicios legales accesibles</div>
                </div>
              </button>
            </div>
            
            {/* Secondary Navigation */}
            <div className="pt-4 border-t border-border space-y-2">
              {navItems.map(item => {
                const IconComponent = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => handleNavClick(item.id)} 
                    className={`flex items-center w-full p-3 rounded-md text-left transition-colors ${
                      isActive 
                        ? "bg-muted text-foreground" 
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              {isAuthenticated ? (
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate(isLawyer ? "abogados" : "user-dashboard");
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  <User className="w-4 h-4 mr-2" />
                  {isLawyer ? "Mi Panel" : "Mi Cuenta"}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = '/auth-abogados';
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Acceder
                </Button>
              )}
              
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("lawyer-landing");
                }}
              >
                Explorar Praxis Hub
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
