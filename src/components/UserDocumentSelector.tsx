import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Check, FileText, Home, Briefcase, Car, Eye, Shield, Users, DollarSign, User } from "lucide-react";

interface UserDocumentSelectorProps {
  onAgentSelected: (agentId: string) => void;
  onOpenChat: (message: string) => void;
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

export default function UserDocumentSelector({ onAgentSelected, onOpenChat }: UserDocumentSelectorProps) {
  const [services, setServices] = useState<AgentService[]>([]);
  const [loading, setLoading] = useState(true);

  const iconMap: { [key: string]: JSX.Element } = {
    FileText: <FileText className="w-8 h-8" />,
    Home: <Home className="w-8 h-8" />,
    Briefcase: <Briefcase className="w-8 h-8" />,
    Car: <Car className="w-8 h-8" />,
    Eye: <Eye className="w-8 h-8" />,
    Shield: <Shield className="w-8 h-8" />,
    Users: <Users className="w-8 h-8" />,
    DollarSign: <DollarSign className="w-8 h-8" />
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

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as { [key: string]: AgentService[] });

  const getCategoryColor = (category: string) => {
    const colors = [
      'border-primary', 'border-success', 'border-rose-500', 'border-purple-500', 
      'border-blue-500', 'border-green-500', 'border-orange-500', 'border-pink-500'
    ];
    const hash = category.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getServiceColor = (category: string) => {
    const colors = [
      'text-primary', 'text-success', 'text-rose-600', 'text-purple-600',
      'text-blue-600', 'text-green-600', 'text-orange-600', 'text-pink-600'
    ];
    const hash = category.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando servicios disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Header integrado al dashboard */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <User className="w-4 h-4 mr-2" />
          Servicios Legales Disponibles
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Selecciona el Documento que Necesitas
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Encuentra el servicio legal que mejor se adapte a tus necesidades personales.
        </p>
      </div>

      {/* Services by Category */}
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="mb-12">
          <h3 className={`text-2xl font-bold mb-6 border-l-4 ${getCategoryColor(category)} pl-4`}>
            {category}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryServices.map(service => (
              <Card key={service.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className={`${getServiceColor(category)} mb-4`}>
                    {iconMap[service.frontend_icon] || iconMap.FileText}
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-foreground">{service.document_name}</h4>
                  <p className="text-muted-foreground mb-4 text-sm">{service.document_description}</p>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-success">
                      {service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString()} COP`}
                    </p>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => onAgentSelected(service.id)}
                    >
                      {service.button_cta}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground mb-4">No hay servicios disponibles</p>
          <p className="text-muted-foreground">Los servicios están siendo revisados por nuestro equipo legal.</p>
        </div>
      )}

      {/* Consultation CTA */}
      <Card className="bg-muted/50 border-primary/20">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">¿Tu caso es diferente?</h3>
              <p className="text-muted-foreground mb-6">
                Si no encuentras el documento que necesitas o tu situación es más compleja, 
                nuestro asistente de IA puede darte una primera orientación confiable.
              </p>
              <Button 
                variant="success" 
                size="lg" 
                onClick={() => onOpenChat("Quiero una consultoría personal. Soy una persona natural que necesita asesoría legal individual.")}
              >
                Iniciar Asesoría Gratuita
              </Button>
            </div>
            <div className="text-muted-foreground space-y-3">
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-3 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Derecho de Familia:</strong> Divorcios, cuotas alimentarias</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-3 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Trámites Notariales:</strong> Autenticaciones, declaraciones</span>
              </p>
              <p className="flex items-start">
                <Check className="w-5 h-5 mr-3 text-success flex-shrink-0 mt-0.5" />
                <span><strong>Y mucho más...</strong></span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}