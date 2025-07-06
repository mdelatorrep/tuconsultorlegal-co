import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface BlogPageProps {
  onOpenChat: (message?: string) => void;
  onNavigate?: (page: string) => void;
}

interface Article {
  id: string;
  category: string;
  categoryColor: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
}

export default function BlogPage({ onOpenChat, onNavigate }: BlogPageProps) {
  const articles: Article[] = [
    {
      id: "arriendo",
      category: "VIVIENDA Y ARRIENDOS",
      categoryColor: "text-blue-600",
      title: "¿Vas a arrendar? 5 Cláusulas que NO pueden faltar en tu contrato",
      description: "Arrendar una vivienda es un paso importante. Para que tu experiencia sea tranquila y segura, es fundamental tener un contrato claro. Te contamos 5 puntos clave que deben estar sí o sí para protegerte, seas arrendador o arrendatario.",
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&auto=format",
      imageAlt: "Persona revisando un contrato de arriendo",
      featured: true
    },
    {
      id: "despido",
      category: "TRABAJO Y EMPLEO", 
      categoryColor: "text-rose-600",
      title: "¿Te despidieron sin justa causa? Conoce tus derechos y cómo calcular tu indemnización",
      description: "Que te despidan es difícil, pero es clave que conozcas tus derechos. Te explicamos de forma simple qué es un despido sin justa causa y cómo se calcula la indemnización que te corresponde.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&auto=format",
      imageAlt: "Persona preocupada con una caja de oficina"
    },
    {
      id: "vehiculo",
      category: "FINANZAS Y ACUERDOS",
      categoryColor: "text-orange-600", 
      title: "Guía para comprar o vender un carro usado en Colombia (y no tener dolores de cabeza)",
      description: "Hacer un buen contrato es el secreto para una compraventa de vehículo sin problemas. Te damos una guía paso a paso de lo que debe incluir para proteger tanto al comprador como al vendedor.",
      image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop&auto=format",
      imageAlt: "Dos personas dándose la mano frente a un carro"
    }
  ];

  const handleReadArticle = (articleId: string) => {
    if (onNavigate) {
      onNavigate(`blog-articulo-${articleId}`);
    }
  };

  const featuredArticle = articles.find(article => article.featured);
  const otherArticles = articles.filter(article => !article.featured);

  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
          Blog de Tu Consultor Legal
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Resolvemos tus dudas legales con explicaciones claras y sencillas. 
          Empodérate con información para tu día a día.
        </p>
      </div>

      {/* Featured Article */}
      {featuredArticle && (
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16 bg-card p-8 rounded-lg shadow-card">
          <img 
            src={featuredArticle.image} 
            alt={featuredArticle.imageAlt} 
            className="rounded-lg w-full h-full object-cover"
          />
          <div>
            <p className={`font-bold ${featuredArticle.categoryColor} mb-2`}>
              {featuredArticle.category}
            </p>
            <h2 className="text-3xl font-bold mb-3 text-foreground">
              {featuredArticle.title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {featuredArticle.description}
            </p>
            <Button
              variant="success"
              onClick={() => handleReadArticle(featuredArticle.id)}
            >
              Leer más →
            </Button>
          </div>
        </div>
      )}

      {/* Other Articles */}
      <h3 className="text-2xl font-bold mb-8 border-l-4 border-success pl-4">
        Otros Artículos de Interés
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {otherArticles.map((article) => (
          <div 
            key={article.id}
            className="bg-card rounded-lg shadow-card overflow-hidden transform hover:-translate-y-2 transition-smooth"
          >
            <img 
              src={article.image} 
              alt={article.imageAlt}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <p className={`text-sm font-bold mb-1 ${article.categoryColor}`}>
                {article.category}
              </p>
              <h4 className="text-xl font-bold mb-2 text-foreground">
                {article.title}
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                {article.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReadArticle(article.id)}
              >
                Leer más →
              </Button>
            </div>
          </div>
        ))}

        {/* Placeholder for future article */}
        <div className="bg-card rounded-lg shadow-card overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=250&fit=crop&auto=format"
            alt="Documento de pagaré con un esfero"
            className="w-full h-48 object-cover"
          />
          <div className="p-6">
            <p className="text-sm font-bold text-violet-600 mb-1">
              FINANZAS Y ACUERDOS
            </p>
            <h4 className="text-xl font-bold mb-2 text-foreground">
              El Pagaré: ¿Qué es y por qué es tu mejor amigo para prestar dinero de forma segura?
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              Prestar dinero a un amigo o familiar se basa en la confianza, pero un pagaré lo hace seguro. 
              Te explicamos qué es y cómo te protege este documento tan simple y poderoso.
            </p>
            <p className="font-bold text-muted-foreground cursor-not-allowed">
              Próximamente
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 bg-success/10 border-l-4 border-success p-8 rounded-r-lg">
        <h3 className="text-2xl font-bold text-success mb-4">
          ¿Necesitas ayuda con tu caso específico?
        </h3>
        <p className="text-muted-foreground mb-6">
          Ya sea para crear tu contrato o resolver una duda específica, nuestro asistente con IA está listo para ayudarte.
        </p>
        <Button
          variant="success"
          size="lg"
          onClick={() => onOpenChat("Hola Lexi, necesito ayuda con una consulta legal.")}
        >
          Hablar con Lexi
        </Button>
      </div>
    </div>
  );
}
