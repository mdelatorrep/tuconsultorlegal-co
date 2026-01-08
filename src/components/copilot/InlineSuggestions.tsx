import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Check, 
  X, 
  ChevronRight,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineSuggestion {
  id: string;
  type: 'grammar' | 'legal' | 'clarity' | 'style';
  original: string;
  suggestion: string;
  reason: string;
  position: { start: number; end: number };
}

interface InlineSuggestionsProps {
  suggestions: InlineSuggestion[];
  onApply: (suggestion: InlineSuggestion) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function InlineSuggestions({
  suggestions,
  onApply,
  onDismiss,
  onDismissAll
}: InlineSuggestionsProps) {
  if (suggestions.length === 0) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <AlertTriangle className="h-3 w-3" />;
      case 'legal': return <Sparkles className="h-3 w-3" />;
      case 'clarity': return <Lightbulb className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'legal': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'clarity': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      grammar: 'Gramática',
      legal: 'Legal',
      clarity: 'Claridad',
      style: 'Estilo'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">
            {suggestions.length} {suggestions.length === 1 ? 'sugerencia' : 'sugerencias'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6"
          onClick={onDismissAll}
        >
          Ignorar todas
        </Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              "p-3 rounded-lg border",
              "bg-card hover:bg-accent/50 transition-colors"
            )}
          >
            <div className="flex items-start gap-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs flex items-center gap-1", getTypeColor(suggestion.type))}
              >
                {getTypeIcon(suggestion.type)}
                {getTypeLabel(suggestion.type)}
              </Badge>
            </div>

            <div className="mt-2 space-y-2">
              {/* Original */}
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Original:</span>
                <span className="text-sm line-through text-muted-foreground">
                  {suggestion.original}
                </span>
              </div>

              {/* Suggestion */}
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-16 flex-shrink-0">Sugerido:</span>
                <span className="text-sm font-medium text-primary">
                  {suggestion.suggestion}
                </span>
              </div>

              {/* Reason */}
              <p className="text-xs text-muted-foreground pl-[4.5rem]">
                {suggestion.reason}
              </p>
            </div>

            <div className="flex gap-2 mt-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onDismiss(suggestion.id)}
              >
                <X className="h-3 w-3 mr-1" />
                Ignorar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onApply(suggestion)}
              >
                <Check className="h-3 w-3 mr-1" />
                Aplicar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
