
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Scale, X, Send, AlertCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { useLegalTracking } from "@/hooks/useLogRocket";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  initialMessage?: string;
}

export default function ChatWidget({ isOpen, onToggle, initialMessage }: ChatWidgetProps) {
  const { toast } = useToast();
  const { trackConsultationStart, trackAgentInteraction, trackUserJourney } = useLegalTracking();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '¡Hola! Soy Lexi, tu asistente legal inteligente de tuconsultorlegal.co 🤖⚖️\n\nTengo acceso a un equipo de especialistas legales y puedo ayudarte con:\n\n🎯 CONSULTAS ESPECIALIZADAS:\n• Derecho Civil (contratos, propiedad, familia)\n• Derecho Laboral (empleos, prestaciones)\n• Derecho Comercial (empresas, sociedades)\n• Derecho Administrativo y más\n\n📋 SERVICIOS GENERALES:\n• Información sobre documentos legales\n• Orientación sobre trámites\n• Consultas básicas de legislación\n\nCuando detecte que necesitas asesoría especializada, te conectaré automáticamente con el experto apropiado.\n\n¿En qué puedo ayudarte hoy?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const [advisorsInitialized, setAdvisorsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Process initial message when chat opens
  useEffect(() => {
    if (isOpen && initialMessage && !hasProcessedInitialMessage) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: initialMessage,
        sender: 'user',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setHasProcessedInitialMessage(true);
      
      // Send the initial message automatically
      sendMessage(initialMessage);
    }
  }, [isOpen, initialMessage, hasProcessedInitialMessage]);

  // Reset processed flag when chat closes
  useEffect(() => {
    if (!isOpen) {
      setHasProcessedInitialMessage(false);
    } else {
      // Track chat opening
      trackUserJourney('chat_opened', window.location.pathname, {
        initialMessage: !!initialMessage
      });
    }
  }, [isOpen, initialMessage, trackUserJourney]);

  // Check and initialize legal advisors when chat opens
  useEffect(() => {
    if (isOpen && !advisorsInitialized) {
      checkAndInitializeAdvisors();
    }
  }, [isOpen, advisorsInitialized]);

  // Check if legal advisors need initialization
  const checkAndInitializeAdvisors = async () => {
    try {
      const { data: advisors, error } = await supabase
        .from('legal_advisor_agents')
        .select('openai_agent_id')
        .like('openai_agent_id', 'temp_%')
        .limit(1);

      if (advisors && advisors.length > 0) {
        // Advisors need initialization
        console.log('Initializing legal advisors...');
        const { data, error: initError } = await supabase.functions.invoke('create-legal-advisor-agents', {
          body: {}
        });

        if (initError) {
          console.error('Error initializing advisors:', initError);
        } else {
          console.log('Legal advisors initialized successfully');
          setAdvisorsInitialized(true);
        }
      } else {
        setAdvisorsInitialized(true);
      }
    } catch (error) {
      console.error('Error checking advisor status:', error);
      setAdvisorsInitialized(true); // Set to true to avoid infinite loops
    }
  };

  // Send message using intelligent legal advisor routing
  const sendMessage = async (messageContent: string) => {
    setIsLoading(true);
    setConnectionError(false);

    // Track consultation start if it's the first message
    if (messages.length <= 1) {
      const consultationType = initialMessage?.includes('empresarial') ? 'business' : 'personal';
      trackConsultationStart(consultationType);
    }

    try {
      // First, determine if this needs specialized legal advice
      const routingResponse = await supabase.functions.invoke('document-chat', {
        body: {
          message: messageContent,
          sessionId: generateSessionId(),
          agentType: 'routing',
          context: 'legal_routing'
        }
      });

      if (routingResponse.error) {
        throw new Error(routingResponse.error.message || 'Error en el análisis de consulta');
      }

      const { needsSpecializedAdvice, specialization, isComplex } = routingResponse.data;

      let finalResponse;

      if (needsSpecializedAdvice && specialization) {
        // Route to specialized legal advisor
        console.log(`Routing to specialized advisor: ${specialization}`);
        
        // Track specialized advisor interaction
        trackAgentInteraction(specialization, 'legal_advice', {
          messageLength: messageContent.length,
          isComplex: isComplex
        });
        
        const advisorResponse = await supabase.functions.invoke('legal-consultation-advisor', {
          body: {
            messages: [{ role: 'user', content: messageContent }],
            agentId: await getAdvisorAgent(specialization),
            consultationTopic: messageContent.substring(0, 100),
            legalArea: specialization
          }
        });

        if (advisorResponse.error) {
          throw new Error('Error en la consulta especializada');
        }

        finalResponse = {
          response: advisorResponse.data.message,
          specialization: advisorResponse.data.specialization,
          isSpecialized: true
        };
      } else {
        // Use general Lexi assistant
        trackAgentInteraction('lexi', 'chat', {
          messageLength: messageContent.length
        });
        
        const lexiResponse = await supabase.functions.invoke('document-chat', {
          body: {
            message: messageContent,
            sessionId: generateSessionId(),
            agentType: 'lexi',
            context: 'general_legal_assistance'
          }
        });

        if (lexiResponse.error) {
          throw new Error(lexiResponse.error.message || 'Error en la respuesta');
        }

        finalResponse = {
          response: lexiResponse.data.response,
          isSpecialized: false
        };
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: finalResponse.response || 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If specialized advice was provided, show indicator
      if (finalResponse.isSpecialized) {
        const specializationMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          content: `🎯 Respuesta proporcionada por nuestro especialista en ${finalResponse.specialization}`,
          sender: 'assistant',
          timestamp: new Date()
        };
        setTimeout(() => {
          setMessages(prev => [...prev, specializationMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionError(true);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Lo siento, no pude procesar tu mensaje. Por favor, inténtalo de nuevo más tarde.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get appropriate legal advisor agent ID
  const getAdvisorAgent = async (specialization: string): Promise<string> => {
    try {
      const { data: agents, error } = await supabase
        .from('legal_advisor_agents')
        .select('openai_agent_id')
        .eq('specialization', specialization)
        .in('status', ['active', 'approved']) // Incluir agentes activos y aprobados
        .limit(1);

      if (error || !agents || agents.length === 0) {
        console.warn(`No advisor found for specialization: ${specialization}`);
        // Return a default agent ID or fallback
        return 'default_agent';
      }

      return agents[0].openai_agent_id;
    } catch (error) {
      console.error('Error getting advisor agent:', error);
      return 'default_agent';
    }
  };

  // Handle sending message from user input
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    await sendMessage(userMessage.content);
  };

  // Generate or retrieve session ID
  const generateSessionId = () => {
    const sessionId = sessionStorage.getItem('chat-session-id');
    if (sessionId) return sessionId;
    
    const newSessionId = Date.now().toString();
    sessionStorage.setItem('chat-session-id', newSessionId);
    return newSessionId;
  };

  // Reset connection error when user types
  useEffect(() => {
    if (inputValue && connectionError) {
      setConnectionError(false);
    }
  }, [inputValue, connectionError]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-orange-500 hover:bg-orange-400 text-white rounded-full shadow-hero flex items-center justify-center z-[9999] md:w-20 md:h-20 hover-scale transition-all duration-500 animate-[pulse_3s_ease-in-out_infinite] hover:animate-none hover:shadow-2xl hover:shadow-orange-500/50"
        aria-label="Abrir chat de asistencia legal"
      >
        <Scale size={28} className="md:w-8 md:h-8 transition-transform duration-300" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 left-4 md:left-auto md:right-6 md:bottom-6 w-auto md:w-96 h-[calc(100vh-2rem)] md:h-[500px] max-h-[80vh] bg-card rounded-lg shadow-hero flex flex-col z-[9999] border"
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-success to-success-dark text-success-foreground rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            ⚖️
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base">Lexi - Asistente Legal</h3>
            <p className="text-xs opacity-90">tuconsultorlegal.co</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-success-foreground hover:bg-white/20 p-1 h-8 w-8"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-success text-success-foreground rounded-br-sm'
                  : 'bg-card text-card-foreground border shadow-soft rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1 opacity-70 ${
                message.sender === 'user' ? 'text-success-foreground' : 'text-muted-foreground'
              }`}>
                {message.timestamp.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border shadow-soft rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {connectionError && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-full">
              <AlertCircle size={14} />
              <span>Error de conexión. Inténtalo de nuevo.</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe tu consulta legal aquí..."
            disabled={isLoading}
            className="flex-1 rounded-full bg-background border-border focus:border-success transition-smooth"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!inputValue.trim() || isLoading}
            className="rounded-full w-10 h-10 p-0 bg-success hover:bg-success-dark transition-smooth"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
