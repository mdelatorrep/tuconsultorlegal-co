import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, 
  Send, 
  User, 
  Bot, 
  Scale, 
  Building, 
  Users, 
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface LegalAdvisorAgent {
  id: string;
  name: string;
  specialization: string;
  target_audience: string;
  openai_agent_id: string;
  status: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export default function LegalConsultationChat() {
  const [agents, setAgents] = useState<LegalAdvisorAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<LegalAdvisorAgent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [consultationTopic, setConsultationTopic] = useState('');
  const [sourcesConsulted, setSourcesConsulted] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLegalAdvisors();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadLegalAdvisors = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_advisor_agents')
        .select('*')
        .eq('status', 'active')
        .order('specialization', { ascending: true });

      if (error) throw error;

      setAgents(data || []);
    } catch (error) {
      console.error('Error loading legal advisors:', error);
      toast.error('Error al cargar los asesores legales');
    } finally {
      setLoading(false);
    }
  };

  const selectAgent = (agent: LegalAdvisorAgent) => {
    setSelectedAgent(agent);
    setMessages([{
      role: 'assistant',
      content: `¡Hola! Soy ${agent.name}, tu asesor legal especializado en ${agent.specialization} ${agent.target_audience === 'ambos' ? 'para personas y empresas' : `para ${agent.target_audience}`}. 

¿En qué tema legal puedo asesorarte hoy? Consultaré las fuentes legales más actualizadas de Colombia para brindarte la mejor orientación.`,
      timestamp: new Date()
    }]);
    setThreadId(null);
    setSourcesConsulted([]);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedAgent || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    if (!consultationTopic) {
      setConsultationTopic(currentMessage.trim().substring(0, 100));
    }
    
    setCurrentMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('legal-consultation-advisor', {
        body: {
          messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
          agentId: selectedAgent.openai_agent_id,
          threadId: threadId,
          consultationTopic: consultationTopic || currentMessage.trim(),
          legalArea: selectedAgent.specialization
        }
      });

      if (error) throw error;

      // Update thread ID if new thread was created
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      // Update sources consulted
      if (data.sourcesConsulted && data.sourcesConsulted.length > 0) {
        setSourcesConsulted(prev => {
          const newSources = data.sourcesConsulted.filter((source: string) => !prev.includes(source));
          return [...prev, ...newSources];
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        sources: data.sourcesConsulted
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.sourcesConsulted && data.sourcesConsulted.length > 0) {
        toast.success(`Consulté ${data.sourcesConsulted.length} fuentes legales actualizadas`);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const getSpecializationIcon = (specialization: string) => {
    switch (specialization) {
      case 'civil': return <Scale className="w-4 h-4" />;
      case 'comercial': return <Building className="w-4 h-4" />;
      case 'laboral': return <Users className="w-4 h-4" />;
      default: return <Scale className="w-4 h-4" />;
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'personas': return 'bg-blue-100 text-blue-800';
      case 'empresas': return 'bg-green-100 text-green-800';
      case 'ambos': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando asesores legales...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">Consulta Legal Inteligente</h1>
        <p className="text-muted-foreground">
          Asesores legales especializados con acceso a fuentes actualizadas de Colombia
        </p>
      </div>

      {!selectedAgent ? (
        /* Agent Selection */
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Selecciona tu asesor legal especializado:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card 
                key={agent.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => selectAgent(agent)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getSpecializationIcon(agent.specialization)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {agent.specialization}
                        </Badge>
                        <Badge className={`text-xs ${getAudienceColor(agent.target_audience)}`}>
                          {agent.target_audience}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Especialista en {agent.specialization} con acceso a fuentes legales actualizadas
                  </p>
                  <Button className="w-full mt-3" variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Iniciar Consulta
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Chat Interface */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Selected Agent Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getSpecializationIcon(selectedAgent.specialization)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedAgent.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedAgent.specialization} • {selectedAgent.target_audience}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedAgent(null)}>
                    Cambiar Asesor
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Messages */}
            <Card className="h-96 flex flex-col">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                          <p className="text-xs opacity-70">
                            <Search className="w-3 h-3 inline mr-1" />
                            {message.sources.length} fuentes consultadas
                          </p>
                        </div>
                      )}
                      <p className="text-xs opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex space-x-3 justify-start">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">Consultando fuentes legales...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              
              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Escribe tu consulta legal aquí..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={sending || !currentMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Sources & Info */}
          <div className="space-y-4">
            {/* Sources Consulted */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Fuentes Consultadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sourcesConsulted.length > 0 ? (
                  sourcesConsulted.map((source, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{source}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Las fuentes se mostrarán aquí cuando se realicen búsquedas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Legal Disclaimer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                  Aviso Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta asesoría es orientativa y se basa en fuentes legales consultadas. 
                  Para casos específicos, recomendamos consultar con un abogado especializado.
                </p>
              </CardContent>
            </Card>

            {/* Consultation Info */}
            {threadId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Información de Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Tema:</span> {consultationTopic}
                  </div>
                  <div>
                    <span className="font-medium">Especialización:</span> {selectedAgent.specialization}
                  </div>
                  <div>
                    <span className="font-medium">ID de Sesión:</span> 
                    <span className="font-mono text-muted-foreground block mt-1">
                      {threadId.substring(0, 8)}...
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}