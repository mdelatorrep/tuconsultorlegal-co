import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProcessCard } from "./process/ProcessCard";
import { ProcessDetails } from "./process/ProcessDetails";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import {
  Search,
  Scale,
  FileText,
  User,
  Hash,
  Loader2,
  History,
  MessageSquare,
  Send,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Gavel,
  Coins
} from "lucide-react";

interface ProcessQueryModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface JudicialProcess {
  llaveProceso?: string;
  idProceso?: string;
  despacho?: string;
  departamento?: string;
  tipoProceso?: string;
  claseProceso?: string;
  subclaseProceso?: string;
  recurso?: string;
  ubicacion?: string;
  ponente?: string;
  fechaRadicacion?: string;
  fechaUltimaActuacion?: string;
  esPrivado?: boolean;
  cantFilas?: number;
  sujetos?: Array<{
    nombre?: string;
    tipoSujeto?: string;
    representante?: string;
  }>;
  actuaciones?: Array<{
    fechaActuacion?: string;
    actuacion?: string;
    anotacion?: string;
    fechaInicia?: string;
    fechaFinaliza?: string;
    fechaRegistro?: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QueryHistory {
  id: string;
  queryType: string;
  queryValue: string;
  processCount: number;
  createdAt: Date;
}

// Según documentación Verifik: solo CC y NIT son válidos
const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'NIT', label: 'NIT' },
];

