import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Eye, Calendar, Clock, AlertTriangle, Loader2, Activity, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface FeedItem {
  id: string;
  type: 'upload' | 'view' | 'appointment' | 'task_due' | 'case_update';
  title: string;
  description: string;
  date: string;
  clientName?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  upload: <Upload className="h-4 w-4 text-primary" />,
  view: <Eye className="h-4 w-4 text-emerald-600" />,
  appointment: <Calendar className="h-4 w-4 text-amber-600" />,
  task_due: <Clock className="h-4 w-4 text-red-500" />,
  case_update: <Briefcase className="h-4 w-4 text-blue-600" />,
};

const bgMap: Record<string, string> = {
  upload: 'bg-primary/10',
  view: 'bg-emerald-500/10',
  appointment: 'bg-amber-500/10',
  task_due: 'bg-red-500/10',
  case_update: 'bg-blue-500/10',
};

const labelMap: Record<string, string> = {
  upload: 'Documento subido',
  view: 'Documento visto',
  appointment: 'Cita',
  task_due: 'Tarea próxima',
  case_update: 'Proceso',
};

interface Props {
  lawyerId: string;
}

export default function CRMNewsFeed({ lawyerId }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, [lawyerId]);

  const fetchFeed = async () => {
    try {
      const [docsResult, appointmentsResult, tasksResult] = await Promise.all([
        supabase
          .from('client_shared_documents')
          .select('id, document_name, is_from_client, viewed_at, created_at, client_id')
          .eq('lawyer_id', lawyerId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('client_appointments')
          .select('id, title, scheduled_at, status, created_at, client_id')
          .eq('lawyer_id', lawyerId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('crm_tasks')
          .select('id, title, due_date, priority, status')
          .eq('lawyer_id', lawyerId)
          .eq('status', 'pending')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(10),
      ]);

      // Collect client IDs for name lookup
      const clientIds = new Set<string>();
      (docsResult.data || []).forEach(d => clientIds.add(d.client_id));
      (appointmentsResult.data || []).forEach(a => clientIds.add(a.client_id));

      let clientMap = new Map<string, string>();
      if (clientIds.size > 0) {
        const { data: clients } = await supabase
          .from('crm_clients')
          .select('id, name')
          .in('id', [...clientIds]);
        clients?.forEach(c => clientMap.set(c.id, c.name));
      }

      const feed: FeedItem[] = [];

      // Document events
      (docsResult.data || []).forEach(doc => {
        if (doc.is_from_client) {
          feed.push({
            id: `upload-${doc.id}`,
            type: 'upload',
            title: 'Documento subido por cliente',
            description: doc.document_name,
            date: doc.created_at,
            clientName: clientMap.get(doc.client_id),
          });
        }
        if (doc.viewed_at) {
          feed.push({
            id: `view-${doc.id}`,
            type: 'view',
            title: 'Documento visto por cliente',
            description: doc.document_name,
            date: doc.viewed_at,
            clientName: clientMap.get(doc.client_id),
          });
        }
      });

      // Appointments
      (appointmentsResult.data || []).forEach(apt => {
        feed.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: `Cita: ${apt.title}`,
          description: `Estado: ${apt.status || 'pendiente'}`,
          date: apt.created_at,
          clientName: clientMap.get(apt.client_id),
        });
      });

      // Tasks due soon
      (tasksResult.data || []).forEach(task => {
        feed.push({
          id: `task-${task.id}`,
          type: 'task_due',
          title: task.title,
          description: `Prioridad: ${task.priority} — Vence: ${task.due_date ? format(new Date(task.due_date), 'd MMM', { locale: es }) : 'Sin fecha'}`,
          date: task.due_date || new Date().toISOString(),
        });
      });

      feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(feed);
    } catch (error) {
      console.error('Error fetching news feed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Sin novedades recientes</p>
        <p className="text-xs text-muted-foreground mt-1">
          Las actividades de tus clientes y tareas pendientes aparecerán aquí
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
          <div className={`w-8 h-8 rounded-full ${bgMap[item.type]} flex items-center justify-center shrink-0 mt-0.5`}>
            {iconMap[item.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {labelMap[item.type]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {item.clientName && (
                <span className="text-[10px] text-primary font-medium">{item.clientName}</span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(item.date), "d MMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
