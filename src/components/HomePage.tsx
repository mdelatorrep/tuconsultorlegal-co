import { Button } from "./ui/button";
import { Check, Clock, Users, Shield, Zap, DollarSign, MessageCircle } from "lucide-react";
import ServiceStatusAlert from "./ServiceStatusAlert";
import useSEO from "@/hooks/useSEO";

interface HomePageProps {
  onOpenChat: (message?: string) => void;
}

export default function HomePage({ onOpenChat }: HomePageProps) {
  // SEO optimization for home page
  useSEO({
    title: "Tu Consultor Legal - Asesoría Legal con IA en Colombia | Documentos Jurídicos Inteligentes",
    description: "Asesoría legal profesional con Inteligencia Artificial en Colombia. Genera contratos, demandas y documentos jurídicos de forma rápida, segura y económica. Consultas especializadas para personas y empresas.",
    keywords: "asesoría legal Colombia, abogado virtual, documentos jurídicos IA, contratos inteligentes, consulta legal online, derechos laborales, derecho empresarial, servicios legales digitales, tuconsultorlegal",
    canonical: "https://tuconsultorlegal.co/",
    ogImage: "https://tuconsultorlegal.co/og-image.png",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Tu Consultor Legal - Inicio",
      "description": "Plataforma de asesoría legal con IA para Colombia",
      "url": "https://tuconsultorlegal.co/",
      "mainEntity": {
        "@type": "LegalService",
        "name": "Tu Consultor Legal",
        "description": "Asesoría legal con Inteligencia Artificial",
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
      icon: <Zap className="w-8 h-8" />,
      title: "Rápido y Eficiente",
      description: "Olvídate de esperar días. Nuestra IA genera borradores de alta calidad en minutos, listos para ser revisados.",
      color: "bg-blue-100 text-legal-blue"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Asequible y Transparente", 
      description: "Accede a servicios legales de primer nivel a una fracción del costo. Conoce el precio desde el inicio, sin sorpresas.",
      color: "bg-green-100 text-success"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Confiable y Seguro",
      description: "Combinamos la agilidad de la IA con la rigurosidad y experiencia de abogados humanos que validan cada documento.",
      color: "bg-rose-100 text-rose-600"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Siempre Disponible",
      description: "Tu asistente legal no duerme. Realiza tus consultas y solicita tus documentos a cualquier hora, desde cualquier lugar.",
      color: "bg-yellow-100 text-yellow-600"
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
    { icon: <Check />, text: "Validado por Abogados" },
    { icon: <Clock />, text: "Disponible 24/7" },
    { icon: <Users />, text: "+5,000 Colombianos Asistidos" }
  ];

  return (
    <>
      <ServiceStatusAlert />
      <div>
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground">
        <div className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Asesoría y Documentos Legales en Colombia, Simplificados con IA.
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto text-primary-foreground/90 mb-10">
            Resuelve tus dudas jurídicas y crea contratos de arrendamiento, laborales y más en minutos. 
            Fácil, rápido y con la validación de abogados expertos.
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
            ¿Por qué elegir Tu Consultor Legal?
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
            ¿Listo para resolver tus necesidades legales?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
            No dejes que la complejidad legal te detenga. Empieza hoy con una asesoría gratuita.
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