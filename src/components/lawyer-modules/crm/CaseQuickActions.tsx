import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  FileText, 
  Target, 
  PenTool, 
  Scale, 
  Calendar,
  Plus,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CaseQuickActionsProps {
  caseId: string;
  caseTitle: string;
  lawyerId: string;
  onNavigateToTool?: (tool: string, caseId: string, caseTitle: string) => void;
  onRefresh: () => void;
}

const CaseQuickActions: React.FC<CaseQuickActionsProps> = ({
  caseId,
  caseTitle,
  lawyerId,
  onNavigateToTool,
  onRefresh
}) => {
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'deadline',
    start_date: '',
    description: ''
  });

  const [processForm, setProcessForm] = useState({
    radicado: ''
  });

  const quickActions = [
    {
      id: 'analyze',
      label: 'Analizar Documento',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      description: 'Análisis con IA'
    },
    {
      id: 'research',
      label: 'Investigar',
      icon: Search,
      color: 'from-emerald-500 to-emerald-600',
      description: 'Jurisprudencia'
    },
    {
      id: 'strategize',
      label: 'Estrategia',
      icon: Target,
      color: 'from-purple-500 to-purple-600',
      description: 'Plan legal'
    },
    {
      id: 'draft',
      label: 'Redactar',
      icon: PenTool,
      color: 'from-amber-500 to-amber-600',
      description: 'Documentos'
    }
  ];

  const handleQuickAction = (actionId: string) => {
    if (onNavigateToTool) {
      onNavigateToTool(actionId, caseId, caseTitle);
    } else {
      toast.info(`Navegando a ${actionId} con caso: ${caseTitle}`);
    }
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.start_date) {
      toast.error('El título y la fecha son requeridos');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('legal_calendar_events')
        .insert({
          lawyer_id: lawyerId,
          case_id: caseId,
          title: eventForm.title,
          event_type: eventForm.event_type,
          start_date: new Date(eventForm.start_date).toISOString(),
          description: eventForm.description || null,
          is_auto_generated: false
        });

      if (error) throw error;
      
      toast.success('Evento agregado al calendario');
      setShowEventDialog(false);
      setEventForm({ title: '', event_type: 'deadline', start_date: '', description: '' });
      onRefresh();
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Error al agregar evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkProcess = async () => {
    if (!processForm.radicado.trim()) {
      toast.error('El número de radicado es requerido');
      return;
    }

    try {
      setIsLoading(true);
      
      // First check if process exists
      const { data: existingProcess } = await supabase
        .from('monitored_processes')
        .select('id')
        .eq('lawyer_id', lawyerId)
        .eq('radicado', processForm.radicado.trim())
        .maybeSingle();

      if (existingProcess) {
        // Link existing process
        const { error } = await supabase
          .from('monitored_processes')
          .update({ case_id: caseId })
          .eq('id', existingProcess.id);

        if (error) throw error;
        toast.success('Proceso vinculado al caso');
      } else {
        // Create and link new process
        const { error } = await supabase
          .from('monitored_processes')
          .insert({
            lawyer_id: lawyerId,
            case_id: caseId,
            radicado: processForm.radicado.trim(),
            estado: 'activo',
            notificaciones_activas: true
          });

        if (error) throw error;
        toast.success('Proceso creado y vinculado al caso');
      }

      setShowProcessDialog(false);
      setProcessForm({ radicado: '' });
      onRefresh();
    } catch (error) {
      console.error('Error linking process:', error);
      toast.error('Error al vincular proceso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {/* AI Tool Actions */}
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="flex items-center gap-2 h-auto py-2"
              onClick={() => handleQuickAction(action.id)}
            >
              <div className={`p-1.5 rounded bg-gradient-to-br ${action.color}`}>
                <action.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}

          {/* Calendar Event */}
          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 h-auto py-2">
                <div className="p-1.5 rounded bg-gradient-to-br from-indigo-500 to-indigo-600">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Agregar Evento</p>
                  <p className="text-xs text-muted-foreground">Calendario</p>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Evento al Caso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Ej: Audiencia de conciliación"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha y Hora *</Label>
                  <Input
                    type="datetime-local"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddEvent}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> Agregar Evento</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Link Process */}
          <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 h-auto py-2">
                <div className="p-1.5 rounded bg-gradient-to-br from-rose-500 to-rose-600">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Vincular Proceso</p>
                  <p className="text-xs text-muted-foreground">Rama Judicial</p>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular Proceso Judicial</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Número de Radicado *</Label>
                  <Input
                    value={processForm.radicado}
                    onChange={(e) => setProcessForm({ radicado: e.target.value })}
                    placeholder="Ej: 11001310300320200012300"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si el proceso ya existe en tu monitor, se vinculará. Si no, se creará uno nuevo.
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleLinkProcess}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vinculando...</>
                  ) : (
                    <><Scale className="h-4 w-4 mr-2" /> Vincular Proceso</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default CaseQuickActions;
