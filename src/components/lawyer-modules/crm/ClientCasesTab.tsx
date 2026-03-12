import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CaseItem {
  id: string;
  title: string;
  case_type: string;
  status: string;
  priority: string;
  pipeline_stage: string | null;
  created_at: string;
  juzgado: string | null;
  demandante: string | null;
  demandado: string | null;
}

interface ClientCasesTabProps {
  clientId: string;
  lawyerId: string;
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  closed: 'Cerrado',
  won: 'Ganado',
  lost: 'Perdido',
};

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-muted text-muted-foreground',
};

const ClientCasesTab: React.FC<ClientCasesTabProps> = ({ clientId, lawyerId }) => {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      const { data, error } = await supabase
        .from('crm_cases')
        .select('id, title, case_type, status, priority, pipeline_stage, created_at, juzgado, demandante, demandado')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false });

      if (!error && data) setCases(data);
      setLoading(false);
    };
    fetchCases();
  }, [clientId, lawyerId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Este cliente no tiene casos asociados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{cases.length} caso(s) encontrado(s)</p>
      {cases.map(c => (
        <div key={c.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.case_type}</p>
              {c.juzgado && <p className="text-xs text-muted-foreground truncate">{c.juzgado}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-xs">{statusLabels[c.status] || c.status}</Badge>
              <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[c.priority] || ''}`}>
                {c.priority === 'high' ? 'Alta' : c.priority === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(c.created_at), "d MMM yyyy", { locale: es })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClientCasesTab;