export default function ProcessQueryModule({
  user,
  currentView,
  onViewChange,
  onLogout,
}: ProcessQueryModuleProps) {
  const [queryType, setQueryType] = useState<'radicado' | 'document'>('radicado');
  const [radicado, setRadicado] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  
  const [isSearching, setIsSearching] = useState(false);
  const [processes, setProcesses] = useState<JudicialProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<JudicialProcess | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  useEffect(() => {
    loadQueryHistory();
  }, [user?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadQueryHistory = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('tool_type', 'judicial_process')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const history: QueryHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        queryType: item.input_data?.queryType || 'unknown',
        queryValue: item.input_data?.documentNumber || item.input_data?.radicado || item.input_data?.name || '',
        processCount: item.output_data?.processCount || 0,
        createdAt: new Date(item.created_at),
      }));

      setQueryHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const validateRadicado = (value: string): boolean => {
    const cleanValue = value.replace(/\s/g, '');
    return cleanValue.length >= 20 && cleanValue.length <= 30;
  };

  const handleSearch = async () => {
    let queryValue = '';
    
    if (queryType === 'radicado') {
      if (!radicado.trim()) {
        toast.error('Ingrese el número de radicado');
        return;
      }
      if (!validateRadicado(radicado)) {
        toast.error('El número de radicado debe tener entre 20 y 30 caracteres');
        return;
      }
      queryValue = radicado;
    } else if (queryType === 'document') {
      if (!documentNumber.trim()) {
        toast.error('Ingrese el número de documento');
        return;
      }
      queryValue = documentNumber;
    }

    // Check and consume credits before proceeding
    if (!hasEnoughCredits('process_query')) {
      toast.error(`Necesitas ${getToolCost('process_query')} créditos para consultar procesos.`);
      return;
    }

    const creditResult = await consumeCredits('process_query', { queryType, queryValue });
    if (!creditResult.success) {
      return;
    }

    setIsSearching(true);
    setProcesses([]);
    setSelectedProcess(null);
    setAiAnalysis('');
    setChatMessages([]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Sesión expirada. Por favor, inicie sesión nuevamente.');
        return;
      }

      const response = await supabase.functions.invoke('judicial-process-lookup', {
        body: {
          queryType,
          documentNumber: queryType === 'document' ? documentNumber : undefined,
          documentType: queryType === 'document' ? documentType : undefined,
          radicado: queryType === 'radicado' ? radicado : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error en la consulta');
      }

      const { processes: resultProcesses, aiAnalysis: analysis, processCount } = response.data;

      if (processCount === 0) {
        toast.info('No se encontraron procesos con los criterios especificados');
      } else {
        toast.success(`Se encontraron ${processCount} proceso(s)`);
        setProcesses(resultProcesses || []);
        setAiAnalysis(analysis || '');
      }

      loadQueryHistory();

    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al consultar procesos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!followUpQuery.trim() || !selectedProcess) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpQuery,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setFollowUpQuery('');
    setIsSendingMessage(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Sesión expirada');
        return;
      }

      const response = await supabase.functions.invoke('judicial-process-lookup', {
        body: {
          queryType: 'radicado',
          radicado: selectedProcess.llaveProceso,
          followUpQuery: followUpQuery,
          conversationHistory: chatMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (response.error) throw response.error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.aiAnalysis || 'No pude generar una respuesta.',
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Follow-up error:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleViewDetails = (process: JudicialProcess) => {
    setSelectedProcess(process);
    if (aiAnalysis && chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: aiAnalysis,
        timestamp: new Date(),
      }]);
    }
  };

  const renderContent = () => {
    if (selectedProcess) {
      return (
        <div className="space-y-4 p-4 lg:p-6">
          <ProcessDetails
            process={selectedProcess}
            aiAnalysis={aiAnalysis}
            onBack={() => setSelectedProcess(null)}
          />

          {/* Chat Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Consulta al Asistente Legal
              </CardTitle>
              <CardDescription>
                Haga preguntas sobre este proceso y reciba análisis legal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] mb-4 pr-4">
                <div className="space-y-4">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Pregunte sobre el proceso, plazos, próximos pasos..."
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFollowUp();
                    }
                  }}
                />
                <Button
                  onClick={handleSendFollowUp}
                  disabled={isSendingMessage || !followUpQuery.trim()}
                  className="self-end"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              Consulta de Procesos Judiciales
            </h1>
            <p className="text-muted-foreground mt-1">
              Consulte información real de procesos en la Rama Judicial de Colombia
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open('https://consultaprocesos.ramajudicial.gov.co', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Portal Oficial
          </Button>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar Proceso</CardTitle>
            <CardDescription>
              Ingrese los datos del proceso que desea consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={queryType} onValueChange={(v) => setQueryType(v as 'radicado' | 'document')}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="radicado" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Por Radicado
                </TabsTrigger>
                <TabsTrigger value="document" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Por Documento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="radicado" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="radicado">Número de Radicación (23 dígitos)</Label>
                  <Input
                    id="radicado"
                    placeholder="Ej: 11001310304220230012300"
                    value={radicado}
                    onChange={(e) => setRadicado(e.target.value.replace(/\s/g, ''))}
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: Código del despacho (11 dígitos) + Año (4) + Número (5) + Otros (3)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="document" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentNumber">Número de Documento</Label>
                    <Input
                      id="documentNumber"
                      placeholder="Ingrese el número"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <Button
                onClick={handleSearch}
                disabled={isSearching || !hasEnoughCredits('process_query')}
                className="w-full h-12"
                size="lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando Rama Judicial...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    <span>Consultar Procesos</span>
                    <span className="ml-3 flex items-center gap-1 bg-primary-foreground/20 px-2 py-0.5 rounded-lg text-sm">
                      <Coins className="h-4 w-4" />
                      {getToolCost('process_query')}
                    </span>
                  </>
                )}
              </Button>
            </Tabs>
          </CardContent>
        </Card>

        {/* Results */}
        {processes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Resultados ({processes.length} proceso{processes.length !== 1 ? 's' : ''})
              </h2>
              <Button variant="ghost" size="sm" onClick={handleSearch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processes.map((process, index) => (
                <ProcessCard
                  key={process.idProceso || process.llaveProceso || index}
                  process={process}
                  onViewDetails={() => handleViewDetails(process)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && processes.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {queryHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={async () => {
                      // Load the full result from database and display it
                      try {
                        const { data, error } = await supabase
                          .from('legal_tools_results')
                          .select('*')
                          .eq('id', item.id)
                          .single();
                        
                        if (error) throw error;
                        
                        const outputData = data.output_data as any;
                        if (outputData?.processes?.length > 0 || outputData?.processDetails) {
                          // Set the query params for reference
                          if (item.queryType === 'radicado') {
                            setQueryType('radicado');
                            setRadicado(item.queryValue);
                          } else if (item.queryType === 'document') {
                            setQueryType('document');
                            setDocumentNumber(item.queryValue);
                          }
                          
                          // Load the saved results
                          const savedProcesses = outputData.processDetails 
                            ? [outputData.processDetails] 
                            : (outputData.processes || []);
                          setProcesses(savedProcesses);
                          setAiAnalysis(outputData.aiAnalysis || '');
                          setChatMessages([]);
                          toast.success('Consulta cargada del historial');
                        } else {
                          toast.info('No hay resultados guardados para esta consulta');
                        }
                      } catch (error) {
                        console.error('Error loading history item:', error);
                        toast.error('Error al cargar la consulta');
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {item.queryType === 'radicado' ? 'Radicado' : 'Documento'}
                      </Badge>
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {item.queryValue}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.processCount} proceso(s)</span>
                      <span>•</span>
                      <span>{item.createdAt.toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Alert */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Información sobre la consulta
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Esta herramienta consulta información en tiempo real de los procesos judiciales 
                  registrados en la Rama Judicial de Colombia. Los datos se obtienen directamente 
                  de fuentes oficiales y se complementan con análisis de IA para facilitar su comprensión.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-blue-500/5">
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-blue-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
          <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div className="p-1.5 lg:p-2 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                <Gavel className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-base lg:text-lg truncate">Consulta de Procesos</h1>
                <p className="text-xs text-muted-foreground hidden lg:block truncate">
                  Rama Judicial de Colombia
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <ScrollArea className="w-full">
          {renderContent()}
        </ScrollArea>
      </main>
    </div>
  );
}