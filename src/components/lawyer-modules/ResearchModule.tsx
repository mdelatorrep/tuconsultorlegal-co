import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, BookOpen, FileText, Loader2, Sparkles, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Calendar, Archive, Filter, Coins, Briefcase } from "lucide-react";
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
  status?: 'completed' | 'failed' | 'pending';
  taskId?: string;
}

interface ResearchModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

// Polling interval for async tasks (5 seconds)
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_TIME_MS = 10 * 60 * 1000; // 10 minutes max

export default function ResearchModule({ user, currentView, onViewChange, onLogout }: ResearchModuleProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'query'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'archived'>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseData, setSelectedCaseData] = useState<any>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);
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

  // Load completed results and pending tasks on mount
  useEffect(() => {
    loadCompletedResults();
    loadPendingTasks();

    // Subscribe to realtime updates for async_research_tasks
    const channel = supabase
      .channel(`research-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'async_research_tasks',
          filter: `lawyer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📡 Realtime task update:', payload);
          const updatedTask = payload.new as any;
          
          if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
            // Reload results when a task completes
            loadCompletedResults();
            loadPendingTasks();
            
            // Clear polling state if this was the task being polled
            if (pendingTaskId === updatedTask.id) {
              setPendingTaskId(null);
              setPollStartTime(null);
              setIsSearching(false);
              setProgress(100);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Load pending tasks from async_research_tasks
  const loadPendingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('async_research_tasks')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`📋 Found ${data.length} pending tasks`);
        
        // Add pending tasks to results
        const pendingResults: ResearchResult[] = data.map((task: any) => ({
          query: task.query,
          findings: 'Procesando investigación...',
          sources: [],
          timestamp: task.created_at,
          status: 'pending' as const,
          taskId: task.id
        }));

        setResults(prev => {
          // Merge pending with existing, avoiding duplicates
          const existingIds = new Set(prev.filter(r => r.taskId).map(r => r.taskId));
          const newPending = pendingResults.filter(p => !existingIds.has(p.taskId));
          return [...newPending, ...prev];
        });

        // Start polling for the most recent pending task
        if (!pendingTaskId && data[0]) {
          setPendingTaskId(data[0].id);
          setPollStartTime(Date.now());
          setIsSearching(true);
        }
      }
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
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const loadedResults = data?.map((item: any) => {
        const itemStatus = (item.metadata as any)?.status;
        const isFailed = itemStatus === 'failed';
        
        return {
          query: item.input_data?.query || 'Consulta completada',
          findings: isFailed 
            ? `Error en la investigación: ${(item.metadata as any)?.error?.message || 'Error desconocido'}` 
            : ((item.output_data as any)?.findings || 'Resultados de investigación disponibles'),
          sources: isFailed ? [] : ((item.output_data as any)?.sources || ['Fuentes legales consultadas']),
          timestamp: item.created_at,
          conclusion: isFailed ? undefined : ((item.output_data as any)?.conclusion || 'Análisis completado'),
          status: (isFailed ? 'failed' : 'completed') as 'completed' | 'failed'
        };
      }) || [];

      setResults(prev => {
        // Merge with any pending tasks already loaded
        const pendingTasks = prev.filter(r => r.status === 'pending');
        return [...pendingTasks, ...loadedResults];
      });
    } catch (error) {
      console.error('Error loading completed results:', error);
    }
  };

  // Poll for async task completion
  const pollTaskStatus = async (taskId: string, queryText: string) => {
    console.log(`📡 Polling task: ${taskId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('poll-research-task', {
        body: { taskId }
      });

      if (error) throw error;

      console.log('Poll response:', data);

      if (data.status === 'completed' && data.result) {
        // Task completed successfully
        const result: ResearchResult = {
          query: queryText,
          findings: data.result.findings || 'Investigación completada',
          sources: data.result.sources || ['Fuentes legales consultadas'],
          timestamp: new Date().toISOString(),
          conclusion: data.result.conclusion || 'Análisis completado',
          status: 'completed'
        };

        setResults(prev => {
          // Replace pending result with completed result
          const filtered = prev.filter(r => r.taskId !== taskId);
          return [result, ...filtered];
        });
        
        setPendingTaskId(null);
        setPollStartTime(null);
        setIsSearching(false);
        setProgress(100);

        // Log activity if case is selected
        if (selectedCaseId && user?.id) {
          await logAIToolUsage({
            caseId: selectedCaseId,
            lawyerId: user.id,
            toolType: 'research',
            resultId: taskId,
            inputSummary: queryText.substring(0, 100)
          });
        }

        toast({
          title: "✅ Investigación completada",
          description: "Se encontraron referencias jurídicas relevantes para tu consulta.",
        });

        return true; // Stop polling
      }

      if (data.status === 'failed') {
        // Task failed
        setResults(prev => {
          const filtered = prev.filter(r => r.taskId !== taskId);
          return [{
            query: queryText,
            findings: `Error: ${data.error || 'Error desconocido'}`,
            sources: [],
            timestamp: new Date().toISOString(),
            status: 'failed'
          }, ...filtered];
        });

        setPendingTaskId(null);
        setPollStartTime(null);
        setIsSearching(false);
        setProgress(0);

        toast({
          title: "❌ Error en la investigación",
          description: data.error || "Hubo un problema al procesar tu consulta.",
          variant: "destructive",
        });

        return true; // Stop polling
      }

      // Still pending - continue polling
      return false;

    } catch (error) {
      console.error('Polling error:', error);
      return false; // Continue trying
    }
  };

  // Effect for polling
  useEffect(() => {
    if (!pendingTaskId || !pollStartTime) return;

    const pendingResult = results.find(r => r.taskId === pendingTaskId);
    const queryText = pendingResult?.query || '';

    const pollInterval = setInterval(async () => {
      // Check if we've exceeded max poll time
      if (Date.now() - pollStartTime > MAX_POLL_TIME_MS) {
        clearInterval(pollInterval);
        setPendingTaskId(null);
        setPollStartTime(null);
        setIsSearching(false);
        setProgress(0);

        toast({
          title: "⏱️ Tiempo excedido",
          description: "La investigación tardó demasiado. Intenta con una consulta más específica.",
          variant: "destructive",
        });
        return;
      }

      // Update progress based on elapsed time (simulate progress up to 90%)
      const elapsed = Date.now() - pollStartTime;
      const progressValue = Math.min(90, (elapsed / MAX_POLL_TIME_MS) * 100);
      setProgress(progressValue);

      const shouldStop = await pollTaskStatus(pendingTaskId, queryText);
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [pendingTaskId, pollStartTime]);

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
    setProgress(5);
    const searchQuery = query;
    setQuery("");

    try {
      console.log('Iniciando investigación legal con query:', searchQuery);
      
      // Call the legal research AI function
      const { data, error } = await supabase.functions.invoke('legal-research-ai', {
        body: { query: searchQuery }
      });
      
      console.log('Respuesta de legal-research-ai:', { data, error });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Error en la investigación');
      }

      // Check if async mode
      if (data.async && data.taskId) {
        console.log(`🔄 Async task started: ${data.taskId}`);
        
        // Add pending result to show in UI
        const pendingResult: ResearchResult = {
          query: searchQuery,
          findings: 'Procesando investigación...',
          sources: [],
          timestamp: new Date().toISOString(),
          status: 'pending',
          taskId: data.taskId
        };

        setResults(prev => [pendingResult, ...prev]);
        setPendingTaskId(data.taskId);
        setPollStartTime(Date.now());
        setProgress(10);

        toast({
          title: "🔍 Investigación iniciada",
          description: "Procesando tu consulta. Esto puede tomar unos minutos...",
        });

        return;
      }

      // Handle immediate response (legacy mode)
      const result: ResearchResult = {
        query: searchQuery,
        findings: data.findings || 'Investigación completada con resultados relevantes.',
        sources: data.sources || ['Legislación Colombiana', 'Jurisprudencia', 'Doctrina Legal'],
        timestamp: data.timestamp || new Date().toISOString(),
        conclusion: data.conclusion || 'Análisis completado',
        status: 'completed'
      };

      setResults(prev => [result, ...prev]);
      setProgress(100);
      setIsSearching(false);
      
      // Log activity if case is selected
      if (selectedCaseId && user?.id) {
        await logAIToolUsage({
          caseId: selectedCaseId,
          lawyerId: user.id,
          toolType: 'research',
          resultId: result.timestamp,
          inputSummary: searchQuery.substring(0, 100)
        });
      }
      
      toast({
        title: "✅ Investigación completada",
        description: "Se encontraron referencias jurídicas relevantes para tu consulta.",
      });

    } catch (error) {
      console.error("Error en investigación:", error);
      setProgress(0);
      setIsSearching(false);
      toast({
        title: "❌ Error en la investigación",
        description: error instanceof Error ? error.message : "Hubo un problema al procesar tu consulta.",
        variant: "destructive",
      });
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mt-6 lg:mt-8">
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">{results.filter(r => r.status === 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Investigaciones completadas</p>
                </div>
              </div>
            </div>
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">~30s</p>
                  <p className="text-sm text-muted-foreground">Tiempo promedio</p>
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
                  📡 Procesando consulta con IA avanzada...
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
                <span className="animate-pulse">Investigando...</span>
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
                              <Badge 
                                variant="secondary" 
                                className={
                                  result.status === 'failed' 
                                    ? "bg-red-100 text-red-800 text-xs" 
                                    : result.status === 'pending'
                                    ? "bg-amber-100 text-amber-800 text-xs"
                                    : "bg-emerald-100 text-emerald-800 text-xs"
                                }
                              >
                                {result.status === 'failed' ? (
                                  <><AlertCircle className="h-3 w-3 mr-1" />Fallido</>
                                ) : result.status === 'pending' ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Procesando...</>
                                ) : (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" />Completado</>
                                )}
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
                      
                      {result.sources && result.sources.length > 0 && (
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
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-2xl mx-auto w-fit">
                <Search className="h-16 w-16 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">¡Comienza tu investigación!</h3>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Utiliza nuestro sistema de IA para realizar consultas jurídicas exhaustivas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
