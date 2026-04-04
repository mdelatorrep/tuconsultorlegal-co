import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Search, Eye, PenTool, Database, Gavel, Radar, Mic, TrendingUp, Calculator, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LucideIcon } from 'lucide-react';

interface RecentActivityFeedProps {
  lawyerId: string;
  onNavigate?: (view: string) => void;
}

interface ActivityItem {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tool_type?: string;
}

const toolIconMap: Record<string, { icon: LucideIcon; color: string; view: string }> = {
  'Investigación Legal': { icon: Search, color: 'text-blue-600', view: 'research' },
  'Análisis de Documentos': { icon: Eye, color: 'text-purple-600', view: 'analyze' },
  'Redacción Legal': { icon: PenTool, color: 'text-green-600', view: 'draft' },
  'SUIN-Juriscol': { icon: Database, color: 'text-orange-600', view: 'suin-juriscol' },
  'Consulta Procesos': { icon: Gavel, color: 'text-red-600', view: 'process-query' },
  'Monitor de Procesos': { icon: Radar, color: 'text-indigo-600', view: 'process-monitor' },
  'Transcripción de Voz': { icon: Mic, color: 'text-pink-600', view: 'voice-assistant' },
  'Predictor': { icon: TrendingUp, color: 'text-emerald-600', view: 'case-predictor' },
  'Cálculo de Términos': { icon: Calculator, color: 'text-amber-600', view: 'legal-calendar' },
};

function getToolInfo(description: string) {
  const toolName = description.replace('Uso de ', '');
  return toolIconMap[toolName] || { icon: Clock, color: 'text-muted-foreground', view: '' };
}

export function RecentActivityFeed({ lawyerId, onNavigate }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, description, amount, created_at, metadata')
        .eq('lawyer_id', lawyerId)
        .eq('transaction_type', 'usage')
        .order('created_at', { ascending: false })
        .limit(8);

      if (!error && data) {
        setActivities(data as ActivityItem[]);
      }
      setLoading(false);
    };

    fetchActivity();
  }, [lawyerId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aún no has usado herramientas. ¡Empieza explorando!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-1">
          {activities.map((activity) => {
            const toolInfo = getToolInfo(activity.description);
            const ToolIcon = toolInfo.icon;
            const detail = activity.metadata
              ? (activity.metadata as Record<string, string>).query
                || (activity.metadata as Record<string, string>).fileName
                || (activity.metadata as Record<string, string>).termType
                || (activity.metadata as Record<string, string>).queryType
                || null
              : null;

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => toolInfo.view && onNavigate?.(toolInfo.view)}
              >
                <div className={`shrink-0 ${toolInfo.color}`}>
                  <ToolIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {activity.description.replace('Uso de ', '')}
                  </p>
                  {detail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {String(detail).substring(0, 60)}{String(detail).length > 60 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs h-5">
                    {Math.abs(activity.amount)} cr
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
