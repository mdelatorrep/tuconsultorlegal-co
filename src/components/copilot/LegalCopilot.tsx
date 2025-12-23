import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  Loader2,
  X,
  Wand2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SuggestionPopover } from './SuggestionPopover';
import { RiskIndicator } from './RiskIndicator';

interface Suggestion {
  id: string;
  type: 'improvement' | 'autocomplete' | 'warning' | 'clause';
  text: string;
  replacement?: string;
  position?: { start: number; end: number };
}

interface Risk {
  id: string;
  level: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion?: string;
}

interface LegalCopilotProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  documentType?: string;
  lawyerId: string;
}

export function LegalCopilot({ 
  initialContent = '', 
  onContentChange,
  documentType,
  lawyerId 
}: LegalCopilotProps) {
  const [content, setContent] = useState(initialContent);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const analyzeContent = useCallback(async (text: string) => {
    if (text.length < 50) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'analyze',
          text,
          documentType,
          lawyerId
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      setRisks(data.risks || []);
    } catch (error) {
      console.error('Error analyzing content:', error);
    } finally {
      setLoading(false);
    }
  }, [documentType, lawyerId]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);

    // Debounced analysis
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      analyzeContent(newContent);
    }, 1500);
  };

  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    if (selected.length > 10) {
      setSelectedText(selected);
      
      // Get cursor position for popover
      const rect = textarea.getBoundingClientRect();
      setCursorPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + (start / content.length) * rect.height
      });
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const improveSelection = async () => {
    if (!selectedText) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'improve',
          text: selectedText,
          documentType,
          lawyerId
        }
      });

      if (error) throw error;

      if (data.improved) {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newContent = content.substring(0, start) + data.improved + content.substring(end);
          setContent(newContent);
          onContentChange?.(newContent);
          toast.success('Texto mejorado');
        }
      }
    } catch (error) {
      console.error('Error improving text:', error);
      toast.error('Error al mejorar el texto');
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (suggestion.replacement && suggestion.position) {
      const newContent = 
        content.substring(0, suggestion.position.start) + 
        suggestion.replacement + 
        content.substring(suggestion.position.end);
      setContent(newContent);
      onContentChange?.(newContent);
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
      toast.success('Sugerencia aplicada');
    }
  };

  const insertClause = async (clauseType: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'generate_clause',
          clauseType,
          documentType,
          context: content.substring(0, 500),
          lawyerId
        }
      });

      if (error) throw error;

      if (data.clause) {
        const textarea = textareaRef.current;
        const cursorPos = textarea?.selectionStart || content.length;
        const newContent = content.substring(0, cursorPos) + '\n\n' + data.clause + '\n\n' + content.substring(cursorPos);
        setContent(newContent);
        onContentChange?.(newContent);
        toast.success('Cláusula insertada');
      }
    } catch (error) {
      console.error('Error generating clause:', error);
      toast.error('Error al generar la cláusula');
    } finally {
      setLoading(false);
    }
  };

  const commonClauses = [
    { id: 'confidencialidad', label: 'Confidencialidad' },
    { id: 'incumplimiento', label: 'Incumplimiento' },
    { id: 'jurisdiccion', label: 'Jurisdicción' },
    { id: 'fuerza_mayor', label: 'Fuerza Mayor' },
    { id: 'terminacion', label: 'Terminación' }
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-2 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium">Legal Copilot</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Clauses */}
          <div className="flex items-center gap-1">
            {commonClauses.slice(0, 3).map(clause => (
              <Button
                key={clause.id}
                variant="outline"
                size="sm"
                onClick={() => insertClause(clause.id)}
                disabled={loading}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                {clause.label}
              </Button>
            ))}
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => analyzeContent(content)}
            disabled={loading || content.length < 50}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Analizar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Editor */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={handleTextSelect}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Escribe o pega tu documento legal aquí...

El Copilot analizará automáticamente tu texto para:
• Detectar riesgos legales
• Sugerir mejoras de redacción
• Autocompletar cláusulas comunes
• Identificar contradicciones"
            className="h-full min-h-[400px] font-mono text-sm resize-none"
          />
          
          {/* Suggestion Popover */}
          {showSuggestions && selectedText && (
            <SuggestionPopover
              position={cursorPosition}
              selectedText={selectedText}
              onImprove={improveSelection}
              onClose={() => setShowSuggestions(false)}
              loading={loading}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4 overflow-y-auto">
          {/* Risk Indicator */}
          <RiskIndicator risks={risks} />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Sugerencias ({suggestions.length})
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="p-3 bg-muted/50 rounded-lg text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2 text-xs">
                          {suggestion.type === 'improvement' && 'Mejora'}
                          {suggestion.type === 'autocomplete' && 'Autocompletar'}
                          {suggestion.type === 'warning' && 'Advertencia'}
                          {suggestion.type === 'clause' && 'Cláusula'}
                        </Badge>
                        <p className="text-muted-foreground">{suggestion.text}</p>
                      </div>
                      {suggestion.replacement && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Aplicar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Stats */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Palabras</p>
                <p className="text-xl font-bold">
                  {content.split(/\s+/).filter(w => w).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Caracteres</p>
                <p className="text-xl font-bold">{content.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Riesgos</p>
                <p className="text-xl font-bold text-red-500">{risks.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sugerencias</p>
                <p className="text-xl font-bold text-yellow-500">{suggestions.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
