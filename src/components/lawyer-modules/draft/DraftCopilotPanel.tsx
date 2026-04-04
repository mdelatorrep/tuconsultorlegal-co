import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
      content: `¡Hola! Soy tu **Copilot Legal** para este documento.\n\n📋 **Puedo ayudarte a:**\n- Sugerir y redactar cláusulas específicas\n- Detectar riesgos legales\n- Mejorar el estilo jurídico\n- Buscar jurisprudencia relevante\n\nUsa las **acciones rápidas** o escríbeme directamente.`,
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

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
          documentType,
          context: `Tipo de documento: ${documentType}.\n\nContenido actual:\n${documentContent.slice(0, 3000)}${documentContent.length > 3000 ? '\n[...continúa...]' : ''}`,
          language: 'es'
        }
      });
      if (error) throw error;
      
      await consumeCredits('copilot', { action: 'chat' }).catch(err => 
        console.warn("Error consuming credits:", err)
      );
      
      const response = data?.suggestion || data?.response || 'No pude generar una respuesta. Intenta reformular tu solicitud.';
      const isInsertable = response.length > 80 && !response.startsWith('Lo siento') && !response.startsWith('No pude') && !response.startsWith('⚠️');
      setChatMessages(prev => [...prev, { role: 'assistant', content: response, insertable: isInsertable }]);
    } catch (err: any) {
      console.error('[Copilot] Error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ Hubo un error al procesar tu solicitud. Intenta de nuevo.`, 
        insertable: false 
      }]);
    } finally {
      setIsChatLoading(false);
      inputRef.current?.focus();
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
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header - compact */}
      <div className="px-3 py-2 border-b bg-primary/5 shrink-0 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <h3 className="font-semibold text-sm">Copilot Legal</h3>
      </div>

      {/* Placeholder chips */}
      {pendingPlaceholders.length > 0 && (
        <div className="px-3 py-2 border-b bg-warning/10 shrink-0">
          <p className="text-xs font-medium text-warning-foreground mb-1.5 flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            Campos pendientes:
          </p>
          <div className="flex flex-wrap gap-1">
            {pendingPlaceholders.map((ph) => (
              <button
                key={ph}
                onClick={() => sendChatMessage(`Necesito completar el campo "${ph}". ¿Qué información debería incluir y cómo redactarlo?`)}
                disabled={isChatLoading}
                className="text-xs px-2 py-0.5 bg-warning/20 text-foreground rounded-full hover:bg-warning/30 transition-colors disabled:opacity-50"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages area - native scroll */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm shadow-sm",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : msg.type === 'placeholder_scan'
                  ? "bg-warning/10 border border-warning/30 rounded-bl-sm"
                  : "bg-muted rounded-bl-sm"
            )}>
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} className="text-sm leading-relaxed" />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              )}

              {msg.role === 'assistant' && msg.insertable && (
                <div className="mt-2.5 flex gap-1.5 flex-wrap border-t border-border/50 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                    onClick={() => handleInsert(msg.content)}
                  >
                    <ArrowDownToLine className="h-3 w-3" />
                    Insertar en editor
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
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading indicator */}
        {isChatLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="bg-muted rounded-xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analizando y generando respuesta...</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t bg-muted/30 shrink-0">
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
      <div className="p-3 border-t bg-background shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Escribe tu solicitud al Copilot..."
            className="flex-1 min-h-[44px] max-h-[120px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <Button
            onClick={() => sendChatMessage()}
            disabled={isChatLoading || !chatInput.trim()}
            size="icon"
            className="shrink-0 h-[44px] w-[44px] rounded-lg"
          >
            {isChatLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
