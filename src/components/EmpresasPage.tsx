import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Building, Users, DollarSign, Scale, Handshake, Shield } from "lucide-react";
import DocumentChatFlow from "./DocumentChatFlow";
import DocumentCreationSuccess from "./DocumentCreationSuccess";

interface EmpresasPageProps {
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

export default function EmpresasPage({ onOpenChat, onNavigate }: EmpresasPageProps) {
  const [services, setServices] = useState<AgentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'success'>('list');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [documentToken, setDocumentToken] = useState<string>('');

  const iconMap: { [key: string]: JSX.Element } = {
    FileText: <FileText className="w-10 h-10" />,
    Building: <Building className="w-10 h-10" />,
    Users: <Users className="w-10 h-10" />,
    DollarSign: <DollarSign className="w-10 h-10" />,
    Scale: <Scale className="w-10 h-10" />,
    Handshake: <Handshake className="w-10 h-10" />,
    Shield: <Shield className="w-10 h-10" />
  };

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data: agents, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('status', 'active')
        .in('target_audience', ['empresas', 'ambos'])
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
      onNavigate('seguimiento');
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as { [key: string]: AgentService[] });

  const getCategoryColor = (category: string) => {
    // Generate consistent colors based on category name hash
    const colors = [
      'border-primary', 'border-blue-500', 'border-green-500', 'border-purple-500',
      'border-orange-500', 'border-pink-500', 'border-indigo-500', 'border-cyan-500',
      'border-red-500', 'border-yellow-500'
    ];
    const hash = category.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getServiceColor = (category: string) => {
    // Generate consistent colors based on category name hash
    const colors = [
      'text-primary', 'text-blue-600', 'text-green-600', 'text-purple-600',
      'text-orange-600', 'text-pink-600', 'text-indigo-600', 'text-cyan-600',
      'text-red-600', 'text-yellow-600'
    ];
    const hash = category.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Show chat flow if agent is selected
  if (currentView === 'form' && selectedAgent) {
    return (
      <DocumentChatFlow
        agentId={selectedAgent}
        onBack={handleFormBack}
        onComplete={handleFormComplete}
      />
    );
  }

  // Show success screen if document was created
  if (currentView === 'success' && documentToken) {
    return (
      <DocumentCreationSuccess
        token={documentToken}
        onBack={handleSuccessBack}
        onNavigateToTracking={handleNavigateToTracking}
      />
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando servicios empresariales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
          Soluciones Legales Empresariales
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Protege y haz crecer tu empresa con documentos legales profesionales. 
          Desde contratos comerciales hasta compliance corporativo.
        </p>
      </div>

      {/* Services by Category */}
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="mb-16">
          <h2 className={`text-3xl font-bold mb-8 border-l-4 ${getCategoryColor(category)} pl-4`}>
            {category}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categoryServices.map((service) => (
              <div key={service.id} className="bg-card rounded-lg shadow-card overflow-hidden transform hover:-translate-y-2 transition-smooth flex flex-col">
                <div className="p-8 flex-grow">
                  <div className={`${getServiceColor(category)} mb-4`}>
                    {iconMap[service.frontend_icon] || iconMap.Building}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-foreground">{service.document_name}</h3>
                  <p className="text-muted-foreground mb-3">{service.document_description}</p>
                  <p className="text-sm text-muted-foreground/80 mb-4 italic">{service.description}</p>
                </div>
                <div className="p-8 pt-0">
                  <p className="text-xl font-bold text-success mb-6">
                    {service.price === 0 ? 'Gratis' : `Desde $${service.price.toLocaleString()} COP`}
                  </p>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => handleDocumentAction(service)}
                  >
                    {service.button_cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-16">
          <p className="text-2xl text-muted-foreground mb-4">No hay servicios disponibles para empresas</p>
          <p className="text-muted-foreground">Los agentes empresariales están siendo revisados por nuestro equipo legal.</p>
        </div>
      )}

      {/* Corporate Benefits */}
      <div className="bg-muted rounded-lg p-10 mt-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-foreground">¿Necesitas asesoría legal especializada?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Nuestros expertos en derecho empresarial pueden ayudarte con casos complejos, 
              restructuraciones, fusiones y cualquier tema legal corporativo.
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => onOpenChat("Quiero una consultoría empresarial. Represento una empresa que necesita asesoría legal corporativa.")}
            >
              Consulta Empresarial
            </Button>
          </div>
          <div className="text-muted-foreground space-y-3">
            <p className="flex items-start">
              <Check className="w-6 h-6 mr-3 text-success flex-shrink-0 mt-1" />
              <span><strong>Due Diligence:</strong> Análisis legal completo</span>
            </p>
            <p className="flex items-start">
              <Check className="w-6 h-6 mr-3 text-success flex-shrink-0 mt-1" />
              <span><strong>Compliance:</strong> Cumplimiento normativo</span>
            </p>
            <p className="flex items-start">
              <Check className="w-6 h-6 mr-3 text-success flex-shrink-0 mt-1" />
              <span><strong>Estructuración:</strong> Optimización legal y fiscal</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}