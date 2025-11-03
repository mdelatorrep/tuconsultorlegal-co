import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  Briefcase, 
  Award,
  MapPin,
  Clock,
  Star,
  Send,
  Loader2
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";

interface LawyerProfile {
  id: string;
  lawyer_id: string;
  slug: string;
  profile_photo: string | null;
  specialties: string[];
  years_of_experience: number | null;
  bio: string | null;
  services: Array<{
    name: string;
    description: string;
  }>;
  testimonials: Array<{
    client_name: string;
    client_role: string;
    comment: string;
  }>;
  lawyer_info?: {
    full_name: string;
    email: string;
  };
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  selectedService?: string;
}

export default function LawyerPublicProfilePage() {
  const location = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    selectedService: ""
  });
  const contactFormRef = useRef<HTMLDivElement>(null);

  const handleServiceClick = (serviceName: string) => {
    setShowContactForm(true);
    setFormData({
      ...formData,
      message: `Estoy interesado en el servicio: ${serviceName}\n\n`,
      selectedService: serviceName
    });
    setTimeout(() => {
      contactFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Extract slug from URL params
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const slug = pathSegments[pathSegments.length - 1];
    
    if (slug && slug !== 'perfil') {
      fetchProfile(slug);
    } else {
      setLoading(false);
      toast({
        title: "Error",
        description: "No se encontró el perfil solicitado",
        variant: "destructive"
      });
    }
  }, [location]);

  const fetchProfile = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_public_profiles')
        .select(`
          *,
          lawyer_info:lawyer_profiles(full_name, email)
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;

      setProfile(data as any);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del abogado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    // Validación
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('crm_leads')
        .insert({
          lawyer_id: profile.lawyer_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message,
          origin: 'Página de perfil público',
          status: 'new'
        });

      if (error) throw error;

      toast({
        title: "¡Mensaje enviado!",
        description: "Gracias por tu interés, te contactaré pronto.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        selectedService: ""
      });
      setShowContactForm(false);
    } catch (error) {
      console.error('Error submitting contact:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar tu mensaje. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header 
          currentPage="perfil" 
          onNavigate={() => {}} 
          onOpenChat={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Perfil no encontrado</CardTitle>
              <CardDescription>
                El perfil que buscas no existe o no está disponible.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer onNavigate={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        currentPage="perfil" 
        onNavigate={() => {}} 
        onOpenChat={() => {}} 
      />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section - Premium Design */}
        <Card className="mb-8 overflow-hidden border-0 shadow-elevated hover:shadow-floating transition-all duration-500 animate-fade-in">
          {/* Elegant Header with Gradient */}
          <div className="relative bg-gradient-to-r from-primary via-primary-light to-primary pt-8 pb-24 md:pb-28 px-4 md:px-8">
            {/* Subtle Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoLTR2LTRoNHptMCA4djRoLTR2LTRoNHptMCA4djRoLTR2LTRoNHptMCA4djRoLTR2LTRoNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
            
            {/* Premium Badge */}
            <div className="absolute top-6 right-6 z-10">
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-scale-in">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Abogado Verificado</span>
              </div>
            </div>

            {/* Nombre del Abogado en Header - Máximo Contraste */}
            <div className="relative z-10 text-center md:text-left mt-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 tracking-tight leading-tight drop-shadow-lg">
                {profile.lawyer_info?.full_name || 'Abogado Profesional'}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                {profile.specialties.map((specialty, index) => (
                  <Badge 
                    key={index} 
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 px-3 py-1.5 text-xs md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                  >
                    <Briefcase className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{specialty}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <CardContent className="relative pt-0 pb-8 md:pb-12">
            <div className="flex flex-col md:flex-row gap-6 items-start -mt-16 md:-mt-20 px-4">
              {/* Professional Avatar with Ring */}
              <div className="relative group flex-shrink-0 mx-auto md:mx-0">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Avatar className="relative h-28 w-28 md:h-36 md:w-36 border-4 border-background shadow-floating ring-4 ring-primary/10 transition-all duration-500 hover:scale-105 hover:ring-primary/30">
                  <AvatarImage src={profile.profile_photo || undefined} className="object-cover" />
                  <AvatarFallback className="text-3xl md:text-4xl bg-primary text-primary-foreground font-bold">
                    {profile.lawyer_info?.full_name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Professional Info */}
              <div className="flex-1 w-full min-w-0 space-y-4">
                {profile.years_of_experience && (
                  <div className="flex items-center justify-center md:justify-start gap-3 text-sm md:text-base text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg shadow-sm">
                    <div className="bg-primary/10 p-2 rounded-full flex-shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{profile.years_of_experience} años de experiencia profesional</span>
                  </div>
                )}
                
                {/* CTA Button - Full Width on Mobile */}
                <Button 
                  size="lg"
                  onClick={() => {
                    setShowContactForm(true);
                    setTimeout(() => {
                      contactFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className="w-full md:w-auto shadow-elevated hover:shadow-floating transition-all duration-300 hover:scale-105 px-6 md:px-8 py-5 md:py-6 text-base font-semibold group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <MessageSquare className="h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0" />
                    Solicita una consulta
                  </span>
                  <div className="absolute inset-0 bg-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Bio - Elegant Card */}
            {profile.bio && (
              <Card className="group shadow-card hover:shadow-elevated transition-all duration-500 border-border/50 hover:border-primary/20 animate-fade-in">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 p-2.5 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-bold">Acerca de mí</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-base">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Services - Premium Cards */}
            {profile.services && profile.services.length > 0 && (
              <Card className="shadow-card hover:shadow-elevated transition-all duration-500 border-border/50 animate-fade-in">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 p-2.5 rounded-lg">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-bold">Servicios Legales</span>
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Selecciona el servicio que necesitas y te contactaré para ayudarte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-5">
                    {profile.services.map((service, index) => (
                      <div 
                        key={index} 
                        className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border-2 border-border hover:border-primary shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] overflow-hidden"
                      >
                        {/* Subtle Background Effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500"></div>
                        
                        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/10 p-2 rounded-lg mt-1 group-hover:scale-110 transition-transform duration-300">
                                <Award className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-xl md:text-2xl mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
                                  {service.name}
                                </h4>
                                <p className="text-muted-foreground leading-relaxed text-base">
                                  {service.description}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleServiceClick(service.name)}
                            size="lg"
                            className="shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105 whitespace-nowrap group/btn relative overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                              Solicitar servicio
                            </span>
                            <div className="absolute inset-0 bg-primary-light opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Form - Premium */}
            {showContactForm && (
              <Card ref={contactFormRef} className="border-2 border-primary/50 shadow-elevated hover:shadow-floating transition-all duration-500 scroll-mt-8 animate-scale-in relative overflow-hidden">
                {/* Elegant Background Effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                
                <CardHeader className="relative pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 p-2.5 rounded-lg">
                      <Send className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-bold">Envíame un mensaje</span>
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Cuéntame sobre tu caso y te contactaré lo antes posible
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <form onSubmit={handleSubmitContact} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Nombre completo *
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Tu nombre completo"
                        className="h-12 text-base border-2 focus:border-primary transition-colors duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email *
                      </label>
                      <Input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tu@email.com"
                        className="h-12 text-base border-2 focus:border-primary transition-colors duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Teléfono
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Opcional"
                        className="h-12 text-base border-2 focus:border-primary transition-colors duration-300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Mensaje *
                        {formData.selectedService && (
                          <span className="ml-2 text-xs text-primary font-normal bg-primary/10 px-2 py-1 rounded-full">
                            Servicio: {formData.selectedService}
                          </span>
                        )}
                      </label>
                      <Textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe brevemente tu caso o consulta..."
                        rows={6}
                        className="text-base border-2 focus:border-primary transition-colors duration-300 resize-none"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={submitting}
                      size="lg"
                      className="w-full h-14 text-base font-semibold shadow-elevated hover:shadow-floating transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <span className="relative z-10 flex items-center gap-2">
                            <Send className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            Enviar mensaje
                          </span>
                          <div className="absolute inset-0 bg-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Testimonials - Trust Building */}
            {profile.testimonials && profile.testimonials.length > 0 && (
              <Card className="shadow-card hover:shadow-elevated transition-all duration-500 border-border/50 animate-fade-in">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-secondary/10 p-2.5 rounded-lg">
                      <Star className="h-5 w-5 text-secondary fill-secondary" />
                    </div>
                    <span className="font-bold">Testimonios</span>
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Lo que dicen mis clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile.testimonials.map((testimonial, index) => (
                      <div 
                        key={index} 
                        className="group relative p-6 rounded-xl bg-gradient-to-br from-card via-card to-secondary/5 border-2 border-border hover:border-secondary/30 shadow-sm hover:shadow-card transition-all duration-500 hover:scale-[1.02]"
                      >
                        {/* Quote Icon */}
                        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                          <Star className="h-12 w-12 text-secondary fill-secondary" />
                        </div>
                        
                        <div className="relative space-y-4">
                          {/* Stars */}
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-secondary fill-secondary" />
                            ))}
                          </div>
                          
                          {/* Comment */}
                          <p className="text-base italic text-foreground/90 leading-relaxed">
                            "{testimonial.comment}"
                          </p>
                          
                          {/* Client Info */}
                          <div className="flex items-center gap-3 pt-2">
                            <div className="relative">
                              <div className="absolute inset-0 bg-secondary/20 rounded-full blur-md"></div>
                              <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-secondary-foreground font-bold shadow-sm">
                                {testimonial.client_name.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{testimonial.client_name}</p>
                              <p className="text-xs text-muted-foreground">{testimonial.client_role}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </main>
      
      <Footer onNavigate={() => {}} />
    </div>
  );
}