import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shuffle, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles,
  ChevronRight,
  Scale,
  Shield,
  Feather
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Variant {
  id: string;
  style: 'formal' | 'conciso' | 'protector' | 'neutral';
  content: string;
  highlights?: string[];
}

interface VariantGeneratorProps {
  selectedText: string;
  documentType: string;
  lawyerId: string;
  onApplyVariant: (text: string) => void;
  onClose: () => void;
}

export function VariantGenerator({
  selectedText,
  documentType,
  lawyerId,
  onApplyVariant,
  onClose
}: VariantGeneratorProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const generateVariants = async (specificStyle?: string) => {
    if (!selectedText.trim()) {
      toast.error('Selecciona un texto primero');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-copilot', {
        body: {
          action: 'generate_variants',
          text: selectedText,
          documentType,
          lawyerId,
          specificStyle,
          customPrompt: customPrompt || undefined
        }
      });

      if (error) throw error;

      setVariants(data.variants || []);
      
      if (data.variants?.length > 0) {
        toast.success(`Se generaron ${data.variants.length} variantes`);
      }
    } catch (error) {
      console.error('Variant generation error:', error);
      toast.error('Error al generar variantes');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyVariant = async (variant: Variant) => {
    await navigator.clipboard.writeText(variant.content);
    setCopiedId(variant.id);
    toast.success('Variante copiada');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyVariant = (variant: Variant) => {
    onApplyVariant(variant.content);
    toast.success('Variante aplicada al documento');
    onClose();
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'formal': return <Scale className="h-4 w-4" />;
      case 'conciso': return <Feather className="h-4 w-4" />;
      case 'protector': return <Shield className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStyleLabel = (style: string) => {
    const labels: Record<string, string> = {
      formal: 'Formal/Tradicional',
      conciso: 'Conciso/Moderno',
      protector: 'Protector del cliente',
      neutral: 'Neutral/Equilibrado'
    };
    return labels[style] || style;
  };

  const getStyleColor = (style: string) => {
    const colors: Record<string, string> = {
      formal: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      conciso: 'bg-green-500/10 text-green-600 border-green-500/20',
      protector: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      neutral: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    };
    return colors[style] || '';
  };

  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Generador de Variantes</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* Original Text */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Texto seleccionado:</p>
        <div className="p-2 bg-muted/50 rounded-lg text-sm max-h-24 overflow-y-auto">
          {selectedText}
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Instrucciones adicionales (opcional):</p>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ej: Hazlo más favorable para el arrendatario..."
          className="text-sm h-16 resize-none"
        />
      </div>

      {/* Generate Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          onClick={() => generateVariants()}
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Shuffle className="h-4 w-4 mr-2" />
          )}
          Generar todas
        </Button>
        <Button
          variant="outline"
          onClick={() => generateVariants('formal')}
          disabled={isGenerating}
        >
          <Scale className="h-4 w-4 mr-1" />
          Formal
        </Button>
        <Button
          variant="outline"
          onClick={() => generateVariants('conciso')}
          disabled={isGenerating}
        >
          <Feather className="h-4 w-4 mr-1" />
          Conciso
        </Button>
        <Button
          variant="outline"
          onClick={() => generateVariants('protector')}
          disabled={isGenerating}
        >
          <Shield className="h-4 w-4 mr-1" />
          Protector
        </Button>
      </div>

      {/* Variants List */}
      {variants.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className={cn(
                  "p-3 rounded-lg border",
                  "hover:border-primary/30 transition-colors"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getStyleIcon(variant.style)}
                  <Badge variant="outline" className={getStyleColor(variant.style)}>
                    {getStyleLabel(variant.style)}
                  </Badge>
                </div>
                
                <p className="text-sm mb-3 whitespace-pre-wrap">{variant.content}</p>
                
                {variant.highlights && variant.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {variant.highlights.map((h, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => copyVariant(variant)}
                  >
                    {copiedId === variant.id ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => applyVariant(variant)}
                  >
                    <ChevronRight className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {variants.length === 0 && !isGenerating && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Haz clic en "Generar todas" para crear variantes de redacción
        </p>
      )}
    </Card>
  );
}
