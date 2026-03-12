import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Eye, Calendar, Loader2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'upload' | 'view' | 'appointment';
  title: string;
  description: string;
  date: string;
}

interface ClientPortalActivityProps {
  clientId: string;
  lawyerId: string;
}

const iconMap = {
  upload: <Upload className="h-4 w-4 text-primary" />,
  view: <Eye className="h-4 w-4 text-green-600" />,
  appointment: <Calendar className="h-4 w-4 text-amber-600" />,
};

const bgMap = {
  upload: 'bg-primary/10',
  view: 'bg-green-500/10',
  appointment: 'bg-amber-500/10',
};

const ClientPortalActivity: React.FC<ClientPortalActivityProps> = ({ clientId, lawyerId }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const [docsResult, appointmentsResult] = await Promise.all([
        supabase
          .from('client_shared_documents')
          .select('id, document_name, is_from_client, viewed_at, created_at')
          .eq('client_id', clientId)
          .eq('lawyer_id', lawyerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_appointments')
          .select('id, title, scheduled_at, status, created_at')
          .eq('client_id', clientId)
          .eq('lawyer_id', lawyerId)
          .order('created_at', { ascending: false }),
      ]);

      const items: ActivityItem[] = [];

      // Document uploads from client
      (docsResult.data || []).forEach(doc => {
        if (doc.is_from_client) {
          items.push({
            id: `upload-${doc.id}`,
            type: 'upload',
            title: 'Documento subido por el cliente',
            description: doc.document_name,
            date: doc.created_at,
          });
        }
        if (doc.viewed_at) {
          items.push({
            id: `view-${doc.id}`,
            type: 'view',
            title: 'Documento visto por el cliente',
            description: doc.document_name,
            date: doc.viewed_at,
          });
        }
      });

      // Appointments
      (appointmentsResult.data || []).forEach(apt => {
        items.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: `Cita: ${apt.title}`,
          description: `Estado: ${apt.status || 'pendiente'} — ${format(new Date(apt.scheduled_at), "d MMM yyyy HH:mm", { locale: es })}`,
          date: apt.created_at,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(items);
      setLoading(false);
    };
    fetchActivity();
  }, [clientId, lawyerId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No hay actividad del portal para este cliente</p>
        <p className="text-xs text-muted-foreground mt-1">Las acciones del cliente en el portal aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-3">{activities.length} evento(s)</p>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        {activities.map(item => (
          <div key={item.id} className="relative flex gap-3 pb-4">
            <div className={`w-8 h-8 rounded-full ${bgMap[item.type]} flex items-center justify-center shrink-0 z-10 bg-background border`}>
              {iconMap[item.type]}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(item.date), "d MMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientPortalActivity;
