import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import useSEO from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, FileText, Users, Building, Star, Zap } from "lucide-react";

interface PricingPageProps {
  onOpenChat: (message: string) => void;
  onNavigate?: (page: string) => void;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  documents: number;
  consultations: number;
  features: string[];
  popular?: boolean;
  recommended?: boolean;
  badge?: string;
  icon: React.ReactNode;
}

const personalPlans: PricingPlan[] = [
  {
    id: "personal-basic",
    name: "Básico Personal",
    price: 0,
    description: "Perfecto para necesidades ocasionales",
    documents: 1,
    consultations: 1,
    features: [
      "1 documento legal por mes",
      "1 consulta básica incluida",
      "Soporte por chat",
      "Revisión inicial incluida",
      "Plantillas básicas"
    ],
    icon: <FileText className="h-6 w-6" />
  },
  {
    id: "personal-standard",
    name: "Estándar Personal",
    price: 49900,
    description: "Para personas con necesidades regulares",
    documents: 5,
    consultations: 3,
    features: [
      "5 documentos legales por mes",
      "3 consultas especializadas",
      "Soporte prioritario",
      "Revisión completa incluida",
      "Todas las plantillas disponibles",
      "Seguimiento de casos"
    ],
    popular: true,
    badge: "Más Popular",
    icon: <Users className="h-6 w-6" />
  },
  {
    id: "personal-premium",
    name: "Premium Personal",
    price: 99900,
    originalPrice: 129900,
    description: "Para profesionales independientes",
    documents: 15,
    consultations: 8,
    features: [
      "15 documentos legales por mes",
      "8 consultas especializadas",
      "Soporte 24/7",
      "Revisión y edición ilimitada",
      "Asesoría personalizada",
      "Plantillas premium",
      "Descarga en múltiples formatos",
      "Notificaciones automáticas"
    ],
    recommended: true,
    badge: "Recomendado",
    icon: <Star className="h-6 w-6" />
  }
];

const businessPlans: PricingPlan[] = [
  {
    id: "business-starter",
    name: "Starter Empresarial",
    price: 199900,
    description: "Ideal para pequeñas empresas",
    documents: 20,
    consultations: 10,
    features: [
      "20 documentos legales por mes",
      "10 consultas especializadas",
      "Soporte empresarial",
      "Múltiples usuarios (hasta 3)",
      "Dashboard empresarial",
      "Reportes básicos",
      "Integración básica"
    ],
    icon: <Building className="h-6 w-6" />
  },
  {
    id: "business-professional",
    name: "Professional Empresarial",
    price: 399900,
    description: "Para empresas en crecimiento",
    documents: 50,
    consultations: 25,
    features: [
      "50 documentos legales por mes",
      "25 consultas especializadas",
      "Soporte dedicado",
      "Usuarios ilimitados",
      "API empresarial",
      "Reportes avanzados",
      "Integraciones premium",
      "Capacitación del equipo",
      "SLA garantizado"
    ],
    popular: true,
    badge: "Más Popular",
    icon: <Zap className="h-6 w-6" />
  },
  {
    id: "business-enterprise",
    name: "Enterprise",
    price: 0,
    description: "Para grandes corporaciones",
    documents: 0,
    consultations: 0,
    features: [
      "Documentos ilimitados",
      "Consultas ilimitadas",
      "Soporte 24/7 dedicado",
      "Integración personalizada",
      "On-premise disponible",
      "Cumplimiento normativo",
      "Auditorías incluidas",
      "Gestor de cuenta dedicado",
      "Precios personalizados"
    ],
    recommended: true,
    badge: "Contactar",
    icon: <Building className="h-6 w-6" />
  }
];

