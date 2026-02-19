import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, Download, X, Loader2, MessageSquare, Sparkles, 
  Wand2, AlertTriangle, CheckCircle, ChevronRight, Send,
  Lightbulb, RefreshCw, Copy, Zap, ClipboardList, PlusCircle,
  FileEdit, Shield, Scale, ArrowDownToLine
} from "lucide-react";
import { generatePDF } from "./pdfUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";

interface DocumentEditorWithCopilotProps {
  open: boolean;
  onClose: () => void;
  initialContent: string;
  documentType: string;
  lawyerId: string;
  canCreateAgents: boolean;
  onSaved?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'welcome' | 'placeholder_scan' | 'normal';
  insertable?: boolean;
}

interface InlineSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  type: 'improvement' | 'risk' | 'clarity';
  position: { start: number; end: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns document-specific contextual quick actions */
function getQuickActions(documentType: string) {
  const lower = documentType.toLowerCase();
  
  if (lower.includes('demanda') || lower.includes('contestacion') || lower.includes('respuesta')) {
    return [
      { label: "Excepciones previas", icon: Shield, prompt: "Sugiere las excepciones previas o de mérito más relevantes para esta demanda y redáctalas en formato legal colombiano." },
      { label: "Hechos de defensa", icon: Scale, prompt: "Con base en el documento actual, redacta los hechos de defensa que refuten las pretensiones del demandante." },
      { label: "Pretensiones de condena", icon: FileEdit, prompt: "¿Qué pretensiones debería incluir en la parte final del escrito de respuesta?" },
      { label: "Jurisprudencia aplicable", icon: Lightbulb, prompt: "¿Qué sentencias de la Corte Suprema o del Consejo de Estado son relevantes para reforzar los argumentos de este escrito?" },
    ];
  }
  if (lower.includes('contrato')) {
    return [
      { label: "Cláusulas de garantía", icon: Shield, prompt: "Sugiere cláusulas de garantía y responsabilidad para este contrato." },
      { label: "Causales de terminación", icon: AlertTriangle, prompt: "Redacta las causales de terminación anticipada del contrato y sus consecuencias." },
      { label: "Cláusula penal", icon: FileEdit, prompt: "Redacta una cláusula penal proporcional para este contrato." },
      { label: "Solución de conflictos", icon: Scale, prompt: "Sugiere una cláusula de solución de disputas (arbitraje o conciliación) apropiada." },
    ];
  }
  if (lower.includes('poder')) {
    return [
      { label: "Facultades del apoderado", icon: FileEdit, prompt: "¿Qué facultades específicas debería incluir este poder según su propósito?" },
      { label: "Limitaciones del poder", icon: Shield, prompt: "Sugiere cláusulas que limiten el poder para proteger al poderdante." },
    ];
  }
  // Generic fallback
  return [
    { label: "Sugerir cláusulas", icon: Lightbulb, prompt: "Sugiere cláusulas adicionales para mejorar este documento." },
    { label: "Detectar riesgos", icon: AlertTriangle, prompt: "¿Qué riesgos legales detectas en este documento?" },
    { label: "Mejorar estilo", icon: RefreshCw, prompt: "Revisa la redacción y sugiere mejoras de estilo jurídico." },
    { label: "Marco legal", icon: Scale, prompt: "¿Qué normas y leyes colombianas aplican a este documento?" },
  ];
}

/** Detects placeholder patterns like [NOMBRE], {{campo}}, _____ */
function detectPlaceholders(text: string): string[] {
  const patterns = [
    /\[([A-ZÁÉÍÓÚÑ][^\]]{1,40})\]/g,
    /\{\{([^}]{1,40})\}\}/g,
    /_{4,}([A-Za-záéíóúñÁÉÍÓÚÑ\s]*)_{0,4}/g,
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

/** Builds a context-aware welcome message */
function buildWelcomeMessage(documentType: string): string {
  const lower = documentType.toLowerCase();
  if (lower.includes('demanda') || lower.includes('contestacion') || lower.includes('respuesta')) {
    return `Soy tu Copilot Legal para este **${documentType}**.\n\n📋 **Cómo trabajamos juntos:**\n• Usa los botones de **acciones rápidas** de abajo para agregar excepciones, hechos de defensa o jurisprudencia\n• Escribe en el chat lo que necesitas: *"Redacta los hechos primero y tercero"* o *"¿Qué excepciones aplican aquí?"*\n• Cuando te responda con texto legal, haz clic en **"⬇ Insertar en documento"** para agregarlo directamente\n• Selecciona cualquier texto del editor y presiona **"Mejorar Selección"** para refinarlo\n\nVoy a revisar el documento ahora para identificar qué información hace falta...`;
  }
  if (lower.includes('contrato')) {
    return `Soy tu Copilot Legal para este **${documentType}**.\n\n📋 **Cómo trabajamos juntos:**\n• Usa las **acciones rápidas** para agregar cláusulas de garantía, terminación o resolución de conflictos\n• Escríbeme en el chat: *"Redacta la cláusula de confidencialidad"* o *"¿Esta cláusula es válida en Colombia?"*\n• Presiona **"⬇ Insertar"** en mis respuestas para agregarlas al documento\n• Selecciona texto y presiona **"Mejorar Selección"** para perfeccionarlo\n\nVoy a revisar el documento para detectar campos pendientes...`;
  }
  return `Soy tu Copilot Legal para este **${documentType}**.\n\n📋 **Cómo trabajamos juntos:**\n• Usa las **acciones rápidas** de abajo para pedirme sugerencias concretas\n• Escríbeme en el chat cualquier consulta o pídeme que redacte secciones\n• Presiona **"⬇ Insertar en documento"** en mis respuestas para agregarlas\n• Selecciona texto en el editor y usa **"Mejorar Selección"** para refinarlo\n\nVoy a revisar el documento ahora...`;
}

// ──────────────────────────────────────────────────────────────────────────

export default function DocumentEditorWithCopilot({
  open,
  onClose,
  initialContent,
  documentType,
  lawyerId,
  canCreateAgents,
  onSaved
}: DocumentEditorWithCopilotProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  
  // Copilot states
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant',
      type: 'welcome',
      content: buildWelcomeMessage(documentType),
      insertable: false,
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [pendingPlaceholders, setPendingPlaceholders] = useState<string[]>([]);
  const [scanDone, setScanDone] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { hasEnoughCredits, consumeCredits, getToolCost } = useCredits(lawyerId);
  const quickActions = getQuickActions(documentType);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // On open: scan document for placeholders
  useEffect(() => {
    if (open && initialContent && !scanDone) {
      setScanDone(true);
      const placeholders = detectPlaceholders(initialContent);
      setPendingPlaceholders(placeholders);
      
      if (placeholders.length > 0) {
        const placeholderList = placeholders.map(p => `• **${p}**`).join('\n');
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          type: 'placeholder_scan',
          insertable: false,
          content: `📌 **Encontré ${placeholders.length} campo(s) que debes completar en el documento:**\n\n${placeholderList}\n\nHaz clic en cualquier campo de arriba para pedirme ayuda con él, o complétalo directamente en el editor.`,
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          type: 'normal',
          insertable: false,
          content: `✅ El documento está estructurado. Usa las acciones rápidas de abajo o escríbeme para refinar, agregar secciones o hacer consultas legales.`,
        }]);
      }
    }
  }, [open, initialContent, scanDone]);

  // Reset scan when dialog re-opens
  useEffect(() => {
    if (!open) setScanDone(false);
  }, [open]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Autocomplete trigger on pause
  const triggerAutocomplete = useCallback(async (text: string, cursorPosition: number) => {
    if (!text || text.length < 50) return;
    const contextStart = Math.max(0, cursorPosition - 500);
    const contextBefore = text.slice(contextStart, cursorPosition);
    if (contextBefore.match(/[.!?]\s*$/) || contextBefore.match(/\n\s*$/)) return;
    
    setIsAutocompleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: { action: 'autocomplete', text: contextBefore, context: `Tipo de documento: ${documentType}`, language: 'es' }
      });
      if (!error && data?.suggestion) setAutocomplete(data.suggestion);
    } catch (err) {
      console.error('Autocomplete error:', err);
    } finally {
      setIsAutocompleting(false);
    }
  }, [documentType]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setContent(newContent);
    setAutocomplete(null);
    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
    autocompleteTimeoutRef.current = setTimeout(() => triggerAutocomplete(newContent, cursorPosition), 1500);
    // Re-scan placeholders on change
    setPendingPlaceholders(detectPlaceholders(newContent));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && autocomplete) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const newContent = content.slice(0, cursorPos) + autocomplete + content.slice(cursorPos);
        setContent(newContent);
        setAutocomplete(null);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + autocomplete.length;
          textarea.focus();
        }, 0);
      }
    } else if (e.key === 'Escape') {
      setAutocomplete(null);
    }
  };

  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const selected = content.slice(textarea.selectionStart, textarea.selectionEnd);
      setSelectedText(selected.length > 10 ? selected : "");
    }
  };

  const analyzeDocument = async () => {
    if (!hasEnoughCredits('copilot')) {
      toast({ title: "Créditos insuficientes", description: `Necesitas ${getToolCost('copilot')} créditos.`, variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await consumeCredits('copilot', { action: 'analyze' });
      if (!result.success) return;
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: { action: 'analyze_inline', text: content, context: `Tipo de documento: ${documentType}`, language: 'es' }
      });
      if (error) throw error;
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        const formattedSuggestions: InlineSuggestion[] = data.suggestions.map((s: any, idx: number) => ({
          id: `sug-${idx}`,
          originalText: s.original || '',
          suggestedText: s.suggestion || '',
          reason: s.reason || 'Mejora sugerida',
          type: s.type || 'improvement',
          position: s.position || { start: 0, end: 0 }
        }));
        setSuggestions(formattedSuggestions);
        toast({ title: "Análisis completado", description: `${formattedSuggestions.length} sugerencia(s) encontrada(s).` });
      }
    } catch (err) {
      toast({ title: "Error en el análisis", description: "No se pudo analizar el documento.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: InlineSuggestion) => {
    const newContent = content.replace(suggestion.originalText, suggestion.suggestedText);
    setContent(newContent);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    toast({ title: "Sugerencia aplicada", description: "El texto ha sido actualizado." });
  };

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
      const result = await consumeCredits('copilot', { action: 'chat' });
      if (!result.success) { setIsChatLoading(false); return; }
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'suggest',
          text: userMessage,
          context: `Tipo de documento: ${documentType}.\n\nContenido actual del documento:\n${content.slice(0, 3000)}${content.length > 3000 ? '\n[...documento continúa...]' : ''}`,
          language: 'es'
        }
      });
      if (error) throw error;
      const response = data?.suggestion || data?.response || 'No pude generar una respuesta. Por favor, intenta reformular tu pregunta.';
      // Determine if the response contains legal text that can be inserted
      const isInsertable = response.length > 80 && !response.startsWith('Lo siento') && !response.startsWith('No pude');
      setChatMessages(prev => [...prev, { role: 'assistant', content: response, insertable: isInsertable }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.', insertable: false }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const insertTextFromChat = (text: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart ?? content.length;
      const newContent = content.slice(0, cursorPos) + '\n\n' + text + '\n\n' + content.slice(cursorPos);
      setContent(newContent);
      toast({ title: "✅ Texto insertado", description: "El contenido se ha agregado al documento en la posición del cursor." });
      // Focus editor so user sees where it was inserted
      setTimeout(() => textarea.focus(), 100);
    }
  };

  const copyFromChat = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Texto copiado al portapapeles." });
  };

  const improveSelectedText = async () => {
    if (!selectedText || !hasEnoughCredits('copilot')) return;
    setIsChatLoading(true);
    try {
      const result = await consumeCredits('copilot', { action: 'improve' });
      if (!result.success) return;
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: { action: 'improve', text: selectedText, context: `Tipo de documento: ${documentType}. Mejora este texto manteniendo el significado legal pero haciéndolo más claro y profesional en estilo jurídico colombiano.`, language: 'es' }
      });
      if (error) throw error;
      if (data?.improved) {
        const newContent = content.replace(selectedText, data.improved);
        setContent(newContent);
        setSelectedText("");
        toast({ title: "✅ Texto mejorado", description: "El fragmento seleccionado ha sido mejorado." });
      }
    } catch (err) {
      toast({ title: "Error", description: "No se pudo mejorar el texto.", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePlaceholderClick = (placeholder: string) => {
    sendChatMessage(`Necesito completar el campo "${placeholder}" en el documento. ¿Qué información debería incluir ahí y cómo debería redactarlo?`);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título requerido", description: "Por favor ingresa un título para el documento.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("lawyer_documents").insert({
        lawyer_id: lawyerId,
        title: title.trim(),
        document_type: documentType,
        content: content,
        markdown_content: content,
      });
      if (error) throw error;
      toast({ title: "Documento guardado", description: "El documento se ha guardado exitosamente." });
      onSaved?.();
      onClose();
    } catch (error) {
      toast({ title: "Error al guardar", description: "No se pudo guardar el documento.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generatePDF(content, title.trim() || documentType);
      toast({ title: "PDF generado", description: "El documento se ha descargado exitosamente." });
    } catch (error) {
      toast({ title: "Error al generar PDF", description: "No se pudo generar el documento PDF.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <DialogTitle className="text-lg mb-2">Estudio de Redacción con Copilot</DialogTitle>
                <Input
                  placeholder="Título del documento..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant={showChat ? "default" : "outline"} size="sm" onClick={() => setShowChat(!showChat)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showChat ? "Ocultar Copilot" : "Mostrar Copilot"}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Panel */}
            <div className={cn("flex flex-col transition-all duration-300", showChat ? "w-2/3" : "w-full")}>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-background flex-wrap">
                <Badge variant="outline" className="text-xs">{documentType}</Badge>
                {pendingPlaceholders.length > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <ClipboardList className="h-3 w-3" />
                    {pendingPlaceholders.length} campo(s) pendiente(s)
                  </Badge>
                )}
                <div className="flex-1" />
                {selectedText && (
                  <Button variant="secondary" size="sm" onClick={improveSelectedText} disabled={isChatLoading}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Mejorar Selección
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={analyzeDocument} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Analizar
                </Button>
              </div>

              {/* Suggestions Bar */}
              {suggestions.length > 0 && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b">
                  <div className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">{suggestions.length} sugerencias disponibles</span>
                    <Button variant="ghost" size="sm" onClick={() => setSuggestions([])} className="ml-auto h-6 text-xs">
                      Limpiar todas
                    </Button>
                  </div>
                </div>
              )}

              {/* Editor Area */}
              <div className="flex-1 relative overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onSelect={handleTextSelect}
                  placeholder="Escribe o edita tu documento legal aquí... Coloca el cursor donde quieres insertar contenido del Copilot."
                  className="w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-serif text-base leading-relaxed p-6"
                  style={{ minHeight: '100%' }}
                />

                {/* Autocomplete Suggestion */}
                {autocomplete && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-primary/5 border border-primary/20 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-primary mt-1 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Autocompletado sugerido:</p>
                        <p className="text-sm text-foreground">{autocomplete.slice(0, 150)}{autocomplete.length > 150 ? '...' : ''}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <kbd className="px-2 py-1 bg-muted text-xs rounded border font-mono">Tab ↹</kbd>
                        <span className="text-xs text-muted-foreground">para aceptar</span>
                        <span className="text-xs text-muted-foreground">Esc para descartar</span>
                      </div>
                    </div>
                  </div>
                )}
                {isAutocompleting && (
                  <div className="absolute bottom-4 right-4 p-2 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <div className="border-t max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-start gap-3 p-3 border-b hover:bg-muted/50 transition-colors">
                      {suggestion.type === 'risk' ? (
                        <AlertTriangle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                      ) : suggestion.type === 'clarity' ? (
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{suggestion.reason}</p>
                        <p className="text-sm line-through text-destructive/60 truncate">{suggestion.originalText}</p>
                        <p className="text-sm text-green-700 dark:text-green-400 truncate">{suggestion.suggestedText}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applySuggestion(suggestion)} title="Aplicar sugerencia">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))} title="Descartar">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t bg-muted/30">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar Documento</>}
                </Button>
                <Button variant="outline" onClick={handleDownload} disabled={isDownloading} title="Descargar PDF">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* ── Copilot Chat Panel ────────────────────────────────────────────── */}
            {showChat && (
              <div className="w-1/3 flex flex-col border-l bg-muted/10">
                {/* Panel Header */}
                <div className="px-4 py-3 border-b bg-background">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Copilot Legal
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Escribe en el chat · usa acciones rápidas · inserta en el documento
                  </p>
                </div>

                {/* Pending Placeholders */}
                {pendingPlaceholders.length > 0 && (
                  <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/20">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1.5 flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" />
                      Campos pendientes — clic para pedir ayuda:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {pendingPlaceholders.map((ph) => (
                        <button
                          key={ph}
                          onClick={() => handlePlaceholderClick(ph)}
                          className="text-xs px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                        >
                          {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-3" ref={chatScrollRef as any}>
                  <div className="space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[90%] rounded-lg px-3 py-2.5 text-sm",
                          msg.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : msg.type === 'placeholder_scan'
                              ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                              : "bg-muted"
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>

                          {/* Action buttons on assistant messages */}
                          {msg.role === 'assistant' && msg.insertable && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                                onClick={() => insertTextFromChat(msg.content)}
                              >
                                <ArrowDownToLine className="h-3 w-3" />
                                Insertar en documento
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => copyFromChat(msg.content)}
                              >
                                <Copy className="h-3 w-3" />
                                Copiar
                              </Button>
                            </div>
                          )}
                        </div>
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

                {/* Quick Actions — dynamic per document type */}
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
                      placeholder="Ej: Redacta la excepción de prescripción..."
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
