import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineAutocompleteProps {
  suggestion: string;
  position: { top: number; left: number };
  onAccept: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export function InlineAutocomplete({
  suggestion,
  position,
  onAccept,
  onDismiss,
  visible
}: InlineAutocompleteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        onAccept();
      } else if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onAccept, onDismiss]);

  if (!visible || !suggestion) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 max-w-md p-3 rounded-lg border shadow-lg",
        "bg-primary/5 border-primary/20 backdrop-blur-sm",
        "animate-in fade-in-0 slide-in-from-top-2 duration-200"
      )}
      style={{
        top: position.top + 24,
        left: position.left,
      }}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground italic line-clamp-3">
            {suggestion}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Tab</kbd>
              para aceptar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              para ignorar
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onAccept}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
