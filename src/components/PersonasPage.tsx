import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Home, Briefcase, Car, Eye, Shield, Users, DollarSign, User, MessageCircle, Scale } from "lucide-react";
import DocumentChatFlow from "./DocumentChatFlow";
import DocumentCreationSuccess from "./DocumentCreationSuccess";

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

  const iconMap: {
    [key: string]: JSX.Element;
  } = {
    FileText: <FileText className="w-10 h-10" />,
    Home: <Home className="w-10 h-10" />,
    Briefcase: <Briefcase className="w-10 h-10" />,
    Car: <Car className="w-10 h-10" />,
    Eye: <Eye className="w-10 h-10" />,
    Shield: <Shield className="w-10 h-10" />,
    Users: <Users className="w-10 h-10" />,
    DollarSign: <DollarSign className="w-10 h-10" />
  };

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
      onNavigate('seguimiento');
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

  const getCategoryGradient = (category: string) => {
    const gradients = [
      'from-primary to-primary-light', 
      'from-success to-success-dark', 
      'from-rose-500 to-rose-600', 
      'from-purple-500 to-purple-600',
      'from-blue-500 to-blue-600', 
      'from-green-500 to-green-600', 
      'from-orange-500 to-orange-600', 
      'from-pink-500 to-pink-600', 
      'from-indigo-500 to-indigo-600', 
      'from-cyan-500 to-cyan-600'
    ];
    const hash = category.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return gradients[Math.abs(hash) % gradients.length];
  };

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
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-brand-gray-light to-background">
      <div className="container mx-auto px-6 py-12">
        {/* Floating Hero Section with Glass Morphism */}
        <div className="relative mb-20">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-brand-gold/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute -bottom-4 -left-4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
          </div>
          
          {/* Main Hero Card */}
          <div className="relative glass-card rounded-3xl p-12 lg:p-16 shadow-floating hover-glow animate-slide-up">
            <div className="text-center max-w-5xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 bg-gradient-elegant rounded-full px-6 py-3 text-primary-foreground font-semibold text-sm mb-8 shadow-card animate-scale-in">
                <User className="w-5 h-5" />
                <span>Panel Legal Inteligente</span>
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              </div>
              
              {/* Main Heading */}
              <h1 className="text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-success mb-8 leading-tight">
                Tu Futuro Legal
                <br />
                <span className="text-4xl lg:text-6xl">Comienza Hoy</span>
              </h1>
              
              {/* Description */}
              <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
                Únete a <span className="font-bold text-success">miles de usuarios</span> que ya revolucionaron 
                su gestión legal con IA avanzada y asesoría 24/7
              </p>
              
              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-card to-brand-gray-light shadow-card hover-lift">
                  <div className="absolute inset-0 bg-gradient-elegant opacity-0 group-hover:opacity-10 rounded-2xl transition-smooth"></div>
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-elegant rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-spring">
                      <FileText className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Documentos IA</h3>
                    <p className="text-muted-foreground">Generación automática en segundos</p>
                  </div>
                </div>
                
                <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-card to-brand-gray-light shadow-card hover-lift">
                  <div className="absolute inset-0 bg-gradient-success opacity-0 group-hover:opacity-10 rounded-2xl transition-smooth"></div>
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-success rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-spring">
                      <Shield className="w-8 h-8 text-success-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Seguridad Total</h3>
                    <p className="text-muted-foreground">Encriptación bancaria certificada</p>
                  </div>
                </div>
                
                <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-card to-brand-gray-light shadow-card hover-lift">
                  <div className="absolute inset-0 bg-gradient-elegant opacity-0 group-hover:opacity-10 rounded-2xl transition-smooth"></div>
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-elegant rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-spring">
                      <Users className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Expertos 24/7</h3>
                    <p className="text-muted-foreground">Abogados disponibles siempre</p>
                  </div>
                </div>
              </div>
              
              {/* CTA Section */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={() => onNavigate && onNavigate("user-dashboard")}
                  size="xl"
                  className="bg-gradient-elegant hover:shadow-glow transition-spring transform hover:scale-105 font-bold text-lg px-12 py-6 rounded-2xl"
                >
                  <User className="w-6 h-6 mr-3" />
                  Crear Cuenta Gratuita
                </Button>
                <div className="text-center sm:text-left">
                  <p className="text-sm text-success font-semibold">✓ Sin tarjeta de crédito</p>
                  <p className="text-sm text-muted-foreground">Acceso completo por 30 días</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section Header */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center bg-primary/10 text-primary px-6 py-3 rounded-full text-sm font-semibold mb-6">
            <FileText className="w-4 h-4 mr-2" />
            Documentos Disponibles
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            Soluciones para Cada Necesidad
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Desde contratos simples hasta casos complejos, nuestra IA genera documentos 
            personalizados con precisión legal profesional
          </p>
        </div>

        {/* Enhanced Services Grid */}
        {Object.entries(groupedServices).map(([category, categoryServices], index) => (
          <div key={category} className="mb-20 animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="flex items-center gap-4 mb-12">
              <div className={`h-1 w-12 bg-gradient-to-r ${getCategoryGradient(category)} rounded-full`}></div>
              <h3 className="text-3xl lg:text-4xl font-bold text-primary">{category}</h3>
              <div className={`h-1 flex-1 bg-gradient-to-r ${getCategoryGradient(category)} rounded-full opacity-30`}></div>
            </div>
            
            <div className="grid grid-auto-fit gap-8">
              {categoryServices.map((service, serviceIndex) => (
                <div 
                  key={service.id} 
                  className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-background to-brand-gray-light shadow-card hover-lift border border-border/50 animate-scale-in"
                  style={{animationDelay: `${(index * 0.1) + (serviceIndex * 0.05)}s`}}
                >
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-elegant opacity-0 group-hover:opacity-5 transition-smooth"></div>
                  
                  {/* Content */}
                  <div className="relative p-8">
                    {/* Icon */}
                    <div className={`w-20 h-20 bg-gradient-to-br ${getCategoryGradient(category)} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-spring shadow-card`}>
                      <div className="text-primary-foreground transform group-hover:rotate-12 transition-spring">
                        {iconMap[service.frontend_icon] || iconMap.FileText}
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h4 className="text-2xl font-bold text-primary mb-4 group-hover:text-primary-light transition-smooth">
                      {service.document_name}
                    </h4>
                    
                    {/* Description */}
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {service.document_description}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-2xl font-bold text-success">
                        {service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString()} COP`}
                      </div>
                      {service.price === 0 && (
                        <div className="bg-success/10 text-success px-3 py-1 rounded-full text-sm font-semibold">
                          Sin costo
                        </div>
                      )}
                    </div>
                    
                    {/* CTA Button */}
                    <Button 
                      variant="default"
                      size="lg"
                      className="w-full bg-gradient-elegant hover:shadow-glow transition-spring transform group-hover:scale-105 font-semibold rounded-xl"
                      onClick={() => handleDocumentAction(service)}
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      {service.button_cta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <div className="text-center py-20 animate-slide-up">
            <div className="bg-gradient-to-br from-card to-brand-gray-light rounded-3xl p-12 shadow-card max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-muted-foreground mb-4">Servicios en Preparación</h3>
              <p className="text-muted-foreground">Nuestros expertos legales están perfeccionando los servicios para ofrecerte la mejor experiencia.</p>
            </div>
          </div>
        )}

        {/* Enhanced CTA Section */}
        <div className="relative mt-20 animate-slide-up">
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-success/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative glass-card rounded-3xl p-12 lg:p-16 shadow-floating">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
                  ¿Tu Caso es Único?
                </h3>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Nuestros asesores legales especializados pueden ayudarte con cualquier situación, 
                  desde lo más simple hasta los casos más complejos.
                </p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-elegant rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary">Derecho de Familia</h4>
                      <p className="text-muted-foreground">Divorcios, custodia, pensiones alimentarias</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-success rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-success-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary">Trámites Notariales</h4>
                      <p className="text-muted-foreground">Autenticaciones, poderes, declaraciones</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-elegant rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary">Consultoría Especializada</h4>
                      <p className="text-muted-foreground">Análisis personalizado de tu situación</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="xl"
                  className="bg-gradient-success hover:shadow-glow transition-spring transform hover:scale-105 font-bold text-lg px-8 py-4 rounded-2xl"
                  onClick={() => onOpenChat("Necesito una consultoría legal personalizada. Soy una persona natural con una situación específica que requiere asesoría profesional.")}
                >
                  <MessageCircle className="w-6 h-6 mr-3" />
                  Consulta Gratuita Ahora
                </Button>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-card to-brand-gray-light rounded-3xl p-8 shadow-card">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-elegant rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Scale className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <h4 className="text-2xl font-bold text-primary mb-2">Asesoría Inmediata</h4>
                    <p className="text-muted-foreground">Respuesta en menos de 5 minutos</p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-muted-foreground">Tiempo de respuesta</span>
                      <span className="font-semibold text-success">{'< 5 min'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-muted-foreground">Consulta inicial</span>
                      <span className="font-semibold text-success">Gratuita</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-muted-foreground">Disponibilidad</span>
                      <span className="font-semibold text-success">24/7</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Abogados certificados</span>
                      <span className="font-semibold text-success">✓ Verificados</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}