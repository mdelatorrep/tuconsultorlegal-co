import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Loader2,
  Wand2,
  MessageSquare,
  CheckCircle,
  Shuffle,
  Lightbulb,
  FileText,
  Zap,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCredits } from '@/hooks/useCredits';
import { ToolCostIndicator } from '@/components/credits/ToolCostIndicator';
import { CopilotChat } from './CopilotChat';
import { ConsistencyChecker } from './ConsistencyChecker';
import { VariantGenerator } from './VariantGenerator';
import { InlineAutocomplete } from './InlineAutocomplete';
import { InlineSuggestions, InlineSuggestion } from './InlineSuggestions';
import { cn } from '@/lib/utils';

interface LegalCopilotProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  documentType?: string;
  lawyerId: string;
}

const DOCUMENT_TYPES = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'demanda', label: 'Demanda' },
  { value: 'contestacion', label: 'Contestación' },
  { value: 'tutela', label: 'Tutela' },
  { value: 'poder', label: 'Poder' },
  { value: 'memorial', label: 'Memorial' },
  { value: 'concepto', label: 'Concepto Jurídico' },
  { value: 'otro', label: 'Otro documento' },
];

export function LegalCopilot({ 
  initialContent = '', 
  onContentChange,
  documentType: initialDocType,
  lawyerId 
}: LegalCopilotProps) {
  const [content, setContent] = useState(initialContent);
  const [documentType, setDocumentType] = useState(initialDocType || 'contrato');
  const [showChat, setShowChat] = useState(true);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  
  // Autocomplete state
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  
  // Inline suggestions state
  const [inlineSuggestions, setInlineSuggestions] = useState<InlineSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(lawyerId);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Autocomplete trigger - debounced on typing pause
  const triggerAutocomplete = useCallback(async (text: string, cursorPos: number) => {
    // Only trigger if at end of sentence or paragraph
    const lastChars = text.slice(Math.max(0, cursorPos - 10), cursorPos);
    const shouldTrigger = /[.,:;]\s*$/.test(lastChars) || /\n\s*$/.test(lastChars);
    
    if (!shouldTrigger || text.length < 50) {
      setShowAutocomplete(false);
      return;
    }

    if (!hasEnoughCredits('legal_copilot_autocomplete')) {
      return;
    }

    setIsLoadingAutocomplete(true);
    try {
      const contextBefore = text.slice(Math.max(0, cursorPos - 500), cursorPos);
      
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'autocomplete',
          text: contextBefore,
          documentType,
          lawyerId
        }
      });

      if (error) throw error;

      if (data.completion && data.completion.trim()) {
        setAutocompleteSuggestion(data.completion.trim());
        
        // Calculate position near cursor
        const textarea = textareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          const lineHeight = 20;
          const lines = text.slice(0, cursorPos).split('\n').length;
          setAutocompletePosition({
            top: Math.min(lines * lineHeight, rect.height - 100),
            left: 20
          });
        }
        
        setShowAutocomplete(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setIsLoadingAutocomplete(false);
    }
  }, [documentType, lawyerId, hasEnoughCredits]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setContent(newContent);
    onContentChange?.(newContent);
    setShowAutocomplete(false);

    // Debounce autocomplete trigger
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    autocompleteTimeoutRef.current = setTimeout(() => {
      triggerAutocomplete(newContent, cursorPos);
    }, 1500);
  };

  const acceptAutocomplete = async () => {
    if (!autocompleteSuggestion) return;
    
    const creditResult = await consumeCredits('legal_copilot_autocomplete', { action: 'autocomplete' });
    if (!creditResult.success) return;
    
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const newContent = content.slice(0, cursorPos) + ' ' + autocompleteSuggestion + content.slice(cursorPos);
      setContent(newContent);
      onContentChange?.(newContent);
      
      // Move cursor to end of inserted text
      setTimeout(() => {
        const newPos = cursorPos + autocompleteSuggestion.length + 1;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }, 0);
    }
    
    setShowAutocomplete(false);
    setAutocompleteSuggestion('');
  };

  const dismissAutocomplete = () => {
    setShowAutocomplete(false);
    setAutocompleteSuggestion('');
  };

  // Text selection for variants
  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    if (selected.length > 20) {
      setSelectedText(selected);
      setSelectionRange({ start, end });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  // Analyze for inline suggestions
  const analyzeDocument = async () => {
    if (content.length < 100) {
      toast.info('El documento es muy corto para analizar');
      return;
    }

    if (!hasEnoughCredits('legal_copilot')) {
      toast.error(`Necesitas ${getToolCost('legal_copilot')} créditos`);
      return;
    }

    setIsAnalyzing(true);
    try {
      const creditResult = await consumeCredits('legal_copilot', { action: 'analyze_inline' });
      if (!creditResult.success) return;

      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'analyze_inline',
          text: content,
          documentType,
          lawyerId
        }
      });

      if (error) throw error;

      setInlineSuggestions(data.suggestions || []);
      
      if (data.suggestions?.length > 0) {
        toast.success(`Se encontraron ${data.suggestions.length} sugerencias`);
      } else {
        toast.success('El documento está bien redactado');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Error al analizar el documento');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: InlineSuggestion) => {
    const newContent = 
      content.slice(0, suggestion.position.start) + 
      suggestion.suggestion + 
      content.slice(suggestion.position.end);
    
    setContent(newContent);
    onContentChange?.(newContent);
    setInlineSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    toast.success('Sugerencia aplicada');
  };

  const dismissSuggestion = (id: string) => {
    setInlineSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const dismissAllSuggestions = () => {
    setInlineSuggestions([]);
  };

  const applyVariant = (text: string) => {
    if (selectionRange) {
      const newContent = 
        content.slice(0, selectionRange.start) + 
        text + 
        content.slice(selectionRange.end);
      setContent(newContent);
      onContentChange?.(newContent);
    }
    setShowVariants(false);
    setSelectedText('');
  };

  const insertTextFromChat = (text: string) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPos) + '\n\n' + text + '\n\n' + content.slice(cursorPos);
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const canUseCredits = hasEnoughCredits('legal_copilot');

  return (
    <div className="flex flex-col h-full">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Legal Copilot</h2>
              <p className="text-xs text-muted-foreground">Asistente de redacción inteligente</p>
            </div>
          </div>
          
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ToolCostIndicator toolType="legal_copilot" lawyerId={lawyerId} />
          
          {isLoadingAutocomplete && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Pensando...
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeDocument}
            disabled={isAnalyzing || !canUseCredits}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Lightbulb className="h-4 w-4 mr-1" />
            )}
            Analizar
          </Button>

          {selectedText && (
            <Button
              size="sm"
              onClick={() => setShowVariants(true)}
              disabled={!canUseCredits}
            >
              <Shuffle className="h-4 w-4 mr-1" />
              Variantes
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChat(!showChat)}
            title={showChat ? 'Ocultar chat' : 'Mostrar chat'}
          >
            {showChat ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          <div className="flex-1 relative p-4">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onSelect={handleTextSelect}
              placeholder={`Comienza a escribir tu ${DOCUMENT_TYPES.find(t => t.value === documentType)?.label || 'documento'}...

El Copilot te ayudará mientras escribes:
• Autocompletado inteligente al final de oraciones
• Chat lateral para consultas con contexto
• Análisis de consistencia y riesgos
• Generación de variantes de redacción

Escribe y el asistente te acompañará.`}
              className="h-full min-h-[500px] font-mono text-sm resize-none"
            />
            
            {/* Inline Autocomplete */}
            <InlineAutocomplete
              suggestion={autocompleteSuggestion}
              position={autocompletePosition}
              onAccept={acceptAutocomplete}
              onDismiss={dismissAutocomplete}
              visible={showAutocomplete}
            />
          </div>

          {/* Bottom Panel - Suggestions & Consistency */}
          <div className="border-t p-4 bg-muted/30 max-h-[300px] overflow-y-auto">
            <Tabs defaultValue="suggestions">
              <TabsList className="mb-3">
                <TabsTrigger value="suggestions" className="gap-1">
                  <Lightbulb className="h-4 w-4" />
                  Sugerencias
                  {inlineSuggestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {inlineSuggestions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="consistency" className="gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Consistencia
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-1">
                  <FileText className="h-4 w-4" />
                  Estadísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="suggestions">
                {inlineSuggestions.length > 0 ? (
                  <InlineSuggestions
                    suggestions={inlineSuggestions}
                    onApply={applySuggestion}
                    onDismiss={dismissSuggestion}
                    onDismissAll={dismissAllSuggestions}
                  />
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Haz clic en "Analizar" para obtener sugerencias</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="consistency">
                <ConsistencyChecker
                  documentContent={content}
                  documentType={documentType}
                  lawyerId={lawyerId}
                />
              </TabsContent>

              <TabsContent value="stats">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {content.split(/\s+/).filter(w => w).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Palabras</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{content.length}</p>
                    <p className="text-xs text-muted-foreground">Caracteres</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {content.split(/\n\n+/).filter(p => p.trim()).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Párrafos</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">
                      {Math.ceil(content.split(/\s+/).filter(w => w).length / 200)}
                    </p>
                    <p className="text-xs text-muted-foreground">Min. lectura</p>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 lg:w-96 border-l flex flex-col">
            <CopilotChat
              documentContent={content}
              documentType={documentType}
              lawyerId={lawyerId}
              onInsertText={insertTextFromChat}
            />
          </div>
        )}
      </div>

      {/* Variant Generator Modal */}
      {showVariants && selectedText && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <VariantGenerator
              selectedText={selectedText}
              documentType={documentType}
              lawyerId={lawyerId}
              onApplyVariant={applyVariant}
              onClose={() => setShowVariants(false)}
            />
          </div>
        </div>
      )}

      {/* No Credits Warning */}
      {!canUseCredits && (
        <div className="absolute bottom-4 left-4 right-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          <p className="text-sm text-destructive font-medium">
            Créditos insuficientes para usar el Copilot Legal
          </p>
        </div>
      )}
    </div>
  );
}
