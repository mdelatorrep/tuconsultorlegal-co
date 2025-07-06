import { Button } from "./ui/button";
import { Home, FileText, Briefcase, Car, Eye, Shield, Check } from "lucide-react";

interface PersonasPageProps {
  onOpenChat: (message: string) => void;
  onNavigate?: (page: string) => void;
}

export default function PersonasPage({ onOpenChat, onNavigate }: PersonasPageProps) {
  
  const handleDocumentAction = (service: any) => {
    // Para servicios pagos, simular que se va directo a la página de pago
    if (service.price !== "Gratis" && onNavigate) {
      const price = service.price.replace(/[^\d]/g, ''); // Extract only numbers
      const params = new URLSearchParams({
        document: service.title,
        price: price,
        description: service.description
      });
      window.history.pushState(null, "", `#documento-pago?${params.toString()}`);
      onNavigate('documento-pago');
    } else {
      // Para servicios gratuitos, abrir chat normal
      onOpenChat(service.message);
    }
  };
  const services = [
    {
      category: "Vivienda y Arriendos",
      color: "border-legal-blue",
      items: [
        {
          icon: <Home className="w-10 h-10" />,
          title: "Contrato de Arrendamiento",
          description: "Crea un contrato para vivienda urbana, cumpliendo con la Ley 820 de 2003. Protege tu patrimonio y asegura una relación clara.",
          price: "Desde $50.000 COP",
          buttonText: "Crear Contrato",
          message: "Quiero crear un contrato de arrendamiento de vivienda.",
          color: "text-legal-blue"
        },
        {
          icon: <FileText className="w-10 h-10" />,
          title: "Preaviso de Terminación",
          description: "Notifica a tu arrendador o arrendatario la terminación del contrato de arrendamiento, cumpliendo con los plazos legales.",
          price: "Desde $30.000 COP",
          buttonText: "Generar Preaviso",
          message: "Necesito un preaviso para terminar un contrato de arriendo.",
          color: "text-legal-blue"
        }
      ]
    },
    {
      category: "Trabajo y Empleo",
      color: "border-success",
      items: [
        {
          icon: <Briefcase className="w-10 h-10" />,
          title: "Contrato de Trabajo",
          description: "Formaliza la relación con tus empleados con un contrato a término fijo, con todas las cláusulas de ley y cálculo de periodo de prueba.",
          price: "Desde $40.000 COP",
          buttonText: "Crear Contrato",
          message: "Quiero crear un contrato de trabajo a término fijo.",
          color: "text-success"
        },
        {
          icon: <FileText className="w-10 h-10" />,
          title: "Carta de Renuncia",
          description: "Genera una carta de renuncia profesional y respetuosa para presentar a tu empleador, asegurando un proceso de salida claro.",
          price: "Gratis",
          buttonText: "Redactar Carta",
          message: "Necesito redactar mi carta de renuncia.",
          color: "text-success"
        }
      ]
    },
    {
      category: "Finanzas y Acuerdos Personales",
      color: "border-rose-500",
      items: [
        {
          icon: <Car className="w-10 h-10" />,
          title: "Compraventa de Vehículo",
          description: "Asegura la venta o compra de un carro o moto con un contrato que protege a ambas partes y define las responsabilidades.",
          price: "Desde $45.000 COP",
          buttonText: "Crear Contrato",
          message: "Quiero hacer un contrato de compraventa de vehículo.",
          color: "text-rose-600"
        },
        {
          icon: <Eye className="w-10 h-10" />,
          title: "Pagaré",
          description: "Crea un título valor para respaldar una deuda. Ideal para préstamos personales, con o sin carta de instrucciones.",
          price: "Desde $25.000 COP",
          buttonText: "Generar Pagaré",
          message: "Necesito generar un pagaré.",
          color: "text-rose-600"
        },
        {
          icon: <Shield className="w-10 h-10" />,
          title: "Reclamación por Garantía",
          description: "Exige tus derechos como consumidor. Redacta una reclamación formal por un producto defectuoso o un servicio mal prestado.",
          price: "Desde $35.000 COP",
          buttonText: "Iniciar Reclamo",
          message: "Quiero hacer una reclamación por garantía.",
          color: "text-rose-600"
        }
      ]
    }
  ];

  const additionalServices = [
    "Derecho de Familia: Divorcios, cuotas alimentarias.",
    "Trámites Notariales: Autenticaciones, declaraciones.",
    "Y mucho más..."
  ];

  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
          Soluciones Legales para tu Día a Día
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Simplificamos la gestión de tus documentos y la resolución de tus dudas legales. 
          Encuentra el servicio que necesitas a continuación.
        </p>
      </div>

      {/* Services by Category */}
      {services.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-16">
          <h2 className={`text-3xl font-bold mb-8 border-l-4 ${category.color} pl-4`}>
            {category.category}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {category.items.map((service, index) => (
              <div key={index} className="bg-card rounded-lg shadow-card overflow-hidden transform hover:-translate-y-2 transition-smooth flex flex-col">
                <div className="p-8 flex-grow">
                  <div className={`${service.color} mb-4`}>
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-foreground">{service.title}</h3>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                </div>
                <div className="p-8 pt-0">
                  <p className="text-xl font-bold text-success mb-6">{service.price}</p>
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={() => handleDocumentAction(service)}
                  >
                    {service.buttonText}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Additional Services CTA */}
      <div className="bg-muted rounded-lg p-10 mt-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-foreground">¿Tu caso es diferente?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Si no encuentras el documento que necesitas o tu situación es más compleja, 
              nuestro asistente de IA puede darte una primera orientación confiable.
            </p>
            <Button
              variant="success"
              size="lg"
              onClick={() => onOpenChat("Tengo una duda legal y necesito asesoría.")}
            >
              Iniciar Asesoría Gratuita
            </Button>
          </div>
          <div className="text-muted-foreground space-y-3">
            {additionalServices.map((service, index) => (
              <p key={index} className="flex items-start">
                <Check className="w-6 h-6 mr-3 text-success flex-shrink-0 mt-1" />
                <span><strong>{service.split(':')[0]}:</strong> {service.split(':')[1] || ""}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}