export default function PricingPage({ onOpenChat, onNavigate }: PricingPageProps) {
  // SEO optimization for pricing page
  useSEO({
    title: "Planes y Precios - IA Legal para Abogados y Documentos | Tu Consultor Legal",
    description: "Planes flexibles de IA legal. Suite completa para abogados y generación de documentos para personas y empresas. Desde $0 COP. Prueba gratis disponible.",
    keywords: "precios software abogados, planes IA legal, tarifas documentos legales, costos herramientas abogados, precios CRM legal, planes empresariales legales",
    canonical: "https://tuconsultorlegal.co/#precios",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Planes y Precios - Tu Consultor Legal",
      "description": "Planes de IA legal para abogados y documentos legales",
      "url": "https://tuconsultorlegal.co/#precios",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "highPrice": "400000",
        "priceCurrency": "COP",
        "offerCount": "6"
      }
    }
  });

  const [activeTab, setActiveTab] = useState("personal");

  const handlePlanClick = async (plan: PricingPlan) => {
    // Track the click in analytics
    try {
      await supabase.functions.invoke('track-pricing-click', {
        body: {
          planId: plan.id,
          planName: plan.name,
          planType: activeTab
        }
      });
    } catch (error) {
      console.error('Error tracking pricing click:', error);
    }
  };

  const renderPlanCard = (plan: PricingPlan) => (
    <Card key={plan.id} className={`relative h-full flex flex-col ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge variant={plan.popular ? "default" : plan.recommended ? "secondary" : "outline"}>
            {plan.badge}
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className={`p-3 rounded-full ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {plan.icon}
          </div>
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
        
        <div className="mt-4">
          {plan.id === "business-enterprise" ? (
            <div className="text-2xl font-bold">Contactar</div>
          ) : plan.price === 0 ? (
            <div className="text-2xl font-bold text-success">Gratis</div>
          ) : (
            <div>
              {plan.originalPrice && (
                <div className="text-sm text-muted-foreground line-through">
                  ${plan.originalPrice.toLocaleString()} COP
                </div>
              )}
              <div className="text-2xl font-bold">
                ${plan.price.toLocaleString()} COP
                <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Documentos</span>
            <span className="font-semibold">
              {plan.documents === 0 ? "Ilimitados" : `${plan.documents}/mes`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Consultas</span>
            <span className="font-semibold">
              {plan.consultations === 0 ? "Ilimitadas" : `${plan.consultations}/mes`}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full mt-auto"
          variant="outline"
          onClick={() => handlePlanClick(plan)}
          disabled
        >
          Próximamente
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Planes y Precios
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Elige el plan perfecto para tus necesidades legales. Desde personas hasta grandes empresas, 
            tenemos la solución ideal para cada volumen de documentos y asesorías.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personas
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Empresas
            </TabsTrigger>
          </TabsList>

          {/* Personal Plans */}
          <TabsContent value="personal">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {personalPlans.map(renderPlanCard)}
            </div>
          </TabsContent>

          {/* Business Plans */}
          <TabsContent value="business">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {businessPlans.map(renderPlanCard)}
            </div>
          </TabsContent>
        </Tabs>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">¿Puedo cambiar de plan en cualquier momento?</h3>
                <p className="text-muted-foreground">Sí, puedes actualizar o degradar tu plan en cualquier momento. Los cambios se aplicarán en tu próximo ciclo de facturación.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Qué sucede si excedo mi límite de documentos?</h3>
                <p className="text-muted-foreground">Te notificaremos cuando estés cerca del límite. Puedes actualizar tu plan o pagar por documentos adicionales.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Incluyen revisión legal todos los planes?</h3>
                <p className="text-muted-foreground">Sí, todos los planes incluyen revisión legal. Los planes superiores incluyen revisiones más detalladas y soporte prioritario.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">¿Hay descuentos por pagos anuales?</h3>
                <p className="text-muted-foreground">Sí, ofrecemos 20% de descuento en todos los planes al pagar anualmente. Contacta ventas para más información.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Qué formas de pago aceptan?</h3>
                <p className="text-muted-foreground">Aceptamos tarjetas de crédito, débito, PSE y transferencias bancarias. Para empresas también manejamos órdenes de compra.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Ofrecen soporte técnico?</h3>
                <p className="text-muted-foreground">Todos los planes incluyen soporte. Los planes empresariales tienen soporte dedicado y SLA garantizado.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-muted/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">¿No estás seguro qué plan elegir?</h2>
            <p className="text-muted-foreground mb-6">
              Nuestro equipo puede ayudarte a encontrar el plan perfecto para tus necesidades específicas.
            </p>
            <Button 
              size="lg" 
              onClick={() => onNavigate("user-dashboard")}
            >
              Hablar con un Asesor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}