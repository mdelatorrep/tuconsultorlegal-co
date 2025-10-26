import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, Brain, Search, Eye, PenTool, Target, Users, Bot, BarChart3, Shield, Zap, Sparkles, ChevronRight, Play, ArrowRight, CheckCircle, Star, Rocket, User, ChevronLeft } from 'lucide-react';
import LawyerLogin from './LawyerLogin';
import DemoResearchMockup from './demo/DemoResearchMockup';
import DemoAnalysisMockup from './demo/DemoAnalysisMockup';
import DemoDraftingMockup from './demo/DemoDraftingMockup';
import DemoStrategyMockup from './demo/DemoStrategyMockup';
import DemoCRMMockup from './demo/DemoCRMMockup';
import DemoAgentsMockup from './demo/DemoAgentsMockup';
import useEmblaCarousel from 'embla-carousel-react';
interface LawyerLandingPageProps {
  onOpenChat: (message: string) => void;
}
export default function LawyerLandingPage({
  onOpenChat
}: LawyerLandingPageProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const demoScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Sync carousel with active feature
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(activeFeature);
    }
  }, [activeFeature, emblaApi]);

  // Reset scroll position when feature changes
  useEffect(() => {
    if (demoScrollRef.current) {
      demoScrollRef.current.scrollTop = 0;
    }
  }, [activeFeature]);

  // Handle scroll detection for auto-advance
  useEffect(() => {
    const demoScroll = demoScrollRef.current;
    if (!demoScroll) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = demoScroll;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      if (isAtBottom && activeFeature < features.length - 1) {
        scrollTimeoutRef.current = setTimeout(() => {
          setActiveFeature(prev => (prev + 1) % features.length);
        }, 800);
      }
    };

    demoScroll.addEventListener('scroll', handleScroll);
    return () => {
      demoScroll.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [activeFeature]);

  const scrollToPrev = () => {
    setActiveFeature(prev => (prev - 1 + 6) % 6);
  };

  const scrollToNext = () => {
    setActiveFeature(prev => (prev + 1) % 6);
  };
  const features = [{
    title: "Investigación Legal IA",
    description: "Análisis avanzado de jurisprudencia y normativa con inteligencia artificial",
    icon: Search,
    color: "from-blue-500 to-blue-600",
    demo: "Buscar precedentes sobre contratos de arrendamiento en Colombia",
    component: DemoResearchMockup
  }, {
    title: "Análisis Documental",
    description: "Revisión automática de documentos legales con detección de riesgos",
    icon: Eye,
    color: "from-purple-500 to-purple-600",
    demo: "Analizar contrato de compraventa para identificar cláusulas problemáticas",
    component: DemoAnalysisMockup
  }, {
    title: "Redacción Inteligente",
    description: "Generación de documentos legales con plantillas personalizadas",
    icon: PenTool,
    color: "from-green-500 to-green-600",
    demo: "Redactar demanda civil por incumplimiento contractual",
    component: DemoDraftingMockup
  }, {
    title: "Estrategia Legal",
    description: "Análisis predictivo y planificación estratégica de casos",
    icon: Target,
    color: "from-orange-500 to-orange-600",
    demo: "Desarrollar estrategia para litigio comercial complejo",
    component: DemoStrategyMockup
  }, {
    title: "Gestión de Clientes",
    description: "CRM especializado para despachos con seguimiento de casos",
    icon: Users,
    color: "from-indigo-500 to-indigo-600",
    demo: "Gestionar cartera de 150+ clientes con automatización",
    component: DemoCRMMockup
  }, {
    title: "Agentes IA Personalizados",
    description: "Crea asistentes especializados para áreas específicas del derecho",
    icon: Bot,
    color: "from-pink-500 to-pink-600",
    demo: "Agente especializado en derecho laboral colombiano",
    component: DemoAgentsMockup
  }];
  const stats = [{
    value: "500+",
    label: "Abogados Activos",
    icon: Users
  }, {
    value: "10K+",
    label: "Documentos Procesados",
    icon: PenTool
  }, {
    value: "95%",
    label: "Precisión IA",
    icon: Target
  }, {
    value: "24/7",
    label: "Disponibilidad",
    icon: Shield
  }];
  const testimonials = [{
    name: "Dr. María González",
    role: "Socia, González & Asociados",
    content: "La plataforma ha revolucionado mi práctica. Ahora puedo revisar contratos complejos en minutos y enfocarme en estrategia.",
    rating: 5
  }, {
    name: "Lic. Carlos Ruiz",
    role: "Abogado Litigante",
    content: "Las herramientas de investigación IA me dan ventaja competitiva. Encuentro precedentes relevantes que antes me tomaban horas.",
    rating: 5
  }, {
    name: "Dra. Ana Martínez",
    role: "Directora Legal, TechCorp",
    content: "El CRM integrado y la automatización han mejorado nuestra eficiencia operativa en un 300%.",
    rating: 5
  }];
  return <div className="min-h-screen bg-background">
      {/* Sticky Quick Access Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        
      </div>

      {/* Hero Section - Unified Brand Identity */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.05%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0372e8]/10 rounded-full blur-[120px]"></div>
        
        <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto">
            {/* Hero Content */}
            <div className={`space-y-6 sm:space-y-8 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Professional Badge */}
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mx-auto">
                <Scale className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span className="whitespace-nowrap">Portal Exclusivo para Abogados</span>
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-yellow-300" />
              </div>
              <div className="space-y-3 sm:space-y-4">
                
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight px-4">
                  El Futuro de la
                  <span className="block bg-gradient-to-r from-[#f2bb31] to-[#ffd666] bg-clip-text text-transparent">
                    Práctica Legal
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed px-4">
                  Revoluciona tu despacho con inteligencia artificial avanzada. 
                  Automatiza, analiza y optimiza cada aspecto de tu práctica profesional.
                </p>
              </div>

              {/* Clear CTAs for Login/Register */}
              <div className="space-y-3 sm:space-y-4 px-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-lg mx-auto">
                  <Button size="lg" variant="accent" onClick={() => window.location.href = '/auth-abogados'} className="font-semibold px-6 sm:px-8 py-4 sm:py-6 shadow-glow transition-all duration-300 hover:scale-105 text-sm sm:text-base w-full sm:w-auto">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Crear Cuenta Gratis
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  </Button>
                  
                  <Button variant="outline" size="lg" onClick={() => window.location.href = '/auth-abogados'} className="border-white/50 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base w-full sm:w-auto">
                    <Scale className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Ya tengo cuenta
                  </Button>
                </div>
                
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => document.getElementById('demo-section')?.scrollIntoView({
                  behavior: 'smooth'
                })} className="text-white/80 hover:text-white hover:bg-white/10 text-xs sm:text-sm">
                    <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Ver cómo funciona
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-white/20 max-w-4xl mx-auto px-4">
                {stats.map((stat, index) => <div key={index} className="text-center">
                    <div className="flex justify-center mb-1 sm:mb-2">
                      <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-white/80">{stat.label}</div>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="demo-section" className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-4 sm:mb-6 text-xs sm:text-sm">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Capacidades Avanzadas
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 px-4">
              Herramientas que 
              <span className="text-primary"> Transforman </span>
              tu Práctica
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Cada herramienta está diseñada específicamente para abogados, 
              con IA entrenada en derecho colombiano y mejores prácticas internacionales.
            </p>
          </div>

          {/* Carousel for Mobile, Grid for Desktop */}
          <div className="mb-8 sm:mb-12">
            {/* Mobile Carousel */}
            <div className="md:hidden">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex-[0_0_85%] min-w-0">
                      <Card 
                        className={`cursor-pointer transition-all duration-500 hover:shadow-hero h-full ${activeFeature === index ? 'border-primary shadow-card bg-gradient-to-br from-background to-primary/5' : 'border-border'}`} 
                        onClick={() => setActiveFeature(index)}
                      >
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Icon y Badge */}
                            <div className="flex items-start justify-between">
                              <div className={`p-4 rounded-xl bg-gradient-to-r ${feature.color} shadow-soft transition-transform`}>
                                <feature.icon className="w-8 h-8 text-white" />
                              </div>
                              {activeFeature === index && <Badge className="bg-success/20 text-success border-success/30">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Activo
                                </Badge>}
                            </div>
                            
                            {/* Content */}
                            <div className="space-y-2">
                              <h3 className="font-bold text-lg">{feature.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                            
                            {/* Demo Preview */}
                            <div className="pt-4 border-t border-border/50">
                              <div className="flex items-start space-x-2">
                                <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-muted-foreground italic">
                                  {feature.demo}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Navigation */}
              <div className="flex justify-center items-center gap-4 mt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollToPrev}
                  disabled={activeFeature === 0}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`h-2 rounded-full transition-all ${
                        activeFeature === index ? 'bg-primary w-8' : 'bg-muted w-2'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollToNext}
                  disabled={activeFeature === features.length - 1}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {features.map((feature, index) => <Card key={index} className={`cursor-pointer transition-all duration-500 hover:shadow-hero group ${activeFeature === index ? 'border-primary shadow-card scale-105 bg-gradient-to-br from-background to-primary/5' : 'border-border hover:border-primary/50'}`} onClick={() => setActiveFeature(index)}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Icon y Badge */}
                      <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-xl bg-gradient-to-r ${feature.color} shadow-soft transition-transform group-hover:scale-110`}>
                          <feature.icon className="w-8 h-8 text-white" />
                        </div>
                        {activeFeature === index && <Badge className="bg-success/20 text-success border-success/30">
                            <Zap className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>}
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      
                      {/* Demo Preview */}
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-start space-x-2">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground italic">
                            {feature.demo}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>

          {/* Live Demo Visual - Laptop Mockup */}
          <div className="relative max-w-7xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-3xl"></div>
            
            {/* Laptop Frame */}
            <div className="relative">
              {/* Screen */}
              <div className="relative bg-gray-900 rounded-t-2xl p-2 sm:p-3 shadow-2xl">
                {/* Browser Header */}
                <div className="bg-gray-800 rounded-t-xl p-2 sm:p-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-[10px] sm:text-xs text-gray-400 ml-2">
                    {features[activeFeature].title}
                  </div>
                </div>
                
                {/* Demo Content */}
                <div className="relative bg-white rounded-b-xl overflow-hidden">
                  <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px]">
                    {features.map((feature, index) => {
                      const DemoComponent = feature.component;
                      return <div 
                        key={index} 
                        className={`absolute inset-0 transition-all duration-700 ${activeFeature === index ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                      >
                        <div 
                          ref={activeFeature === index ? demoScrollRef : null}
                          className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-gray-100"
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          <DemoComponent />
                        </div>
                      </div>;
                    })}
                  </div>
                  
                  {/* Scroll Indicator */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-bounce pointer-events-none">
                    <span>↓ Scroll para siguiente demo</span>
                  </div>
                  
                  {/* Navigation Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                    {features.map((_, index) => <button 
                      key={index} 
                      onClick={() => setActiveFeature(index)} 
                      className={`rounded-full transition-all duration-300 ${
                        activeFeature === index 
                          ? 'bg-white w-8 h-2' 
                          : 'bg-white/50 hover:bg-white/75 w-2 h-2'
                      }`} 
                      aria-label={`Ver demo ${index + 1}`} 
                    />)}
                  </div>
                </div>
              </div>
              
              {/* Laptop Base */}
              <div className="relative">
                <div className="h-2 sm:h-3 bg-gradient-to-b from-gray-800 to-gray-900"></div>
                <div className="h-3 sm:h-4 bg-gradient-to-b from-gray-900 to-gray-950 rounded-b-2xl"></div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
              </div>
            </div>
            
            {/* Feature Info Below */}
            <div className="mt-8 text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold">{features[activeFeature].title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">{features[activeFeature].description}</p>
              </div>
              
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Ejemplo: {features[activeFeature].demo}</span>
              </div>
              
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/auth-abogados'} 
                className="mt-4"
              >
                Probar Ahora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-4 sm:mb-6 text-xs sm:text-sm">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Testimonios
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 px-4">
              Casos de <span className="text-primary">Éxito</span> Reales
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => <Card key={index} className="border-0 shadow-card hover:shadow-hero transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-success text-success" />)}
                    </div>
                    
                    <p className="text-muted-foreground italic">
                      "{testimonial.content}"
                    </p>
                    
                    <div className="border-t pt-4">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-[#010f24] via-[#0372e8] to-[#011838] text-center text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 px-4">¿Listo para transformar tu práctica legal?</h2>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = '/auth-abogados'} className="font-semibold px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base w-full sm:w-auto max-w-xs sm:max-w-none mx-4 sm:mx-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Comenzar Ahora
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>;
}