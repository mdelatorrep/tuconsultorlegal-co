import { useState, useEffect } from "react";
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
    message: ""
  });

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
        message: ""
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-blue-500/5">
      <Header 
        currentPage="perfil" 
        onNavigate={() => {}} 
        onOpenChat={() => {}} 
      />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <Card className="mb-8 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-blue-500/5">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32"></div>
          <CardContent className="relative pt-0 pb-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 px-4">
              <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                <AvatarImage src={profile.profile_photo || undefined} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  {profile.lawyer_info?.full_name.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 mt-4 md:mt-0">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {profile.lawyer_info?.full_name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {specialty}
                    </Badge>
                  ))}
                </div>
                {profile.years_of_experience && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{profile.years_of_experience} años de experiencia</span>
                  </div>
                )}
              </div>
              
              <Button 
                size="lg"
                onClick={() => setShowContactForm(!showContactForm)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-lg"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Solicita una consulta
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Bio */}
            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Acerca de mí
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {profile.services && profile.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Servicios ofrecidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile.services.map((service, index) => (
                      <div key={index} className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200">
                        <h4 className="font-semibold text-lg mb-2">{service.name}</h4>
                        <p className="text-muted-foreground">{service.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Form */}
            {showContactForm && (
              <Card className="border-blue-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    Envíame un mensaje
                  </CardTitle>
                  <CardDescription>
                    Cuéntame sobre tu caso y te contactaré lo antes posible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitContact} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Nombre completo *
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Tu nombre"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Email *
                      </label>
                      <Input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tu@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Teléfono
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Mensaje *
                      </label>
                      <Textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe brevemente tu caso o consulta..."
                        rows={5}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar mensaje
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
            {/* Testimonials */}
            {profile.testimonials && profile.testimonials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Testimonios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profile.testimonials.map((testimonial, index) => (
                      <div key={index} className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                        <p className="text-sm italic mb-3 text-muted-foreground">
                          "{testimonial.comment}"
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-semibold">
                            {testimonial.client_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{testimonial.client_name}</p>
                            <p className="text-xs text-muted-foreground">{testimonial.client_role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Contact */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Contacto rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowContactForm(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar mensaje
                </Button>
                {profile.lawyer_info?.email && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={`mailto:${profile.lawyer_info.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer onNavigate={() => {}} />
    </div>
  );
}