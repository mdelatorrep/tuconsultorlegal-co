import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, Send, ArrowLeft, Loader2, User, Sparkles, 
  AlertCircle, Star, ThumbsUp, ThumbsDown, RefreshCw,
  Zap, MessageSquare, X
} from "lucide-react";

interface SpecializedAgent {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  icon: string;
  color_class: string;
  agent_instructions: string | null;
  openai_workflow_id: string | null;
  openai_assistant_id: string | null;
  credits_per_session: number;
  max_messages_per_session: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SpecializedAgentChatProps {
  agent: SpecializedAgent;
  lawyerId: string;
  onBack: () => void;
}

export const SpecializedAgentChat = ({ agent, lawyerId, onBack }: SpecializedAgentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data, error } = await supabase
          .from('specialized_agent_sessions')
          .insert({
            agent_id: agent.id,
            lawyer_id: lawyerId,
            credits_consumed: agent.credits_per_session
          })
          .select('id')
          .single();

        if (error) throw error;
        setSessionId(data.id);

        // Add welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `¡Hola! Soy ${agent.name}. ${agent.short_description || agent.description || 'Estoy aquí para ayudarte.'}

¿En qué puedo asistirte hoy?`,
          timestamp: new Date()
        }]);
      } catch (err) {
        console.error('Error initializing session:', err);
        setError('No se pudo iniciar la sesión');
      }
    };

    initSession();
  }, [agent, lawyerId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Call the specialized agent chat edge function
      const { data, error } = await supabase.functions.invoke('specialized-agent-chat', {
        body: {
          agent_id: agent.id,
          session_id: sessionId,
          message: userMessage.content,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Lo siento, no pude procesar tu consulta.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session message count
      if (sessionId) {
        await supabase
          .from('specialized_agent_sessions')
          .update({ 
            messages_count: messages.length + 2,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error al enviar el mensaje. Por favor intenta de nuevo.');
      toast({
        title: "Error",
        description: "No se pudo procesar tu consulta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    if (sessionId) {
      await supabase
        .from('specialized_agent_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px]">
      {/* Header */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleEndSession}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className={`p-2 rounded-lg ${agent.color_class} text-white`}>
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {agent.name}
                  <Badge variant="outline" className="text-xs capitalize">
                    {agent.category}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Agente especializado • {messages.length - 1} mensajes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.credits_per_session > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {agent.credits_per_session} créditos
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleEndSession}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 rounded-none border-b-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className={`p-2 rounded-lg ${agent.color_class} text-white h-fit`}>
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString('es-CO', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                {message.role === 'user' && (
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground h-fit">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className={`p-2 rounded-lg ${agent.color_class} text-white h-fit`}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setError(null)}
                    className="h-6 px-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input */}
      <Card className="rounded-t-none">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta legal..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Las respuestas son orientativas. Consulte siempre con un abogado para casos específicos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecializedAgentChat;
