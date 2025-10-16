import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Search, Shield, Users, User, MessageCircle, LogIn, ArrowRight, Lock } from "lucide-react";
import DocumentChatFlow from "./DocumentChatFlow";
import DocumentCreationSuccess from "./DocumentCreationSuccess";
import { useUserAuth } from "@/hooks/useUserAuth";

interface PersonasPageProps {
  onOpenChat: (message: string) => void;
  onNavigate?: (page: string) => void;
}

interface AgentService {
  id: string;
  document_name: string;
  document_description: string;
  description: string;
  price: number;
  button_cta: string;
  frontend_icon: string;
  category: string;
  ai_prompt: string;
}

export default function PersonasPage({ onOpenChat, onNavigate }: PersonasPageProps) {
  const [services, setServices] = useState<AgentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'success'>('list');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [documentToken, setDocumentToken] = useState<string>('');
  const [searchCode, setSearchCode] = useState('');
  const { isAuthenticated } = useUserAuth();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: agents, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('status', 'active')
        .in('target_audience', ['personas', 'ambos'])
        .order('category', { ascending: true });

      if (error) throw error;
      setServices(agents || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = (service: AgentService) => {
    setSelectedAgent(service.id);
    setCurrentView('form');
  };

  const handleFormBack = () => {
    setCurrentView('list');
    setSelectedAgent('');
  };

  const handleFormComplete = (token: string) => {
    setDocumentToken(token);
    setCurrentView('success');
  };

  const handleSuccessBack = () => {
    setCurrentView('list');
    setSelectedAgent('');
    setDocumentToken('');
  };

  const handleNavigateToTracking = () => {
    if (onNavigate) {
      onNavigate('documento');
    }
  };

  const handleSearchDocument = () => {
    if (searchCode.trim()) {
      if (onNavigate) {
        onNavigate('documento');
      }
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as { [key: string]: AgentService[] });

  // Show chat flow if agent is selected
  if (currentView === 'form' && selectedAgent) {
    return <DocumentChatFlow agentId={selectedAgent} onBack={handleFormBack} onComplete={handleFormComplete} />;
  }

  // Show success screen if document was created
  if (currentView === 'success' && documentToken) {
    return <DocumentCreationSuccess token={documentToken} onBack={handleSuccessBack} onNavigateToTracking={handleNavigateToTracking} />;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Apple Style */}
      <section className="pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-semibold text-foreground mb-6 tracking-tight">
            Portal Personas
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 font-light">
            Accede a servicios legales inteligentes diseñados para ti
          </p>
        </div>
      </section>

      {/* Main Navigation Cards - 4 Sections */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Documentos por Categorías */}
          <div className="group relative bg-card rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Documentos</h3>
              <p className="text-muted-foreground text-sm">Genera documentos legales personalizados</p>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-between group-hover:bg-primary/5"
              onClick={() => {
                const element = document.getElementById('documentos-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ver opciones
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* 2. Seguimiento de Documentos */}
          <div className="group relative bg-card rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Seguimiento</h3>
              <p className="text-muted-foreground text-sm">Rastrea tus documentos generados</p>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Código de seguimiento"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchDocument()}
              />
              <Button 
                variant="ghost" 
                className="w-full justify-between group-hover:bg-primary/5"
                onClick={handleSearchDocument}
              >
                Buscar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* 3. Autenticación */}
          <div className="group relative bg-card rounded-3xl p-8 border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">
                {isAuthenticated ? 'Mi Cuenta' : 'Acceso'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isAuthenticated ? 'Gestiona tu perfil y documentos' : 'Inicia sesión o regístrate'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-between group-hover:bg-primary/5"
              onClick={() => onNavigate && onNavigate('user-dashboard')}
            >
              {isAuthenticated ? 'Ir al panel' : 'Acceder'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* 4. Asistente Legal */}
          <div className={`group relative rounded-3xl p-8 border transition-all duration-300 cursor-pointer ${
            isAuthenticated 
              ? 'bg-card border-border hover:border-primary/50 hover:shadow-lg' 
              : 'bg-muted/30 border-muted cursor-not-allowed'
          }`}>
            <div className="mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                isAuthenticated ? 'bg-primary/10' : 'bg-muted/50'
              }`}>
                {isAuthenticated ? (
                  <MessageCircle className="w-7 h-7 text-primary" />
                ) : (
                  <Lock className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-2xl font-semibold mb-2">
                Asistente Legal
              </h3>
              <p className="text-muted-foreground text-sm">
                {isAuthenticated 
                  ? 'Consulta legal personalizada 24/7' 
                  : 'Solo para usuarios registrados'
                }
              </p>
            </div>
            <Button 
              variant="ghost" 
              className={`w-full justify-between ${
                isAuthenticated ? 'group-hover:bg-primary/5' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => isAuthenticated && onOpenChat("Necesito asesoría legal personalizada")}
              disabled={!isAuthenticated}
            >
              {isAuthenticated ? 'Iniciar chat' : 'Requiere cuenta'}
              <ArrowRight className={`w-4 h-4 ${isAuthenticated ? 'group-hover:translate-x-1' : ''} transition-transform`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-muted/30 rounded-3xl p-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-semibold mb-2">+5,000</div>
                <p className="text-muted-foreground">Documentos generados</p>
              </div>
              <div>
                <div className="text-4xl font-semibold mb-2">24/7</div>
                <p className="text-muted-foreground">Soporte disponible</p>
              </div>
              <div>
                <div className="text-4xl font-semibold mb-2">100%</div>
                <p className="text-muted-foreground">Datos encriptados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section id="documentos-section" className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">Documentos Disponibles</h2>
            <p className="text-xl text-muted-foreground font-light">Selecciona el tipo de documento que necesitas</p>
          </div>

          {/* Categories */}
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category} className="mb-16">
              <h3 className="text-2xl font-semibold mb-8 pb-4 border-b">{category}</h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                    onClick={() => handleDocumentAction(service)}
                  >
                    <h4 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      {service.document_name}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.document_description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-2xl font-semibold text-primary">
                        {service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString()}`}
                      </span>
                      <Button variant="ghost" size="sm" className="group-hover:bg-primary/5">
                        Generar <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-muted/30 rounded-3xl p-12 max-w-2xl mx-auto">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Servicios en Preparación</h3>
                <p className="text-muted-foreground">Nuestros expertos están perfeccionando los servicios.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto bg-primary/5 rounded-3xl p-12 text-center">
          <h3 className="text-3xl font-semibold mb-4">¿Necesitas ayuda personalizada?</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nuestro equipo de expertos legales está disponible para asesorarte en casos específicos
          </p>
          <Button 
            variant="default" 
            size="lg"
            onClick={() => onOpenChat("Necesito asesoría legal personalizada")}
            className="rounded-full px-8"
          >
            Consultar con un experto
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}