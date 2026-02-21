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
  BookOpen, Search, Loader2, Sparkles, FileText, Scale, 
  ExternalLink, ChevronDown, ChevronRight, Calendar, Clock,
  Database, Globe, AlertCircle, CheckCircle2, History, MessageCircle, Send, Coins
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import SuinJuriscolChatMessage from "./SuinJuriscolChatMessage";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

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
  messages?: ChatMessage[];
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

// Render markdown text with basic formatting
function MarkdownRenderer({ content }: { content: string }) {
  // Parse markdown into formatted HTML-like structure
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
      // Handle bold text
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        // Handle links [text](url)
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
              className="text-emerald-600 hover:underline inline-flex items-center gap-1"
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
      
      // Skip empty lines but flush list
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Handle headers
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

      // Handle horizontal rule
      if (trimmedLine === '---') {
        flushList();
        elements.push(<hr key={index} className="my-4 border-border" />);
        return;
      }

      // Handle numbered list items
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
        return;
      }

      // Handle bullet list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.slice(2));
        return;
      }

      // Regular paragraph
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

export default function SuinJuriscolModule({ user, currentView, onViewChange, onLogout }: SuinJuriscolModuleProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

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
        messages: item.output_data?.messages || [],
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

    // Check and consume credits before proceeding
    if (!hasEnoughCredits('suin_juriscol')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('suin_juriscol')} créditos para consultar SUIN-Juriscol.`,
        variant: "destructive",
      });
      return;
    }

    const creditResult = await consumeCredits('suin_juriscol', { query, category });
    if (!creditResult.success) {
      return;
    }

    setIsSearching(true);
    setCurrentResult(null);
    setChatMessages([]);

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
        messages: [],
      };

      // Initialize chat with the first search
      const initialMessages: ChatMessage[] = [
        {
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: data.summary || 'Búsqueda completada.',
          timestamp: new Date().toISOString()
        }
      ];

      setChatMessages(initialMessages);
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

  const handleSendFollowUp = async () => {
    if (!followUpQuery.trim() || !currentResult) return;

    // Check and consume credits for follow-up
    if (!hasEnoughCredits('suin_juriscol_followup')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('suin_juriscol_followup')} créditos para enviar un mensaje de seguimiento.`,
        variant: "destructive",
      });
      return;
    }

    const creditResult = await consumeCredits('suin_juriscol_followup', { query: followUpQuery, isFollowUp: true });
    if (!creditResult.success) {
      return;
    }

    setIsSendingMessage(true);
    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpQuery,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setFollowUpQuery("");

    try {
      // Build context from previous messages
      const conversationContext = chatMessages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n\n');

      const { data, error } = await supabase.functions.invoke('suin-juriscol-search', {
        body: { 
          query: followUpQuery.trim(),
          category: category !== 'all' ? category : undefined,
          year: year || undefined,
          conversationContext,
          isFollowUp: true,
          originalQuery: currentResult.query
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

      // Update current result with new sources
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

  const handleLoadHistoryResult = (result: SearchResult) => {
    setCurrentResult(result);
    setChatMessages(result.messages || [
      { role: 'user', content: result.query, timestamp: result.timestamp },
      { role: 'assistant', content: result.summary, timestamp: result.timestamp }
    ]);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Search Interface */}
      <Card>
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
                    disabled={isSearching || !query.trim() || !hasEnoughCredits('suin_juriscol')}
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
                        <span>Buscar con IA</span>
                        <span className="ml-3 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                          <Coins className="h-4 w-4" />
                          {getToolCost('suin_juriscol')}
                        </span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Current Result with Chat */}
              {currentResult && (
                <Card className="border-emerald-200 dark:border-emerald-800 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-emerald-600" />
                        Conversación de Búsqueda
                      </CardTitle>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {currentResult.results.length} fuentes
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      Consulta: "{currentResult.query}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {/* Chat Messages */}
                    <div 
                      ref={chatScrollRef}
                      className="max-h-[500px] overflow-y-auto space-y-4 p-2"
                    >
                      {chatMessages.map((message, index) => (
                        <div 
                          key={index}
                          className={`${message.role === 'user' ? 'flex justify-end' : ''}`}
                        >
                          {message.role === 'user' ? (
                            <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl px-4 py-3">
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs mt-2 text-emerald-200">
                                {new Date(message.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ) : (
                            <SuinJuriscolChatMessage 
                              content={message.content} 
                              timestamp={message.timestamp} 
                            />
                          )}
                        </div>
                      ))}
                      {isSendingMessage && (
                        <div className="flex justify-start">
                          <div className="bg-muted border rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                              <span className="text-sm text-muted-foreground">Analizando...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Follow-up Input */}
                    <div className="flex gap-2 pt-2 border-t items-center">
                      <Input
                        value={followUpQuery}
                        onChange={(e) => setFollowUpQuery(e.target.value)}
                        placeholder="Haz una pregunta de seguimiento..."
                        disabled={isSendingMessage || !hasEnoughCredits('suin_juriscol_followup')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFollowUp();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendFollowUp}
                        disabled={isSendingMessage || !followUpQuery.trim() || !hasEnoughCredits('suin_juriscol_followup')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        <span className="flex items-center gap-1 text-xs">
                          <Coins className="h-3 w-3" />
                          {getToolCost('suin_juriscol_followup')}
                        </span>
                      </Button>
                    </div>

                    {/* Sources */}
                    {currentResult.results.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Ver fuentes ({currentResult.results.length})
                            </span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ScrollArea className="max-h-[300px] mt-2">
                            <div className="space-y-2">
                              {currentResult.results.map((result, index) => (
                                <a
                                  key={index}
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-muted/50 rounded-lg border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-sm line-clamp-2 text-emerald-600">{result.title}</h5>
                                      {result.type && (
                                        <Badge variant="outline" className="mt-1 text-xs">
                                          {result.type}
                                        </Badge>
                                      )}
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                                  </div>
                                  {result.snippet && (
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{result.snippet}</p>
                                  )}
                                </a>
                              ))}
                            </div>
                          </ScrollArea>
                        </CollapsibleContent>
                      </Collapsible>
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
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                          onClick={() => handleLoadHistoryResult(item)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">{item.query}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {item.results.length} fuentes
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
    </div>
  );
}
