import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Clock, User, FileText, Phone, Mail, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  activity_date: string;
  metadata: any;
  created_at: string;
}

interface CaseTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
  lawyerData: any;
}

const CaseTraceabilityModal: React.FC<CaseTraceabilityModalProps> = ({
  isOpen,
  onClose,
  caseData,
  lawyerData
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'meeting',
    title: '',
    description: '',
    activity_date: new Date().toISOString().slice(0, 16)
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && caseData?.id) {
      fetchActivities();
    }
  }, [isOpen, caseData?.id]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_case_activities')
        .select('*')
        .eq('case_id', caseData.id)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades del caso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActivity = async () => {
    try {
      const { error } = await supabase
        .from('crm_case_activities')
        .insert([{
          case_id: caseData.id,
          lawyer_id: lawyerData.id,
          ...newActivity
        }]);

      if (error) throw error;

      toast({
        title: "Actividad agregada",
        description: "La actividad se ha registrado correctamente",
      });

      setNewActivity({
        activity_type: 'meeting',
        title: '',
        description: '',
        activity_date: new Date().toISOString().slice(0, 16)
      });
      setIsAddingActivity(false);
      fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la actividad",
        variant: "destructive",
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'milestone': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'call': return 'bg-green-100 text-green-800';
      case 'email': return 'bg-purple-100 text-purple-800';
      case 'document': return 'bg-orange-100 text-orange-800';
      case 'milestone': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trazabilidad del Caso: {caseData?.title}
          </DialogTitle>
          <DialogDescription>
            Historial completo de actividades y eventos relacionados con este caso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Case Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Cliente:</span>
                <p className="text-muted-foreground">{caseData?.client?.name}</p>
              </div>
              <div>
                <span className="font-medium">Estado:</span>
                <p className="text-muted-foreground">{caseData?.status}</p>
              </div>
              <div>
                <span className="font-medium">Prioridad:</span>
                <p className="text-muted-foreground">{caseData?.priority}</p>
              </div>
              <div>
                <span className="font-medium">Creado:</span>
                <p className="text-muted-foreground">
                  {caseData?.created_at ? format(new Date(caseData.created_at), 'dd/MM/yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Add Activity Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Actividades ({activities.length})</h3>
            <Button 
              onClick={() => setIsAddingActivity(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Actividad
            </Button>
          </div>

          {/* Add Activity Form */}
          {isAddingActivity && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Actividad</Label>
                  <Select
                    value={newActivity.activity_type}
                    onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Reunión</SelectItem>
                      <SelectItem value="call">Llamada</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                      <SelectItem value="milestone">Hito</SelectItem>
                      <SelectItem value="note">Nota</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha y Hora</Label>
                  <Input
                    type="datetime-local"
                    value={newActivity.activity_date}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="Título de la actividad"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Descripción detallada de la actividad"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddActivity}>
                  Agregar Actividad
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingActivity(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Activities Timeline */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay actividades registradas para este caso</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setIsAddingActivity(true)}
                >
                  Agregar primera actividad
                </Button>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{activity.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(activity.activity_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {activity.activity_type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaseTraceabilityModal;