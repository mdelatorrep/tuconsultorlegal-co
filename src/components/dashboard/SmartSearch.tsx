import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Briefcase, Users, FileText, Calendar, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SearchResult {
  id: string;
  type: 'case' | 'client' | 'document' | 'task';
  title: string;
  subtitle?: string;
  metadata?: string;
}

interface SmartSearchProps {
  lawyerId: string;
  onNavigate: (type: string, id?: string) => void;
}

export function SmartSearch({ lawyerId, onNavigate }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchTerm = `%${searchQuery}%`;
      const allResults: SearchResult[] = [];

      // Search cases
      const { data: cases } = await supabase
        .from('crm_cases')
        .select('id, title, case_number, case_type, status')
        .eq('lawyer_id', lawyerId)
        .or(`title.ilike.${searchTerm},case_number.ilike.${searchTerm},case_type.ilike.${searchTerm}`)
        .limit(3);

      if (cases) {
        allResults.push(...cases.map(c => ({
          id: c.id,
          type: 'case' as const,
          title: c.title,
          subtitle: c.case_type,
          metadata: c.case_number || undefined
        })));
      }

      // Search clients
      const { data: clients } = await supabase
        .from('crm_clients')
        .select('id, name, email, company')
        .eq('lawyer_id', lawyerId)
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
        .limit(3);

      if (clients) {
        allResults.push(...clients.map(c => ({
          id: c.id,
          type: 'client' as const,
          title: c.name,
          subtitle: c.company || c.email
        })));
      }

      // Search documents
      const { data: documents } = await supabase
        .from('crm_documents')
        .select('id, name, document_type, created_at')
        .eq('lawyer_id', lawyerId)
        .or(`name.ilike.${searchTerm},document_type.ilike.${searchTerm}`)
        .limit(3);

      if (documents) {
        allResults.push(...documents.map(d => ({
          id: d.id,
          type: 'document' as const,
          title: d.name,
          subtitle: d.document_type,
          metadata: format(new Date(d.created_at), "d MMM yyyy", { locale: es })
        })));
      }

      // Search tasks
      const { data: tasks } = await supabase
        .from('crm_tasks')
        .select('id, title, type, due_date')
        .eq('lawyer_id', lawyerId)
        .ilike('title', searchTerm)
        .limit(3);

      if (tasks) {
        allResults.push(...tasks.map(t => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          subtitle: t.type,
          metadata: t.due_date ? format(new Date(t.due_date), "d MMM", { locale: es }) : undefined
        })));
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [lawyerId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'case': return <Briefcase className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'task': return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'case': return 'Caso';
      case 'client': return 'Cliente';
      case 'document': return 'Documento';
      case 'task': return 'Tarea';
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'case': return 'bg-blue-500/10 text-blue-600';
      case 'client': return 'bg-green-500/10 text-green-600';
      case 'document': return 'bg-amber-500/10 text-amber-600';
      case 'task': return 'bg-purple-500/10 text-purple-600';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.type, result.id);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-3">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos, clientes, documentos, tareas..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                className="pl-9 pr-8"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results Dropdown */}
          {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-0"
                  onClick={() => handleResultClick(result)}
                >
                  <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                    {getTypeIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result.metadata && (
                      <span className="text-xs text-muted-foreground">{result.metadata}</span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {isOpen && query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No se encontraron resultados para "{query}"
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}