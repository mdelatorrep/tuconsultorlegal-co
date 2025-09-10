import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, FileText, Loader2, Sparkles, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Hourglass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface ResearchResult {
  query: string;
  findings: string;
  sources: string[];
  timestamp: string;
  conclusion?: string;
  task_id?: string;
  status?: 'completed' | 'failed' | 'processing';
}

interface PendingTask {
  task_id: string;
  query: string;
  started_at: string;
  estimated_completion: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
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
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Effect to load pending tasks and completed results on mount
  useEffect(() => {
    loadPendingTasks();
    loadCompletedResults();
    
    // Set up polling for pending tasks
    const pollInterval = setInterval(() => {
      if (pendingTasks.length > 0) {
        checkTaskUpdates();
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [pendingTasks.length]);

  const loadPendingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'research_initiated')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pending = data?.map((item: any) => ({
        task_id: item.metadata?.task_id || item.input_data?.task_id,
        query: item.input_data?.query || 'Consulta en progreso',
        started_at: item.created_at,
        estimated_completion: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 min estimate
        status: 'processing' as const
      })).filter(task => task.task_id) || [];

      setPendingTasks(pending);
    } catch (error) {
      console.error('Error loading pending tasks:', error);
    }
  };

  const loadCompletedResults = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .in('tool_type', ['research_completed', 'research'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const completed = data?.map((item: any) => ({
        query: item.input_data?.query || item.input_data?.original_query || 'Consulta completada',
        findings: (item.output_data as any)?.findings || 'Resultados de investigación disponibles',
        sources: (item.output_data as any)?.sources || ['Fuentes legales consultadas'],
        timestamp: item.created_at,
        conclusion: (item.output_data as any)?.conclusion || 'Análisis completado',
        task_id: item.metadata?.task_id,
        status: 'completed' as const
      })) || [];

      setResults(completed);
    } catch (error) {
      console.error('Error loading completed results:', error);
    }
  };

  const checkTaskUpdates = async () => {
    for (const task of pendingTasks) {
      try {
        const { data, error } = await supabase
          .from('legal_tools_results')
          .select('*')
          .eq('lawyer_id', user.id)
          .eq('metadata->>task_id', task.task_id)
          .in('tool_type', ['research_completed', 'research_failed']);

        if (error) continue;

        if (data && data.length > 0) {
          const completedTask = data[0];
          
          if (completedTask.tool_type === 'research_completed') {
            // Task completed successfully
            const newResult: ResearchResult = {
              query: task.query,
              findings: (completedTask.output_data as any)?.findings || 'Investigación completada',
              sources: (completedTask.output_data as any)?.sources || ['Fuentes consultadas'],
              timestamp: completedTask.created_at,
              conclusion: (completedTask.output_data as any)?.conclusion || 'Análisis finalizado',
              task_id: task.task_id,
              status: 'completed'
            };

            setResults(prev => [newResult, ...prev.filter(r => r.task_id !== task.task_id)]);
            setPendingTasks(prev => prev.filter(t => t.task_id !== task.task_id));
            
            toast({
              title: "🎉 Investigación completada",
              description: `Tu consulta sobre "${task.query.substring(0, 50)}..." ha sido procesada exitosamente.`,
            });
          } else if (completedTask.tool_type === 'research_failed') {
            // Task failed
            setPendingTasks(prev => prev.filter(t => t.task_id !== task.task_id));
            
            toast({
              title: "⚠️ Investigación fallida",
              description: "Hubo un problema procesando tu consulta. Por favor intenta nuevamente.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error(`Error checking task ${task.task_id}:`, error);
      }
    }
  };

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
    setProgress(0);
    
    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

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

      // Handle background task response
      if (data.task_id) {
        const newTask: PendingTask = {
          task_id: data.task_id,
          query: query,
          started_at: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
          status: 'initiated' as const
        };

        setPendingTasks(prev => [newTask, ...prev]);
        setQuery("");
        setProgress(100);

        toast({
          title: "🚀 Investigación iniciada",
          description: `Tu consulta está siendo procesada. Tiempo estimado: ${data.estimated_time || '5-30 minutos'}`,
        });
      } else {
        // Handle immediate response (fallback)
        const result: ResearchResult = {
          query: query,
          findings: data.findings || data.content || 'Investigación completada con resultados relevantes.',
          sources: data.sources || ['Legislación Colombiana', 'Jurisprudencia', 'Doctrina Legal'],
          timestamp: data.timestamp || new Date().toISOString(),
          conclusion: data.conclusion || 'Análisis completado',
          status: 'completed'
        };

        setResults(prev => [result, ...prev]);
        setQuery("");
        setProgress(100);
        
        toast({
          title: "✅ Investigación completada",
          description: "Se encontraron referencias jurídicas relevantes para tu consulta.",
        });
      }

    } catch (error) {
      console.error("Error en investigación:", error);
      setProgress(0);
      toast({
        title: "❌ Error en la investigación",
        description: "Hubo un problema al procesar tu consulta. Verifica tu conexión e intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsSearching(false);
        setProgress(0);
      }, 1000);
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
                            <p className="text-sm text-muted-foreground">Investigaciones completadas</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Hourglass className="h-8 w-8 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold text-orange-600">{pendingTasks.length}</p>
                            <p className="text-sm text-muted-foreground">En progreso</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-blue-600">5-30</p>
                            <p className="text-sm text-muted-foreground">Minutos promedio</p>
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
                    
                    {/* Progress indicator */}
                    {isSearching && (
                      <div className="space-y-3">
                        <Progress value={progress} className="h-2" />
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800 text-center">
                            📡 <strong>Procesando consulta con IA avanzada</strong> - Esta investigación se realiza en background y puede tomar entre 5-30 minutos para obtener resultados exhaustivos.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg font-semibold"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                          <span className="animate-pulse">Iniciando investigación profunda...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-3" />
                          Iniciar Investigación Deep Research
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pending Tasks Section */}
                {pendingTasks.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                        <Hourglass className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                        Investigaciones en Progreso
                      </h3>
                    </div>
                    
                    {pendingTasks.map((task, index) => (
                      <Card key={task.task_id} className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-orange-50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/10 opacity-50"></div>
                        <CardHeader className="relative pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                                {task.query.length > 120 
                                  ? `${task.query.substring(0, 120)}...` 
                                  : task.query
                                }
                              </CardTitle>
                            </div>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 whitespace-nowrap animate-pulse">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Procesando
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="relative space-y-4">
                          <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-200/60 p-4 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                              <Clock className="h-5 w-5 text-orange-600" />
                              <span className="font-semibold text-orange-800">Deep Research en progreso</span>
                            </div>
                            <p className="text-sm text-orange-700 mb-3">
                              Tu consulta está siendo procesada por nuestro sistema de investigación avanzado con IA. 
                              Esto incluye análisis de jurisprudencia, normativa vigente y búsqueda web especializada.
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-orange-600">
                                <span>Tiempo transcurrido:</span>
                                <span>{Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000)} min</span>
                              </div>
                              <div className="flex justify-between text-xs text-orange-600">
                                <span>Tiempo estimado total:</span>
                                <span>5-30 minutos</span>
                              </div>
                            </div>
                            <Progress value={Math.min(90, (Date.now() - new Date(task.started_at).getTime()) / (30 * 60 * 1000) * 100)} className="mt-3 h-2" />
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 text-center">
                              💡 <strong>Tip:</strong> Recibirás una notificación cuando tu investigación esté lista. Puedes continuar usando otras funciones mientras tanto.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Enhanced Results */}
                {results.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                        Investigaciones Completadas
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
                            <div className="flex gap-2 flex-col sm:flex-row">
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completado
                              </Badge>
                              <Badge variant="outline" className="text-gray-600 border-gray-300 whitespace-nowrap">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(result.timestamp).toLocaleDateString()}
                              </Badge>
                            </div>
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
                          
                          {result.conclusion && (
                            <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-200/60 p-4 rounded-xl">
                              <h4 className="font-bold mb-3 flex items-center gap-3 text-lg text-blue-900">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                  <Target className="h-4 w-4 text-white" />
                                </div>
                                Conclusión
                              </h4>
                              <p className="text-blue-800 leading-relaxed">{result.conclusion}</p>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-bold mb-4 flex items-center gap-3 text-lg text-gray-900">
                              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                                <BookOpen className="h-4 w-4 text-white" />
                              </div>
                              Fuentes Jurídicas Consultadas
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {result.sources.filter(Boolean).map((source, idx) => {
                                let sourceText = 'Fuente legal';
                                
                                try {
                                  if (typeof source === 'string') {
                                    sourceText = source;
                                  } else if (source && typeof source === 'object' && 'title' in source) {
                                    sourceText = (source as any).title || 'Fuente legal';
                                  }
                                } catch (e) {
                                  sourceText = 'Fuente legal';
                                }
                                
                                return (
                                  <div key={idx} className="bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200 rounded-lg p-3 shadow-sm">
                                    <Badge variant="outline" className="text-purple-700 border-purple-300 bg-white/80 text-sm font-medium">
                                      {sourceText}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {(results.length === 0 && pendingTasks.length === 0 && !isSearching) && (
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
                            Utiliza nuestro sistema de Deep Research para realizar consultas exhaustivas sobre legislación y jurisprudencia colombiana
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 max-w-lg mx-auto border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-800">Deep Research IA</span>
                          </div>
                          <p className="text-sm text-blue-700 text-left">
                            • Análisis exhaustivo de jurisprudencia<br/>
                            • Búsqueda web especializada en derecho<br/>
                            • Resultados en 5-30 minutos<br/>
                            • Procesamiento en background
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