import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, Brain, Search, Eye, PenTool, Target, Users, Bot, BarChart3, Shield, Zap, Sparkles, ChevronRight, Play, ArrowRight, CheckCircle, Star, Rocket, User } from 'lucide-react';
import LawyerLogin from './LawyerLogin';
interface LawyerLandingPageProps {
  onOpenChat: (message: string) => void;
}
export default function LawyerLandingPage({
  onOpenChat
}: LawyerLandingPageProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const features = [{
    title: "Investigación Legal IA",
    description: "Análisis avanzado de jurisprudencia y normativa con inteligencia artificial",
    icon: Search,
    color: "from-blue-500 to-blue-600",
    demo: "Buscar precedentes sobre contratos de arrendamiento en Colombia"
  }, {
    title: "Análisis Documental",
    description: "Revisión automática de documentos legales con detección de riesgos",
    icon: Eye,
    color: "from-purple-500 to-purple-600",
    demo: "Analizar contrato de compraventa para identificar cláusulas problemáticas"
  }, {
    title: "Redacción Inteligente",
    description: "Generación de documentos legales con plantillas personalizadas",
    icon: PenTool,
    color: "from-green-500 to-green-600",
    demo: "Redactar demanda civil por incumplimiento contractual"
  }, {
    title: "Estrategia Legal",
    description: "Análisis predictivo y planificación estratégica de casos",
    icon: Target,
    color: "from-orange-500 to-orange-600",
    demo: "Desarrollar estrategia para litigio comercial complejo"
  }, {
    title: "Gestión de Clientes",
    description: "CRM especializado para despachos con seguimiento de casos",
    icon: Users,
    color: "from-indigo-500 to-indigo-600",
    demo: "Gestionar cartera de 150+ clientes con automatización"
  }, {
    title: "Agentes IA Personalizados",
    description: "Crea asistentes especializados para áreas específicas del derecho",
    icon: Bot,
    color: "from-pink-500 to-pink-600",
    demo: "Agente especializado en derecho laboral colombiano"
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
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Portal Abogados</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/auth-abogados'}
              >
                Iniciar Sesión
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = '/auth-abogados'}
              >
                <User className="w-4 h-4 mr-2" />
                Registrarse
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Unified Brand Identity */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#010f24] via-[#011838] to-[#010f24]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20viewBox=%220%200%2060%2060%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22none%22%20fill-rule=%22evenodd%22%3E%3Cg%20fill=%22%23ffffff%22%20fill-opacity=%220.05%22%3E%3Ccircle%20cx=%2230%22%20cy=%2230%22%20r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0372e8]/10 rounded-full blur-[120px]"></div>
        
        <div className="relative container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              {/* Professional Badge */}
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium">
                <Scale className="w-4 h-4 mr-2" />
                Portal Exclusivo para Abogados
                <Shield className="w-4 h-4 ml-2 text-yellow-300" />
              </div>
              <div className="space-y-4">
                <Badge className="bg-success/20 text-success border-success/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Próxima Generación Legal Tech
                </Badge>
                
                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                  El Futuro de la
                  <span className="block bg-gradient-to-r from-[#f2bb31] to-[#ffd666] bg-clip-text text-transparent">
                    Práctica Legal
                  </span>
                </h1>
                
                <p className="text-xl text-white/90 max-w-lg leading-relaxed">
                  Revoluciona tu despacho con inteligencia artificial avanzada. 
                  Automatiza, analiza y optimiza cada aspecto de tu práctica profesional.
                </p>
              </div>

              {/* Clear CTAs for Login/Register */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    variant="accent" 
                    onClick={() => window.location.href = '/auth-abogados'} 
                    className="font-semibold px-8 py-6 shadow-glow transition-all duration-300 hover:scale-105"
                  >
                    <User className="w-5 h-5 mr-2" />
                    Crear Cuenta Gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => window.location.href = '/auth-abogados'} 
                    className="border-white/50 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-6"
                  >
                    <Scale className="w-5 h-5 mr-2" />
                    Ya tengo cuenta
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => document.getElementById('demo-section')?.scrollIntoView({
                    behavior: 'smooth'
                  })} 
                  className="text-white/80 hover:text-white hover:bg-white/10 mx-auto"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Ver cómo funciona
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-white/20">
                {stats.map((stat, index) => <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <stat.icon className="w-6 h-6 text-success" />
                    </div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-white/80">{stat.label}</div>
                  </div>)}
              </div>
            </div>

            {/* Hero Visual */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-success/20 to-brand-gold/20 rounded-3xl blur-3xl animate-pulse"></div>
                <Card className="relative bg-white/10 backdrop-blur-lg border-white/20 p-8 shadow-hero">
                  <CardContent className="p-0">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Panel de Control IA</h3>
                        <Badge className="bg-success text-white border-success/30">
                          <Zap className="w-3 h-3 mr-1" />
                          En Vivo
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        {features.slice(0, 3).map((feature, index) => <div key={index} className="flex items-center space-x-3 text-white/90">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${feature.color}`}>
                              <feature.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{feature.title}</div>
                              <div className="text-sm text-white/70">{feature.description}</div>
                            </div>
                            <CheckCircle className="w-5 h-5 text-success" />
                          </div>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="demo-section" className="py-20 bg-gradient-to-b from-background to-brand-gray-light">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-6">
              <Brain className="w-4 h-4 mr-2" />
              Capacidades Avanzadas
            </Badge>
            <h2 className="text-4xl font-bold mb-6">
              Herramientas que 
              <span className="text-primary"> Transforman </span>
              tu Práctica
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cada herramienta está diseñada específicamente para abogados, 
              con IA entrenada en derecho colombiano y mejores prácticas internacionales.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Interactive Feature Demo */}
            <div className="space-y-6">
              {features.map((feature, index) => <Card key={index} className={`cursor-pointer transition-all duration-500 hover:shadow-card ${activeFeature === index ? 'border-primary shadow-card scale-105' : 'border-border hover:border-primary/50'}`} onClick={() => setActiveFeature(index)}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color} shadow-soft`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground mb-3">{feature.description}</p>
                        <div className="text-sm text-primary font-medium">
                          Ejemplo: {feature.demo}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeFeature === index ? 'rotate-90' : ''}`} />
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            {/* Live Demo Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-brand-blue-light/10 rounded-3xl blur-3xl"></div>
              <Card className="relative bg-white shadow-hero border-0">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {features[activeFeature].title}
                      </h3>
                      <Badge className={`bg-gradient-to-r ${features[activeFeature].color} text-white border-0`}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        IA Activa
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-brand-gray-light rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">Consulta:</div>
                        <div className="font-medium">{features[activeFeature].demo}</div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                        <span className="text-muted-foreground">Procesando con IA...</span>
                      </div>
                      
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-3 bg-brand-gray-light rounded animate-pulse" style={{
                        width: `${Math.random() * 40 + 60}%`
                      }}></div>)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-6">
              <Star className="w-4 h-4 mr-2" />
              Testimonios
            </Badge>
            <h2 className="text-4xl font-bold mb-6">
              Casos de <span className="text-primary">Éxito</span> Reales
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
      <section className="py-20 bg-gradient-to-r from-primary via-primary-light to-brand-blue-light text-center text-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold mb-6">¿Listo para transformar tu práctica legal?</h2>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = '/auth-abogados'}
            className="font-semibold px-8 py-6"
          >
            <User className="w-5 h-5 mr-2" />
            Comenzar Ahora
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>;
}