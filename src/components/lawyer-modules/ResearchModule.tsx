import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, BookOpen, FileText, Loader2, Sparkles, Target, TrendingUp, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Calendar, Archive, Filter, Coins, Briefcase, ExternalLink, Download } from "lucide-react";
import { exportResearchToPdf } from "@/utils/aiResultPdfExporter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { CaseSelectorDropdown } from "./CaseSelectorDropdown";
import { useCaseActivityLogger } from "@/hooks/useCaseActivityLogger";
import { QuickPromptSuggestions } from "@/components/ui/QuickPromptSuggestions";

// Parse markdown links and render them as clickable links
function renderMarkdownLinks(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;
  
  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the link
    const linkText = match[1];
    const url = match[2];
    parts.push(
      <a 
        key={`link-${keyIndex++}`}
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
      >
        {linkText}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

// Parse source which may be a markdown link or plain text
function parseSource(source: string): { title: string; url?: string } {
  if (!source || typeof source !== 'string') {
    return { title: 'Fuente legal' };
  }
  
  const linkMatch = source.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (linkMatch) {
    return { title: linkMatch[1], url: linkMatch[2] };
  }
  
  return { title: source };
}

interface ResearchResult {
  query: string;
  findings: string;
  sources: string[];
  timestamp: string;
  conclusion?: string;
  analysis?: string;
  keyPoints?: string[];
  legalBasis?: string[];
  recommendations?: string;
  risks?: string;
  verificationNotes?: string;
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
    // Guard: only load if user is available
    if (!user?.id) {
      setResults([]);
      return;
    }

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
  }, [user?.id]);

  // Load pending tasks from async_research_tasks
  const loadPendingTasks = async () => {
    if (!user?.id) return;
    
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
    if (!user?.id) return;
    
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
        const outputData = item.output_data as any;
        
        return {
          query: item.input_data?.query || 'Consulta completada',
          findings: isFailed 
            ? `Error en la investigación: ${(item.metadata as any)?.error?.message || 'Error desconocido'}` 
            : (outputData?.findings || 'Resultados de investigación disponibles'),
          sources: isFailed ? [] : (outputData?.sources || ['Fuentes legales consultadas']),
          timestamp: item.created_at,
          conclusion: isFailed ? undefined : (outputData?.conclusion || 'Análisis completado'),
          analysis: isFailed ? undefined : outputData?.analysis,
          keyPoints: isFailed ? undefined : outputData?.keyPoints,
          legalBasis: isFailed ? undefined : outputData?.legalBasis,
          recommendations: isFailed ? undefined : outputData?.recommendations,
          risks: isFailed ? undefined : outputData?.risks,
          verificationNotes: isFailed ? undefined : outputData?.verificationNotes,
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
          analysis: data.result.analysis,
          keyPoints: data.result.keyPoints,
          legalBasis: data.result.legalBasis,
          recommendations: data.result.recommendations,
          risks: data.result.risks,
          verificationNotes: data.result.verificationNotes,
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

    // Check credits availability before proceeding (consume after success)
    if (!hasEnoughCredits('research')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('research')} créditos para usar esta herramienta.`,
        variant: "destructive",
      });
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

      // Consume credits only after successful API response
      await consumeCredits('research', { query: searchQuery });

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

  // Guard: Show loading if user is not available
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando módulo de investigación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Interface */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">Nueva Consulta de Investigación</CardTitle>
              <CardDescription className="text-sm">
                Consulta legislación, jurisprudencia o normativa colombiana
              </CardDescription>
            </div>
            <ToolCostIndicator toolType="research" lawyerId={user.id} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="research-query" className="text-sm font-medium text-foreground">
              Descripción de la consulta jurídica
            </label>
            <Textarea
              id="research-query"
              placeholder="Ejemplo: Analiza la línea jurisprudencial más reciente de la Corte Suprema sobre terminación anticipada de contratos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              disabled={isSearching}
              className="resize-none"
            />
          </div>

          {/* Quick prompt suggestions */}
          {!query.trim() && !isSearching && (
            <QuickPromptSuggestions
              suggestions={[
                "Jurisprudencia reciente sobre despido sin justa causa",
                "Requisitos para la acción de tutela en salud",
                "Responsabilidad civil extracontractual del Estado",
                "Prescripción de la acción penal en delitos financieros",
                "Régimen de inhabilidades para contratar con el Estado",
                "Derechos del consumidor en compras digitales",
              ]}
              onSelect={(s) => setQuery(s)}
              disabled={isSearching}
            />
          )}
          
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
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Investigando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Iniciar Investigación
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
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                          {renderMarkdownLinks(result.findings)}
                        </div>
                      </div>
                      
                      {result.conclusion && (
                        <div className="bg-blue-50 border border-blue-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-blue-900">
                            <Target className="h-5 w-5 inline mr-2" />Conclusión
                          </h4>
                          <p className="text-blue-800 whitespace-pre-wrap">{renderMarkdownLinks(result.conclusion)}</p>
                        </div>
                      )}

                      {result.analysis && (
                        <div className="bg-slate-50 border border-slate-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-slate-900">
                            <FileText className="h-5 w-5 inline mr-2" />Análisis
                          </h4>
                          <div className="text-slate-800 whitespace-pre-wrap">{renderMarkdownLinks(result.analysis)}</div>
                        </div>
                      )}

                      {result.keyPoints && result.keyPoints.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-emerald-900">
                            <CheckCircle2 className="h-5 w-5 inline mr-2" />Puntos Clave
                          </h4>
                          <ul className="list-disc list-inside space-y-2 text-emerald-800">
                            {result.keyPoints.map((point, idx) => (
                              <li key={idx}>{renderMarkdownLinks(point)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.legalBasis && result.legalBasis.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-amber-900">
                            <BookOpen className="h-5 w-5 inline mr-2" />Fundamento Legal
                          </h4>
                          <ul className="list-disc list-inside space-y-2 text-amber-800">
                            {result.legalBasis.map((basis, idx) => (
                              <li key={idx}>{renderMarkdownLinks(basis)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.recommendations && (
                        <div className="bg-green-50 border border-green-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-green-900">
                            <TrendingUp className="h-5 w-5 inline mr-2" />Recomendaciones Prácticas
                          </h4>
                          <div className="text-green-800 whitespace-pre-wrap">{renderMarkdownLinks(result.recommendations)}</div>
                        </div>
                      )}

                      {result.risks && (
                        <div className="bg-red-50 border border-red-200 p-4 lg:p-6 rounded-xl">
                          <h4 className="font-bold mb-3 text-lg text-red-900">
                            <AlertCircle className="h-5 w-5 inline mr-2" />Riesgos e Incertidumbres
                          </h4>
                          <div className="text-red-800 whitespace-pre-wrap">{renderMarkdownLinks(result.risks)}</div>
                        </div>
                      )}
                      
                      {result.sources && result.sources.length > 0 && (
                        <div>
                          <h4 className="font-bold mb-4 text-lg"><BookOpen className="h-5 w-5 inline mr-2" />Fuentes Consultadas</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {result.sources.filter(Boolean).map((source, idx) => {
                              const parsed = parseSource(source);
                              return parsed.url ? (
                                <a 
                                  key={idx}
                                  href={parsed.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors group"
                                >
                                  <ExternalLink className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                  <span className="text-purple-700 text-sm line-clamp-2 group-hover:underline">{parsed.title}</span>
                                </a>
                              ) : (
                                <Badge key={idx} variant="outline" className="text-purple-700 border-purple-300 p-3">
                                  {parsed.title}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {result.verificationNotes && (
                        <div className="bg-gray-100 border border-gray-300 p-4 rounded-xl text-sm text-gray-600">
                          <strong>Nota de verificación:</strong> {result.verificationNotes}
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
