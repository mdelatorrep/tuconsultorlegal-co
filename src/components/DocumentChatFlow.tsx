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
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  showGenerateButton?: boolean;
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
  placeholder_fields: any;
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
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist chat data to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${agentId}`, JSON.stringify({
        messages,
        collectedData,
        userInfo,
        timestamp: Date.now()
      }));
    }
  }, [messages, collectedData, userInfo, agentId]);

  // Load persisted data on mount
  useEffect(() => {
    const persistedData = localStorage.getItem(`chat_${agentId}`);
    if (persistedData) {
      try {
        const parsed = JSON.parse(persistedData);
        const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24 hours
        
        if (isRecent && parsed.messages.length > 1) {
          // Convert timestamp strings/numbers back to Date objects
          const messagesWithDates = parsed.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          
          setMessages(messagesWithDates);
          setCollectedData(parsed.collectedData || {});
          setUserInfo(parsed.userInfo || { name: '', email: '' });
        }
      } catch (error) {
        console.error('Error loading persisted chat data:', error);
      }
    }
  }, [agentId]);

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
      
      // Only add initial message if there are no existing messages
      if (messages.length === 0) {
        const initialMessage: Message = {
          role: 'user',
          content: `Quiero crear un ${data.document_name}. Por favor ayúdame con la información necesaria.`,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
        
        // Immediately get the assistant's response
        await getInitialResponse(data, initialMessage);
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Error al cargar el agente');
    } finally {
      setLoading(false);
    }
  };

  const getInitialResponse = async (agentData: AgentData, userMessage: Message) => {
    try {
      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          messages: [{ role: userMessage.role, content: userMessage.content }],
          agent_prompt: agentData.ai_prompt,
          document_name: agentData.document_name
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting initial response:', error);
      toast.error('Error al inicializar el chat');
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

      // Extract information from the conversation for placeholders
      const extractedData = extractInformationFromMessage(userMessage.content);
      setCollectedData(prev => ({ ...prev, ...extractedData }));

      // Check if the assistant indicates readiness to generate
      const isReadyToGenerate = data.message.includes('Ya tengo toda la información necesaria para proceder con la generación del documento.');

      const assistantMessageWithButton: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        showGenerateButton: isReadyToGenerate
      };

      setMessages(prev => [...prev, assistantMessageWithButton]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const extractInformationFromMessage = (content: string): Record<string, any> => {
    const extracted: Record<string, any> = {};
    
    // Extract common patterns based on agent's placeholder fields
    if (agent?.placeholder_fields && Array.isArray(agent.placeholder_fields)) {
      agent.placeholder_fields.forEach((field: any) => {
        if (field.type === 'text' || field.type === 'string') {
          // Simple extraction based on field labels and common patterns
          const fieldLabel = field.label?.toLowerCase() || field.name?.toLowerCase();
          if (fieldLabel) {
            const regex = new RegExp(`${fieldLabel}[:\\s]+([^\\n\\.]+)`, 'i');
            const match = content.match(regex);
            if (match) {
              extracted[field.name] = match[1].trim();
            }
          }
        }
      });
    }
    
    return extracted;
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
          sla_hours: agent.sla_hours || 4,
          collected_data: collectedData
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

  console.log('DocumentChatFlow rendering:', { loading, agent: !!agent, showUserForm, agentId });

  return (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Modal Container - Responsive */}
        <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header - WhatsApp style - Modal optimized */}
          <div className="bg-primary px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack} 
                className="text-primary-foreground hover:bg-primary-foreground/10 p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-9 h-9 bg-primary-foreground/10 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-primary-foreground text-base truncate">{agent.document_name}</h1>
                <p className="text-xs text-primary-foreground/70">Asistente legal • En línea</p>
              </div>
            </div>
          </div>

          {/* Messages - Modal scrollable area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 dark:bg-gray-800" style={{ maxHeight: '60vh' }}>
            <div className="space-y-3 pb-4">
              {messages.map((message, index) => (
                <div key={index} className="animate-fade-in">
                  <div className={`flex gap-2 mb-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'user' ? (
                      /* User message - right side */
                      <div className="max-w-[80%] group">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 shadow-sm">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Assistant message - left side */
                      <div className="max-w-[80%] group">
                        <div className="bg-white dark:bg-gray-700 border rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">{message.content}</p>
                          <div className="flex items-center justify-start gap-1 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Generate button as a special message */}
                  {message.showGenerateButton && (
                    <div className="flex justify-start mb-2 animate-fade-in">
                      <div className="max-w-[80%]">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">¡Documento listo para generar!</span>
                          </div>
                          <Button 
                            onClick={() => setShowUserForm(true)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            size="sm"
                          >
                            Continuar con mis datos
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {sending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="bg-white dark:bg-gray-700 border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-gray-500">Escribiendo...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area - Modal bottom */}
          <div className="border-t bg-white dark:bg-gray-900 px-4 py-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  disabled={sending}
                  className="pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-colors text-sm border"
                  autoComplete="off"
                />
              </div>
              <Button 
                onClick={sendMessage} 
                disabled={sending || !currentMessage.trim()}
                size="icon"
                className="rounded-full w-10 h-10 shrink-0 bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}