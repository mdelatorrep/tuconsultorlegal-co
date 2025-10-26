import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Search, Shield, Users, User, MessageCircle, LogIn, ArrowRight, Lock } from "lucide-react";
import DocumentChatFlow from "./DocumentChatFlow";
import DocumentCreationSuccess from "./DocumentCreationSuccess";
import { useUserAuth } from "@/hooks/useUserAuth";
import { IntelligentDocumentSearch } from "./IntelligentDocumentSearch";
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
export default function PersonasPage({
  onOpenChat,
  onNavigate
}: PersonasPageProps) {
  const [services, setServices] = useState<AgentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'success'>('list');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [documentToken, setDocumentToken] = useState<string>('');
  const [searchCode, setSearchCode] = useState('');
  const {
    isAuthenticated
  } = useUserAuth();
  useEffect(() => {
    loadServices();
  }, []);
  const loadServices = async () => {
    try {
      const {
        data: agents,
        error
      } = await supabase.from('legal_agents').select('*').eq('status', 'active').in('target_audience', ['personas', 'ambos']).order('category', {
        ascending: true
      });
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
        // Navigate to documento page with the tracking code as URL parameter
        window.location.hash = `#documento?code=${encodeURIComponent(searchCode.trim())}`;
      }
    }
  };
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as {
    [key: string]: AgentService[];
  });

  // Show chat flow if agent is selected
  if (currentView === 'form' && selectedAgent) {
    return <DocumentChatFlow agentId={selectedAgent} onBack={handleFormBack} onComplete={handleFormComplete} />;
  }

  // Show success screen if document was created
  if (currentView === 'success' && documentToken) {
    return <DocumentCreationSuccess token={documentToken} onBack={handleSuccessBack} onNavigateToTracking={handleNavigateToTracking} />;
  }
  if (loading) {
    return <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Hero Section - High Impact Design */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24]">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.05%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
        
        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-[#0372e8]/10 rounded-full blur-[120px]"></div>
        
        <div className="relative container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
              <Shield className="w-4 h-4 mr-2" />
              Servicios Legales para Personas
              <Check className="w-4 h-4 ml-2 text-green-300" />
            </div>

            {/* Main Title */}
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight tracking-tight">
                Tu Asesoría Legal
                <span className="block bg-gradient-to-r from-[#f2bb31] to-[#ffd666] bg-clip-text text-transparent mt-2">
                  Inteligente
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
                Documentos legales personalizados con inteligencia artificial. 
                <span className="block mt-2 text-white/60">Rápido, seguro y accesible.</span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in">
              <Button size="lg" className="bg-gradient-to-r from-[#f2bb31] to-[#ffd666] text-[#010f24] hover:shadow-xl hover:shadow-yellow-500/20 transition-all duration-300 font-semibold px-8 py-6 text-lg group" onClick={() => {
              const element = document.getElementById('documentos-section');
              element?.scrollIntoView({
                behavior: 'smooth'
              });
            }}>
                Comenzar Ahora
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8 py-6 text-lg" onClick={() => onOpenChat("Necesito asesoría legal")}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat con IA
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 pt-8 text-white/60 text-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-300" />
                <span>100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-300" />
                <span>Documentos Personalizados</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-300" />
                <span>Respuesta Inmediata</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Navigation Cards - 4 Sections */}
      <section className="py-16 px-6 bg-background">
        
      </section>

      {/* Trust Indicators */}
      

      {/* Documents Section */}
      <section id="documentos-section" className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold mb-4">Encuentra tu documento</h2>
            <p className="text-xl text-muted-foreground">Busca con lenguaje natural o explora por categorías</p>
          </div>

          {/* Intelligent Search */}
          <div className="mb-16">
            <IntelligentDocumentSearch audience="personas" onDocumentSelect={documentId => handleDocumentAction({
            id: documentId
          } as AgentService)} placeholder="Busca documentos con lenguaje natural... Ej: 'necesito un contrato de arrendamiento'" />
          </div>

          <div className="border-t pt-12">
            <h3 className="text-2xl font-semibold mb-8 text-center">O explora por categoría</h3>
          </div>

          {/* Categories */}
          {Object.entries(groupedServices).map(([category, categoryServices]) => <div key={category} className="mb-16">
              <h3 className="text-2xl font-semibold mb-8 pb-4 border-b">{category}</h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryServices.map(service => <div key={service.id} className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-lg" onClick={() => handleDocumentAction(service)}>
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
                  </div>)}
              </div>
            </div>)}

          {services.length === 0 && <div className="text-center py-20">
              <div className="bg-muted/30 rounded-3xl p-12 max-w-2xl mx-auto">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Servicios en Preparación</h3>
                <p className="text-muted-foreground">Nuestros expertos están perfeccionando los servicios.</p>
              </div>
            </div>}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto bg-primary/5 rounded-3xl p-12 text-center">
          <h3 className="text-3xl font-semibold mb-4">¿Necesitas ayuda personalizada?</h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nuestro equipo de expertos legales está disponible para asesorarte en casos específicos
          </p>
          <Button variant="default" size="lg" onClick={() => onNavigate("user-dashboard")} className="rounded-full px-8">
            Consultar con un experto
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>;
}