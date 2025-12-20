import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Gavel, Search, Loader2, Sparkles, FileText, Scale, 
  ExternalLink, ChevronDown, ChevronRight, Calendar, Clock,
  Globe, AlertCircle, CheckCircle2, History, MessageCircle, Send,
  User, Building2, MapPin, FileSearch, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface QueryResult {
  id: string;
  query: string;
  queryType: string;
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
  messages?: ChatMessage[];
}

interface ProcessQueryModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const PROCESS_TYPES = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'civil', label: 'Civil' },
  { value: 'penal', label: 'Penal' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'contencioso', label: 'Contencioso Administrativo' },
  { value: 'familia', label: 'Familia' },
  { value: 'constitucional', label: 'Constitucional' },
];

const ID_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'PA', label: 'Pasaporte' },
];

// Render markdown text with basic formatting
function MarkdownRenderer({ content }: { content: string }) {
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-2">
            {listItems.map((item, i) => (
              <li key={i} className="text-sm text-foreground/80">{renderInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const renderInline = (text: string): React.ReactNode => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        const linkParts: React.ReactNode[] = [];
        let match;
        
        while ((match = linkRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            linkParts.push(part.slice(lastIndex, match.index));
          }
          linkParts.push(
            <a 
              key={`link-${i}-${match.index}`}
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              {match[1]}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
          lastIndex = match.index + match[0].length;
        }
        
        if (linkParts.length > 0) {
          if (lastIndex < part.length) {
            linkParts.push(part.slice(lastIndex));
          }
          return <span key={i}>{linkParts}</span>;
        }
        
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        flushList();
        return;
      }

      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={index} className="text-base font-semibold mt-4 mb-2 text-foreground">
            {renderInline(trimmedLine.slice(4))}
          </h4>
        );
        return;
      }
      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-foreground">
            {renderInline(trimmedLine.slice(3))}
          </h3>
        );
        return;
      }
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground">
            {renderInline(trimmedLine.slice(2))}
          </h2>
        );
        return;
      }

      if (trimmedLine === '---') {
        flushList();
        elements.push(<hr key={index} className="my-4 border-border" />);
        return;
      }

      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
        return;
      }

      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.slice(2));
        return;
      }

      flushList();
      elements.push(
        <p key={index} className="text-sm text-foreground/80 mb-2 leading-relaxed">
          {renderInline(trimmedLine)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  return <div className="prose prose-sm max-w-none">{renderMarkdown(content)}</div>;
}

// Validate radicado format (23 characters)
function validateRadicado(radicado: string): boolean {
  const cleanRadicado = radicado.replace(/[\s-]/g, '');
  return cleanRadicado.length === 23 && /^\d+$/.test(cleanRadicado);
}

export default function ProcessQueryModule({ user, currentView, onViewChange, onLogout }: ProcessQueryModuleProps) {
  // Query type: 'radicado', 'identification', 'name'
  const [queryType, setQueryType] = useState<'radicado' | 'identification' | 'name'>('radicado');
  const [radicado, setRadicado] = useState("");
  const [idType, setIdType] = useState("CC");
  const [idNumber, setIdNumber] = useState("");
  const [personName, setPersonName] = useState("");
  const [processType, setProcessType] = useState("all");
  const [city, setCity] = useState("");
  
  const [isSearching, setIsSearching] = useState(false);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQueryHistory();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadQueryHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'process_query')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const history = data?.map((item: any) => ({
        id: item.id,
        query: item.input_data?.query || 'Consulta de proceso',
        queryType: item.input_data?.queryType || 'radicado',
        results: item.output_data?.results || [],
        summary: item.output_data?.summary || '',
        sources: item.output_data?.sources || [],
        timestamp: item.created_at,
        messages: item.output_data?.messages || [],
      })) || [];

      setQueryHistory(history);
    } catch (error) {
      console.error('Error loading query history:', error);
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

  const buildQueryString = (): string => {
    switch (queryType) {
      case 'radicado':
        return `Número de radicación: ${radicado}`;
      case 'identification':
        return `${ID_TYPES.find(t => t.value === idType)?.label || idType}: ${idNumber}`;
      case 'name':
        return `Nombre: ${personName}${city ? `, Ciudad: ${city}` : ''}`;
      default:
        return '';
    }
  };

  const handleSearch = async () => {
    // Validation
    if (queryType === 'radicado' && !radicado.trim()) {
      toast({
        title: "Número de radicación requerido",
        description: "Por favor ingresa el número de radicación del proceso.",
        variant: "destructive",
      });
      return;
    }

    if (queryType === 'identification' && !idNumber.trim()) {
      toast({
        title: "Número de identificación requerido",
        description: "Por favor ingresa el número de identificación.",
        variant: "destructive",
      });
      return;
    }

    if (queryType === 'name' && !personName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa el nombre o razón social.",
        variant: "destructive",
      });
      return;
    }

    // Validate radicado format if applicable
    if (queryType === 'radicado' && radicado.trim()) {
      const isValid = validateRadicado(radicado);
      if (!isValid) {
        toast({
          title: "Formato de radicación incorrecto",
          description: "El número de radicación debe tener 23 dígitos. Ejemplo: 05001310300320180012300",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSearching(true);
    setCurrentResult(null);
    setChatMessages([]);

    try {
      const queryString = buildQueryString();
      console.log('Iniciando consulta de proceso:', { queryType, queryString, processType });

      const { data, error } = await supabase.functions.invoke('process-query-search', {
        body: { 
          queryType,
          radicado: queryType === 'radicado' ? radicado.trim() : undefined,
          idType: queryType === 'identification' ? idType : undefined,
          idNumber: queryType === 'identification' ? idNumber.trim() : undefined,
          personName: queryType === 'name' ? personName.trim() : undefined,
          city: city.trim() || undefined,
          processType: processType !== 'all' ? processType : undefined
        }
      });

      console.log('Respuesta de process-query-search:', { data, error });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Error en la consulta');
      }

      const result: QueryResult = {
        id: data.result_id || crypto.randomUUID(),
        query: queryString,
        queryType,
        results: data.results || [],
        summary: data.summary || 'Consulta completada.',
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
        messages: [],
      };

      const initialMessages: ChatMessage[] = [
        {
          role: 'user',
          content: queryString,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: data.summary || 'Consulta completada.',
          timestamp: new Date().toISOString()
        }
      ];

      setChatMessages(initialMessages);
      setCurrentResult(result);
      setQueryHistory(prev => [result, ...prev.slice(0, 9)]);

      toast({
        title: "✅ Consulta completada",
        description: "Se ha procesado la consulta de proceso judicial.",
      });

    } catch (error) {
      console.error("Error en consulta de proceso:", error);
      toast({
        title: "❌ Error en la consulta",
        description: error instanceof Error ? error.message : "Hubo un problema al consultar los procesos.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUpQuery.trim() || !currentResult) return;

    setIsSendingMessage(true);
    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpQuery,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setFollowUpQuery("");

    try {
      const conversationContext = chatMessages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n\n');

      const { data, error } = await supabase.functions.invoke('process-query-search', {
        body: { 
          queryType: currentResult.queryType,
          followUpQuery: followUpQuery.trim(),
          conversationContext,
          isFollowUp: true,
          originalQuery: currentResult.query,
          processType: processType !== 'all' ? processType : undefined
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Error en la consulta');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.summary || 'No encontré información adicional.',
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      if (data.results && data.results.length > 0) {
        setCurrentResult(prev => prev ? {
          ...prev,
          results: [...prev.results, ...data.results],
          sources: [...new Set([...prev.sources, ...(data.sources || [])])]
        } : null);
      }

    } catch (error) {
      console.error("Error en seguimiento:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLoadHistoryResult = (result: QueryResult) => {
    setCurrentResult(result);
    setChatMessages(result.messages || [
      { role: 'user', content: result.query, timestamp: result.timestamp },
      { role: 'assistant', content: result.summary, timestamp: result.timestamp }
    ]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-blue-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0">
          {/* Header */}
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-blue-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              <SidebarTrigger className="mr-2 lg:mr-4 hover:bg-blue-500/10 rounded-lg p-2 transition-all duration-200 flex-shrink-0" />
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <Gavel className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent truncate">
                    Consulta de Procesos
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Rama Judicial de Colombia
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-4 lg:p-8">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl shadow-2xl">
                      <Scale className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                        Consulta de Procesos Judiciales
                      </h1>
                      <p className="text-sm lg:text-base text-muted-foreground mt-1">
                        Información sobre procesos de la Rama Judicial con análisis IA
                      </p>
                    </div>
                  </div>
                  
                  {/* Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <FileSearch className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Por Radicación</p>
                          <p className="text-xs text-muted-foreground">23 dígitos</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Por Identificación</p>
                          <p className="text-xs text-muted-foreground">CC, NIT, CE</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Por Nombre</p>
                          <p className="text-xs text-muted-foreground">Persona o empresa</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Form */}
                <div className="lg:col-span-1 space-y-4">
                  <Card className="border-blue-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Search className="h-5 w-5 text-blue-600" />
                        Nueva Consulta
                      </CardTitle>
                      <CardDescription>
                        Busca información de procesos judiciales
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Query Type Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de búsqueda</label>
                        <Select value={queryType} onValueChange={(v) => setQueryType(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="radicado">Por número de radicación</SelectItem>
                            <SelectItem value="identification">Por identificación</SelectItem>
                            <SelectItem value="name">Por nombre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dynamic Fields based on Query Type */}
                      {queryType === 'radicado' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Número de radicación</label>
                          <Input
                            placeholder="Ej: 05001310300320180012300"
                            value={radicado}
                            onChange={(e) => setRadicado(e.target.value)}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            23 dígitos sin espacios ni guiones
                          </p>
                        </div>
                      )}

                      {queryType === 'identification' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de documento</label>
                            <Select value={idType} onValueChange={setIdType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ID_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Número de documento</label>
                            <Input
                              placeholder="Ingresa el número"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {queryType === 'name' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre o razón social</label>
                            <Input
                              placeholder="Nombre completo"
                              value={personName}
                              onChange={(e) => setPersonName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Ciudad (opcional)</label>
                            <Input
                              placeholder="Ciudad del despacho"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* Process Type Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de proceso</label>
                        <Select value={processType} onValueChange={setProcessType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROCESS_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleSearch} 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Consultando...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Consultar Proceso
                          </>
                        )}
                      </Button>

                      {/* Direct Link to Official Portal */}
                      <div className="pt-2 border-t">
                        <a 
                          href="https://consultaprocesos.ramajudicial.gov.co/procesos/Index"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ir al portal oficial de consulta
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Query History */}
                  {queryHistory.length > 0 && (
                    <Card className="border-blue-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <History className="h-4 w-4 text-blue-600" />
                          Historial
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {queryHistory.map((result) => (
                              <button
                                key={result.id}
                                onClick={() => handleLoadHistoryResult(result)}
                                className="w-full text-left p-2 rounded-lg hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20"
                              >
                                <p className="text-sm font-medium truncate">{result.query}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(result.timestamp).toLocaleDateString('es-CO')}
                                </p>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Results & Chat */}
                <div className="lg:col-span-2">
                  {currentResult ? (
                    <Card className="border-blue-500/20 h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                            Resultados de la consulta
                          </CardTitle>
                          <Badge variant="outline" className="text-blue-600 border-blue-500/30">
                            {currentResult.results.length} fuentes
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Chat Messages */}
                        <ScrollArea className="h-[400px] pr-4" ref={chatScrollRef}>
                          <div className="space-y-4">
                            {chatMessages.map((message, idx) => (
                              <div 
                                key={idx} 
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[85%] rounded-2xl p-4 ${
                                    message.role === 'user' 
                                      ? 'bg-blue-600 text-white' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  {message.role === 'assistant' ? (
                                    <MarkdownRenderer content={message.content} />
                                  ) : (
                                    <p className="text-sm">{message.content}</p>
                                  )}
                                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-muted-foreground'}`}>
                                    {new Date(message.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {isSendingMessage && (
                              <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl p-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>

                        {/* Sources */}
                        {currentResult.results.length > 0 && (
                          <div className="pt-4 border-t">
                            <p className="text-sm font-medium mb-2">Fuentes consultadas:</p>
                            <div className="flex flex-wrap gap-2">
                              {currentResult.results.slice(0, 5).map((result, idx) => (
                                <a 
                                  key={idx}
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full hover:bg-blue-500/20"
                                >
                                  <Globe className="h-3 w-3" />
                                  {new URL(result.url).hostname.replace('www.', '')}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow-up Input */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Input
                            placeholder="Haz una pregunta de seguimiento..."
                            value={followUpQuery}
                            onChange={(e) => setFollowUpQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendFollowUp()}
                            disabled={isSendingMessage}
                          />
                          <Button 
                            onClick={handleSendFollowUp}
                            disabled={!followUpQuery.trim() || isSendingMessage}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-blue-500/20 h-full flex items-center justify-center min-h-[500px]">
                      <CardContent className="text-center py-12">
                        <div className="p-6 bg-blue-500/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                          <Gavel className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Consulta de Procesos Judiciales</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                          Ingresa los datos del proceso que deseas consultar. Nuestro asistente IA te ayudará a 
                          interpretar la información y obtener análisis contextual.
                        </p>
                        
                        {/* Info Box */}
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 max-w-md mx-auto">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                            <div className="text-left text-sm">
                              <p className="font-medium text-blue-600 mb-1">Nota importante</p>
                              <p className="text-muted-foreground">
                                Esta herramienta proporciona análisis contextual e información sobre procesos judiciales. 
                                Para consultas oficiales y actuaciones, utiliza el 
                                <a 
                                  href="https://consultaprocesos.ramajudicial.gov.co/procesos/Index"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline ml-1"
                                >
                                  portal oficial de la Rama Judicial
                                </a>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
