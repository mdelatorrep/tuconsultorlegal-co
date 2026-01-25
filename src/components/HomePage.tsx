import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Check,
  Users,
  Layers,
  Shield,
  Globe,
  Scale,
  FileText,
  Briefcase,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";

interface HomePageProps {
  onOpenChat: (message?: string) => void;
  onNavigate: (page: string) => void;
}

export default function HomePage({ onOpenChat, onNavigate }: HomePageProps) {
  useSEO({
    title: "Praxis Hub - El entorno que eleva la práctica legal",
    description: "Praxis Hub potencia a los abogados con un entorno profesional integrado para ofrecer servicios legales de alta calidad, confiables y más accesibles.",
    keywords: "plataforma legal, entorno profesional abogados, práctica legal, herramientas abogados, gestión legal",
    canonical: "https://praxishub.co/",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Praxis Hub",
      "description": "El entorno que eleva la práctica legal. Infraestructura profesional para abogados.",
      "url": "https://praxishub.co"
    }
  });

  const pillars = [
    { 
      icon: TrendingUp, 
      title: "Práctica Elevada", 
      description: "Claridad, consistencia y estándares profesionales que fortalecen cada aspecto de tu trabajo legal."
    },
    { 
      icon: Layers, 
      title: "Entorno Integrado", 
      description: "Unificación de herramientas, flujos e información en un solo espacio diseñado para la práctica legal."
    },
    { 
      icon: Shield, 
      title: "Confianza Sistémica", 
      description: "Procesos claros y trazables que fortalecen la relación entre abogado y ciudadano."
    },
    { 
      icon: Globe, 
      title: "Acceso Ampliado", 
      description: "Una mejor práctica habilita servicios legales de calidad para más personas."
    }
  ];

  const forLawyers = [
    "Herramientas integradas para gestión de casos y clientes",
    "Flujos de trabajo optimizados que reducen fricción operativa",
    "Estándares profesionales que elevan la calidad del servicio",
    "Acceso a recursos que potencian tu práctica"
  ];

  const FadeInSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-foreground">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 leading-tight tracking-tight text-background"
            >
              El entorno que eleva
              <br />
              <span className="font-semibold">la práctica legal.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-lg md:text-xl text-background/70 max-w-2xl mx-auto mb-10 font-light leading-relaxed"
            >
              Praxis Hub potencia a los abogados con un entorno profesional integrado 
              para ofrecer servicios legales de alta calidad, confiables y más accesibles.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Button 
                size="lg" 
                className="bg-background text-foreground hover:bg-background/90 px-8 py-6 text-base font-medium rounded-md transition-all duration-300"
                onClick={() => onNavigate('lawyer-landing')}
              >
                Explorar Praxis Hub
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInSection>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                El contexto actual
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-foreground mb-8 leading-tight">
                La práctica legal ocurre en entornos fragmentados.
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground font-light leading-relaxed">
                <p>
                  Herramientas dispersas, información desconectada y alta fricción operativa 
                  dificultan mantener los estándares profesionales que tus clientes merecen.
                </p>
                <p>
                  El problema no es la falta de abogados competentes. Es la ausencia de 
                  entornos profesionales adecuados que sostengan la calidad y generen confianza.
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInSection>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Nuestra propuesta
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-foreground mb-8 leading-tight">
                Un entorno integrado que ordena la práctica legal.
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground font-light leading-relaxed">
                <p>
                  Praxis Hub es infraestructura profesional. Un entorno que estructura 
                  y eleva la práctica legal, reduce fricción operativa y permite 
                  sostener estándares profesionales elevados.
                </p>
                <p className="text-foreground font-normal">
                  No reemplazamos al abogado. Lo potenciamos.
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-16">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Pilares de valor
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-foreground leading-tight">
                Lo que hace posible Praxis Hub
              </h2>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pillars.map((pillar, index) => (
              <FadeInSection key={index} delay={index * 0.1}>
                <div className="p-8 border border-border rounded-lg bg-card hover:shadow-card transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-md bg-muted">
                      <pillar.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {pillar.title}
                      </h3>
                      <p className="text-muted-foreground font-light leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* For Lawyers Section */}
      <section className="py-24 md:py-32 bg-foreground">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <FadeInSection>
                <div>
                  <p className="text-sm font-medium text-background/60 uppercase tracking-wider mb-4">
                    Para abogados
                  </p>
                  <h2 className="text-3xl md:text-4xl font-light text-background mb-6 leading-tight">
                    Empoderamiento profesional, no promesas vacías.
                  </h2>
                  <p className="text-background/70 font-light leading-relaxed mb-8">
                    Praxis Hub está diseñado para abogados independientes y estudios 
                    pequeños y medianos que buscan claridad operativa, calidad del trabajo 
                    y crecimiento sostenible.
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-background text-foreground hover:bg-background/90 px-6 py-5 text-base font-medium rounded-md"
                    onClick={() => onNavigate('lawyer-landing')}
                  >
                    Conocer más
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </FadeInSection>

              <FadeInSection delay={0.1}>
                <div className="space-y-4">
                  {forLawyers.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-background/10 mt-0.5">
                        <Check className="w-4 h-4 text-background" />
                      </div>
                      <span className="text-background/80 font-light">{item}</span>
                    </div>
                  ))}
                </div>
              </FadeInSection>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <FadeInSection>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Impacto
              </p>
              <h2 className="text-3xl md:text-4xl font-light text-foreground mb-8 leading-tight">
                Mejor práctica, mejor servicio, mayor acceso.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-12">
                El impacto social surge como consecuencia de una mejor práctica profesional. 
                Cuando los abogados trabajan en entornos adecuados, los ciudadanos reciben 
                servicios legales más claros, confiables y accesibles.
              </p>
            </FadeInSection>

            <FadeInSection delay={0.15}>
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-lg bg-muted mb-4">
                    <Scale className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-light">Más confianza</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-lg bg-muted mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-light">Mejor experiencia</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex p-4 rounded-lg bg-muted mb-4">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-light">Mayor acceso</p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <FadeInSection>
              <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6 leading-tight">
                Eleva tu práctica legal.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-10">
                Únete a Praxis Hub y accede a un entorno profesional diseñado 
                para sostener los estándares que tu trabajo merece.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-medium rounded-md"
                  onClick={() => onNavigate('lawyer-landing')}
                >
                  Sumarse a Praxis Hub
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted px-8 py-6 text-base font-medium rounded-md"
                  onClick={() => onNavigate('contacto')}
                >
                  Contactar
                </Button>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>
    </div>
  );
}
