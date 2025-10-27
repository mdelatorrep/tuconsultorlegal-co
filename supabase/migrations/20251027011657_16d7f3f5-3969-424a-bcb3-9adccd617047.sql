-- Actualizar contenido legal para evitar duplicación de títulos
-- El componente ya muestra el título, así que el HTML solo debe tener el contenido del cuerpo

UPDATE legal_content 
SET content = '<h2>1. RESPONSABLE DEL TRATAMIENTO</h2>
<p>El responsable del tratamiento de tus datos personales es:</p>
<ul>
<li><strong>Razón Social:</strong> TU CONSULTOR LEGAL S.A.S.</li>
<li><strong>NIT:</strong> [Número de NIT de la empresa]</li>
<li><strong>Domicilio:</strong> Envigado, Antioquia, Colombia.</li>
<li><strong>Correo electrónico para notificaciones y ejercicio de derechos:</strong> contacto@tuconsultorlegal.co</li>
<li><strong>Sitio web:</strong> www.tuconsultorlegal.co</li>
</ul>

<h2>2. RECOLECCIÓN DE INFORMACIÓN</h2>
<p>Recopilamos los siguientes tipos de información:</p>
<h3>2.1. Información que proporcionas directamente</h3>
<ul>
<li>Datos de identificación (nombre completo, correo electrónico, teléfono)</li>
<li>Información proporcionada durante interacciones con Lexi</li>
<li>Información de pago procesada por Bold</li>
</ul>
<h3>2.2. Información recopilada automáticamente</h3>
<ul>
<li>Dirección IP y datos de navegación</li>
<li>Cookies y tecnologías similares</li>
<li>Información de uso de la Plataforma</li>
</ul>

<h2>3. FINALIDAD DEL TRATAMIENTO</h2>
<p>Utilizamos tus datos para:</p>
<ul>
<li>Prestación de servicios legales automatizados</li>
<li>Generación de documentos legales personalizados</li>
<li>Procesamiento de pagos</li>
<li>Comunicaciones relacionadas con el servicio</li>
<li>Mejora de la experiencia del usuario</li>
<li>Cumplimiento de obligaciones legales</li>
</ul>

<h2>4. BASE JURÍDICA</h2>
<p>El tratamiento de tus datos se fundamenta en:</p>
<ul>
<li>Ejecución de un contrato</li>
<li>Consentimiento informado</li>
<li>Cumplimiento de obligaciones legales</li>
<li>Intereses legítimos</li>
</ul>

<h2>5. COMPARTIR INFORMACIÓN</h2>
<p>No vendemos tu información. Solo compartimos datos con:</p>
<ul>
<li><strong>Proveedores de servicios:</strong> Bold (procesamiento de pagos), OpenAI (asistencia de IA)</li>
<li><strong>Autoridades:</strong> Cuando sea requerido por ley</li>
</ul>

<h2>6. TUS DERECHOS</h2>
<p>Tienes derecho a:</p>
<ul>
<li>Conocer, actualizar y rectificar tus datos</li>
<li>Solicitar prueba de la autorización otorgada</li>
<li>Ser informado sobre el uso de tus datos</li>
<li>Presentar quejas ante la Superintendencia de Industria y Comercio</li>
<li>Revocar tu autorización o solicitar supresión de datos</li>
<li>Acceder de forma gratuita a tus datos</li>
</ul>
<p>Para ejercer estos derechos, escribe a <strong>contacto@tuconsultorlegal.co</strong></p>

<h2>7. SEGURIDAD</h2>
<p>Implementamos medidas técnicas y organizativas apropiadas para proteger tu información personal.</p>

<h2>8. COOKIES</h2>
<p>Utilizamos cookies para mejorar tu experiencia. Puedes configurar tu navegador para rechazarlas.</p>

<h2>9. CAMBIOS A ESTA POLÍTICA</h2>
<p>Nos reservamos el derecho de modificar esta política. Los cambios serán publicados en esta página.</p>

<h2>10. CONTACTO</h2>
<p>Para preguntas sobre esta política, contáctanos en <strong>contacto@tuconsultorlegal.co</strong></p>'
WHERE page_key = 'privacy-policy';

