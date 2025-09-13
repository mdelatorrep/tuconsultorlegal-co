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

  const mainFeatures = [
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Para Personas",
      subtitle: "Contratos, consultas y asesoría personalizada",
      description: "Accede a servicios legales de calidad sin barreras económicas. Resuelve tus dudas jurídicas y obtén documentos respaldados por abogados expertos.",
      action: "Explorar Servicios",
      gradient: "from-primary to-primary-light",
      onClick: () => onNavigate("personas")
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Para Empresas", 
      subtitle: "Soluciones jurídicas empresariales integrales",
      description: "Optimiza la gestión legal de tu empresa con documentos corporativos, contratos comerciales y asesoría especializada en derecho empresarial.",
      action: "Ver Soluciones",
      gradient: "from-success to-success-dark",
      onClick: () => onNavigate("empresas")
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Para Abogados",
      subtitle: "Herramientas de productividad legal",
      description: "Potencia tu práctica legal con IA avanzada. Automatiza tareas repetitivas, mejora la precisión y enfócate en casos de mayor valor.",
      action: "Acceder Dashboard",
      gradient: "from-accent to-primary",
      onClick: () => onNavigate("abogados")
    }
  ];

  const trustBadges = [
    { icon: <Shield className="w-5 h-5" />, text: "Respaldo Legal Certificado" },
    { icon: <Clock className="w-5 h-5" />, text: "Disponible 24/7" },
    { icon: <Users className="w-5 h-5" />, text: "+10,000 Usuarios Confiaron" }
  ];

  return (
    <>
      <ServiceStatusAlert />
      <div className="min-h-screen">
        {/* Hero Section - Apple Style */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 hero-gradient"></div>
          
          {/* Content */}
          <div className="relative z-10 container mx-auto px-6 text-center">
            <div className="max-w-6xl mx-auto">
              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-primary-foreground mb-8 leading-[0.9]">
                Democratizar
                <br />
                <span className="font-bold bg-gradient-to-r from-success to-success-dark bg-clip-text text-transparent">
                  el Acceso Legal
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-4xl mx-auto mb-12 font-light leading-relaxed">
                Servicios legales de alta calidad para todos los colombianos.
                <br />
                Tecnología inteligente. Respaldo profesional. Precios justos.
              </p>

              {/* Trust Badges */}
              <div className="flex justify-center items-center space-x-8 text-sm text-primary-foreground/70 mb-16 flex-wrap gap-4">
                {trustBadges.map((badge, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="text-success">{badge.icon}</div>
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <Button
                size="lg"
                className="bg-success hover:bg-success-dark text-success-foreground px-12 py-6 text-lg font-medium shadow-glow mb-16 transition-smooth"
                onClick={() => onOpenChat("Quiero una consultoría legal")}
              >
                Comenzar Ahora
              </Button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-primary-foreground/60 animate-bounce">
            <div className="w-6 h-10 border-2 border-primary-foreground/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-primary-foreground/60 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* Main Features Section - Apple Style Cards */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">
                  Diseñado para
                  <span className="font-bold"> cada necesidad</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Tres experiencias únicas optimizadas para personas, empresas y profesionales del derecho
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {mainFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="group relative bg-card border border-border rounded-3xl p-8 md:p-12 hover:shadow-trust transition-smooth cursor-pointer"
                    onClick={feature.onClick}
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-smooth`}></div>
                    
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-8`}>
                        {feature.icon}
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-lg text-primary/80 mb-6 font-medium">
                        {feature.subtitle}
                      </p>
                      <p className="text-muted-foreground mb-8 leading-relaxed">
                        {feature.description}
                      </p>
                      
                      {/* CTA */}
                      <div className="flex items-center text-primary font-medium group-hover:text-primary-light transition-smooth">
                        <span className="mr-2">{feature.action}</span>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                          <span className="text-sm">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Popular Documents Section */}
        <section className="py-32 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">
                  Documentos
                  <span className="font-bold"> más solicitados</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Accede rápidamente a los documentos legales que más necesitan los colombianos
                </p>
              </div>

              {loadingDocs ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-card p-8 rounded-2xl shadow-soft animate-pulse">
                      <div className="bg-muted rounded-full w-12 h-12 mb-6"></div>
                      <div className="bg-muted h-6 rounded mb-4"></div>
                      <div className="bg-muted h-4 rounded mb-6"></div>
                      <div className="bg-muted h-12 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {popularDocuments.map((doc, index) => (
                    <div 
                      key={doc.id} 
                      className="group bg-card p-8 rounded-2xl shadow-soft hover:shadow-trust transition-smooth border border-border hover:border-primary/20 cursor-pointer"
                      onClick={() => onOpenChat(`Quiero crear un ${doc.name.toLowerCase()}`)}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-primary/10 text-primary rounded-2xl p-4 w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                          <FileText className="w-8 h-8" />
                        </div>
                        {doc.request_count > 0 && (
                          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 mr-1 text-success" />
                            <span>{doc.request_count}</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-smooth">
                        {doc.name}
                      </h3>
                      
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {doc.description}
                      </p>
                      
                      <div className="mb-6">
                        <span className="inline-block bg-success/10 text-success text-sm px-3 py-1 rounded-full font-medium">
                          {doc.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-primary font-medium group-hover:text-primary-light transition-smooth">
                        <span className="mr-2">{doc.button_cta || 'Crear Documento'}</span>
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                          <span className="text-sm">→</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-32 bg-card">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto text-center">
              <div className="mb-20">
                <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">
                  Testimonios de
                  <span className="font-bold"> confianza</span>
                </h2>
                <p className="text-xl text-muted-foreground">
                  Miles de colombianos ya confían en nosotros
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    text: "El proceso para crear el contrato de arrendamiento fue increíblemente fácil y rápido. ¡Y saber que un abogado lo revisó me dio total tranquilidad!",
                    author: "Juliana G.",
                    location: "Medellín",
                    rating: 5
                  },
                  {
                    text: "Como freelancer, necesitaba un contrato de prestación de servicios. En minutos lo tuve listo y a un precio justo. 100% recomendado.",
                    author: "Carlos V.",
                    location: "Bogotá", 
                    rating: 5
                  },
                  {
                    text: "Resolví una duda sobre mi liquidación laboral en minutos. La respuesta fue clara y me citaron los artículos correctos del código. ¡Excelente servicio!",
                    author: "Sofía R.",
                    location: "Cali",
                    rating: 5
                  }
                ].map((testimonial, index) => (
                  <div key={index} className="bg-background p-8 rounded-2xl shadow-soft border border-border">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-success text-success" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold mr-4">
                        {testimonial.author.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 hero-gradient text-primary-foreground">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-light mb-8 leading-tight">
                Comienza tu
                <br />
                <span className="font-bold bg-gradient-to-r from-success to-success-dark bg-clip-text text-transparent">
                  transformación legal
                </span>
              </h2>
              <p className="text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                Únete a miles de colombianos que ya disfrutan de servicios legales accesibles, confiables y profesionales.
              </p>
              <Button
                size="lg"
                className="bg-success hover:bg-success-dark text-success-foreground px-12 py-6 text-lg font-medium shadow-glow transition-smooth"
                onClick={() => onOpenChat("Quiero una consultoría legal")}
              >
                Comenzar Ahora
              </Button>
            </div>
          </div>
        </section>
    </div>
    </>
  );
}