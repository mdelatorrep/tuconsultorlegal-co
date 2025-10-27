import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TermsAndConditionsPageProps {
  onOpenChat: (message?: string) => void;
}

export default function TermsAndConditionsPage({ onOpenChat }: TermsAndConditionsPageProps) {
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
        .eq('page_key', 'terms-and-conditions')
        .single();

      if (error) throw error;
      setContent(data);
    } catch (error) {
      console.error('Error loading terms:', error);
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
              {content?.title || 'Términos y Condiciones de Uso'}
            </h1>
            <p className="text-lg text-muted-foreground">TUCONSULTORLEGAL.CO</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div 
              className="bg-card p-6 rounded-lg border"
              dangerouslySetInnerHTML={{ __html: content?.content || '' }}
            />

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">1. DEFINICIONES</h2>
              <ul className="list-disc pl-6 space-y-3 text-foreground">
                <li>
                  <strong>Plataforma:</strong> Se refiere al sitio web www.tuconsultorlegal.co y todas sus
                  funcionalidades.
                </li>
                <li>
                  <strong>Usuario:</strong> Toda persona natural o jurídica que accede y/o utiliza los servicios de la
                  Plataforma.
                </li>
                <li>
                  <strong>Lexi (Asistente de IA):</strong> La herramienta de inteligencia artificial de la Plataforma
                  que interactúa con el Usuario para recopilar información, ofrecer orientación preliminar y generar
                  borradores iniciales de documentos.
                </li>
                <li>
                  <strong>Servicios:</strong> Incluye, pero no se limita a, la generación de documentos legales y la
                  prestación de asesoría jurídica inicial a través del Asistente de IA, siempre sujetos a una Revisión
                  Humana final.
                </li>
                <li>
                  <strong>Revisión Humana:</strong> El proceso mediante el cual un abogado humano, colegiado y con
                  licencia para ejercer en Colombia, revisa, valida, corrige y aprueba el borrador del documento o la
                  orientación generada por el Asistente de IA antes de su entrega final al Usuario.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">2. NATURALEZA Y ALCANCE DEL SERVICIO</h2>
              <p className="text-foreground mb-4 font-semibold">
                Este es el punto más importante. Queremos ser completamente transparentes sobre cómo funcionamos:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    Servicio de Información y Asistencia Tecnológica:
                  </h3>
                  <p className="text-foreground">
                    El Usuario reconoce y acepta que Lexi (nuestro Asistente de IA) no es un abogado y las interacciones
                    iniciales con él no constituyen una asesoría legal formal ni establecen una relación
                    abogado-cliente. Lexi es una herramienta tecnológica avanzada diseñada para recopilar información y
                    generar borradores basados en plantillas y datos estandarizados.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No es Asesoría Jurídica Instantánea:</h3>
                  <p className="text-foreground">
                    La información proporcionada por Lexi es de carácter orientativo y preliminar. Las decisiones
                    legales no deben basarse únicamente en la información generada por el Asistente de IA.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">La Importancia de la Revisión Humana:</h3>
                  <p className="text-foreground">
                    El servicio legal de tuconsultorlegal.co se perfecciona y finaliza ÚNICAMENTE cuando el documento o
                    la consulta ha pasado por el proceso de Revisión Humana. El documento final validado por uno de
                    nuestros abogados humanos es el producto por el cual nuestra firma asume responsabilidad
                    profesional.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">3. OBLIGACIONES DEL USUARIO</h2>
              <p className="text-foreground mb-4">Al utilizar nuestros Servicios, te comprometes a:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Ser mayor de edad y tener plena capacidad legal para contratar según la legislación colombiana.</li>
                <li>
                  Proporcionar información veraz, precisa, completa y actualizada durante tu interacción con el
                  Asistente de IA. La calidad y validez del documento final dependen directamente de la exactitud de la
                  información que suministres.
                </li>
                <li>
                  Utilizar la Plataforma y los documentos generados para fines lícitos y de acuerdo con la ley
                  colombiana.
                </li>
                <li>Custodiar la confidencialidad de cualquier credencial de acceso a la Plataforma.</li>
                <li>
                  No utilizar la Plataforma para realizar actos de ingeniería inversa, descompilar el software o
                  intentar acceder a nuestro código fuente.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">4. PROPIEDAD INTELECTUAL</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">De la Plataforma:</h3>
                  <p className="text-foreground">
                    Todo el contenido del sitio web, incluyendo el diseño, textos, gráficos, logos, íconos, el software,
                    y el Asistente de IA "Lexi", son propiedad exclusiva de TU CONSULTOR LEGAL S.A.S. o de sus
                    licenciantes y están protegidos por las leyes de propiedad intelectual de Colombia.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">De los Documentos Finales:</h3>
                  <p className="text-foreground">
                    Una vez el Usuario ha pagado por un Servicio y el documento ha sido entregado tras la Revisión
                    Humana, el Usuario adquiere una licencia de uso personal y no exclusiva sobre dicho documento final
                    para los fines para los que fue creado. No está permitida su reventa o distribución masiva.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">5. TARIFAS Y PAGOS</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  Los precios de los Servicios serán indicados de manera clara y previa a la confirmación de la compra
                  por parte del Usuario.
                </li>
                <li>El pago se realizará a través de las pasarelas de pago seguras habilitadas en la Plataforma.</li>
                <li>
                  El Servicio se entenderá prestado y completado una vez el documento final, validado por un abogado,
                  sea enviado al correo electrónico proporcionado por el Usuario. No se realizarán reembolsos una vez
                  iniciado el proceso de Revisión Humana.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">6. LIMITACIÓN DE RESPONSABILIDAD</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  TU CONSULTOR LEGAL S.A.S. no será responsable por las decisiones o acciones que el Usuario tome
                  basándose exclusivamente en la información preliminar proporcionada por el Asistente de IA antes de la
                  Revisión Humana.
                </li>
                <li>
                  Nuestra responsabilidad profesional, sujeta a la normativa que rige la profesión de abogado en
                  Colombia, se limita al contenido y la idoneidad del documento o consulta final que ha sido objeto de
                  Revisión Humana y entregado al Usuario.
                </li>
                <li>
                  No garantizamos que la Plataforma esté libre de errores o interrupciones, pero nos comprometemos a
                  realizar nuestros mejores esfuerzos para asegurar su correcto funcionamiento.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">7. TRATAMIENTO DE DATOS PERSONALES</h2>
              <p className="text-foreground">
                La privacidad de tu información es de suma importancia para nosotros. La recopilación y el tratamiento
                de tus datos personales se rigen por nuestra Política de Privacidad y Tratamiento de Datos, la cual
                puedes consultar aquí. Dicha política se entiende como parte integral de estos T&C y cumple con la Ley
                1581 de 2012 y sus decretos reglamentarios.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">8. MODIFICACIONES</h2>
              <p className="text-foreground">
                TU CONSULTOR LEGAL S.A.S. se reserva el derecho de modificar estos T&C en cualquier momento. Cualquier
                cambio será notificado a través de la Plataforma o por correo electrónico. El uso continuado de los
                Servicios después de una modificación constituirá la aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">9. LEY APLICABLE Y JURISDICCIÓN</h2>
              <p className="text-foreground">
                Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de la República de
                Colombia. Cualquier controversia que surja de su interpretación o aplicación será sometida a la
                jurisdicción de los jueces y tribunales competentes de la ciudad de Envigado, Antioquia, Colombia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">
                11. TÉRMINOS ESPECÍFICOS PARA SERVICIOS DE SUSCRIPCIÓN PARA ABOGADOS
              </h2>

              <div className="bg-accent/10 border border-accent/20 p-6 rounded-lg mb-6">
                <h4 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Servicios Especializados para Profesionales del Derecho
                </h4>
                <p className="text-foreground">
                  Esta sección establece términos adicionales que se aplican específicamente a los abogados que
                  contratan servicios de suscripción en nuestra plataforma.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    11.1 Naturaleza de los Servicios de Suscripción
                  </h3>
                  <p className="text-foreground mb-3">
                    Los servicios de suscripción para abogados proporcionan acceso a herramientas tecnológicas avanzadas
                    que incluyen:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Herramientas de inteligencia artificial para análisis y redacción legal</li>
                    <li>Sistema de gestión de relaciones con clientes (CRM) especializado</li>
                    <li>Automatización de documentos y procesos legales</li>
                    <li>Herramientas de investigación jurídica asistida por IA</li>
                    <li>Capacitación y certificación en tecnologías legales</li>
                    <li>Soporte técnico especializado para abogados</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.2 Requisitos del Suscriptor</h3>
                  <p className="text-foreground mb-3">
                    Para acceder a los servicios de suscripción, el abogado debe cumplir con:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-foreground">
                    <li>Ser abogado titulado y debidamente colegiado en Colombia</li>
                    <li>Mantener vigente su tarjeta profesional expedida por el Consejo Superior de la Judicatura</li>
                    <li>Cumplir con las normas éticas y deontológicas de la profesión legal</li>
                    <li>Proporcionar información veraz y actualizada sobre su ejercicio profesional</li>
                    <li>No tener sanciones disciplinarias vigentes que impidan el ejercicio de la profesión</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.3 Términos de Facturación y Pago</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Modalidades de Suscripción:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>
                          <strong>Suscripción Mensual:</strong> Facturación y cobro automático cada 30 días
                        </li>
                        <li>
                          <strong>Suscripción Anual:</strong> Pago único anual con descuentos por pronto pago
                        </li>
                        <li>Los pagos se procesan mediante pasarelas seguras certificadas (dLocal, Bold)</li>
                        <li>
                          Los precios están expresados en dólares estadounidenses (USD) e incluyen los impuestos
                          aplicables según la legislación colombiana
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Renovación y Cancelación:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Las suscripciones se renuevan automáticamente al finalizar cada período</li>
                        <li>
                          El suscriptor puede cancelar con al menos 24 horas de anticipación a la fecha de renovación
                        </li>
                        <li>La cancelación será efectiva al final del período de facturación actual</li>
                        <li>No se generan reembolsos por cancelaciones posteriores al período de prueba</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Política de Reembolsos:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Período de prueba de 7 días calendario para nuevas suscripciones</li>
                        <li>Reembolso del 100% si se cancela dentro del período de prueba</li>
                        <li>Las suscripciones anuales pueden reembolsarse dentro de los primeros 30 días</li>
                        <li>No se otorgan reembolsos proporcionales por cancelaciones anticipadas</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    11.4 Uso Responsable de Herramientas de Inteligencia Artificial
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-4">
                    <p className="text-orange-800 font-semibold">
                      ⚠️ Responsabilidad Profesional: El abogado suscriptor mantiene la total responsabilidad
                      profesional y ética sobre el uso de las herramientas de IA.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Obligaciones del Suscriptor:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>
                          Revisar, validar y supervisar todo contenido generado por herramientas de IA antes de su uso o
                          entrega a clientes
                        </li>
                        <li>
                          Mantener la responsabilidad profesional total sobre los documentos y consejos legales finales
                        </li>
                        <li>No delegar exclusivamente en la IA decisiones que requieren criterio legal profesional</li>
                        <li>Cumplir con las normas deontológicas del Código de Ética Profesional del Abogado</li>
                        <li>
                          Informar adecuadamente a los clientes sobre el uso de herramientas tecnológicas en su caso
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Limitaciones de las Herramientas de IA:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>
                          Las herramientas de IA son auxiliares y no sustituyen el criterio profesional del abogado
                        </li>
                        <li>Los resultados generados requieren siempre revisión y validación humana</li>
                        <li>No garantizamos la exactitud absoluta de las sugerencias o contenidos generados</li>
                        <li>El suscriptor debe verificar la vigencia de normas y jurisprudencia sugeridas</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    11.5 Confidencialidad y Protección de Datos
                  </h3>
                  <div className="space-y-3">
                    <p className="text-foreground">
                      <strong>Compromiso de Confidencialidad:</strong> Toda la información procesada a través de
                      nuestras herramientas está protegida por estrictas medidas de seguridad y confidencialidad.
                      Cumplimos con la Ley 1581 de 2012 de Protección de Datos Personales y sus decretos reglamentarios.
                    </p>
                    <div>
                      <h4 className="font-semibold mb-2">Obligaciones del Suscriptor:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Proteger las credenciales de acceso y no compartirlas con terceros</li>
                        <li>
                          Mantener la confidencialidad de la información de sus clientes según el secreto profesional
                        </li>
                        <li>Informar inmediatamente cualquier compromiso de seguridad de su cuenta</li>
                        <li>Usar las herramientas exclusivamente para fines profesionales legítimos</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.6 Suspensión y Terminación del Servicio</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Causales de Suspensión Inmediata:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Falta de pago en las fechas establecidas (gracia de 5 días hábiles)</li>
                        <li>Uso indebido o no autorizado de las herramientas de IA</li>
                        <li>Violación de normas éticas profesionales en el uso del servicio</li>
                        <li>Compartir credenciales de acceso con personas no autorizadas</li>
                        <li>Uso del servicio para actividades ilegales o no éticas</li>
                        <li>Suspensión o cancelación de la tarjeta profesional del suscriptor</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Proceso de Terminación:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>El usuario puede cancelar su suscripción en cualquier momento desde su panel de control</li>
                        <li>La cancelación será efectiva al final del período de facturación actual</li>
                        <li>El acceso a las herramientas se mantendrá hasta la fecha de expiración</li>
                        <li>Los datos del usuario se conservarán según nuestra política de retención de datos</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    11.7 Responsabilidad Profesional y Limitaciones
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                    <p className="text-blue-800 font-semibold">
                      ℹ️ Clarificación Importante: El abogado suscriptor mantiene la total responsabilidad profesional
                      por su ejercicio y las decisiones tomadas con apoyo de nuestras herramientas.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2">Responsabilidad del Abogado Suscriptor:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Responsabilidad profesional total por la calidad y exactitud de los documentos finales</li>
                        <li>Cumplimiento de todas las normas éticas y legales aplicables a su profesión</li>
                        <li>Supervisión adecuada del uso de herramientas tecnológicas en su práctica</li>
                        <li>Protección de la información confidencial de clientes según el secreto profesional</li>
                        <li>Mantenimiento de su competencia profesional y actualización normativa</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Limitaciones de Responsabilidad de TuConsultorLegal.co:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>
                          Nuestra responsabilidad se limita a proporcionar las herramientas tecnológicas según los
                          términos de la suscripción
                        </li>
                        <li>No asumimos responsabilidad por decisiones profesionales tomadas por el suscriptor</li>
                        <li>No somos responsables por errores en el uso o interpretación de las herramientas</li>
                        <li>La responsabilidad máxima se limita al valor de la suscripción mensual</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.8 Soporte Técnico y Actualizaciones</h3>
                  <p className="text-foreground mb-3">Los abogados suscriptores tienen acceso a:</p>
                  <ul className="list-disc pl-6 space-y-1 text-foreground">
                    <li>
                      Soporte técnico especializado durante horarios de oficina (8:00 AM - 6:00 PM, lunes a viernes)
                    </li>
                    <li>Actualizaciones automáticas y gratuitas de todas las herramientas</li>
                    <li>Capacitación continua en nuevas funcionalidades y mejores prácticas</li>
                    <li>Documentación técnica completa y guías de uso</li>
                    <li>Webinars periódicos sobre innovaciones en tecnología legal</li>
                    <li>Acceso prioritario a nuevas funcionalidades en fase beta</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.9 Modificaciones de Términos y Tarifas</h3>
                  <div className="space-y-3">
                    <p className="text-foreground">
                      <strong>Notificación de Cambios:</strong> Cualquier modificación a estos términos específicos será
                      notificada con al menos 30 días de anticipación a través del correo electrónico registrado y
                      notificaciones en la plataforma.
                    </p>
                    <div>
                      <h4 className="font-semibold mb-2">Cambios en Tarifas:</h4>
                      <ul className="list-disc pl-6 space-y-1 text-foreground">
                        <li>Los cambios en precios se notificarán con 60 días de anticipación</li>
                        <li>
                          Los suscriptores existentes mantendrán su tarifa actual durante el período de facturación
                          vigente
                        </li>
                        <li>
                          El uso continuado del servicio después de los cambios constituye aceptación de las nuevas
                          condiciones
                        </li>
                        <li>
                          Los suscriptores pueden cancelar sin penalización antes de que entren en vigor los nuevos
                          términos
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">11.10 Contacto y Resolución de Disputas</h3>
                  <div className="bg-card border border-border p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Canales de Contacto para Suscriptores:</h4>
                    <ul className="list-none space-y-2 text-foreground">
                      <li>
                        <strong>Email de suscripciones:</strong> contacto@tuconsultorlegal.co
                      </li>
                      <li>
                        <strong>Soporte técnico:</strong> contacto@tuconsultorlegal.co
                      </li>
                      <li>
                        <strong>Línea directa:</strong> +57 (4) 444-5555
                      </li>
                      <li>
                        <strong>Horario de atención:</strong> Lunes a Viernes, 8:00 AM - 6:00 PM
                      </li>
                      <li>
                        <strong>Chat en vivo:</strong> Disponible en la plataforma durante horarios de oficina
                      </li>
                    </ul>
                  </div>
                  <p className="text-foreground mt-4">
                    <strong>Resolución de Disputas:</strong> Cualquier controversia relacionada con los servicios de
                    suscripción será resuelta inicialmente mediante diálogo directo. En caso de no llegarse a un
                    acuerdo, se someterá a los procedimientos de conciliación del Centro de Arbitraje y Conciliación de
                    la Cámara de Comercio de Medellín.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">12. CONTACTO</h2>
              <p className="text-foreground mb-4">
                Para consultas generales, puedes contactarnos a través del correo electrónico:
                contacto@tuconsultorlegal.co.
              </p>
              <p className="text-foreground">
                Para consultas específicas sobre suscripciones de abogados: contacto@tuconsultorlegal.co.
              </p>
            </section>

            <div className="mt-12 bg-success/10 border-l-4 border-success p-6 rounded-r-lg">
              <h3 className="text-2xl font-bold text-success-foreground">¿Tienes dudas sobre nuestros términos?</h3>
              <p className="text-success-foreground/80 mt-2 mb-4">
                Si tienes preguntas sobre nuestros términos y condiciones o necesitas aclarar algún punto, nuestro
                asistente Lexi está aquí para ayudarte.
              </p>
              <button
                onClick={() => onOpenChat("Tengo una pregunta sobre los términos y condiciones")}
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
