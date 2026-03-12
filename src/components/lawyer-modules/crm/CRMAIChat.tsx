import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyerId: string;
}

const SUGGESTED_QUESTIONS = [
  "¿Cuántos procesos activos tengo?",
  "¿Qué clientes no tienen procesos?",
  "Resume mis tareas pendientes por prioridad",
  "¿Cuáles son mis procesos en riesgo?",
];

export default function CRMAIChat({ open, onOpenChange, lawyerId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(lawyerId);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    if (!hasEnoughCredits('crm_ai')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('crm_ai')} créditos para consultar IA.`,
        variant: "destructive",
      });
      return;
    }

    const userMsg: Message = { role: 'user', content: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const creditResult = await consumeCredits('crm_ai');
      if (!creditResult.success) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
        body: { lawyerId, question: question.trim() },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        role: 'assistant',
        content: data?.answer || 'No pude generar una respuesta. Intenta de nuevo.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('CRM AI error:', error);
      const errorMsg = error?.message?.includes('429')
        ? 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.'
        : error?.message?.includes('402')
        ? 'Sin créditos disponibles. Recarga para continuar.'
        : 'Error al consultar IA. Intenta de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Asistente IA del CRM
          </DialogTitle>
          <DialogDescription>
            Pregunta sobre tus procesos, clientes, tareas y más
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-1">
          <ToolCostIndicator toolType="crm_ai" lawyerId={lawyerId} />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-[250px] max-h-[400px] pr-1">
          {messages.length === 0 && (
            <div className="space-y-2 pt-4">
              <p className="text-sm text-muted-foreground text-center mb-3">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Sugerencias para empezar:
              </p>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta algo sobre tu CRM..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
