import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import useSEO from "@/hooks/useSEO";

interface ContactPageProps {
  onOpenChat: (message: string) => void;
  onNavigate?: (page: string) => void;
}

export default function ContactPage({ onOpenChat, onNavigate }: ContactPageProps) {
  // SEO optimization for contact page
  useSEO({
    title: "Contacto - Tu Consultor Legal Colombia | Asesoría Legal Profesional",
    description: "Contacta con Tu Consultor Legal para asesoría legal profesional en Colombia. Consultas gratuitas, soporte 24/7 y atención personalizada para personas y empresas.",
    keywords: "contacto abogado Colombia, consulta legal gratuita, asesoría legal online, soporte jurídico, contacto tu consultor legal",
    canonical: "https://tuconsultorlegal.co/#contacto",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contacto - Tu Consultor Legal",
      "description": "Página de contacto para asesoría legal en Colombia",
      "url": "https://tuconsultorlegal.co/#contacto",
      "mainEntity": {
        "@type": "Organization",
        "name": "Tu Consultor Legal",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+57-1-800-LEGAL",
          "contactType": "customer service",
          "areaServed": "CO",
          "availableLanguage": "Spanish"
        }
      }
    }
  });

  const handleConsultationRequest = () => {
    onOpenChat("Hola, me gustaría solicitar una consulta legal gratuita. ¿Pueden ayudarme?");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Contáctanos
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            ¿Tienes preguntas sobre nuestros servicios o necesitas asesoría legal personalizada? 
            Estamos aquí para ayudarte las 24 horas del día.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Información de Contacto</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Teléfono</h3>
                    <p className="text-muted-foreground">+57 (1) 800-LEGAL</p>
                    <p className="text-sm text-muted-foreground">Línea nacional gratuita</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-muted-foreground">contacto@tuconsultorlegal.co</p>
                    <p className="text-sm text-muted-foreground">Respuesta en 24 horas</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Ubicación</h3>
                    <p className="text-muted-foreground">Colombia</p>
                    <p className="text-sm text-muted-foreground">Servicio nacional</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Horarios</h3>
                    <p className="text-muted-foreground">24/7 - Chat con IA</p>
                    <p className="text-sm text-muted-foreground">Lun-Vie 8AM-6PM - Abogados especialistas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Consulta Inmediata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  ¿Necesitas ayuda ahora? Inicia una conversación con nuestro asistente legal inteligente.
                </p>
                <Button 
                  onClick={handleConsultationRequest}
                  className="w-full"
                  size="lg"
                >
                  Iniciar Consulta Gratuita
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Envíanos un Mensaje</CardTitle>
              <p className="text-muted-foreground">
                Completa el formulario y nos pondremos en contacto contigo pronto.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input placeholder="Tu nombre completo" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input type="email" placeholder="tu@email.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input placeholder="+57 xxx xxx xxxx" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Consulta</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Consulta General</option>
                  <option>Derecho Laboral</option>
                  <option>Derecho Civil</option>
                  <option>Derecho Comercial</option>
                  <option>Documentos Jurídicos</option>
                  <option>Otros</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mensaje *</label>
                <Textarea 
                  placeholder="Describe brevemente tu consulta legal..."
                  rows={5}
                />
              </div>

              <Button className="w-full" size="lg">
                Enviar Mensaje
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Al enviar este formulario, aceptas nuestros{" "}
                <button
                  onClick={() => onNavigate?.("terminos")}
                  className="text-primary hover:underline"
                >
                  términos y condiciones
                </button>{" "}
                y{" "}
                <button
                  onClick={() => onNavigate?.("privacidad")}
                  className="text-primary hover:underline"
                >
                  política de privacidad
                </button>
                .
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">¿Las consultas iniciales son gratuitas?</h3>
                <p className="text-muted-foreground">Sí, ofrecemos consultas iniciales gratuitas para evaluar tu caso y determinar la mejor estrategia legal.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿En qué horarios puedo contactarlos?</h3>
                <p className="text-muted-foreground">Nuestro chat con IA está disponible 24/7. Los abogados especialistas atienden de lunes a viernes de 8AM a 6PM.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Atienden casos en todo Colombia?</h3>
                <p className="text-muted-foreground">Sí, brindamos servicios legales a nivel nacional en Colombia a través de nuestra plataforma digital.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">¿Qué métodos de pago aceptan?</h3>
                <p className="text-muted-foreground">Aceptamos tarjetas de crédito, débito, PSE, transferencias bancarias y efectivo en puntos autorizados.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Los documentos son válidos legalmente?</h3>
                <p className="text-muted-foreground">Todos nuestros documentos son revisados y validados por abogados certificados antes de ser entregados.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Ofrecen seguimiento post-servicio?</h3>
                <p className="text-muted-foreground">Sí, incluimos seguimiento y soporte para aclarar dudas sobre los documentos entregados.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-muted/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">¿Listo para Resolver tu Consulta Legal?</h2>
            <p className="text-muted-foreground mb-6">
              No esperes más. Comienza tu consulta legal ahora mismo con nuestro equipo de expertos.
            </p>
            <Button 
              size="lg" 
              onClick={handleConsultationRequest}
            >
              Comenzar Consulta Ahora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}