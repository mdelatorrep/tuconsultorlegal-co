import { FileText, Star, Users, Building2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePopularDocuments } from "@/hooks/usePopularDocuments";
import { useSEO } from "@/hooks/useSEO";
import ServiceStatusAlert from "./ServiceStatusAlert";
import { motion } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

interface HomePageProps {
  onOpenChat: (message?: string) => void;
  onNavigate: (page: string) => void;
}

export default function HomePage({ onOpenChat, onNavigate }: HomePageProps) {
  const { documents: popularDocuments, loading: loadingDocs } = usePopularDocuments();
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

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
      icon: <Users className="w-8 h-8 text-slate-700" />,
      title: "Personas",
      subtitle: "Accede a contratos y asesoría legal sin complicaciones.",
      action: "Explorar servicios",
      onClick: () => onNavigate('personas')
    },
    {
      icon: <Building2 className="w-8 h-8 text-slate-700" />,
      title: "Empresas",
      subtitle: "Gestiona contratos comerciales y compliance corporativo.",
      action: "Soluciones empresariales",
      onClick: () => onNavigate('empresas')
    },
    {
      icon: <Scale className="w-8 h-8 text-slate-700" />,
      title: "Abogados",
      subtitle: "Potencia tu práctica con IA y gestión automatizada.",
      action: "Portal Abogados",
      onClick: () => onNavigate('lawyer-landing')
    }
  ];

  const FadeInSection = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white">
      <ServiceStatusAlert />
      
      {/* Hero Section - Estilo Apple */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background con profundidad */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {/* Grid pattern sutil */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
          
          {/* Glow effect central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#e7b008]/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-6xl md:text-8xl lg:text-[120px] font-[100] text-white mb-6 leading-[0.95] tracking-tight"
            >
              Tu derecho.
              <br />
              <span className="font-[700] bg-gradient-to-r from-[#e7b008] to-[#f4d03f] bg-clip-text text-transparent">
                Simplificado.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-16 font-[300] leading-relaxed"
            >
              Servicios legales profesionales al alcance de todos.
              <br />
              Sin complicaciones. Sin letra pequeña.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <Button 
                size="lg" 
                onClick={() => onNavigate("user-dashboard")}
                className="bg-white text-slate-950 hover:bg-white/90 px-12 py-7 text-lg font-medium rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(231,176,8,0.4)] transition-all duration-500 hover:scale-[1.02]"
              >
                Comenzar gratis
              </Button>
              
              <button 
                onClick={() => onOpenChat("Quiero una consultoría legal")}
                className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group"
              >
                <span>Ver cómo funciona</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Cards Estilo Apple */}
      <FadeInSection delay={0.2}>
        <section className="py-40 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-5xl md:text-6xl font-[200] text-slate-950 mb-4 tracking-tight">
                  Para cada necesidad.
                </h2>
                <p className="text-xl text-slate-600 font-[300]">
                  Tres experiencias. Una plataforma.
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {mainFeatures.map((feature, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="group relative bg-slate-50 rounded-[32px] p-12 hover:bg-slate-100 transition-all duration-500 cursor-pointer overflow-hidden"
                    onClick={feature.onClick}
                  >
                    {/* Efecto de hover sutil */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      {/* Icono más grande y elegante */}
                      <div className="mb-8 transform group-hover:scale-110 transition-transform duration-500">
                        <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                          {feature.icon}
                        </div>
                      </div>
                      
                      {/* Título */}
                      <h3 className="text-3xl font-[600] text-slate-950 mb-3 tracking-tight">
                        {feature.title}
                      </h3>
                      
                      {/* Descripción más corta */}
                      <p className="text-slate-600 font-[300] leading-relaxed mb-8">
                        {feature.subtitle}
                      </p>
                      
                      {/* Link minimalista */}
                      <div className="inline-flex items-center text-[#e7b008] font-medium gap-0 group-hover:gap-2 transition-all">
                        <span>{feature.action}</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Popular Documents - Más Visual */}
      <FadeInSection delay={0.3}>
        <section className="py-40 bg-slate-50">
          <div className="container mx-auto px-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-5xl md:text-6xl font-[200] text-slate-950 mb-4 tracking-tight">
                  Documentos más solicitados.
                </h2>
                <p className="text-xl text-slate-600 font-[300]">
                  Creados por expertos. Listos para usar.
                </p>
              </div>

              {loadingDocs ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-[24px] p-8 animate-pulse">
                      <div className="w-16 h-16 rounded-2xl bg-slate-200 mb-6"></div>
                      <div className="h-6 bg-slate-200 rounded mb-3"></div>
                      <div className="h-4 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : popularDocuments.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularDocuments.map((doc, index) => (
                    <motion.div 
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                      className="group bg-white rounded-[24px] p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer border border-slate-200/50"
                      onClick={() => onOpenChat(`Quiero crear un ${doc.name.toLowerCase()}`)}
                    >
                      {/* Icono más grande */}
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-[#e7b008]/10 transition-colors duration-500">
                        <FileText className="w-8 h-8 text-slate-700 group-hover:text-[#e7b008] transition-colors duration-500" />
                      </div>
                      
                      {/* Título más limpio */}
                      <h3 className="text-xl font-[600] text-slate-950 mb-3 tracking-tight group-hover:text-[#e7b008] transition-colors">
                        {doc.name}
                      </h3>
                      
                      {/* Descripción más corta */}
                      <p className="text-slate-600 font-[300] text-sm leading-relaxed line-clamp-2">
                        {doc.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-[300]">
                    No hay documentos disponibles en este momento
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Testimonials - Carrusel Elegante */}
      <FadeInSection delay={0.4}>
        <section className="py-40 bg-white overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-5xl md:text-6xl font-[200] text-slate-950 mb-4 tracking-tight">
                Lo que dicen nuestros usuarios.
              </h2>
              
              <Carousel 
                plugins={[plugin.current]}
                className="mt-20"
                opts={{ align: "center", loop: true }}
              >
                <CarouselContent>
                  {[
                    {
                      text: "Increíble servicio. Pude crear mi contrato laboral en minutos y todo quedó perfecto.",
                      author: "María González",
                      location: "Bogotá"
                    },
                    {
                      text: "La plataforma es muy intuitiva. Me ayudó con toda la documentación legal de mi empresa.",
                      author: "Carlos Rodríguez",
                      location: "Medellín"
                    },
                    {
                      text: "Excelente atención y rapidez. Los documentos generados son de alta calidad.",
                      author: "Ana Martínez",
                      location: "Cali"
                    },
                    {
                      text: "Como abogado, esta herramienta ha revolucionado mi práctica. Muy recomendado.",
                      author: "Diego Sánchez",
                      location: "Barranquilla"
                    },
                    {
                      text: "Servicio excepcional. Me ahorraron tiempo y dinero en trámites legales.",
                      author: "Laura Pérez",
                      location: "Cartagena"
                    }
                  ].map((testimonial, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="bg-slate-50 rounded-[24px] p-8 mx-2 h-full">
                        {/* Rating */}
                        <div className="flex gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-[#e7b008] text-[#e7b008]" />
                          ))}
                        </div>
                        
                        {/* Quote */}
                        <p className="text-slate-700 font-[300] leading-relaxed mb-6">
                          "{testimonial.text}"
                        </p>
                        
                        {/* Author */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e7b008] to-[#f4d03f] flex items-center justify-center text-white font-[600] text-sm">
                            {testimonial.author.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-[500] text-slate-950 text-sm">{testimonial.author}</p>
                            <p className="text-xs text-slate-500">{testimonial.location}</p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Final CTA - Minimalista y Potente */}
      <FadeInSection delay={0.5}>
        <section className="py-40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
          {/* Efecto de glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e7b008]/20 rounded-full blur-[150px]"></div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-[200] text-white mb-6 leading-tight tracking-tight">
                Comienza hoy.
                <br />
                <span className="font-[700]">
                  Sin compromisos.
                </span>
              </h2>
              
              <p className="text-lg text-white/60 mb-12 font-[300] leading-relaxed max-w-xl mx-auto">
                Únete a miles de colombianos que transformaron su relación con los servicios legales.
              </p>
              
              <Button 
                size="lg"
                onClick={() => onNavigate("user-dashboard")}
                className="bg-white text-slate-950 hover:bg-white/90 px-12 py-7 text-lg font-medium rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)] transition-all duration-500 hover:scale-[1.02]"
              >
                Comenzar gratis
              </Button>
            </div>
          </div>
        </section>
      </FadeInSection>
    </div>
  );
}