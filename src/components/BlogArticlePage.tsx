import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface BlogArticlePageProps {
  articleId: string;
  onOpenChat: (message?: string) => void;
  onNavigate?: (page: string) => void;
}

interface ArticleContent {
  category: string;
  categoryColor: string;
  title: string;
  image: string;
  imageAlt: string;
  content: string;
}

export default function BlogArticlePage({ articleId, onOpenChat, onNavigate }: BlogArticlePageProps) {
  const articles: Record<string, ArticleContent> = {
    arriendo: {
      category: "VIVIENDA Y ARRIENDOS",
      categoryColor: "text-blue-600",
      title: "¿Vas a arrendar? 5 Cláusulas que NO pueden faltar en tu contrato",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&auto=format",
      imageAlt: "Persona revisando un contrato de arriendo",
      content: `
        <p>Arrendar una vivienda es un paso emocionante, pero también puede generar nervios. La clave para una experiencia tranquila, tanto para el dueño (arrendador) como para quien vive en el inmueble (arrendatario), es tener un <strong>contrato de arrendamiento claro y completo</strong>. Este documento es el mapa de ruta que define las reglas del juego.</p>
        <p>En <strong>Tu Consultor Legal</strong>, queremos que te sientas seguro. Por eso, te explicamos 5 puntos que nunca deben faltar en tu contrato.</p>
        
        <h2>1. Identificación Clara de Todos</h2>
        <p>Parece obvio, pero es el error más común. El contrato debe decir claramente quién es quién.</p>
        <ul>
            <li><strong>Arrendador:</strong> Nombre completo y número de cédula de la persona dueña del inmueble o de quien lo representa.</li>
            <li><strong>Arrendatario:</strong> Nombre completo y cédula de la persona que va a vivir en el inmueble. Si hay co-arrendatarios (roomies o familiares), también deben estar aquí.</li>
        </ul>
        <p><strong>¿Por qué es importante?</strong> Porque si hay un problema, sabes exactamente a quién reclamarle o quién es el responsable legal.</p>

        <h2>2. Descripción Exacta del Inmueble</h2>
        <p>No basta con poner "apartamento en Bogotá". El contrato debe ser específico:</p>
        <ul>
            <li><strong>Dirección completa:</strong> Incluyendo número de apartamento, torre, conjunto, etc.</li>
            <li><strong>Matrícula inmobiliaria:</strong> Es como la "cédula" del inmueble. Da total seguridad sobre cuál es la propiedad.</li>
            <li><strong>Inventario:</strong> ¿El apartamento se entrega con cortinas, calentador, lámparas? Todo debe quedar por escrito en una lista. Es buena idea tomar fotos y anexarlas al contrato.</li>
        </ul>
        <p><strong>¿Por qué es importante?</strong> Evita malentendidos al momento de entregar el inmueble. Así, no te cobrarán por daños que ya existían o no te reclamarán por un objeto que nunca estuvo allí.</p>

        <h2>3. El Valor y las Fechas de Pago (¡Sin rodeos!)</h2>
        <p>El dinero es un tema sensible. El contrato debe ser cristalino en este punto:</p>
        <ul>
            <li><strong>Valor del canon:</strong> El monto exacto del arriendo mensual, en números y letras. Ejemplo: "$1.500.000 (UN MILLÓN QUINIENTOS MIL PESOS)".</li>
            <li><strong>Fecha de pago:</strong> ¿Se paga los primeros 5 días del mes? ¿El día 30? Debe quedar definido.</li>
            <li><strong>Dónde y cómo pagar:</strong> ¿Consignación a una cuenta? ¿En efectivo? Especificar el número de cuenta y el banco.</li>
            <li><strong>Incremento anual:</strong> La ley colombiana regula cómo sube el arriendo cada año. El contrato debe mencionar que se ajustará según la ley (normalmente, basado en el IPC del año anterior).</li>
        </ul>

        <h2>4. Duración y Reglas de Terminación</h2>
        <p>¿Cuánto tiempo dura el acuerdo? ¿Y si alguien se quiere ir antes?</p>
        <ul>
            <li><strong>Duración del contrato:</strong> Generalmente es por 12 meses.</li>
            <li><strong>Fecha de inicio y fin:</strong> Por ejemplo, "desde el 1 de agosto de 2025 hasta el 31 de julio de 2026".</li>
            <li><strong>Prórrogas automáticas:</strong> La mayoría de los contratos se renuevan solos si nadie dice lo contrario.</li>
            <li><strong>Preaviso:</strong> Si no quieres renovar, debes avisar con un tiempo de antelación (la ley dice 3 meses antes de la fecha de terminación). El contrato debe recordarlo.</li>
        </ul>
        <p><strong>¿Por qué es importante?</strong> Porque irse antes de tiempo sin un acuerdo puede generar multas (cláusula penal). Tener las reglas claras protege a ambos.</p>

        <h2>5. Responsabilidades: ¿Quién paga qué?</h2>
        <p>Un inmueble requiere mantenimiento. Es vital definir quién se encarga de cada cosa.</p>
        <ul>
            <li><strong>Servicios públicos:</strong> El contrato debe decir que el arrendatario es responsable de pagar el agua, la luz, el gas, etc.</li>
            <li><strong>Administración:</strong> Si es un conjunto o edificio, se debe aclarar quién paga la cuota de administración (casi siempre es el arrendatario).</li>
            <li><strong>Reparaciones:</strong>
                <ul>
                    <li><strong>Locativas (pequeñas):</strong> Daños por el uso diario, como un bombillo quemado o un vidrio roto, las paga el arrendatario.</li>
                    <li><strong>Necesarias (grandes):</strong> Problemas estructurales, como una tubería rota dentro de la pared o una humedad grave, las debe pagar el arrendador.</li>
                </ul>
            </li>
        </ul>
        <p>Tener esto claro desde el principio te ahorrará muchos dolores de cabeza y discusiones en el futuro.</p>
      `
    },
    despido: {
      category: "TRABAJO Y EMPLEO",
      categoryColor: "text-rose-600",
      title: "¿Te despidieron sin justa causa? Conoce tus derechos y cómo calcular tu indemnización",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format",
      imageAlt: "Persona preocupada con una caja de oficina",
      content: `
        <p>Recibir la noticia de un despido es una de las situaciones más estresantes que podemos enfrentar. Si además sientes que fue injusto, la incertidumbre aumenta. En Colombia, la ley protege al trabajador en estos casos. Aquí te explicamos de forma sencilla qué es un despido sin justa causa y, lo más importante, qué dinero te corresponde por ley.</p>
        
        <h2>¿Qué es un "despido sin justa causa"?</h2>
        <p>Es muy simple: ocurre cuando tu empleador decide terminar tu contrato de trabajo <strong>sin tener una de las razones que la ley considera válidas</strong>. La ley (Código Sustantivo del Trabajo) tiene una lista de motivos graves por los que te pueden despedir "con justa causa", como por ejemplo:</p>
        <ul>
            <li>Robo o actos violentos en el trabajo.</li>
            <li>Revelar secretos de la empresa.</li>
            <li>Faltar al trabajo por varios días sin excusa.</li>
            <li>Bajo rendimiento constante y comprobado.</li>
        </ul>
        <p>Si la razón de tu despido no está en esa lista, o si simplemente te dicen "gracias por sus servicios, pero ya no necesitamos su cargo", entonces es un despido SIN justa causa. Y en ese caso, <strong>tienen que pagarte una indemnización</strong>.</p>

        <h2>Tu Liquidación vs. Tu Indemnización: ¡No son lo mismo!</h2>
        <p>Este es un punto clave que genera mucha confusión.</p>
        <ul>
            <li><strong>La Liquidación:</strong> Es el dinero que SIEMPRE te deben pagar cuando te vas de un trabajo, sin importar si renuncias o te despiden. Incluye: tus salarios pendientes, cesantías, intereses de cesantías, primas y vacaciones no disfrutadas.</li>
            <li><strong>La Indemnización:</strong> Es un PAGO ADICIONAL que solo recibes si te despiden sin una justa causa. Es una especie de "compensación" por terminar tu contrato antes de tiempo y sin un motivo válido.</li>
        </ul>
        <p>En resumen: si te despiden sin justa causa, deben pagarte <strong>tu liquidación + tu indemnización</strong>.</p>

        <h2>¿Cómo se calcula la indemnización?</h2>
        <p>El cálculo depende del tipo de contrato que tenías y de tu salario.</p>

        <h3>Si tu contrato era a Término Indefinido:</h3>
        <p>La regla cambia si ganas más o menos de 10 salarios mínimos.</p>
        <p><strong>Para salarios menores a 10 salarios mínimos:</strong></p>
        <ul>
            <li><strong>Si trabajaste hasta 1 año:</strong> Te pagan 30 días de salario.</li>
            <li><strong>Si trabajaste más de 1 año:</strong> Te pagan 30 días por el primer año, y 20 días adicionales por cada año siguiente que trabajaste. Si no completaste un año adicional, se paga proporcional.</li>
        </ul>
        <p><em>Ejemplo simple:</em> Llevabas 3 años en la empresa. Te pagan 30 días (primer año) + 20 días (segundo año) + 20 días (tercer año) = 70 días de salario como indemnización.</p>

        <h3>Si tu contrato era a Término Fijo:</h3>
        <p>La cosa es más directa: la indemnización es el valor de los salarios que faltaban para que se terminara el contrato.</p>
        <p><em>Ejemplo simple:</em> Tenías un contrato de 1 año y te despidieron en el mes 9. Te faltaban 3 meses para terminar. Tu indemnización será el valor de esos 3 meses de salario.</p>

        <h2>¿Qué hacer si crees que tu despido fue injusto?</h2>
        <ol>
            <li><strong>No firmes nada sin leer:</strong> No firmes un documento de "mutuo acuerdo" si no estás de acuerdo. Pide una copia de tu carta de despido.</li>
            <li><strong>Revisa tu liquidación:</strong> Asegúrate de que incluya todos los conceptos y, si aplica, el valor de la indemnización.</li>
            <li><strong>Busca asesoría:</strong> Si tienes dudas o sientes que no te están pagando lo correcto, es el momento de buscar ayuda.</li>
        </ol>
        <p>En <strong>Tu Consultor Legal</strong>, nuestro asistente Lexi puede ayudarte a entender mejor tu situación y a calcular una primera estimación de lo que te corresponde. No te quedes con la duda, ¡conocer tus derechos es el primer paso para defenderlos!</p>
      `
    },
    vehiculo: {
      category: "FINANZAS Y ACUERDOS",
      categoryColor: "text-orange-600",
      title: "Guía para comprar o vender un carro usado en Colombia (y no tener dolores de cabeza)",
      image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop&auto=format",
      imageAlt: "Dos personas dándose la mano frente a un carro",
      content: `
        <p>Comprar o vender un carro usado es una de las transacciones más importantes y comunes que hacemos. Sin embargo, muchas veces, por la emoción o el afán, se nos olvida lo más importante: <strong>dejar todo por escrito en un buen contrato de compraventa</strong>. Este documento no es un simple papel, es el escudo que te protege de futuros problemas.</p>
        <p>En esta guía, te explicamos de forma sencilla qué debe tener ese contrato para que tu negocio sea un éxito y no una pesadilla.</p>

        <h2>¿Por qué es TAN importante el contrato de compraventa?</h2>
        <p>Imagina que vendes tu carro y el nuevo dueño comete una infracción de tránsito antes de hacer el traspaso. ¡La multa te llegará a ti! O imagina que compras un carro y a los pocos días descubres que tenía una deuda enorme o un problema legal (un embargo). Un buen contrato evita todo esto porque deja claras las responsabilidades de cada uno.</p>
        <p>El contrato es la prueba reina del negocio. Sin él, es tu palabra contra la del otro.</p>

        <h2>Los Puntos Clave que tu Contrato DEBE Tener</h2>
        <p>Un buen contrato de compraventa de vehículo debe ser como una hoja de vida completa del negocio. Aquí están las partes esenciales:</p>

        <h3>1. Quién Vende y Quién Compra</h3>
        <p>Debe identificar a las partes con total claridad:</p>
        <ul>
            <li><strong>Vendedor:</strong> Nombre completo, número de cédula y dirección.</li>
            <li><strong>Comprador:</strong> Nombre completo, número de cédula y dirección.</li>
        </ul>

        <h3>2. La "Cédula" del Vehículo</h3>
        <p>Hay que describir el carro con el mayor detalle posible para que no haya duda de qué se está vendiendo:</p>
        <ul>
            <li><strong>Placa</strong></li>
            <li><strong>Marca</strong> (Ej: Renault, Chevrolet)</li>
            <li><strong>Línea</strong> (Ej: Logan, Spark GT)</li>
            <li><strong>Modelo</strong> (Año de fabricación)</li>
            <li><strong>Color</strong></li>
            <li><strong>Número de motor, chasis y serie (VIN):</strong> Estos son los identificadores únicos del carro. ¡Verifícalos directamente en el vehículo y en la tarjeta de propiedad!</li>
        </ul>

        <h3>3. El Negocio: Precio y Forma de Pago</h3>
        <p>Esta parte debe ser muy específica para evitar malentendidos:</p>
        <ul>
            <li><strong>Precio de venta:</strong> En números y letras. Ejemplo: "$25.000.000 (VEINTICINCO MILLONES DE PESOS)".</li>
            <li><strong>Forma de pago:</strong> ¿Fue por transferencia? ¿En efectivo? ¿Se dio un anticipo? Hay que describirlo. Si fue por transferencia, es bueno poner la fecha y el comprobante.</li>
        </ul>

        <h3>4. El Estado del Vehículo y las "Cuentas Claras"</h3>
        <p>Esta es una de las cláusulas más importantes para proteger al comprador y ser justo como vendedor.</p>
        <ul>
            <li><strong>Declaración del vendedor:</strong> El vendedor debe manifestar por escrito que el vehículo está <strong>"a paz y salvo"</strong> por todo concepto. Esto incluye:
                <ul>
                    <li>Multas de tránsito.</li>
                    <li>Impuestos.</li>
                    <li>Embargos o cualquier otro lío legal (pignoraciones, etc.).</li>
                </ul>
            </li>
            <li><strong>Responsabilidad:</strong> El vendedor se hace responsable por cualquier multa o impuesto pendiente que aparezca después y que sea de una fecha anterior a la venta.</li>
            <li><strong>Estado mecánico:</strong> Se debe describir el estado en que se entrega el carro ("en buen estado de funcionamiento"). Si tiene algún detalle conocido (un rayón, un ruido), es mejor dejarlo por escrito para ser transparentes.</li>
        </ul>

        <h3>5. Las Obligaciones: El Traspaso</h3>
        <p>El contrato debe establecer un compromiso claro sobre el traspaso, que es el trámite para poner el carro a nombre del nuevo dueño.</p>
        <ul>
            <li><strong>Plazo para el traspaso:</strong> Acordar un tiempo máximo para hacer el trámite (ej: 15 días hábiles).</li>
            <li><strong>División de gastos:</strong> La costumbre en Colombia es que los gastos de traspaso se dividen por mitades, y la Retención en la Fuente la paga el vendedor. ¡Pero esto se puede negociar! Lo importante es que quede escrito.</li>
        </ul>
        <p>Hacer el traspaso es fundamental. Vender un carro y dejarlo "a traspaso abierto" es un riesgo gigante.</p>
        <p>Crear un contrato de compraventa no tiene por qué ser complicado. Con <strong>Tu Consultor Legal</strong>, puedes generar un documento completo y seguro en minutos. Solo responde las preguntas de Lexi y tendrás un contrato listo para proteger tu negocio.</p>
      `
    }
  };

  const article = articles[articleId];

  if (!article) {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Artículo no encontrado</h1>
        <Button onClick={() => onNavigate?.("blog")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Blog
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20">
      <Button 
        variant="ghost" 
        onClick={() => onNavigate?.("blog")}
        className="mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al Blog
      </Button>
      
      <div className="max-w-4xl mx-auto">
        <p className={`font-bold mb-2 ${article.categoryColor}`}>
          {article.category}
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
          {article.title}
        </h1>
        <p className="text-muted-foreground mb-6">
          Publicado por Tu Consultor Legal
        </p>
        <img 
          src={article.image} 
          alt={article.imageAlt}
          className="w-full h-auto max-h-96 object-cover rounded-lg mb-8"
        />
        
        <div 
          className="prose prose-lg max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{
            color: 'inherit'
          }}
        />
        
        {/* CTA Box within article */}
        <div className="mt-12 bg-success/10 border-l-4 border-success p-6 rounded-r-lg">
          <h3 className="text-2xl font-bold text-success mb-2">
            ¿Necesitas ayuda con tu caso?
          </h3>
          <p className="text-muted-foreground mb-4">
            Ya sea para crear tu contrato o resolver una duda específica, nuestro asistente con IA está listo para ayudarte.
          </p>
          <Button
            variant="success"
            size="lg"
            onClick={() => onOpenChat("Hola Lexi, necesito ayuda con mi caso legal específico.")}
          >
            Hablar con Lexi
          </Button>
        </div>
      </div>
    </div>
  );
}