interface TermsAndConditionsPageProps {
  onOpenChat: (message?: string) => void;
}

export default function TermsAndConditionsPage({ onOpenChat }: TermsAndConditionsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
              Términos y Condiciones de Uso
            </h1>
            <p className="text-lg text-muted-foreground">
              TUCONSULTORLEGAL.CO
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Fecha de última actualización: 5 de julio de 2025
            </p>
          </div>

          <div className="prose max-w-none space-y-8">
            <div className="bg-card p-6 rounded-lg border">
              <p className="text-foreground leading-relaxed">
                ¡Bienvenido a <strong>tuconsultorlegal.co</strong>! Antes de utilizar nuestros servicios, te pedimos que leas detenidamente los siguientes Términos y Condiciones (en adelante, "T&C"). Al acceder y utilizar nuestra plataforma, aceptas y te comprometes a cumplir con lo aquí estipulado. Si no estás de acuerdo con estos T&C, por favor, no utilices nuestros servicios.
              </p>
              <p className="text-foreground leading-relaxed mt-4">
                Este sitio web es operado por <strong>TU CONSULTOR LEGAL S.A.S.</strong>, una sociedad legalmente constituida en Colombia.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">1. DEFINICIONES</h2>
              <ul className="list-disc pl-6 space-y-3 text-foreground">
                <li><strong>Plataforma:</strong> Se refiere al sitio web www.tuconsultorlegal.co y todas sus funcionalidades.</li>
                <li><strong>Usuario:</strong> Toda persona natural o jurídica que accede y/o utiliza los servicios de la Plataforma.</li>
                <li><strong>Lexi (Asistente de IA):</strong> La herramienta de inteligencia artificial de la Plataforma que interactúa con el Usuario para recopilar información, ofrecer orientación preliminar y generar borradores iniciales de documentos.</li>
                <li><strong>Servicios:</strong> Incluye, pero no se limita a, la generación de documentos legales y la prestación de asesoría jurídica inicial a través del Asistente de IA, siempre sujetos a una Revisión Humana final.</li>
                <li><strong>Revisión Humana:</strong> El proceso mediante el cual un abogado humano, colegiado y con licencia para ejercer en Colombia, revisa, valida, corrige y aprueba el borrador del documento o la orientación generada por el Asistente de IA antes de su entrega final al Usuario.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">2. NATURALEZA Y ALCANCE DEL SERVICIO</h2>
              <p className="text-foreground mb-4 font-semibold">
                Este es el punto más importante. Queremos ser completamente transparentes sobre cómo funcionamos:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Servicio de Información y Asistencia Tecnológica:</h3>
                  <p className="text-foreground">
                    El Usuario reconoce y acepta que Lexi (nuestro Asistente de IA) no es un abogado y las interacciones iniciales con él no constituyen una asesoría legal formal ni establecen una relación abogado-cliente. Lexi es una herramienta tecnológica avanzada diseñada para recopilar información y generar borradores basados en plantillas y datos estandarizados.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No es Asesoría Jurídica Instantánea:</h3>
                  <p className="text-foreground">
                    La información proporcionada por Lexi es de carácter orientativo y preliminar. Las decisiones legales no deben basarse únicamente en la información generada por el Asistente de IA.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">La Importancia de la Revisión Humana:</h3>
                  <p className="text-foreground">
                    El servicio legal de tuconsultorlegal.co se perfecciona y finaliza ÚNICAMENTE cuando el documento o la consulta ha pasado por el proceso de Revisión Humana. El documento final validado por uno de nuestros abogados humanos es el producto por el cual nuestra firma asume responsabilidad profesional.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">3. OBLIGACIONES DEL USUARIO</h2>
              <p className="text-foreground mb-4">Al utilizar nuestros Servicios, te comprometes a:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Ser mayor de edad y tener plena capacidad legal para contratar según la legislación colombiana.</li>
                <li>Proporcionar información veraz, precisa, completa y actualizada durante tu interacción con el Asistente de IA. La calidad y validez del documento final dependen directamente de la exactitud de la información que suministres.</li>
                <li>Utilizar la Plataforma y los documentos generados para fines lícitos y de acuerdo con la ley colombiana.</li>
                <li>Custodiar la confidencialidad de cualquier credencial de acceso a la Plataforma.</li>
                <li>No utilizar la Plataforma para realizar actos de ingeniería inversa, descompilar el software o intentar acceder a nuestro código fuente.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">4. PROPIEDAD INTELECTUAL</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">De la Plataforma:</h3>
                  <p className="text-foreground">
                    Todo el contenido del sitio web, incluyendo el diseño, textos, gráficos, logos, íconos, el software, y el Asistente de IA "Lexi", son propiedad exclusiva de TU CONSULTOR LEGAL S.A.S. o de sus licenciantes y están protegidos por las leyes de propiedad intelectual de Colombia.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">De los Documentos Finales:</h3>
                  <p className="text-foreground">
                    Una vez el Usuario ha pagado por un Servicio y el documento ha sido entregado tras la Revisión Humana, el Usuario adquiere una licencia de uso personal y no exclusiva sobre dicho documento final para los fines para los que fue creado. No está permitida su reventa o distribución masiva.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">5. TARIFAS Y PAGOS</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>Los precios de los Servicios serán indicados de manera clara y previa a la confirmación de la compra por parte del Usuario.</li>
                <li>El pago se realizará a través de las pasarelas de pago seguras habilitadas en la Plataforma.</li>
                <li>El Servicio se entenderá prestado y completado una vez el documento final, validado por un abogado, sea enviado al correo electrónico proporcionado por el Usuario. No se realizarán reembolsos una vez iniciado el proceso de Revisión Humana.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">6. LIMITACIÓN DE RESPONSABILIDAD</h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>TU CONSULTOR LEGAL S.A.S. no será responsable por las decisiones o acciones que el Usuario tome basándose exclusivamente en la información preliminar proporcionada por el Asistente de IA antes de la Revisión Humana.</li>
                <li>Nuestra responsabilidad profesional, sujeta a la normativa que rige la profesión de abogado en Colombia, se limita al contenido y la idoneidad del documento o consulta final que ha sido objeto de Revisión Humana y entregado al Usuario.</li>
                <li>No garantizamos que la Plataforma esté libre de errores o interrupciones, pero nos comprometemos a realizar nuestros mejores esfuerzos para asegurar su correcto funcionamiento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">7. TRATAMIENTO DE DATOS PERSONALES</h2>
              <p className="text-foreground">
                La privacidad de tu información es de suma importancia para nosotros. La recopilación y el tratamiento de tus datos personales se rigen por nuestra Política de Privacidad y Tratamiento de Datos, la cual puedes consultar aquí. Dicha política se entiende como parte integral de estos T&C y cumple con la Ley 1581 de 2012 y sus decretos reglamentarios.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">8. MODIFICACIONES</h2>
              <p className="text-foreground">
                TU CONSULTOR LEGAL S.A.S. se reserva el derecho de modificar estos T&C en cualquier momento. Cualquier cambio será notificado a través de la Plataforma o por correo electrónico. El uso continuado de los Servicios después de una modificación constituirá la aceptación de los nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">9. LEY APLICABLE Y JURISDICCIÓN</h2>
              <p className="text-foreground">
                Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de la República de Colombia. Cualquier controversia que surja de su interpretación o aplicación será sometida a la jurisdicción de los jueces y tribunales competentes de la ciudad de Envigado, Antioquia, Colombia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary mb-4">10. CONTACTO</h2>
              <p className="text-foreground">
                Si tienes alguna pregunta sobre estos Términos y Condiciones, puedes contactarnos a través del correo electrónico: soporte@tuconsultorlegal.co.
              </p>
            </section>

            <div className="mt-12 bg-success/10 border-l-4 border-success p-6 rounded-r-lg">
              <h3 className="text-2xl font-bold text-success-foreground">¿Tienes dudas sobre nuestros términos?</h3>
              <p className="text-success-foreground/80 mt-2 mb-4">
                Si tienes preguntas sobre nuestros términos y condiciones o necesitas aclarar algún punto, nuestro asistente Lexi está aquí para ayudarte.
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