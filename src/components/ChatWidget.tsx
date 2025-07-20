
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Scale, X, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: '¡Hola! Soy Lexi, tu asistente legal de tuconsultorlegal.co 🤖⚖️\n\nEstoy aquí para ayudarte con:\n• Consultas legales generales\n• Información sobre documentos\n• Orientación sobre trámites legales\n• Conexión con nuestros servicios especializados\n\n¿En qué puedo ayudarte hoy?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
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
    }
  }, [isOpen]);

  // Send message using OpenAI agent through Supabase
  const sendMessage = async (messageContent: string) => {
    setIsLoading(true);
    setConnectionError(false);

    try {
      const { data, error } = await supabase.functions.invoke('document-chat', {
        body: {
          message: messageContent,
          sessionId: generateSessionId(),
          agentType: 'lexi',
          context: 'general_legal_assistance'
        }
      });

      if (error) {
        throw new Error(error.message || 'Error en la conexión');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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
