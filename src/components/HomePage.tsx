import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Building2, 
  Scale, 
  ArrowRight, 
  MessageCircle, 
  Star,
  Search,
  FileSearch,
  Edit3,
  Users,
  Gavel,
  BookOpen,
  Bot,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  Zap,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { usePopularDocuments } from "@/hooks/usePopularDocuments";
import { useSEO } from "@/hooks/useSEO";
import ServiceStatusAlert from "./ServiceStatusAlert";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HomePageProps {
  onOpenChat: (message?: string) => void;
  onNavigate: (page: string) => void;
}

export default function HomePage({ onOpenChat, onNavigate }: HomePageProps) {
  const { documents: popularDocuments, loading: loadingDocs } = usePopularDocuments();
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

  useSEO({
    title: "Tu Consultor Legal - IA Legal para Abogados y Documentos Legales",
    description: "Plataforma de inteligencia artificial legal. 14 herramientas IA para abogados y generación de documentos legales para personas y empresas en Colombia.",
    keywords: "abogados IA, documentos legales, contratos, asesoría legal, inteligencia artificial legal, derecho colombiano, investigación jurídica",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "LegalService",
      "name": "Tu Consultor Legal",
      "description": "Plataforma de inteligencia artificial legal para abogados y generación de documentos",
      "url": "https://tuconsultorlegal.co",
      "areaServed": "Colombia",
      "serviceType": ["AI Legal Tools", "Legal Document Generation", "Legal Research"]
    }
  });

  const lawyerTools = [
    { icon: Search, title: "Investigación Legal IA", description: "Busca jurisprudencia y normativa con IA avanzada" },
    { icon: FileSearch, title: "Análisis Documental", description: "Analiza contratos y documentos automáticamente" },
    { icon: Edit3, title: "Redacción + Copilot", description: "Redacta documentos con asistente de IA integrado" },
    { icon: Users, title: "CRM + Portal Clientes", description: "Gestiona clientes y casos en un solo lugar" },
    { icon: Gavel, title: "Procesos Judiciales", description: "Monitorea tus procesos en la Rama Judicial" },
    { icon: BookOpen, title: "SUIN-Juriscol", description: "Acceso directo al sistema normativo colombiano" }
  ];

  const stats = [
    { value: "14+", label: "Herramientas IA" },
    { value: "1M+", label: "Normas Indexadas" },
    { value: "95%", label: "Precisión" },
    { value: "24/7", label: "Disponibilidad" }
  ];

  const lawyerTestimonials = [
    { rating: 5, text: "La investigación jurídica que antes me tomaba horas, ahora la hago en minutos. Ha transformado mi práctica.", author: "Dr. Carlos Mendoza", role: "Abogado Litigante" },
    { rating: 5, text: "El CRM integrado con las herramientas de IA me permite dar un servicio excepcional a mis clientes.", author: "Dra. María Fernanda López", role: "Socia - Firma Boutique" },
    { rating: 5, text: "El monitoreo automático de procesos judiciales me da tranquilidad. Nunca más perdí un término.", author: "Dr. Andrés Ramírez", role: "Abogado Independiente" }
  ];

  const userTestimonials = [
    { rating: 5, text: "Necesitaba un contrato de arrendamiento urgente y lo tuve listo en 10 minutos. ¡Increíble!", author: "Laura Martínez", location: "Bogotá" },
    { rating: 5, text: "El proceso fue muy fácil, las preguntas me guiaron perfectamente para crear mi documento.", author: "Pedro Gómez", location: "Medellín" }
  ];

  const FadeInSection = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
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
    <div className="min-h-screen bg-background">
      <ServiceStatusAlert />

      {/* Hero Section - Enfoque Abogados */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24]">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0372e8]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#f2bb31]/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0372e8]/10 rounded-full blur-[150px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0372e8]/10 border border-[#0372e8]/20 text-[#0372e8] mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Plataforma #1 de IA Legal en Colombia</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl font-[200] mb-6 leading-[0.95] tracking-tight"
            >
              <span className="text-white">Potencia tu</span>{" "}
              <span className="font-[700] bg-gradient-to-r from-[#f2bb31] to-[#ffd666] bg-clip-text text-transparent">
                Práctica Legal
              </span>
              <br />
              <span className="font-[700] bg-gradient-to-r from-[#0372e8] to-[#0ea5e9] bg-clip-text text-transparent">
                con IA
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-10 font-[300] leading-relaxed"
            >
              14 herramientas de IA especializadas para abogados. 
              <br className="hidden md:block" />
              Investigación, redacción, análisis y gestión de casos en una sola plataforma.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#f2bb31]">{stat.value}</div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg" 
                className="bg-[#0372e8] hover:bg-[#0260c7] text-white px-10 py-7 text-lg font-medium rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(3,114,232,0.5)] transition-all duration-500 hover:scale-[1.02] group"
                onClick={() => onNavigate('lawyer-landing')}
              >
                <Scale className="w-5 h-5 mr-2" />
                Portal para Abogados
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-[#f2bb31]/50 text-[#f2bb31] hover:bg-[#f2bb31]/10 hover:border-[#f2bb31] px-10 py-7 text-lg font-medium rounded-full"
                onClick={() => onNavigate('user-dashboard')}
              >
                <FileText className="w-5 h-5 mr-2" />
                Crear Documento Legal
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12 flex flex-wrap justify-center gap-6 text-white/40 text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Datos Encriptados</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Validado por Abogados</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f2bb31]" />
                <span>Resultados en Segundos</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/50 rounded-full mt-2"
            />
          </div>
        </motion.div>
      </section>

      {/* Suite para Abogados */}
      <section className="py-32 bg-gradient-to-b from-[#010f24] to-white">
        <div className="container mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0372e8]/10 text-[#0372e8] text-sm font-medium mb-4">
                <Bot className="w-4 h-4" />
                Para Abogados
              </div>
              <h2 className="text-4xl md:text-6xl font-[200] text-white mb-4 tracking-tight">
                Suite Completa de{" "}
                <span className="font-[700] bg-gradient-to-r from-[#0372e8] to-[#0ea5e9] bg-clip-text text-transparent">
                  IA Legal
                </span>
              </h2>
              <p className="text-lg text-white/60 max-w-2xl mx-auto font-[300]">
                Herramientas diseñadas específicamente para la práctica legal en Colombia. 
                Ahorra tiempo, reduce errores y potencia tu productividad.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {lawyerTools.map((tool, index) => (
              <FadeInSection key={index} delay={index * 0.1}>
                <Card 
                  className="group border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#0372e8]/50 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  onClick={() => onNavigate('lawyer-landing')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-[#0372e8]/20 to-[#0372e8]/5 text-[#0372e8] group-hover:scale-110 transition-transform">
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1 group-hover:text-[#0372e8] transition-colors">
                          {tool.title}
                        </h3>
                        <p className="text-sm text-white/60">
                          {tool.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-[#0372e8] group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection delay={0.6}>
            <div className="text-center mt-12">
              <Button 
                size="lg" 
                className="bg-[#0372e8] hover:bg-[#0260c7] text-white px-10 py-6 text-lg font-medium rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(3,114,232,0.5)] transition-all duration-500 group"
                onClick={() => onNavigate('lawyer-landing')}
              >
                Explorar Todas las Herramientas
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Documentos para Personas y Empresas */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-[200] text-slate-950 mb-4 tracking-tight">
                Documentos Legales{" "}
                <span className="font-[700] bg-gradient-to-r from-[#f2bb31] to-[#e5a91a] bg-clip-text text-transparent">
                  Fácil y Rápido
                </span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto font-[300]">
                Genera documentos legales válidos en minutos. 
                Guiado por IA y validado por abogados profesionales.
              </p>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Personas */}
            <FadeInSection delay={0.1}>
              <div className="group bg-slate-50 rounded-[32px] p-10 hover:bg-slate-100 transition-all duration-500 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#f2bb31]/20 to-[#f2bb31]/5">
                    <FileText className="w-8 h-8 text-[#f2bb31]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-[600] text-slate-950">Para Personas</h3>
                    <p className="text-slate-600 font-[300]">Documentos personales y familiares</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {["Contratos de arrendamiento", "Poderes notariales", "Documentos de sucesión", "Contratos de trabajo", "Derechos de petición"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-[300]">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full bg-[#f2bb31] hover:bg-[#e5a91a] text-[#010f24] font-semibold py-6 rounded-full group"
                  onClick={() => onNavigate('user-dashboard')}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Crear Mi Documento
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </FadeInSection>

            {/* Empresas */}
            <FadeInSection delay={0.2}>
              <div className="group bg-slate-50 rounded-[32px] p-10 hover:bg-slate-100 transition-all duration-500 h-full relative">
                <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-[#0372e8]/10 text-[#0372e8] text-xs font-medium">
                  Próximamente
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0372e8]/20 to-[#0372e8]/5">
                    <Building2 className="w-8 h-8 text-[#0372e8]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-[600] text-slate-950">Para Empresas</h3>
                    <p className="text-slate-600 font-[300]">Soluciones corporativas completas</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {["Contratos comerciales", "Compliance y regulación", "Due diligence", "Propiedad intelectual", "Asesoría estratégica"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-[300]">
                      <CheckCircle2 className="w-5 h-5 text-[#0372e8]/50 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button 
                  variant="outline"
                  className="w-full py-6 rounded-full group"
                  onClick={() => onNavigate('empresas')}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Unirse a Lista de Espera
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </FadeInSection>
          </div>

          {/* Documentos Populares */}
          {!loadingDocs && popularDocuments.length > 0 && (
            <FadeInSection delay={0.3}>
              <div className="max-w-[1400px] mx-auto">
                <h3 className="text-2xl font-[600] text-center text-slate-950 mb-8">
                  Documentos más solicitados
                </h3>
                <Carousel
                  plugins={[plugin.current]}
                  opts={{ align: "start", loop: true }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {popularDocuments.map((doc) => {
                      const handleDocumentAction = async () => {
                        try {
                          const { data: agent, error } = await supabase
                            .from('legal_agents')
                            .select('*')
                            .eq('id', doc.id)
                            .single();

                          if (error) throw error;
                          
                          onNavigate('personas');
                          setTimeout(() => {
                            onOpenChat(`Quiero crear un ${doc.name.toLowerCase()}`);
                          }, 500);
                        } catch (error) {
                          console.error('Error loading agent:', error);
                        }
                      };

                      return (
                        <CarouselItem key={doc.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                          <motion.div 
                            whileHover={{ scale: 1.02 }} 
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="bg-white rounded-[24px] p-8 h-[300px] flex flex-col hover:shadow-[0_12px_40px_rgba(3,114,232,0.15)] border border-slate-200 hover:border-[#0372e8]/30 transition-all duration-500"
                          >
                            <div className="w-12 h-12 rounded-xl bg-[#f2bb31]/10 flex items-center justify-center mb-4 flex-shrink-0">
                              <FileText className="w-6 h-6 text-[#f2bb31]" />
                            </div>
                            
                            <h3 className="text-lg font-[600] text-[#010f24] mb-2 leading-tight line-clamp-2 flex-shrink-0">
                              {doc.name}
                            </h3>
                            
                            <p className="text-slate-600 font-[300] text-sm leading-relaxed line-clamp-3 mb-4 flex-grow">
                              {doc.description}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 flex-shrink-0">
                              <span className="text-lg font-[600] text-[#0372e8]">
                                Gratis
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleDocumentAction}
                                className="hover:bg-[#0372e8]/5 text-[#0372e8] font-[500]"
                              >
                                Generar 
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </motion.div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex -left-4" />
                  <CarouselNext className="hidden md:flex -right-4" />
                </Carousel>
              </div>
            </FadeInSection>
          )}

          {loadingDocs && (
            <div className="flex gap-6 overflow-x-hidden max-w-[1400px] mx-auto">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="min-w-[320px] max-w-[320px] bg-slate-100 rounded-[24px] p-8 animate-pulse flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 mb-4"></div>
                  <div className="h-6 bg-slate-200 rounded mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded mb-4"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Diferenciadores */}
      <section className="py-32 bg-slate-50">
        <div className="container mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-[200] text-slate-950 mb-4 tracking-tight">
                ¿Por qué <span className="font-[600] text-[#0372e8]">tuconsultorlegal.co</span>?
              </h2>
            </div>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Bot, title: "IA Especializada", description: "Modelos entrenados específicamente en derecho colombiano" },
              { icon: Shield, title: "Respaldo Profesional", description: "Documentos validados por abogados titulados" },
              { icon: Zap, title: "Resultados Inmediatos", description: "Genera documentos en minutos, no en días" },
              { icon: TrendingUp, title: "Plataforma Todo-en-Uno", description: "Desde investigación hasta gestión de clientes" }
            ].map((item, index) => (
              <FadeInSection key={index} delay={index * 0.1}>
                <div className="text-center p-8 bg-white rounded-[24px]">
                  <div className="inline-flex p-4 rounded-2xl bg-[#0372e8]/10 text-[#0372e8] mb-4">
                    <item.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-[600] text-slate-950 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 font-[300]">{item.description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-[200] text-slate-950 mb-4 tracking-tight">
                Lo que dicen nuestros usuarios
              </h2>
            </div>
          </FadeInSection>

          <Carousel
            plugins={[plugin.current]}
            opts={{ align: "start", loop: true }}
            className="w-full max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {/* Testimonios de Abogados */}
              {lawyerTestimonials.map((testimonial, index) => (
                <CarouselItem key={`lawyer-${index}`} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="bg-gradient-to-br from-[#0372e8]/5 to-transparent rounded-[24px] p-8 h-full border border-[#0372e8]/10">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#f2bb31] text-[#f2bb31]" />
                      ))}
                    </div>
                    <p className="text-slate-600 mb-6 text-sm font-[300] italic leading-relaxed">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0372e8]/20 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-[#0372e8]" />
                      </div>
                      <div>
                        <p className="font-[500] text-slate-950 text-sm">{testimonial.author}</p>
                        <p className="text-xs text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
              
              {/* Testimonios de Usuarios */}
              {userTestimonials.map((testimonial, index) => (
                <CarouselItem key={`user-${index}`} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="bg-gradient-to-br from-[#f2bb31]/5 to-transparent rounded-[24px] p-8 h-full border border-[#f2bb31]/10">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#f2bb31] text-[#f2bb31]" />
                      ))}
                    </div>
                    <p className="text-slate-600 mb-6 text-sm font-[300] italic leading-relaxed">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f2bb31]/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#f2bb31]" />
                      </div>
                      <div>
                        <p className="font-[500] text-slate-950 text-sm">{testimonial.author}</p>
                        <p className="text-xs text-slate-500">{testimonial.location}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#0372e8]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[#f2bb31]/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* CTA Abogados */}
              <FadeInSection>
                <div className="bg-white/5 border border-[#0372e8]/30 backdrop-blur-sm rounded-[32px] p-10 text-center">
                  <div className="inline-flex p-4 rounded-2xl bg-[#0372e8]/20 text-[#0372e8] mb-6">
                    <Scale className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-[600] text-white mb-3">¿Eres abogado?</h3>
                  <p className="text-white/60 mb-8 font-[300]">
                    Transforma tu práctica legal con la suite de IA más completa de Colombia.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full bg-[#0372e8] hover:bg-[#0260c7] text-white py-6 rounded-full shadow-2xl hover:shadow-[0_20px_60px_rgba(3,114,232,0.5)] transition-all duration-500 group"
                    onClick={() => onNavigate('lawyer-landing')}
                  >
                    Comenzar Ahora
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </FadeInSection>

              {/* CTA Documentos */}
              <FadeInSection delay={0.1}>
                <div className="bg-white/5 border border-[#f2bb31]/30 backdrop-blur-sm rounded-[32px] p-10 text-center">
                  <div className="inline-flex p-4 rounded-2xl bg-[#f2bb31]/20 text-[#f2bb31] mb-6">
                    <FileText className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-[600] text-white mb-3">¿Necesitas un documento?</h3>
                  <p className="text-white/60 mb-8 font-[300]">
                    Genera contratos, poderes y más documentos legales en minutos.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full bg-[#f2bb31] hover:bg-[#e5a91a] text-[#010f24] py-6 rounded-full font-semibold group"
                    onClick={() => onNavigate('user-dashboard')}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Crear Documento
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </FadeInSection>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
