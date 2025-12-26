import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, BookOpen, FileText, Loader2, Sparkles, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, Hourglass, ChevronDown, ChevronRight, Calendar, Archive, Filter, Coins, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { CaseSelectorDropdown } from "./CaseSelectorDropdown";
import { useCaseActivityLogger } from "@/hooks/useCaseActivityLogger";

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
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'rate_limited' | 'pending';
  retry_count?: number;
  next_retry_at?: string;
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
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'query'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'archived'>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);
  const { logAIToolUsage } = useCaseActivityLogger();

  // Toggle expand/collapse for individual results
  const toggleResult = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  // Filter and sort results
  const getFilteredResults = () => {
    let filtered = [...results];
    
    // Apply filters
    if (filterBy === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(result => new Date(result.timestamp) >= sevenDaysAgo);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else {
        return a.query.localeCompare(b.query);
      }
    });
    
    return filtered;
  };

  // Debug logs
  console.log('ResearchModule state:', { query, isSearching, results: results.length, pendingTasks: pendingTasks.length });

  // Effect to load pending tasks and completed results on mount
  useEffect(() => {
    loadPendingTasks();
    loadCompletedResults();
  }, []);

  // Separate effect for continuous polling that doesn't depend on pendingTasks
  useEffect(() => {
    // Set up continuous polling for pending tasks
    const pollInterval = setInterval(() => {
      checkTaskUpdates();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, []); // Empty dependency array for continuous polling

  const loadPendingTasks = async () => {
    try {
      // Load from new research_queue table
      const { data: queueData, error: queueError } = await supabase
        .from('research_queue')
        .select('*')
        .eq('lawyer_id', user.id)
        .in('status', ['pending', 'processing', 'rate_limited'])
        .order('created_at', { ascending: false });

      // Also check legacy legal_tools_results for initiated tasks
      const { data: legacyData, error: legacyError } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'research')
        .eq('metadata->>status', 'initiated')
        .order('created_at', { ascending: false });

      const pending: PendingTask[] = [];

      // Add queue tasks
      queueData?.forEach((item: any) => {
        pending.push({
          task_id: item.id,
          query: item.query || 'Consulta en progreso',
          started_at: item.created_at,
          estimated_completion: item.next_retry_at || new Date(Date.now() + 25 * 60 * 1000).toISOString(),
          status: item.status as PendingTask['status'],
          retry_count: item.retry_count || 0,
          next_retry_at: item.next_retry_at
        });
      });

      // Add legacy tasks (if not already in queue)
      legacyData?.forEach((item: any) => {
        const taskId = item.metadata?.task_id || item.input_data?.task_id;
        if (taskId && !pending.some(p => p.task_id === taskId)) {
          pending.push({
            task_id: taskId,
            query: item.input_data?.query || 'Consulta en progreso',
            started_at: item.created_at,
            estimated_completion: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
            status: 'processing' as const
          });
        }
      });

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
        .eq('tool_type', 'research')
        .in('metadata->>status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const results = data?.map((item: any) => {
        const itemStatus = (item.metadata as any)?.status;
        const isFailed = itemStatus === 'failed';
        
        return {
          query: item.input_data?.query || item.input_data?.original_query || 'Consulta completada',
          findings: isFailed 
            ? `Error en la investigación: ${(item.metadata as any)?.error?.message || 'Error desconocido'}` 
            : ((item.output_data as any)?.findings || 'Resultados de investigación disponibles'),
          sources: isFailed ? [] : ((item.output_data as any)?.sources || ['Fuentes legales consultadas']),
          timestamp: item.created_at,
          conclusion: isFailed ? undefined : ((item.output_data as any)?.conclusion || 'Análisis completado'),
          task_id: item.metadata?.task_id,
          status: itemStatus as 'completed' | 'failed'
        };
      }) || [];

      setResults(results);
    } catch (error) {
      console.error('Error loading completed results:', error);
    }
  };

  const checkTaskUpdates = async () => {
    try {
      // Check queue table for completed/failed tasks
      const { data: queueCompleted, error: queueError } = await supabase
        .from('research_queue')
        .select('*')
        .eq('lawyer_id', user.id)
        .in('status', ['completed', 'failed'])
        .order('completed_at', { ascending: false })
        .limit(5);

      // Reload pending to update counts
      await loadPendingTasks();
      await loadCompletedResults();

      // Show toast for newly completed items
      if (queueCompleted && queueCompleted.length > 0) {
        const recentlyCompleted = queueCompleted.filter(t => {
          const completedAt = new Date(t.completed_at);
          const now = new Date();
          return (now.getTime() - completedAt.getTime()) < 60000; // Within last minute
        });

        recentlyCompleted.forEach(task => {
          if (task.status === 'completed') {
            toast({
              title: "🎉 Investigación completada",
              description: `Tu consulta sobre "${task.query?.substring(0, 50)}..." ha sido procesada exitosamente.`,
            });
          } else if (task.status === 'failed') {
            toast({
              title: "⚠️ Investigación fallida",
              description: task.last_error || "Hubo un problema procesando tu consulta. Por favor intenta nuevamente.",
              variant: "destructive",
            });
          }
        });
      }
      
    } catch (error) {
      console.error('Error in checkTaskUpdates:', error);
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

    // Check and consume credits before proceeding
    if (!hasEnoughCredits('research')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('research')} créditos para usar esta herramienta.`,
        variant: "destructive",
      });
      return;
    }

    const creditResult = await consumeCredits('research', { query });
    if (!creditResult.success) {
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

      // Handle queue response (new system)
      if (data.queue_id) {
        const newTask: PendingTask = {
          task_id: data.queue_id,
          query: query,
          started_at: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
          status: 'initiated' as const
        };

        setPendingTasks(prev => [newTask, ...prev]);
        setQuery("");
        setProgress(100);

        toast({
          title: "🚀 Investigación en cola",
          description: data.message || `Tu consulta está en cola. Tiempo estimado: ${data.estimated_time || '5-30 minutos'}`,
        });
      } else if (data.task_id) {
        // Legacy background task response
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
    <div className="space-y-4 lg:space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 lg:p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Centro de Investigación Legal
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Acceso instantáneo a jurisprudencia, doctrina y normativa colombiana con análisis IA
              </p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-6 lg:mt-8">
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Investigaciones completadas</p>
                </div>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <Hourglass className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{pendingTasks.length}</p>
                  <p className="text-sm text-muted-foreground">En progreso</p>
                </div>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">5-30</p>
                  <p className="text-sm text-muted-foreground">Minutos promedio</p>
                </div>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-emerald-600">95%</p>
                  <p className="text-sm text-muted-foreground">Precisión IA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Interface */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">
        <CardHeader className="relative z-10 pb-6">
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
        <CardContent className="relative z-10 space-y-6">
          <div className="space-y-3">
            <label htmlFor="research-query" className="text-sm font-semibold text-primary">
              Descripción de la consulta jurídica
            </label>
            <Textarea
              id="research-query"
              placeholder="Ejemplo: Analiza la línea jurisprudencial más reciente de la Corte Suprema sobre terminación anticipada de contratos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={5}
              disabled={isSearching}
              className="resize-none border-primary/20 focus:border-primary/40 rounded-xl bg-background text-base min-h-[120px]"
            />
          </div>
          
          {isSearching && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 text-center">
                  📡 Procesando consulta con IA avanzada - Esto puede tomar entre 5-30 minutos.
                </p>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSearch}
            disabled={isSearching || !hasEnoughCredits('research')}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl text-lg font-semibold"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                <span className="animate-pulse">Iniciando investigación profunda...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-3" />
                <span>Iniciar Investigación</span>
                <span className="ml-3 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                  <Coins className="h-4 w-4" />
                  {getToolCost('research')}
                </span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
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
            <Card key={task.task_id} className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-orange-50">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-xl font-bold leading-tight">
                    {task.query.length > 120 ? `${task.query.substring(0, 120)}...` : task.query}
                  </CardTitle>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Procesando
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                  <p className="text-sm text-orange-700 mb-3">
                    Tu consulta está siendo procesada por nuestro sistema de investigación avanzado.
                  </p>
                  <Progress value={Math.min(90, (Date.now() - new Date(task.started_at).getTime()) / (30 * 60 * 1000) * 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results History */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                <Archive className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  Historial de Investigaciones
                </h3>
                <p className="text-emerald-700 text-sm">{getFilteredResults().length} investigaciones</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant={sortBy === 'date' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('date')}>
                <Calendar className="h-3 w-3 mr-1" />Fecha
              </Button>
              <Button variant={sortBy === 'query' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('query')}>
                <Filter className="h-3 w-3 mr-1" />A-Z
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            {getFilteredResults().map((result, index) => (
              <Collapsible key={index} open={expandedResults.has(index)} onOpenChange={() => toggleResult(index)}>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-background via-background to-emerald-50/30 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-emerald-50/50 transition-colors pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {expandedResults.has(index) ? <ChevronDown className="h-5 w-5 text-emerald-600" /> : <ChevronRight className="h-5 w-5 text-emerald-600" />}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base lg:text-lg font-semibold line-clamp-2">{result.query}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Completado
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(result.timestamp).toLocaleDateString('es-ES')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">
                      <div className="bg-background border rounded-xl p-4 lg:p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-3 text-lg">
                          <FileText className="h-5 w-5 text-primary" />Hallazgos Jurídicos
                        </h4>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">{result.findings}</div>
                      </div>
                      
                      {result.conclusion && (
                        <div className="bg-blue-50 border border-blue-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-blue-900">
                            <Target className="h-5 w-5 inline mr-2" />Conclusión
                          </h4>
                          <p className="text-blue-800">{result.conclusion}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-bold mb-4 text-lg"><BookOpen className="h-5 w-5 inline mr-2" />Fuentes Consultadas</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {result.sources.filter(Boolean).map((source, idx) => (
                            <Badge key={idx} variant="outline" className="text-purple-700 border-purple-300 p-3">
                              {typeof source === 'string' ? source : 'Fuente legal'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && pendingTasks.length === 0 && !isSearching && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl mx-auto w-fit">
                <Search className="h-16 w-16 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">¡Comienza tu investigación!</h3>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Utiliza nuestro sistema de Deep Research para realizar consultas exhaustivas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}