import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IntellectualPropertyPageProps {
  onOpenChat: (message?: string) => void;
}

export default function IntellectualPropertyPage({ onOpenChat }: IntellectualPropertyPageProps) {
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
        .eq('page_key', 'intellectual-property')
        .single();

      if (error) throw error;
      setContent(data);
    } catch (error) {
      console.error('Error loading intellectual property:', error);
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
              {content?.title || 'Propiedad Intelectual'}
            </h1>
            <p className="text-lg text-muted-foreground">PRAXIS-HUB.CO</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div 
              className="bg-card p-6 rounded-lg border"
              dangerouslySetInnerHTML={{ __html: content?.content || '' }}
            />
          </div>

          <div className="mt-12 bg-success/10 border-l-4 border-success p-6 rounded-r-lg">
            <h3 className="text-2xl font-bold text-success-foreground">¿Tienes dudas sobre propiedad intelectual?</h3>
            <p className="text-success-foreground/80 mt-2 mb-4">
              Si tienes preguntas sobre nuestros derechos de propiedad intelectual o deseas información adicional, estamos aquí para ayudarte.
            </p>
            <button
              onClick={() => onOpenChat("Tengo una pregunta sobre propiedad intelectual")}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all"
            >
              Consultar con soporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
