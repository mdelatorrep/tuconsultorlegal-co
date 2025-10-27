import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrivacyPolicyPageProps {
  onOpenChat: (message?: string) => void;
}

export default function PrivacyPolicyPage({ onOpenChat }: PrivacyPolicyPageProps) {
  const [content, setContent] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_content')
        .select('title, content')
        .eq('page_key', 'privacy-policy')
        .single();

      if (error) throw error;
      setContent(data);
    } catch (error) {
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
              {content?.title || 'Política de Privacidad y Tratamiento de Datos Personales'}
            </h1>
            <p className="text-lg text-muted-foreground">TUCONSULTORLEGAL.CO</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div 
              className="bg-card p-6 rounded-lg border"
              dangerouslySetInnerHTML={{ __html: content?.content || '' }}
            />

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">1. RESPONSABLE DEL TRATAMIENTO</h2>
              <p className="text-foreground mb-4">El responsable del tratamiento de tus datos personales es:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  <strong>Razón Social:</strong> TU CONSULTOR LEGAL S.A.S.
                </li>
                <li>
                  <strong>NIT:</strong> [Número de NIT de la empresa]
                </li>
                <li>
                  <strong>Domicilio:</strong> Envigado, Antioquia, Colombia.
                </li>
                <li>
                  <strong>Correo electrónico para notificaciones y ejercicio de derechos:</strong>{" "}
                  contacto@tuconsultorlegal.co
                </li>
                <li>
                  <strong>Sitio web:</strong> www.tuconsultorlegal.co
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">2. INFORMACIÓN QUE RECOPILAMOS</h2>
              <p className="text-foreground mb-4">
                Para prestar nuestros servicios de manera efectiva, recopilamos la siguiente información que tú nos
                proporcionas directamente a través de tu interacción con nuestro Asistente de IA ("Lexi") y la
                Plataforma:
              </p>
              <ul className="list-disc pl-6 space-y-3 text-foreground">
                <li>
                  <strong>Datos de Identificación:</strong> Nombres y apellidos, número de cédula de ciudadanía o de
                  extranjería, fecha de nacimiento, estado civil.
                </li>
                <li>
                  <strong>Datos de Contacto:</strong> Dirección de correo electrónico, número de teléfono, domicilio.
                </li>
                <li>
                  <strong>Datos Relacionados con el Caso:</strong> Toda la información, hechos, narraciones y detalles
                  que proporciones sobre tu situación o necesidad legal. Esto puede incluir información sobre relaciones
                  laborales, contractuales, familiares, comerciales, entre otras.
                </li>
                <li>
                  <strong>Datos de Terceros:</strong> Si para la elaboración de un documento nos proporcionas datos de
                  otras personas (por ejemplo, la contraparte en un contrato), declaras que cuentas con la autorización
                  de dichos terceros para suministrar su información.
                </li>
                <li>
                  <strong>Datos Técnicos y de Uso:</strong> Información sobre cómo interactúas con nuestra Plataforma,
                  como dirección IP, tipo de dispositivo y navegador.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">3. TRATAMIENTO DE DATOS SENSIBLES</h2>
              <p className="text-foreground mb-4">
                Reconocemos que, por la naturaleza de los servicios legales, podrías suministrarnos datos sensibles.
                Estos son datos que afectan tu intimidad o cuyo uso indebido puede generar discriminación, tales como
                aquellos que revelen tu origen racial o étnico, opiniones políticas, convicciones religiosas o
                filosóficas, pertenencia a sindicatos, datos relativos a la salud, a la vida sexual y datos biométricos.
              </p>
              <p className="text-foreground">
                Tu autorización para el tratamiento de datos sensibles es voluntaria y explícita. Al aceptar esta
                política y proporcionar dicha información, nos otorgas tu consentimiento expreso para tratarla con la
                única finalidad de prestar el servicio legal solicitado. Nos comprometemos a tratar estos datos con un
                nivel de seguridad reforzado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">4. FINALIDAD DEL TRATAMIENTO DE DATOS</h2>
              <p className="text-foreground mb-4">Utilizamos tus datos personales para las siguientes finalidades:</p>
              <ul className="list-disc pl-6 space-y-3 text-foreground">
                <li>
                  <strong>Prestación del Servicio Contratado:</strong> Usar la información para que nuestro Asistente de
                  IA genere un borrador inicial del documento o la consulta solicitada.
                </li>
                <li>
                  <strong>Revisión Humana por Parte de Abogados:</strong> Compartir la información recopilada con los
                  abogados humanos de nuestra red para que realicen la revisión, validación, corrección y aprobación
                  final del servicio.
                </li>
                <li>
                  <strong>Comunicación Contigo:</strong> Enviarte el documento final, notificaciones sobre el estado de
                  tu servicio, responder a tus preguntas y brindarte soporte.
                </li>
                <li>
                  <strong>Facturación y Cobro:</strong> Procesar los pagos por los servicios adquiridos.
                </li>
                <li>
                  <strong>Mejora de Nuestros Servicios:</strong> Analizar datos de uso de forma anonimizada para
                  entender cómo mejorar nuestra Plataforma y la experiencia del usuario.
                </li>
                <li>
                  <strong>Marketing y Comunicaciones Comerciales:</strong> Ocasionalmente, y solo si nos das tu
                  consentimiento para ello, enviarte información sobre nuevos servicios, promociones o artículos de
                  nuestro blog que puedan ser de tu interés. Podrás darte de baja de estas comunicaciones en cualquier
                  momento.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">5. DERECHOS DEL TITULAR DE LOS DATOS</h2>
              <p className="text-foreground mb-4">
                Como titular de tus datos personales, tienes los siguientes derechos, consagrados en el artículo 8 de la
                Ley 1581 de 2012:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Conocer, actualizar y rectificar tus datos personales.</li>
                <li>Solicitar prueba de la autorización otorgada para el tratamiento de tus datos.</li>
                <li>Ser informado sobre el uso que se le ha dado a tus datos personales.</li>
                <li>Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.</li>
                <li>
                  Revocar la autorización y/o solicitar la supresión de tus datos cuando no se respeten los principios,
                  derechos y garantías constitucionales y legales.
                </li>
                <li>Acceder en forma gratuita a tus datos personales que hayan sido objeto de tratamiento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">6. PROCEDIMIENTO PARA EJERCER TUS DERECHOS</h2>
              <p className="text-foreground mb-4">
                Para ejercer cualquiera de tus derechos, puedes enviar una solicitud formal al correo electrónico
                contacto@tuconsultorlegal.co. Tu solicitud deberá contener como mínimo:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground mb-4">
                <li>Nombre completo y número de identificación.</li>
                <li>Descripción clara de la solicitud (qué derecho deseas ejercer y sobre qué datos).</li>
                <li>Datos de contacto para recibir la respuesta.</li>
              </ul>
              <p className="text-foreground">
                Daremos respuesta a tu consulta en un término máximo de diez (10) días hábiles y a tus reclamos en un
                término máximo de quince (15) días hábiles, contados a partir del día siguiente a la fecha de su recibo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">7. SEGURIDAD DE LA INFORMACIÓN</h2>
              <p className="text-foreground">
                Hemos implementado medidas de seguridad técnicas, humanas y administrativas para proteger tu información
                contra el acceso no autorizado, la pérdida, el uso indebido o la alteración. Esto incluye el uso de
                cifrado, controles de acceso y la firma de acuerdos de confidencialidad con nuestros empleados y
                abogados colaboradores.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">
                8. TRANSFERENCIA Y TRANSMISIÓN DE DATOS A TERCEROS
              </h2>
              <p className="text-foreground mb-4">
                Para poder operar, compartimos tu información con terceros bajo estrictas condiciones de
                confidencialidad y seguridad:
              </p>
              <ul className="list-disc pl-6 space-y-3 text-foreground">
                <li>
                  <strong>Abogados Revisores:</strong> Compartimos la información de tu caso con los abogados de nuestra
                  red, quienes están sujetos al secreto profesional y a obligaciones contractuales de confidencialidad.
                </li>
                <li>
                  <strong>Proveedores Tecnológicos:</strong> Utilizamos servicios de terceros para el funcionamiento de
                  la Plataforma, como proveedores de hosting (almacenamiento en la nube) y plataformas de inteligencia
                  artificial. Es posible que estos proveedores se encuentren fuera de Colombia. En dichos casos, nos
                  aseguramos de que cumplan con estándares de protección de datos adecuados y se suscriban los contratos
                  de transmisión de datos personales correspondientes.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">9. VIGENCIA</h2>
              <p className="text-foreground mb-4">
                Esta Política de Privacidad rige a partir de su publicación. Tus datos personales serán tratados durante
                el tiempo que sea necesario para cumplir con las finalidades para las que fueron recopilados, y para
                cumplir con las obligaciones legales de conservación de información.
              </p>
              <p className="text-foreground">
                TU CONSULTOR LEGAL S.A.S. se reserva el derecho de modificar esta política. Cualquier cambio sustancial
                será comunicado oportunamente a través de la Plataforma o al correo electrónico que nos hayas
                proporcionado.
              </p>
            </section>

            <div className="mt-12 bg-success/10 border-l-4 border-success p-6 rounded-r-lg">
              <h3 className="text-2xl font-bold text-success-foreground">¿Tienes dudas sobre nuestras políticas?</h3>
              <p className="text-success-foreground/80 mt-2 mb-4">
                Si tienes preguntas sobre cómo manejamos tus datos o quieres ejercer alguno de tus derechos, estamos
                aquí para ayudarte.
              </p>
              <button
                onClick={() => onOpenChat("Tengo una pregunta sobre la política de privacidad")}
                className="bg-success text-success-foreground px-6 py-3 rounded-lg font-bold hover:bg-success/90 transition-smooth"
              >
                Consultar con Lexi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
