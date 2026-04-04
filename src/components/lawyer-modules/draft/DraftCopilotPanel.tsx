import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Loader2, Sparkles, Bot, User,
  ArrowDownToLine, Copy, ClipboardList,
  Shield, Scale, FileEdit, Lightbulb,
  AlertTriangle, RefreshCw
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'welcome' | 'placeholder_scan' | 'normal';
  insertable?: boolean;
}

interface DraftCopilotPanelProps {
  documentContent: string;
  documentType: string;
  lawyerId: string;
  onInsertText: (text: string) => void;
}

function getQuickActions(documentType: string) {
  const lower = documentType.toLowerCase();
  if (lower.includes('demanda') || lower.includes('contestacion') || lower.includes('respuesta')) {
    return [
      { label: "Excepciones previas", icon: Shield, prompt: "Sugiere las excepciones previas más relevantes para esta demanda en formato legal colombiano." },
      { label: "Hechos de defensa", icon: Scale, prompt: "Redacta los hechos de defensa que refuten las pretensiones del demandante." },
      { label: "Jurisprudencia", icon: Lightbulb, prompt: "¿Qué sentencias de la Corte Suprema o Consejo de Estado son relevantes para este escrito?" },
      { label: "Pretensiones", icon: FileEdit, prompt: "¿Qué pretensiones debería incluir en la parte final del escrito?" },
    ];
  }
  if (lower.includes('contrato')) {
    return [
      { label: "Cláusulas de garantía", icon: Shield, prompt: "Sugiere cláusulas de garantía y responsabilidad para este contrato." },
      { label: "Terminación anticipada", icon: AlertTriangle, prompt: "Redacta las causales de terminación anticipada del contrato." },
      { label: "Cláusula penal", icon: FileEdit, prompt: "Redacta una cláusula penal proporcional para este contrato." },
      { label: "Solución de conflictos", icon: Scale, prompt: "Sugiere una cláusula de solución de disputas apropiada." },
    ];
  }
  return [
    { label: "Sugerir cláusulas", icon: Lightbulb, prompt: "Sugiere cláusulas adicionales para mejorar este documento." },
    { label: "Detectar riesgos", icon: AlertTriangle, prompt: "¿Qué riesgos legales detectas en este documento?" },
    { label: "Mejorar estilo", icon: RefreshCw, prompt: "Revisa la redacción y sugiere mejoras de estilo jurídico." },
    { label: "Marco legal", icon: Scale, prompt: "¿Qué normas y leyes colombianas aplican a este documento?" },
  ];
}

function detectPlaceholders(text: string): string[] {
  const patterns = [
    /\[([A-ZÁÉÍÓÚÑ][^\]]{1,40})\]/g,
    /\{\{([^}]{1,40})\}\}/g,
    /<([A-ZÁÉÍÓÚÑ][^>]{1,40})>/g,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = (match[1] || match[0]).trim();
      if (label.length > 1 && label.length < 60) found.add(label);
    }
  }
  return Array.from(found).slice(0, 12);
}

export default function DraftCopilotPanel({
  documentContent,
  documentType,
  lawyerId,
  onInsertText,
}: DraftCopilotPanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      type: 'welcome',
      insertable: false,
      content: `¡Hola! Soy tu **Copilot Legal** para este documento.\n\n📋 **Puedo ayudarte a:**\n- Sugerir y redactar cláusulas específicas\n- Detectar riesgos legales\n- Mejorar el estilo jurídico\n- Buscar jurisprudencia relevante\n\nUsa las **acciones rápidas** abajo o escríbeme directamente.`,
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { hasEnoughCredits, consumeCredits, getToolCost } = useCredits(lawyerId);
  const quickActions = getQuickActions(documentType);
  const pendingPlaceholders = detectPlaceholders(documentContent);

  // Scan placeholders once when content first arrives
  useEffect(() => {
    if (documentContent && documentContent.length > 50 && !scanDone) {
      setScanDone(true);
      const phs = detectPlaceholders(documentContent);
      if (phs.length > 0) {
        const list = phs.map(p => `- **${p}**`).join('\n');
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          type: 'placeholder_scan',
          insertable: false,
          content: `📌 **Encontré ${phs.length} campo(s) por completar:**\n\n${list}\n\nHaz clic en cualquiera para que te ayude a completarlo.`,
        }]);
      }
    }
  }, [documentContent, scanDone]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChatMessage = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage || chatInput).trim();
    if (!userMessage || isChatLoading) return;
    if (!hasEnoughCredits('copilot')) {
      toast({ title: "Créditos insuficientes", description: `Necesitas ${getToolCost('copilot')} créditos.`, variant: "destructive" });
      return;
    }
    if (!overrideMessage) setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, insertable: false }]);
    setIsChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'suggest',
          text: userMessage,
          context: `Tipo de documento: ${documentType}.\n\nContenido actual:\n${documentContent.slice(0, 3000)}${documentContent.length > 3000 ? '\n[...continúa...]' : ''}`,
          language: 'es'
        }
      });
      if (error) throw error;
      await consumeCredits('copilot', { action: 'chat' });
      const response = data?.suggestion || data?.response || 'No pude generar una respuesta.';
      const isInsertable = response.length > 80 && !response.startsWith('Lo siento') && !response.startsWith('No pude');
      setChatMessages(prev => [...prev, { role: 'assistant', content: response, insertable: isInsertable }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al procesar tu solicitud. Intenta de nuevo.', insertable: false }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleInsert = (text: string) => {
    onInsertText(text);
    toast({ title: "✅ Insertado", description: "El texto se agregó al documento." });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Texto copiado al portapapeles." });
  };

  return (
    <div className="flex flex-col h-full border-l bg-muted/10">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Copilot Legal
        </h3>
        <p className="text-xs text-muted-foreground">
          Escribe o usa las acciones rápidas
        </p>
      </div>

      {/* Placeholder chips */}
      {pendingPlaceholders.length > 0 && (
        <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1.5 flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            Campos pendientes:
          </p>
          <div className="flex flex-wrap gap-1">
            {pendingPlaceholders.map((ph) => (
              <button
                key={ph}
                onClick={() => sendChatMessage(`Necesito completar el campo "${ph}". ¿Qué información debería incluir y cómo redactarlo?`)}
                className="text-xs px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={chatScrollRef as any}>
        <div className="space-y-3">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[88%] rounded-lg px-3 py-2.5 text-sm",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground"
                  : msg.type === 'placeholder_scan'
                    ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                    : "bg-muted"
              )}>
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} className="text-xs" />
                ) : (
                  <p className="whitespace-pre-wrap text-xs">{msg.content}</p>
                )}

                {msg.role === 'assistant' && msg.insertable && (
                  <div className="mt-2 flex gap-1 flex-wrap border-t border-border/50 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                      onClick={() => handleInsert(msg.content)}
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      Insertar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleCopy(msg.content)}
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generando respuesta...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t bg-background">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Acciones rápidas:</p>
        <div className="grid grid-cols-2 gap-1">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start gap-1.5 truncate"
                onClick={() => sendChatMessage(action.prompt)}
                disabled={isChatLoading}
                title={action.prompt}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ej: Redacta la cláusula de confidencialidad..."
            className="min-h-[56px] max-h-[120px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
              }
            }}
          />
          <Button
            onClick={() => sendChatMessage()}
            disabled={isChatLoading || !chatInput.trim()}
            size="icon"
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Enter para enviar · Shift+Enter nueva línea</p>
      </div>
    </div>
  );
}
