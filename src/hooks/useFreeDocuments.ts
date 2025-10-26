import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FreeDocument {
  id: string;
  document_name: string;
  document_description: string;
  category: string;
  frontend_icon?: string;
  button_cta?: string;
}

export const useFreeDocuments = () => {
  const [documents, setDocuments] = useState<FreeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFreeDocuments = async () => {
      try {
        setLoading(true);
        
        const { data: freeDocs, error: docsError } = await supabase
          .from('legal_agents')
          .select(`
            id,
            document_name,
            document_description,
            category,
            frontend_icon,
            button_cta
          `)
          .eq('status', 'active')
          .eq('price', 0)
          .in('target_audience', ['personas', 'ambos'])
          .limit(6);

        if (docsError) throw docsError;

        setDocuments(freeDocs || []);
      } catch (err) {
        console.error('Error fetching free documents:', err);
        setError('Error al cargar los documentos gratuitos');
      } finally {
        setLoading(false);
      }
    };

    fetchFreeDocuments();
  }, []);

  return { documents, loading, error };
};