UPDATE legal_content 
SET content = '<h2>1. DEFINICIONES</h2>
<ul>
<li><strong>Plataforma:</strong> Se refiere al sitio web www.tuconsultorlegal.co y todas sus funcionalidades.</li>
<li><strong>Usuario:</strong> Toda persona natural o jurídica que accede y/o utiliza los servicios de la Plataforma.</li>
<li><strong>Lexi (Asistente de IA):</strong> La herramienta de inteligencia artificial de la Plataforma que interactúa con el Usuario para recopilar información, ofrecer orientación legal inicial y generar documentos legales.</li>
<li><strong>Documento Legal:</strong> Cualquier archivo generado por la Plataforma mediante la interacción con Lexi.</li>
<li><strong>Servicios:</strong> Todos los servicios ofrecidos a través de la Plataforma.</li>
</ul>

<h2>2. ACEPTACIÓN DE LOS TÉRMINOS</h2>
<p>Al acceder y utilizar la Plataforma, el Usuario acepta estar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, no utilices nuestros servicios.</p>

<h2>3. DESCRIPCIÓN DEL SERVICIO</h2>
<p>Tu Consultor Legal proporciona una plataforma digital que utiliza inteligencia artificial para:</p>
<ul>
<li>Ofrecer orientación legal automatizada</li>
<li>Generar documentos legales personalizados</li>
<li>Facilitar el acceso a información legal básica</li>
</ul>
<p><strong>Importante:</strong> Nuestros servicios son complementarios y no sustituyen el asesoramiento de un abogado licenciado.</p>

<h2>4. REGISTRO Y CUENTA</h2>
<p>Para utilizar ciertos servicios, deberás proporcionar información veraz y actualizada. Eres responsable de mantener la confidencialidad de tu cuenta.</p>

<h2>5. USO DE LA PLATAFORMA</h2>
<h3>5.1. Uso Permitido</h3>
<p>Puedes usar la Plataforma para:</p>
<ul>
<li>Generar documentos legales personalizados</li>
<li>Obtener información legal general</li>
<li>Interactuar con Lexi para asesoramiento automatizado</li>
</ul>
<h3>5.2. Uso Prohibido</h3>
<p>No puedes:</p>
<ul>
<li>Violar leyes aplicables</li>
<li>Intentar acceder sin autorización a sistemas o redes</li>
<li>Usar la Plataforma para actividades fraudulentas</li>
<li>Reproducir, distribuir o modificar el contenido sin autorización</li>
<li>Interferir con el funcionamiento de la Plataforma</li>
</ul>

<h2>6. GENERACIÓN DE DOCUMENTOS</h2>
<ul>
<li>Los documentos son generados mediante IA basada en la información proporcionada</li>
<li>La precisión depende de la calidad de los datos ingresados</li>
<li>Los documentos son plantillas y pueden requerir revisión profesional</li>
<li>No garantizamos validez legal en todos los contextos</li>
</ul>

<h2>7. PAGOS Y FACTURACIÓN</h2>
<p>Los pagos se procesan a través de <strong>Bold</strong>. Al realizar un pago, aceptas sus términos y condiciones. Los precios están sujetos a cambios.</p>

<h2>8. PROPIEDAD INTELECTUAL</h2>
<p>Todo el contenido de la Plataforma es propiedad de Tu Consultor Legal. No puedes copiar, modificar o distribuir el contenido sin autorización.</p>

<h2>9. LIMITACIÓN DE RESPONSABILIDAD</h2>
<p>Tu Consultor Legal no será responsable por:</p>
<ul>
<li>Daños derivados del uso o imposibilidad de uso de la Plataforma</li>
<li>Errores en los documentos generados</li>
<li>Decisiones tomadas basándose en información de la Plataforma</li>
<li>Interrupciones del servicio</li>
</ul>
<p><strong>Importante:</strong> Nuestros servicios no constituyen asesoría legal profesional.</p>

<h2>10. PROTECCIÓN DE DATOS</h2>
<p>El tratamiento de datos personales se rige por nuestra <a href="/#privacidad">Política de Privacidad</a>.</p>

<h2>11. MODIFICACIONES</h2>
<p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán efectivos al ser publicados.</p>

<h2>12. TERMINACIÓN</h2>
<p>Podemos suspender o terminar tu acceso si violas estos términos.</p>

<h2>13. LEY APLICABLE</h2>
<p>Estos términos se rigen por las leyes de Colombia. Cualquier disputa se resolverá ante los tribunales de Envigado, Antioquia.</p>

