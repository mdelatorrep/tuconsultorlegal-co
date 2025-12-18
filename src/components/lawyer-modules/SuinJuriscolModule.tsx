import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, Search, Loader2, Sparkles, FileText, Scale, 
  ExternalLink, ChevronDown, ChevronRight, Calendar, Clock,
  Database, Globe, AlertCircle, CheckCircle2, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface SearchResult {
  id: string;
  query: string;
  results: {
    title: string;
    url: string;
    snippet: string;
    type?: string;
    date?: string;
  }[];
  summary: string;
  sources: string[];
  timestamp: string;
}

interface SuinJuriscolModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const LEGAL_CATEGORIES = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'leyes', label: 'Leyes' },
  { value: 'decretos', label: 'Decretos' },
  { value: 'resoluciones', label: 'Resoluciones' },
  { value: 'jurisprudencia', label: 'Jurisprudencia' },
  { value: 'conceptos', label: 'Conceptos' },
  { value: 'circulares', label: 'Circulares' },
];

export default function SuinJuriscolModule({ user, currentView, onViewChange, onLogout }: SuinJuriscolModuleProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'suin_juriscol')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const history = data?.map((item: any) => ({
        id: item.id,
        query: item.input_data?.query || 'Consulta SUIN',
        results: item.output_data?.results || [],
        summary: item.output_data?.summary || '',
        sources: item.output_data?.sources || [],
        timestamp: item.created_at,
      })) || [];

      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const toggleResult = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Consulta requerida",
        description: "Por favor ingresa una consulta para buscar en SUIN-Juriscol.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setCurrentResult(null);

    try {
      console.log('Iniciando búsqueda en SUIN-Juriscol:', { query, category, year });

      const { data, error } = await supabase.functions.invoke('suin-juriscol-search', {
        body: { 
          query: query.trim(),
          category: category !== 'all' ? category : undefined,
          year: year || undefined
        }
      });

      console.log('Respuesta de suin-juriscol-search:', { data, error });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Error en la búsqueda');
      }

      const result: SearchResult = {
        id: data.result_id || crypto.randomUUID(),
        query: query,
        results: data.results || [],
        summary: data.summary || 'Búsqueda completada.',
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      };

      setCurrentResult(result);
      setSearchHistory(prev => [result, ...prev.slice(0, 9)]);

      toast({
        title: "✅ Búsqueda completada",
        description: `Se encontraron ${result.results.length} resultados relevantes.`,
      });

    } catch (error) {
      console.error("Error en búsqueda SUIN:", error);
      toast({
        title: "❌ Error en la búsqueda",
        description: error instanceof Error ? error.message : "Hubo un problema al consultar SUIN-Juriscol.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-emerald-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-emerald-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              <SidebarTrigger className="mr-2 lg:mr-4 hover:bg-emerald-500/10 rounded-lg p-2 transition-all duration-200 flex-shrink-0" />
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <Database className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent truncate">
                    SUIN-Juriscol
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Sistema Único de Información Normativa
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 lg:p-8">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl shadow-2xl">
                      <Scale className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                        Consulta SUIN-Juriscol
                      </h1>
                      <p className="text-sm lg:text-base text-muted-foreground mt-1">
                        Acceso directo a normativa colombiana con análisis IA
                      </p>
                    </div>
                  </div>
                  
                  {/* Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium">Leyes y Decretos</p>
                          <p className="text-xs text-muted-foreground">Normativa vigente</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium">Jurisprudencia</p>
                          <p className="text-xs text-muted-foreground">Sentencias y fallos</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium">Fuente Oficial</p>
                          <p className="text-xs text-muted-foreground">suin-juriscol.gov.co</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Interface */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-emerald-50/50 dark:from-card dark:via-card dark:to-emerald-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-emerald-600" />
                    Nueva Consulta
                  </CardTitle>
                  <CardDescription>
                    Busca leyes, decretos, jurisprudencia y normativa colombiana
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ej: Ley 1801 de 2016 Código de Policía, Decreto 1072 de 2015 trabajo, sentencias tutela derecho a la salud..."
                      className="min-h-[100px] resize-none focus:ring-emerald-500 focus:border-emerald-500"
                      disabled={isSearching}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                      <Select value={category} onValueChange={setCategory} disabled={isSearching}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEGAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Año (opcional)</label>
                      <Input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="Ej: 2024"
                        min="1900"
                        max={new Date().getFullYear()}
                        disabled={isSearching}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg"
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Consultando SUIN-Juriscol...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Buscar con IA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Current Result */}
              {currentResult && (
                <Card className="border-emerald-200 dark:border-emerald-800 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Resultados de la Búsqueda
                      </CardTitle>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {currentResult.results.length} encontrados
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(currentResult.timestamp).toLocaleString('es-CO')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {/* Summary */}
                    {currentResult.summary && (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Resumen IA
                        </h4>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{currentResult.summary}</p>
                      </div>
                    )}

                    {/* Results List */}
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-3">
                        {currentResult.results.map((result, index) => (
                          <div 
                            key={index}
                            className="p-4 bg-muted/50 rounded-lg border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm line-clamp-2">{result.title}</h5>
                                {result.type && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {result.type}
                                  </Badge>
                                )}
                              </div>
                              {result.url && (
                                <a 
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4 text-emerald-600" />
                                </a>
                              )}
                            </div>
                            {result.snippet && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{result.snippet}</p>
                            )}
                            {result.date && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {result.date}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Sources */}
                    {currentResult.sources.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Fuentes consultadas:</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentResult.sources.map((source, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Search History */}
              {searchHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="h-5 w-5" />
                      Historial de Búsquedas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {searchHistory.slice(0, 5).map((item) => (
                        <Collapsible
                          key={item.id}
                          open={expandedResults.has(item.id)}
                          onOpenChange={() => toggleResult(item.id)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {expandedResults.has(item.id) ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium truncate">{item.query}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs">
                                  {item.results.length} resultados
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleDateString('es-CO')}
                                </span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-10 pr-4 pb-4 space-y-2">
                              {item.summary && (
                                <p className="text-sm text-muted-foreground">{item.summary}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {item.results.slice(0, 3).map((result, idx) => (
                                  <a
                                    key={idx}
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {result.title.substring(0, 40)}...
                                  </a>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
