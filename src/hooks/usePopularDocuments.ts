import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PopularDocument {
  id: string;
  name: string;
  description: string;
  category: string;
  frontend_icon?: string;
  button_cta?: string;
  request_count: number;
}

export const usePopularDocuments = () => {
  const [documents, setDocuments] = useState<PopularDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularDocuments = async () => {
      try {
        setLoading(true);
        
        // Get active legal agents with their request counts
        const { data: popularDocs, error: docsError } = await supabase
          .from('legal_agents')
          .select(`
            id,
            name,
            description,
            category,
            frontend_icon,
            button_cta,
            document_name
          `)
          .eq('status', 'active')
          .limit(6);

        if (docsError) throw docsError;

        // Get request counts for each document type
        const { data: tokenCounts, error: countsError } = await supabase
          .from('document_tokens')
          .select('document_type')
          .not('document_type', 'is', null);

        if (countsError) throw countsError;

        // Count requests per document type
        const requestCounts: Record<string, number> = {};
        tokenCounts?.forEach(token => {
          const docType = token.document_type;
          requestCounts[docType] = (requestCounts[docType] || 0) + 1;
        });

        // Combine data and sort by popularity
        const documentsWithCounts = popularDocs?.map(doc => ({
          ...doc,
          request_count: requestCounts[doc.document_name || doc.name] || 0
        })) || [];

        // Sort by request count and take top 6
        const sortedDocs = documentsWithCounts
          .sort((a, b) => b.request_count - a.request_count)
          .slice(0, 6);

        setDocuments(sortedDocs);
      } catch (err) {
        console.error('Error fetching popular documents:', err);
        setError('Error al cargar los documentos populares');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularDocuments();
  }, []);

  return { documents, loading, error };
};