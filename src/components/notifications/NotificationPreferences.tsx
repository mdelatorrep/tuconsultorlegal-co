import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Mail, 
  Users, 
  FileText, 
  Radar, 
  CreditCard, 
  Calendar, 
  AlertCircle,
  Settings,
  Loader2
} from 'lucide-react';

interface NotificationPreference {
  id: string;
  notification_type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

interface NotificationPreferencesProps {
  lawyerId: string;
}

const notificationTypes = [
  {
    key: 'new_lead',
    label: 'Nuevos Leads',
    description: 'Cuando alguien envía un mensaje de contacto desde tu perfil público',
    icon: Users,
    color: 'text-blue-500'
  },
  {
    key: 'document_status',
    label: 'Estado de Documentos',
    description: 'Cambios en el estado de documentos que revisas',
    icon: FileText,
    color: 'text-green-500'
  },
  {
    key: 'process_update',
    label: 'Actuaciones Judiciales',
    description: 'Nuevas actuaciones en los procesos que monitoreas',
    icon: Radar,
    color: 'text-purple-500'
  },
  {
    key: 'credit_low',
    label: 'Créditos Bajos',
    description: 'Cuando tu balance de créditos está bajo',
    icon: CreditCard,
    color: 'text-amber-500'
  },
  {
    key: 'credit_recharge',
    label: 'Recargas de Créditos',
    description: 'Confirmaciones de recargas y bonificaciones',
    icon: CreditCard,
    color: 'text-amber-500'
  },
  {
    key: 'sla_alert',
    label: 'Alertas de SLA',
    description: 'Documentos en riesgo o vencidos por tiempo de respuesta',
    icon: AlertCircle,
    color: 'text-red-500'
  },
  {
    key: 'calendar_reminder',
    label: 'Recordatorios de Calendario',
    description: 'Audiencias y vencimientos próximos',
    icon: Calendar,
    color: 'text-indigo-500'
  },
  {
    key: 'system',
    label: 'Sistema',
    description: 'Actualizaciones del sistema y mantenimiento',
    icon: Settings,
    color: 'text-gray-500'
  }
];

export function NotificationPreferences({ lawyerId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingType, setUpdatingType] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerId) {
      loadPreferences();
    }
  }, [lawyerId]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('lawyer_id', lawyerId);

      if (error) throw error;
      setPreferences(data || []);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las preferencias',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (
    notificationType: string, 
    field: 'email_enabled' | 'in_app_enabled', 
    value: boolean
  ) => {
    try {
      setUpdatingType(notificationType);

      const existingPref = preferences.find(p => p.notification_type === notificationType);

      if (existingPref) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existingPref.id);

        if (error) throw error;

        setPreferences(prev =>
          prev.map(p => p.id === existingPref.id ? { ...p, [field]: value } : p)
        );
      } else {
        const newPref = {
          lawyer_id: lawyerId,
          notification_type: notificationType,
          email_enabled: field === 'email_enabled' ? value : true,
          in_app_enabled: field === 'in_app_enabled' ? value : true
        };

        const { data, error } = await supabase
          .from('notification_preferences')
          .insert(newPref)
          .select()
          .single();

        if (error) throw error;
        setPreferences(prev => [...prev, data]);
      }

      toast({
        title: 'Preferencia actualizada',
        description: 'Tu configuración ha sido guardada'
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la preferencia',
        variant: 'destructive'
      });
    } finally {
      setUpdatingType(null);
    }
  };

  const getPreference = (type: string): NotificationPreference => {
    const pref = preferences.find(p => p.notification_type === type);
    return pref || {
      id: '',
      notification_type: type,
      email_enabled: true,
      in_app_enabled: true
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferencias de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferencias de Notificaciones
        </CardTitle>
        <CardDescription>
          Configura cómo y cuándo quieres recibir notificaciones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,80px] gap-4 pb-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">Tipo de Notificación</span>
            <span className="text-sm font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <span className="text-sm font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
              <Bell className="h-4 w-4" />
              In-App
            </span>
          </div>

          {/* Notification types */}
          {notificationTypes.map((type) => {
            const pref = getPreference(type.key);
            const Icon = type.icon;
            const isUpdating = updatingType === type.key;

            return (
              <div 
                key={type.key} 
                className="grid grid-cols-[1fr,80px,80px] gap-4 items-center py-3 border-b last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                  <div>
                    <Label className="font-medium">{type.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Switch
                    checked={pref.email_enabled}
                    onCheckedChange={(value) => updatePreference(type.key, 'email_enabled', value)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={pref.in_app_enabled}
                    onCheckedChange={(value) => updatePreference(type.key, 'in_app_enabled', value)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Las notificaciones críticas de seguridad siempre se enviarán 
            independientemente de estas preferencias.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationPreferences;
