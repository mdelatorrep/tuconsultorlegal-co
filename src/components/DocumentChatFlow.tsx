import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, User, Bot, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocumentChatFlowProps {
  agentId: string;
  onBack: () => void;
  onComplete: (token: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentData {
  id: string;
  name: string;
  document_name: string;
  template_content: string;
  final_price: number | null;
  suggested_price: number;
  sla_hours: number | null;
  ai_prompt: string;
}

export default function DocumentChatFlow({ agentId, onBack, onComplete }: DocumentChatFlowProps) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [showUserForm, setShowUserForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
      
      // Add initial message
      const initialMessage: Message = {
        role: 'assistant',
        content: `¡Hola! Soy tu asistente legal especializado en ${data.document_name}. Te ayudaré a recopilar toda la información necesaria para generar tu documento. ¿Podrías contarme un poco sobre tu situación y qué necesitas?`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Error al cargar el agente');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !agent || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          messages: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
          agent_prompt: agent.ai_prompt,
          document_name: agent.document_name
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if the assistant is ready to generate the document
      if (data.message.toLowerCase().includes('generar') || data.message.toLowerCase().includes('proceder')) {
        setShowUserForm(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const generateDocument = async () => {
    if (!userInfo.name.trim() || !userInfo.email.trim() || !agent) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-from-chat', {
        body: {
          conversation: messages.map(msg => ({ role: msg.role, content: msg.content })),
          template_content: agent.template_content,
          document_name: agent.document_name,
          user_email: userInfo.email,
          user_name: userInfo.name,
          sla_hours: agent.sla_hours || 4
        }
      });

      if (error) throw error;

      toast.success('Documento generado exitosamente');
      onComplete(data.token);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar el documento');
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando asistente legal...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: No se pudo cargar el agente</p>
          <Button onClick={onBack}>Volver</Button>
        </div>
      </div>
    );
  }

  if (showUserForm) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Información de contacto
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Para finalizar la generación de tu documento, necesitamos tu información de contacto.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="user-name" className="text-sm font-medium">Nombre completo</label>
                  <Input
                    id="user-name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tu nombre completo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="user-email" className="text-sm font-medium">Correo electrónico</label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="tu@email.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2 text-sm">Resumen del documento:</h4>
                <p className="text-sm text-muted-foreground mb-2">{agent.document_name}</p>
                <p className="text-base font-bold text-success">
                  Precio: ${(agent.final_price || agent.suggested_price).toLocaleString()} COP
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUserForm(false)}
                  className="flex-1"
                >
                  Volver al chat
                </Button>
                <Button
                  onClick={generateDocument}
                  disabled={!userInfo.name.trim() || !userInfo.email.trim() || generating}
                  className="flex-1"
                >
                  {generating ? 'Generando...' : 'Generar Documento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b p-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{agent.document_name}</h1>
            <p className="text-sm text-muted-foreground">Asistente legal especializado</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-12' 
                  : 'bg-muted'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={sending || !currentMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {messages.length > 2 && (
            <div className="mt-2 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowUserForm(true)}
              >
                ¿Listo para generar el documento?
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}