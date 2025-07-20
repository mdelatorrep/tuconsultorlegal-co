import { Button } from "./ui/button";
import { Check, Clock, Users, Shield, Zap, DollarSign, MessageCircle, FileText, Star } from "lucide-react";
import ServiceStatusAlert from "./ServiceStatusAlert";
import useSEO from "@/hooks/useSEO";
import { usePopularDocuments } from "@/hooks/usePopularDocuments";

interface HomePageProps {
  onOpenChat: (message?: string) => void;
  onNavigate: (page: string) => void;
}

export default function HomePage({ onOpenChat, onNavigate }: HomePageProps) {
  const { documents: popularDocuments, loading: loadingDocs } = usePopularDocuments();
  // SEO optimization for home page
  useSEO({
    title: "Tu Consultor Legal - Democratizando el Acceso a Servicios Legales de Alta Calidad en Colombia",
    description: "Democratizamos el acceso a servicios legales de alta calidad en Colombia con tecnología. Asesoría legal confiable, documentos jurídicos precisos y soporte profesional para todos.",
    keywords: "asesoría legal Colombia, democratizar servicios legales, abogado virtual, documentos jurídicos IA, contratos inteligentes, consulta legal accesible, derechos laborales, derecho empresarial, servicios legales digitales, tuconsultorlegal",
    canonical: "https://tuconsultorlegal.co/",
    ogImage: "https://tuconsultorlegal.co/og-image.png",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Tu Consultor Legal - Democratizando el Acceso a Servicios Legales",
      "description": "Democratizando el acceso a servicios legales de alta calidad en Colombia con tecnología",
      "url": "https://tuconsultorlegal.co/",
      "mainEntity": {
        "@type": "LegalService",
        "name": "Tu Consultor Legal",
        "description": "Democratizando el acceso a servicios legales de alta calidad en Colombia con tecnología",
        "provider": {
          "@type": "Organization",
          "name": "Tu Consultor Legal",
          "url": "https://tuconsultorlegal.co"
        }
      }
    }
  });

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Respaldo Legal Profesional",
      description: "Cada documento es revisado por abogados certificados para garantizar tu protección legal y tranquilidad total.",
      color: "bg-primary/10 text-primary"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Acceso Democrático",
      description: "Servicios legales de alta calidad a precios justos. Sin letra pequeña, sin costos ocultos.",
      color: "bg-success/10 text-success"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Tecnología Inteligente",
      description: "IA avanzada que aprende del derecho colombiano para crear documentos precisos en minutos, no días.",
      color: "bg-accent/10 text-accent"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Acompañamiento Continuo",
      description: "Siempre a tu lado con asesoría personalizada y soporte cuando más lo necesitas.",
      color: "bg-warning/10 text-warning"
    }
  ];

  const testimonials = [
    {
      text: "El proceso para crear el contrato de arrendamiento fue increíblemente fácil y rápido. ¡Y saber que un abogado lo revisó me dio total tranquilidad!",
      author: "Juliana G., Medellín"
    },
    {
      text: "Como freelancer, necesitaba un contrato de prestación de servicios. En minutos lo tuve listo y a un precio justo. 100% recomendado.",
      author: "Carlos V., Bogotá"
    },
    {
      text: "Resolví una duda sobre mi liquidación laboral en minutos. La respuesta fue clara y me citaron los artículos correctos del código. ¡Excelente servicio!",
      author: "Sofía R., Cali"
    }
  ];

  const stats = [
    { icon: <Check />, text: "Respaldo Legal Certificado" },
    { icon: <Clock />, text: "Siempre Disponible" },
    { icon: <Users />, text: "+5,000 Colombianos Beneficiados" }
  ];

  return (
    <>
      <ServiceStatusAlert />
      <div>
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Servicios Legales de Alta Calidad para Todos los Colombianos
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto text-primary-foreground/90 mb-6">
            Democratizamos el acceso a asesoría legal profesional con tecnología inteligente. 
            Resuelve tus dudas jurídicas y obtén documentos legales seguros, validados por abogados expertos.
          </p>
          <p className="text-base max-w-2xl mx-auto text-primary-foreground/80 mb-10">
            ✓ Confiable y seguro ✓ Precios justos ✓ Respaldo profesional ✓ Disponible 24/7
          </p>
          
          <Button
            variant="success"
            size="xl"
            className="mb-8 shadow-hero"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            Empezar Ahora →
          </Button>

          <div className="flex justify-center items-center space-x-6 text-sm text-primary-foreground/80 flex-wrap gap-4">
            {stats.map((stat, index) => (
              <span key={index} className="flex items-center">
                <span className="text-success mr-2">{stat.icon}</span>
                {stat.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Nuestra Misión: Democratizar el Acceso a Servicios Legales de Calidad
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 border border-border rounded-lg hover:shadow-card transition-smooth bg-card">
                <div className={`${feature.color} rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Documents Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Documentos Más Solicitados
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Accede rápidamente a los documentos legales que más necesitan los colombianos. 
              Proceso simple, seguro y con respaldo profesional.
            </p>
          </div>

          {loadingDocs ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-card p-6 rounded-lg shadow-soft animate-pulse">
                  <div className="bg-muted rounded-full w-12 h-12 mb-4"></div>
                  <div className="bg-muted h-6 rounded mb-2"></div>
                  <div className="bg-muted h-4 rounded mb-4"></div>
                  <div className="bg-muted h-10 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularDocuments.map((doc, index) => (
                <div key={doc.id} className="bg-card p-6 rounded-lg shadow-soft hover:shadow-card transition-smooth border border-border group hover:border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-primary/10 text-primary rounded-full p-3 w-12 h-12 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    {doc.request_count > 0 && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="w-4 h-4 mr-1 text-warning" />
                        <span>{doc.request_count} solicitudes</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-smooth">
                    {doc.name}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 text-sm">
                    {doc.description}
                  </p>
                  
                  <div className="mb-4">
                    <span className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                      {doc.category}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => onOpenChat(`Quiero crear un ${doc.name.toLowerCase()}`)}
                  >
                    {doc.button_cta || 'Crear Documento'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Button
              variant="default"
              size="lg"
              onClick={() => onNavigate("personas")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth shadow-lg w-full sm:w-auto"
            >
              📄 Documentos para Personas
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate("empresas")}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-smooth w-full sm:w-auto"
            >
              🏢 Documentos para Empresas
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card p-8 rounded-lg shadow-soft">
                <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                <p className="font-bold text-foreground">- {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Da el Primer Paso Hacia tu Seguridad Legal
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
            Únete a miles de colombianos que ya confían en nosotros. Tu tranquilidad legal está a un clic de distancia.
          </p>
          <Button
            variant="success"
            size="xl"
            className="shadow-hero"
            onClick={() => onOpenChat("Quiero una consultoría legal")}
          >
            Iniciar Asesoría Ahora
          </Button>
        </div>
      </section>
    </div>
    </>
  );
}