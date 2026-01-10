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
  Lightbulb, RefreshCw, Copy, Zap
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
}

interface InlineSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  type: 'improvement' | 'risk' | 'clarity';
  position: { start: number; end: number };
}

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
      content: `¡Hola! Soy tu asistente legal. Estoy aquí para ayudarte a perfeccionar este ${documentType}. Puedes preguntarme sobre cláusulas, pedirme que mejore secciones específicas, o solicitar sugerencias legales.`
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<string | null>(null);
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [suggestions, setSuggestions] = useState<InlineSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { hasEnoughCredits, consumeCredits, getToolCost } = useCredits(lawyerId);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Autocomplete trigger on pause
  const triggerAutocomplete = useCallback(async (text: string, cursorPosition: number) => {
    if (!text || text.length < 50) return;
    
    // Get context around cursor
    const contextStart = Math.max(0, cursorPosition - 500);
    const contextEnd = cursorPosition;
    const contextBefore = text.slice(contextStart, contextEnd);
    
    // Don't autocomplete if we're at the end of a sentence or paragraph
    if (contextBefore.match(/[.!?]\s*$/) || contextBefore.match(/\n\s*$/)) return;
    
    setIsAutocompleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'autocomplete',
          text: contextBefore,
          context: `Tipo de documento: ${documentType}`,
          language: 'es'
        }
      });
      
      if (!error && data?.suggestion) {
        setAutocomplete(data.suggestion);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    } finally {
      setIsAutocompleting(false);
    }
  }, [documentType]);

  // Handle content change with debounced autocomplete
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setContent(newContent);
    setAutocomplete(null);
    
    // Debounce autocomplete
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    autocompleteTimeoutRef.current = setTimeout(() => {
      triggerAutocomplete(newContent, cursorPosition);
    }, 1500); // 1.5 seconds pause
  };

  // Accept autocomplete with Tab
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && autocomplete) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        const newContent = content.slice(0, cursorPos) + autocomplete + content.slice(cursorPos);
        setContent(newContent);
        setAutocomplete(null);
        
        // Move cursor to end of inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + autocomplete.length;
          textarea.focus();
        }, 0);
      }
    } else if (e.key === 'Escape') {
      setAutocomplete(null);
    }
  };

  // Handle text selection
  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const selected = content.slice(textarea.selectionStart, textarea.selectionEnd);
      if (selected.length > 10) {
        setSelectedText(selected);
      } else {
        setSelectedText("");
      }
    }
  };

  // Analyze document for suggestions
  const analyzeDocument = async () => {
    if (!hasEnoughCredits('copilot')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('copilot')} créditos para analizar el documento.`,
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await consumeCredits('copilot', { action: 'analyze' });
      if (!result.success) return;

      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'analyze_inline',
          text: content,
          context: `Tipo de documento: ${documentType}`,
          language: 'es'
        }
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
        
        toast({
          title: "Análisis completado",
          description: `Se encontraron ${formattedSuggestions.length} sugerencias de mejora.`,
        });
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast({
        title: "Error en el análisis",
        description: "No se pudo analizar el documento.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply suggestion
  const applySuggestion = (suggestion: InlineSuggestion) => {
    const newContent = content.replace(suggestion.originalText, suggestion.suggestedText);
    setContent(newContent);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    
    toast({
      title: "Sugerencia aplicada",
      description: "El texto ha sido actualizado.",
    });
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    if (!hasEnoughCredits('copilot')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('copilot')} créditos para usar el chat.`,
        variant: "destructive",
      });
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const result = await consumeCredits('copilot', { action: 'chat' });
      if (!result.success) {
        setIsChatLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'suggest',
          text: userMessage,
          context: `Documento actual (${documentType}):\n\n${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}`,
          language: 'es'
        }
      });
      
      if (error) throw error;
      
      const response = data?.suggestion || data?.response || 'No pude generar una respuesta. Por favor, intenta reformular tu pregunta.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Insert text from chat into document
  const insertTextFromChat = (text: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const newContent = content.slice(0, cursorPos) + '\n\n' + text + '\n\n' + content.slice(cursorPos);
      setContent(newContent);
      
      toast({
        title: "Texto insertado",
        description: "El contenido se ha agregado al documento.",
      });
    }
  };

  // Quick improve selected text
  const improveSelectedText = async () => {
    if (!selectedText || !hasEnoughCredits('copilot')) return;
    
    setIsChatLoading(true);
    try {
      const result = await consumeCredits('copilot', { action: 'improve' });
      if (!result.success) return;

      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'improve',
          text: selectedText,
          context: `Tipo de documento: ${documentType}. Mejora este texto manteniendo el significado legal pero haciéndolo más claro y profesional.`,
          language: 'es'
        }
      });
      
      if (error) throw error;
      
      if (data?.improved) {
        const newContent = content.replace(selectedText, data.improved);
        setContent(newContent);
        setSelectedText("");
        
        toast({
          title: "Texto mejorado",
          description: "El fragmento seleccionado ha sido mejorado.",
        });
      }
    } catch (err) {
      console.error('Improve error:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Título requerido",
        description: "Por favor ingresa un título para el documento.",
        variant: "destructive",
      });
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

      toast({
        title: "Documento guardado",
        description: "El documento se ha guardado exitosamente.",
      });

      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el documento.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const documentTitle = title.trim() || documentType;
      await generatePDF(content, documentTitle);
      
      toast({
        title: "PDF generado",
        description: "El documento se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el documento PDF.",
        variant: "destructive",
      });
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
                <Button
                  variant={showChat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showChat ? "Ocultar Chat" : "Mostrar Chat"}
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
            <div className={cn(
              "flex flex-col transition-all duration-300",
              showChat ? "w-2/3" : "w-full"
            )}>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
                <Badge variant="outline" className="text-xs">
                  {documentType}
                </Badge>
                <div className="flex-1" />
                
                {selectedText && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={improveSelectedText}
                    disabled={isChatLoading}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Mejorar Selección
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeDocument}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analizar
                </Button>
              </div>

              {/* Suggestions Bar */}
              {suggestions.length > 0 && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b">
                  <div className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">{suggestions.length} sugerencias disponibles</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSuggestions([])}
                      className="ml-auto h-6 text-xs"
                    >
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
                  placeholder="Escribe o edita tu documento legal aquí..."
                  className="w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-serif text-base leading-relaxed p-6"
                  style={{ minHeight: '100%' }}
                />
                
                {/* Autocomplete Suggestion */}
                {autocomplete && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg">
                    <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-blue-600 mt-1 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          Sugerencia de autocompletado:
                        </p>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {autocomplete.slice(0, 150)}
                          {autocomplete.length > 150 ? '...' : ''}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <kbd className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-xs rounded">
                          Tab ↹
                        </kbd>
                        <span className="text-xs text-muted-foreground">aceptar</span>
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
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-3 p-3 border-b hover:bg-muted/50 transition-colors"
                    >
                      {suggestion.type === 'risk' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                      ) : suggestion.type === 'clarity' ? (
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">{suggestion.reason}</p>
                        <p className="text-sm line-through text-red-600/70 truncate">
                          {suggestion.originalText}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 truncate">
                          {suggestion.suggestedText}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t bg-muted/30">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Documento
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Chat Panel */}
            {showChat && (
              <div className="w-1/3 flex flex-col border-l bg-muted/20">
                <div className="px-4 py-3 border-b bg-background">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Copilot Legal
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tu asistente de redacción inteligente
                  </p>
                </div>

                <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                  <div className="space-y-4">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.role === 'assistant' && msg.content.length > 50 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-6 text-xs w-full justify-start"
                              onClick={() => insertTextFromChat(msg.content)}
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Insertar en documento
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t bg-background">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setChatInput("Sugiere cláusulas adicionales para este documento")}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      Sugerir cláusulas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setChatInput("¿Qué riesgos legales detectas en este documento?")}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Detectar riesgos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setChatInput("Revisa la redacción y sugiere mejoras de estilo")}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Mejorar estilo
                    </Button>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Escribe tu consulta..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={isChatLoading || !chatInput.trim()}
                      size="icon"
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
