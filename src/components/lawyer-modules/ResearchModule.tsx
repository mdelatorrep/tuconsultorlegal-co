import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, FileText, Loader2, Sparkles, Target, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface ResearchResult {
  query: string;
  findings: string;
  sources: string[];
  timestamp: string;
}

interface ResearchModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function ResearchModule({ user, currentView, onViewChange, onLogout }: ResearchModuleProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Consulta requerida",
        description: "Por favor ingresa una pregunta de investigación.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      console.log('Iniciando investigación legal con query:', query);
      
      // Call the legal research AI function
      const { data, error } = await supabase.functions.invoke('legal-research-ai', {
        body: { query }
      });
      
      console.log('Respuesta de legal-research-ai:', { data, error });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en la investigación');
      }

      const result: ResearchResult = {
        query: data.query,
        findings: data.findings,
        sources: data.sources,
        timestamp: data.timestamp
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'research',
          input_data: { query: data.query },
          output_data: { 
            findings: data.findings, 
            sources: data.sources,
            conclusion: data.conclusion 
          },
          metadata: { timestamp: data.timestamp }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      setResults(prev => [result, ...prev]);
      setQuery("");
      
      toast({
        title: "Investigación completada",
        description: "Se encontraron referencias jurídicas relevantes para tu consulta.",
      });
    } catch (error) {
      console.error("Error en investigación:", error);
      toast({
        title: "Error en la investigación",
        description: "Hubo un problema al procesar tu consulta. Verifica tu conexión.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Modern Header */}
          <header className="h-16 border-b bg-gradient-to-r from-background/95 to-primary/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50"></div>
            <div className="relative flex h-16 items-center px-6">
              <SidebarTrigger className="mr-4 hover:bg-primary/10 rounded-lg p-2 transition-all duration-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                  <Search className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Investigación Jurídica IA
                  </h1>
                  <p className="text-sm text-muted-foreground">Sistema inteligente de investigación legal</p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl">
                        <Sparkles className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                          Centro de Investigación Legal
                        </h2>
                        <p className="text-lg text-muted-foreground mt-2">
                          Acceso instantáneo a jurisprudencia, doctrina y normativa colombiana con análisis IA
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-primary" />
                          <div>
                            <p className="text-2xl font-bold text-primary">{results.length}</p>
                            <p className="text-sm text-muted-foreground">Investigaciones realizadas</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">98%</p>
                            <p className="text-sm text-muted-foreground">Precisión legal</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold text-orange-600">2 min</p>
                            <p className="text-sm text-muted-foreground">Tiempo promedio</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Search Interface */}
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-primary/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-50"></div>
                  <CardHeader className="relative pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                        <BookOpen className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          Nueva Consulta de Investigación
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                          Realiza consultas avanzadas sobre legislación, jurisprudencia o normativa colombiana
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-primary">Descripción de la consulta jurídica</label>
                      <Textarea
                        placeholder="Ejemplo: Analiza la línea jurisprudencial más reciente de la Corte Suprema sobre terminación anticipada de contratos de arrendamiento comercial por fuerza mayor o caso fortuito en Colombia, incluyendo criterios de aplicación y requisitos..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={5}
                        className="resize-none border-primary/20 focus:border-primary/40 rounded-xl bg-white/80 backdrop-blur-sm text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Sé específico sobre el área del derecho, jurisdicción y tipo de análisis que necesitas
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          <span className="animate-pulse">Analizando jurisprudencia...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-3" />
                          Iniciar Investigación Inteligente
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Enhanced Results */}
                {results.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                        Resultados de Investigación
                      </h3>
                    </div>
                    
                    {results.map((result, index) => (
                      <Card key={index} className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-emerald-50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 opacity-50"></div>
                        <CardHeader className="relative pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                                {result.query.length > 120 
                                  ? `${result.query.substring(0, 120)}...` 
                                  : result.query
                                }
                              </CardTitle>
                            </div>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(result.timestamp).toLocaleDateString()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="relative space-y-6">
                          <div className="bg-gradient-to-br from-white via-white to-gray-50 border border-gray-200/60 p-6 rounded-xl shadow-inner">
                            <h4 className="font-bold mb-4 flex items-center gap-3 text-lg text-gray-900">
                              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              Hallazgos Jurídicos
                            </h4>
                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {result.findings}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold mb-4 flex items-center gap-3 text-lg text-gray-900">
                              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                <BookOpen className="h-4 w-4 text-white" />
                              </div>
                              Fuentes Jurídicas Consultadas
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {result.sources.map((source, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                  <Badge variant="outline" className="text-blue-700 border-blue-300 bg-white/80 text-sm font-medium">
                                    {source}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {results.length === 0 && !isSearching && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 overflow-hidden">
                    <CardContent className="p-12 text-center">
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-2xl"></div>
                          <div className="relative p-6 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl mx-auto w-fit">
                            <Search className="h-16 w-16 text-primary-foreground" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Comienza tu investigación!</h3>
                          <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            Utiliza nuestro sistema de IA para realizar consultas avanzadas sobre legislación y jurisprudencia colombiana
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 max-w-lg mx-auto">
                          <p className="text-sm text-primary font-medium">
                            💡 Tip: Describe tu consulta de manera específica para obtener resultados más precisos
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}