<h2>14. CONTACTO</h2>
<p>Para preguntas sobre estos términos, contáctanos en <strong>contacto@tuconsultorlegal.co</strong></p>'
WHERE page_key = 'terms-and-conditions';

UPDATE legal_content 
SET content = '<h2>1. Derechos de Autor</h2>
<p>Todo el contenido presente en este sitio web, incluyendo pero no limitado a textos, gráficos, logos, iconos, imágenes, clips de audio, descargas digitales, compilaciones de datos y software, es propiedad de Tu Consultor Legal o de sus proveedores de contenido y está protegido por las leyes de derechos de autor de Colombia y tratados internacionales.</p>

<h2>2. Marcas Registradas</h2>
<p>El nombre "Tu Consultor Legal", el logo "Lexi" y otras marcas mostradas en el sitio son marcas registradas o marcas comerciales de Tu Consultor Legal S.A.S. en Colombia. No está permitido el uso de estas marcas sin el consentimiento previo por escrito de Tu Consultor Legal.</p>

<h2>3. Licencia de Uso</h2>
<p>Se otorga una licencia limitada, no exclusiva e intransferible para:</p>
<ul>
<li>Acceder y usar la plataforma para fines personales o comerciales legítimos</li>
<li>Descargar y usar los documentos legales generados específicamente para ti</li>
<li>Visualizar el contenido del sitio en tu dispositivo</li>
</ul>
<p>Esta licencia no incluye el derecho a:</p>
<ul>
<li>Revender o hacer uso comercial del sitio o su contenido</li>
<li>Recopilar listados, descripciones o datos del sitio</li>
<li>Hacer uso derivado del sitio o su contenido</li>
<li>Descargar o copiar información para beneficio de terceros</li>
</ul>

<h2>4. Contenido Generado por IA</h2>
<p>Los documentos y contenido generado mediante nuestra inteligencia artificial "Lexi" son propiedad del usuario que los solicitó una vez completado el pago correspondiente. Sin embargo:</p>
<ul>
<li>Tu Consultor Legal retiene todos los derechos sobre la tecnología y algoritmos utilizados</li>
<li>Las plantillas y estructuras base permanecen como propiedad de Tu Consultor Legal</li>
<li>El usuario no puede redistribuir las plantillas o el sistema de generación</li>
</ul>

<h2>5. Contenido del Usuario</h2>
<p>Al proporcionar información o contenido a la plataforma, el usuario:</p>
<ul>
<li>Garantiza que tiene derecho a proporcionar dicho contenido</li>
<li>Otorga a Tu Consultor Legal una licencia para usar, almacenar y procesar ese contenido para proporcionar el servicio</li>
<li>Conserva todos los derechos de propiedad sobre su información personal y documentos generados</li>
</ul>

<h2>6. Protección de Propiedad Intelectual</h2>
<p>Tu Consultor Legal respeta los derechos de propiedad intelectual de terceros. Si crees que tu obra ha sido copiada de manera que constituya una infracción de derechos de autor, proporciona la siguiente información a <strong>contacto@tuconsultorlegal.co</strong>:</p>
<ul>
<li>Identificación de la obra protegida por derechos de autor</li>
<li>Identificación del material infractor</li>
<li>Información de contacto</li>
<li>Declaración de buena fe</li>
<li>Declaración de veracidad</li>
<li>Firma física o electrónica</li>
</ul>

<h2>7. Patentes y Algoritmos</h2>
<p>Los algoritmos, procesos y métodos utilizados en la plataforma pueden estar sujetos a patentes pendientes o concedidas. Ningún derecho de licencia o uso está implícito en el acceso al sitio.</p>

<h2>8. Modificaciones</h2>
<p>Tu Consultor Legal se reserva el derecho de modificar o actualizar esta política de propiedad intelectual en cualquier momento. Los cambios serán efectivos inmediatamente después de su publicación en el sitio.</p>

<h2>9. Contacto</h2>
<p>Para cualquier consulta relacionada con derechos de propiedad intelectual, contacta:</p>
<ul>
<li><strong>Email:</strong> contacto@tuconsultorlegal.co</li>
<li><strong>Dirección:</strong> Envigado, Antioquia, Colombia</li>
</ul>'
WHERE page_key = 'intellectual-property';