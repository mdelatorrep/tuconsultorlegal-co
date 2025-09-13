import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, FileText } from 'lucide-react';

interface LawyerTermsAndConditionsProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const LawyerTermsAndConditions: React.FC<LawyerTermsAndConditionsProps> = ({
  open,
  onAccept,
  onDecline
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToSubscription, setAgreedToSubscription] = useState(false);

  const handleAccept = () => {
    if (agreedToTerms && agreedToSubscription) {
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Términos y Condiciones para Abogados - Servicios de Suscripción
          </DialogTitle>
          <DialogDescription>
            Por favor, lee y acepta los términos específicos para el servicio de suscripción para abogados
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 text-sm">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-800 mb-2">Aviso Importante</h4>
                  <p className="text-orange-700">
                    Estos términos complementan los términos generales de uso de tuconsultorlegal.co y se aplican específicamente a los servicios de suscripción para abogados.
                  </p>
                </div>
              </div>
            </div>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">1. SERVICIOS DE SUSCRIPCIÓN PARA ABOGADOS</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">1.1 Naturaleza del Servicio</h4>
                  <p className="text-muted-foreground">
                    Los servicios de suscripción para abogados en tuconsultorlegal.co proporcionan acceso a herramientas tecnológicas de inteligencia artificial y automatización para la práctica legal, incluyendo:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                    <li>Acceso a herramientas de IA para análisis legal</li>
                    <li>Sistemas de gestión de documentos y casos (CRM)</li>
                    <li>Herramientas de redacción y revisión automatizada</li>
                    <li>Capacitación y certificación en tecnologías legales</li>
                    <li>Soporte técnico especializado</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">1.2 Requisitos del Suscriptor</h4>
                  <p className="text-muted-foreground">
                    Para acceder a los servicios de suscripción, el usuario debe:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                    <li>Ser abogado titulado y colegiado en Colombia</li>
                    <li>Mantener una tarjeta profesional vigente</li>
                    <li>Cumplir con las normas éticas de la profesión legal</li>
                    <li>Proporcionar información veraz sobre su práctica profesional</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">2. TÉRMINOS DE PAGO Y FACTURACIÓN</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">2.1 Modalidades de Pago</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li><strong>Suscripción Mensual:</strong> Pago automático cada 30 días</li>
                    <li><strong>Suscripción Anual:</strong> Pago único anual con descuentos aplicables</li>
                    <li>Los pagos se procesan a través de pasarelas seguras (dLocal, Bold)</li>
                    <li>Los precios pueden incluir IVA según la legislación colombiana vigente</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2.2 Renovación Automática</h4>
                  <p className="text-muted-foreground">
                    Las suscripciones se renuevan automáticamente al final de cada período de facturación, a menos que se cancelen con al menos 24 horas de anticipación a la fecha de renovación.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2.3 Política de Reembolsos</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Período de prueba de 7 días para nuevas suscripciones</li>
                    <li>Reembolso completo si se cancela dentro del período de prueba</li>
                    <li>No hay reembolsos por cancelaciones después del período de prueba</li>
                    <li>Los pagos anuales no son reembolsables después de 30 días</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">3. USO RESPONSABLE DE LAS HERRAMIENTAS DE IA</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">3.1 Supervisión Profesional</h4>
                  <p className="text-muted-foreground">
                    El abogado suscriptor se compromete a:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                    <li>Revisar y validar todo contenido generado por IA antes de su uso</li>
                    <li>Mantener la responsabilidad profesional sobre los documentos finales</li>
                    <li>No delegar exclusivamente en la IA decisiones que requieren criterio legal</li>
                    <li>Cumplir con las normas deontológicas de la profesión legal</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3.2 Confidencialidad</h4>
                  <p className="text-muted-foreground">
                    La información procesada a través de las herramientas está protegida por nuestras políticas de privacidad y confidencialidad. El suscriptor se compromete a no compartir credenciales de acceso y a proteger la información de sus clientes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">4. SUSPENSIÓN Y TERMINACIÓN</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">4.1 Causales de Suspensión</h4>
                  <p className="text-muted-foreground">
                    El servicio puede ser suspendido por:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                    <li>Falta de pago en las fechas establecidas</li>
                    <li>Uso inadecuado de las herramientas de IA</li>
                    <li>Violación de normas éticas profesionales</li>
                    <li>Compartir credenciales de acceso con terceros</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">4.2 Terminación por Parte del Usuario</h4>
                  <p className="text-muted-foreground">
                    El usuario puede cancelar su suscripción en cualquier momento a través de su panel de control. La cancelación será efectiva al final del período de facturación actual.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">5. RESPONSABILIDAD Y LIMITACIONES</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">5.1 Responsabilidad del Suscriptor</h4>
                  <p className="text-muted-foreground">
                    El abogado suscriptor mantiene la total responsabilidad profesional y legal por:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                    <li>La calidad y exactitud de los documentos finales entregados a clientes</li>
                    <li>El cumplimiento de las normas éticas y legales aplicables</li>
                    <li>La supervisión adecuada del uso de herramientas de IA</li>
                    <li>La protección de la información confidencial de clientes</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">5.2 Limitaciones de Responsabilidad de TuConsultorLegal.co</h4>
                  <p className="text-muted-foreground">
                    Nuestra responsabilidad se limita a proporcionar las herramientas tecnológicas según los términos de la suscripción. No asumimos responsabilidad por decisiones profesionales tomadas por el suscriptor.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">6. SOPORTE Y ACTUALIZACIONES</h3>
              <p className="text-muted-foreground">
                Los suscriptores tienen acceso a:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                <li>Soporte técnico especializado durante horarios de oficina</li>
                <li>Actualizaciones automáticas de las herramientas</li>
                <li>Capacitación continua en nuevas funcionalidades</li>
                <li>Documentación técnica y mejores prácticas</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">7. MODIFICACIONES</h3>
              <p className="text-muted-foreground">
                Estos términos pueden ser modificados con previo aviso de 30 días. Los cambios en precios se notificarán con 60 días de anticipación. El uso continuado del servicio constituye aceptación de las modificaciones.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-primary mb-3">8. CONTACTO Y SOPORTE</h3>
              <p className="text-muted-foreground">
                Para consultas sobre suscripciones:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                <li>Email: suscripciones@tuconsultorlegal.co</li>
                <li>Soporte técnico: soporte@tuconsultorlegal.co</li>
                <li>Teléfono: +57 (4) 444-5555</li>
                <li>Horario de atención: Lunes a Viernes 8:00 AM - 6:00 PM</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
              />
              <label 
                htmlFor="terms" 
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                He leído y acepto los <strong>Términos y Condiciones Generales</strong> de tuconsultorlegal.co
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox 
                id="subscription" 
                checked={agreedToSubscription}
                onCheckedChange={(checked) => setAgreedToSubscription(!!checked)}
              />
              <label 
                htmlFor="subscription" 
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                He leído y acepto los <strong>Términos Específicos de Suscripción para Abogados</strong> y entiendo mi responsabilidad profesional en el uso de herramientas de IA
              </label>
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button 
              variant="outline" 
              onClick={onDecline}
              className="flex-1"
            >
              Rechazar
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={!agreedToTerms || !agreedToSubscription}
              className="flex-1"
            >
              Aceptar y Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};