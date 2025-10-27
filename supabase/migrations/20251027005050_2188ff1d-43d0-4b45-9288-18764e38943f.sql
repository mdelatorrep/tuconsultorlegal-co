-- Insert default legal content
INSERT INTO public.legal_content (page_key, title, content) 
VALUES 
(
  'terms-and-conditions', 
  'Términos y Condiciones', 
  '<h1>Términos y Condiciones de Tu Consultor Legal</h1>
<p>Última actualización: ' || CURRENT_DATE || '</p>

<h2>1. Aceptación de los Términos</h2>
<p>Al acceder y utilizar este sitio web, aceptas estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables, y aceptas que eres responsable del cumplimiento de las leyes locales aplicables.</p>

<h2>2. Uso del Servicio</h2>
<p>Nuestro servicio proporciona información legal general y asistencia en la creación de documentos legales básicos. Este servicio no reemplaza la asesoría legal profesional personalizada.</p>

<h2>3. Limitaciones de Responsabilidad</h2>
<p>La información proporcionada en este sitio web no constituye asesoría legal profesional. Para asuntos legales específicos, recomendamos consultar con un abogado calificado.</p>

<h2>4. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán efectivos inmediatamente después de su publicación.</p>

<h2>5. Contacto</h2>
<p>Para cualquier pregunta sobre estos términos, contáctanos a través de nuestro sitio web.</p>'
),
(
  'privacy-policy', 
  'Política de Privacidad', 
  '<h1>Política de Privacidad de Tu Consultor Legal</h1>
<p>Última actualización: ' || CURRENT_DATE || '</p>

<h2>1. Información que Recopilamos</h2>
<p>Recopilamos información personal que nos proporcionas voluntariamente al registrarte en nuestro servicio, incluyendo nombre, correo electrónico y número de teléfono.</p>

<h2>2. Uso de la Información</h2>
<p>Utilizamos la información recopilada para:</p>
<ul>
  <li>Proporcionar y mejorar nuestros servicios</li>
  <li>Comunicarnos contigo sobre actualizaciones y novedades</li>
  <li>Procesar tus solicitudes de documentos legales</li>
  <li>Cumplir con obligaciones legales</li>
</ul>

<h2>3. Protección de Datos</h2>
<p>Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger tu información personal contra acceso no autorizado, alteración, divulgación o destrucción.</p>

<h2>4. Compartir Información</h2>
<p>No vendemos, intercambiamos ni transferimos tu información personal a terceros sin tu consentimiento, excepto cuando sea necesario para proporcionar nuestros servicios o cuando lo requiera la ley.</p>

<h2>5. Tus Derechos</h2>
<p>Tienes derecho a acceder, corregir o eliminar tu información personal. Para ejercer estos derechos, contáctanos a través de nuestro sitio web.</p>

<h2>6. Cookies</h2>
<p>Utilizamos cookies para mejorar tu experiencia en nuestro sitio web. Puedes configurar tu navegador para rechazar cookies, pero esto puede afectar la funcionalidad del sitio.</p>'
),
(
  'intellectual-property', 
  'Propiedad Intelectual', 
  '<h1>Propiedad Intelectual de Tu Consultor Legal</h1>
<p>Última actualización: ' || CURRENT_DATE || '</p>

<h2>1. Derechos de Autor</h2>
<p>Todo el contenido presente en este sitio web, incluyendo pero no limitado a textos, gráficos, logos, iconos, imágenes, clips de audio, descargas digitales, compilaciones de datos y software, es propiedad de Tu Consultor Legal o de sus proveedores de contenido y está protegido por las leyes de derechos de autor de Colombia y tratados internacionales.</p>

<h2>2. Marcas Registradas</h2>
<p>Las marcas, logos y nombres comerciales mostrados en este sitio web son propiedad de Tu Consultor Legal. El uso no autorizado de estas marcas está estrictamente prohibido.</p>

<h2>3. Licencia de Uso</h2>
<p>Se te concede una licencia limitada, no exclusiva, no transferible y revocable para acceder y hacer uso personal del contenido de este sitio. Esta licencia no incluye:</p>
<ul>
  <li>Ningún derecho de reventa o uso comercial</li>
  <li>Recopilación y uso de listados de productos, descripciones o precios</li>
  <li>Uso derivado del sitio web o su contenido</li>
  <li>Descarga o copia de información de cuenta para beneficio de otro comerciante</li>
  <li>Cualquier uso de minería de datos, robots o herramientas similares de recopilación y extracción de datos</li>
</ul>

<h2>4. Contenido del Usuario</h2>
<p>Al enviar contenido a través de nuestro sitio web, nos concedes una licencia mundial, no exclusiva, libre de regalías para usar, reproducir, modificar y mostrar dicho contenido en conexión con la prestación de nuestros servicios.</p>

<h2>5. Protección de Propiedad Intelectual</h2>
<p>Respetamos los derechos de propiedad intelectual de otros. Si crees que tu trabajo ha sido copiado de manera que constituye una infracción de derechos de autor, contáctanos inmediatamente.</p>

<h2>6. Modificaciones</h2>
<p>Nos reservamos el derecho de modificar esta política de propiedad intelectual en cualquier momento. Los cambios serán efectivos inmediatamente después de su publicación en este sitio web.</p>'
)
ON CONFLICT (page_key) DO NOTHING;