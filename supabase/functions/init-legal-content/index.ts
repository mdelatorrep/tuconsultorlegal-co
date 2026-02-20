import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if content already exists
    const { data: existing } = await supabase
      .from('legal_content')
      .select('page_key')
    
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Legal content already initialized', pages: existing.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize with default content
    const legalPages = [
      {
        page_key: 'terms-and-conditions',
        title: 'Términos y Condiciones de Uso',
        content: `<h1>Términos y Condiciones de Uso</h1>
<p><strong>PRAXIS HUB</strong></p>
<p>Fecha de última actualización: 5 de julio de 2025</p>

<p>¡Bienvenido a <strong>Praxis Hub</strong>! Antes de utilizar nuestros servicios, te pedimos que leas detenidamente los siguientes Términos y Condiciones (en adelante, "T&C"). Al acceder y utilizar nuestra plataforma, aceptas y te comprometes a cumplir con lo aquí estipulado. Si no estás de acuerdo con estos T&C, por favor, no utilices nuestros servicios.</p>

<p>Este sitio web es operado por <strong>TU CONSULTOR LEGAL S.A.S.</strong>, una sociedad legalmente constituida en Colombia.</p>

<h2>1. DEFINICIONES</h2>
<ul>
<li><strong>Plataforma:</strong> Se refiere al sitio web www.praxis-hub.co y todas sus funcionalidades.</li>
<li><strong>Usuario:</strong> Toda persona natural o jurídica que accede y/o utiliza los servicios de la Plataforma.</li>
<li><strong>Lexi (Asistente de IA):</strong> La herramienta de inteligencia artificial de la Plataforma que interactúa con el Usuario para recopilar información, ofrecer orientación preliminar y generar borradores iniciales de documentos.</li>
<li><strong>Servicios:</strong> Incluye, pero no se limita a, la generación de documentos legales y la prestación de asesoría jurídica inicial a través del Asistente de IA, siempre sujetos a una Revisión Humana final.</li>
<li><strong>Revisión Humana:</strong> El proceso mediante el cual un abogado humano, colegiado y con licencia para ejercer en Colombia, revisa, valida, corrige y aprueba el borrador del documento o la orientación generada por el Asistente de IA antes de su entrega final al Usuario.</li>
</ul>

<h2>2. NATURALEZA Y ALCANCE DEL SERVICIO</h2>
<p>Este es el punto más importante. Queremos ser completamente transparentes sobre cómo funcionamos.</p>`
      },
      {
        page_key: 'privacy-policy',
        title: 'Política de Privacidad y Tratamiento de Datos Personales',
        content: `<h1>Política de Privacidad y Tratamiento de Datos Personales</h1>
<p><strong>PRAXIS HUB</strong></p>
<p>Fecha de última actualización: 5 de julio de 2025</p>

<p>En <strong>TU CONSULTOR LEGAL S.A.S.</strong>, sociedad legalmente constituida en Colombia e identificada con NIT [Número de NIT de la empresa], estamos comprometidos con la protección de tu privacidad y la seguridad de tu información. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos, compartimos y protegemos tus datos personales, en cumplimiento estricto de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 y demás normas concordantes en Colombia.</p>

<h2>1. RESPONSABLE DEL TRATAMIENTO</h2>
<p>El responsable del tratamiento de tus datos personales es:</p>
<ul>
<li><strong>Razón Social:</strong> TU CONSULTOR LEGAL S.A.S.</li>
<li><strong>NIT:</strong> [Número de NIT de la empresa]</li>
<li><strong>Domicilio:</strong> Envigado, Antioquia, Colombia.</li>
<li><strong>Correo electrónico:</strong> contacto@praxis-hub.co</li>
<li><strong>Sitio web:</strong> www.praxis-hub.co</li>
</ul>`
      },
      {
        page_key: 'intellectual-property',
        title: 'Propiedad Intelectual',
        content: `<h1>Propiedad Intelectual</h1>
<p><strong>PRAXIS HUB</strong></p>

<h2>DERECHOS DE PROPIEDAD INTELECTUAL</h2>

<h3>De la Plataforma:</h3>
<p>Todo el contenido del sitio web, incluyendo el diseño, textos, gráficos, logos, íconos, el software, y el Asistente de IA "Lexi", son propiedad exclusiva de <strong>TU CONSULTOR LEGAL S.A.S.</strong> o de sus licenciantes y están protegidos por las leyes de propiedad intelectual de Colombia.</p>

<h3>De los Documentos Finales:</h3>
<p>Una vez el Usuario ha pagado por un Servicio y el documento ha sido entregado tras la Revisión Humana, el Usuario adquiere una licencia de uso personal y no exclusiva sobre dicho documento final para los fines para los que fue creado. No está permitida su reventa o distribución masiva.</p>

<h3>Uso Autorizado:</h3>
<p>El Usuario puede utilizar la Plataforma y los servicios únicamente para fines legítimos y de acuerdo con estos términos. Queda prohibido:</p>
<ul>
<li>Realizar ingeniería inversa, descompilar o desensamblar cualquier parte de la Plataforma</li>
<li>Copiar, modificar, distribuir o crear trabajos derivados del contenido sin autorización</li>
<li>Utilizar la Plataforma para fines ilegales o no autorizados</li>
<li>Intentar obtener acceso no autorizado a cualquier parte de la Plataforma</li>
</ul>`
      }
    ]

    const { data, error } = await supabase
      .from('legal_content')
      .insert(legalPages)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Legal content initialized successfully',
        pages: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error initializing legal content:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
