import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, ListPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkProcessAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyerId: string;
  onComplete: () => void;
}

type ProcessStatus = 'pending' | 'inserting' | 'syncing' | 'done' | 'error' | 'duplicate';

interface ProcessEntry {
  radicado: string;
  status: ProcessStatus;
  message?: string;
  processId?: string;
}

export function BulkProcessAddDialog({ open, onOpenChange, lawyerId, onComplete }: BulkProcessAddDialogProps) {
  const [rawInput, setRawInput] = useState('');
  const [entries, setEntries] = useState<ProcessEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase, setPhase] = useState<'input' | 'processing' | 'done'>('input');
  const cancelRef = useRef(false);

  const parseRadicados = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map(line => line.replace(/\s/g, '').trim())
      .filter(line => line.length >= 10); // radicados are long numbers
  };

  const handleStartProcessing = async () => {
    const radicados = parseRadicados(rawInput);
    if (radicados.length === 0) {
      toast.error('Ingresa al menos un número de radicado válido');
      return;
    }

    // Remove duplicates within input
    const unique = [...new Set(radicados)];
    const initialEntries: ProcessEntry[] = unique.map(r => ({
      radicado: r,
      status: 'pending',
    }));

    setEntries(initialEntries);
    setPhase('processing');
    setIsProcessing(true);
    cancelRef.current = false;

    // Process sequentially
    for (let i = 0; i < initialEntries.length; i++) {
      if (cancelRef.current) break;

      setCurrentIndex(i);
      const entry = initialEntries[i];

      // Step 1: Insert into DB
      setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'inserting' } : e));

      try {
        // Check if already monitored
        const { data: existing } = await supabase
          .from('monitored_processes')
          .select('id')
          .eq('lawyer_id', lawyerId)
          .eq('radicado', entry.radicado)
          .maybeSingle();

        if (existing) {
          setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'duplicate', message: 'Ya está monitoreado' } : e));
          continue;
        }

        const { data, error } = await supabase
          .from('monitored_processes')
          .insert({
            lawyer_id: lawyerId,
            radicado: entry.radicado,
            tipo_proceso: 'civil',
            estado: 'activo',
          })
          .select()
          .single();

        if (error) throw error;

        // Step 2: Sync with Rama Judicial
        setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'syncing', processId: data.id } : e));

        const { error: syncError } = await supabase.functions.invoke('rama-judicial-monitor', {
          body: { action: 'sync', processId: data.id },
        });

        if (syncError) {
          setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'done', message: 'Agregado (sync pendiente)', processId: data.id } : e));
        } else {
          setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'done', message: 'Agregado y sincronizado', processId: data.id } : e));
        }

        // Small delay between requests to avoid overwhelming Firecrawl
        if (i < initialEntries.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err: any) {
        setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'error', message: err.message || 'Error desconocido' } : e));
      }
    }

    setIsProcessing(false);
    setPhase('done');
  };

  const handleClose = () => {
    if (isProcessing) {
      cancelRef.current = true;
    }
    setRawInput('');
    setEntries([]);
    setPhase('input');
    setCurrentIndex(-1);
    onOpenChange(false);
    if (phase === 'processing' || phase === 'done') {
      onComplete();
    }
  };

  const completedCount = entries.filter(e => e.status === 'done').length;
  const errorCount = entries.filter(e => e.status === 'error').length;
  const duplicateCount = entries.filter(e => e.status === 'duplicate').length;
  const progressPercent = entries.length > 0 ? ((completedCount + errorCount + duplicateCount) / entries.length) * 100 : 0;

  const getStatusIcon = (status: ProcessStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'inserting': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'syncing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'duplicate': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: ProcessStatus) => {
    switch (status) {
      case 'pending': return 'En espera';
      case 'inserting': return 'Registrando...';
      case 'syncing': return 'Sincronizando...';
      case 'done': return 'Completado';
      case 'error': return 'Error';
      case 'duplicate': return 'Duplicado';
    }
  };

  const parsedCount = parseRadicados(rawInput).length;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Agregar Múltiples Procesos
          </DialogTitle>
          <DialogDescription>
            Ingresa los números de radicado para monitorear. Se procesarán uno por uno de forma secuencial.
          </DialogDescription>
        </DialogHeader>

        {phase === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder={`Pega los números de radicado, uno por línea:\n\n11001310300320200012300\n05001310500120210034500\n76001400300120220056700`}
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Separar por líneas, comas o punto y coma</span>
                {parsedCount > 0 && (
                  <Badge variant="secondary">{parsedCount} radicado{parsedCount !== 1 ? 's' : ''} detectado{parsedCount !== 1 ? 's' : ''}</Badge>
                )}
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={handleStartProcessing}
              disabled={parsedCount === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Iniciar Monitoreo de {parsedCount} Proceso{parsedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {(phase === 'processing' || phase === 'done') && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isProcessing
                    ? `Procesando ${currentIndex + 1} de ${entries.length}...`
                    : 'Procesamiento completado'}
                </span>
                <span className="font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap">
              {completedCount > 0 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {completedCount} agregado{completedCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {duplicateCount} duplicado{duplicateCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  <XCircle className="h-3 w-3 mr-1" /> {errorCount} error{errorCount !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>

            {/* Process list with status */}
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg text-sm transition-colors ${
                      idx === currentIndex && isProcessing
                        ? 'bg-primary/5 border border-primary/20'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(entry.status)}
                      <span className="font-mono text-xs truncate">{entry.radicado}</span>
                    </div>
                    <span className={`text-xs whitespace-nowrap ${
                      entry.status === 'error' ? 'text-destructive' 
                      : entry.status === 'duplicate' ? 'text-yellow-600'
                      : 'text-muted-foreground'
                    }`}>
                      {entry.message || getStatusLabel(entry.status)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button 
              className="w-full" 
              variant={phase === 'done' ? 'default' : 'outline'}
              onClick={handleClose}
            >
              {isProcessing ? 'Cancelar y Cerrar' : 'Cerrar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
