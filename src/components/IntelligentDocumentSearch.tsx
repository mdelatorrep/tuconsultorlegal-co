import React, { useState } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Document {
  id: string;
  name: string;
  description: string;
  document_name: string;
  document_description: string;
  category: string;
  price: number;
  frontend_icon: string;
  button_cta: string;
}

interface IntelligentDocumentSearchProps {
  audience: 'personas' | 'empresas';
  onDocumentSelect: (documentId: string) => void;
  placeholder?: string;
}

export const IntelligentDocumentSearch: React.FC<IntelligentDocumentSearchProps> = ({
  audience,
  onDocumentSelect,
  placeholder = "Busca documentos con lenguaje natural... Ej: 'necesito un contrato de arrendamiento'"
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Document[]>([]);
  const [explanation, setExplanation] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Por favor escribe tu búsqueda');
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const { data, error } = await supabase.functions.invoke('intelligent-document-search', {
        body: { query: query.trim(), audience }
      });

      if (error) {
        console.error('Search error:', error);
        if (error.message?.includes('429')) {
          toast.error('Demasiadas búsquedas. Por favor espera un momento.');
        } else if (error.message?.includes('402')) {
          toast.error('Error de configuración del servicio.');
        } else {
          toast.error('Error al buscar documentos. Intenta nuevamente.');
        }
        return;
      }

      setResults(data.matches || []);
      setExplanation(data.explanation || '');
      
      if (data.matches?.length === 0) {
        toast.info('No se encontraron documentos para tu búsqueda');
      } else {
        toast.success(`${data.matches.length} documento(s) encontrado(s)`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error al procesar la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setExplanation('');
    setShowResults(false);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-12 pr-32 h-14 text-base rounded-2xl border-2 focus:border-primary shadow-sm"
            disabled={isSearching}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="gap-2 h-10"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* AI Explanation */}
            {explanation && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{explanation}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Grid */}
            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((doc) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="h-full hover:shadow-lg transition-all cursor-pointer hover:border-primary/30"
                      onClick={() => onDocumentSelect(doc.id)}
                    >
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h3 className="font-semibold text-lg line-clamp-2">
                              {doc.document_name || doc.name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {doc.category}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {doc.document_description || doc.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-lg font-bold text-primary">
                            ${doc.price.toLocaleString('es-CO')}
                          </span>
                          <Button size="sm" variant="outline">
                            {doc.button_cta || 'Ver documento'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : showResults && !isSearching ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron resultados</h3>
                  <p className="text-sm text-muted-foreground">
                    Intenta con otras palabras clave o describe tu necesidad de otra forma
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
