import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface SuggestionPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onImprove: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function SuggestionPopover({
  position,
  selectedText,
  onImprove,
  onClose,
  loading = false
}: SuggestionPopoverProps) {
  return (
    <Card
      className="absolute z-50 p-2 shadow-lg flex items-center gap-2"
      style={{
        left: Math.max(10, position.x - 100),
        top: Math.max(10, position.y - 50),
        minWidth: '200px'
      }}
    >
      <Button
        size="sm"
        onClick={onImprove}
        disabled={loading}
        className="flex-1"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        Mejorar redacción
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onClose}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
}
