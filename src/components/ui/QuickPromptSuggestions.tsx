import { Lightbulb } from "lucide-react";

interface QuickPromptSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function QuickPromptSuggestions({ suggestions, onSelect, disabled }: QuickPromptSuggestionsProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lightbulb className="h-3 w-3" />
        <span>Ejemplos de consulta:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(suggestion)}
            className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left leading-tight"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
