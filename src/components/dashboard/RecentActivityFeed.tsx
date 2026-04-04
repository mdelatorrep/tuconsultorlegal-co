import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, Eye, PenTool, Database, Gavel, Radar, Mic, TrendingUp, Calculator, Clock, CheckCircle2, XCircle, ExternalLink, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LucideIcon } from 'lucide-react';
import { exportResearchToPdf, exportStrategyToPdf, exportPredictionToPdf, exportAnalysisToPdf, exportProcessQueryToPdf, exportSuinSearchToPdf } from '@/utils/aiResultPdfExporter';

interface RecentActivityFeedProps {
  lawyerId: string;
  onNavigate?: (view: string) => void;
}

interface ActivityItem {
  id: string;
  tool_type: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  created_at: string;
  status: 'completed' | 'failed';
}

const toolConfig: Record<string, { icon: LucideIcon; label: string; color: string; view: string }> = {
  research: { icon: Search, label: 'Investigación Legal', color: 'text-blue-600', view: 'research' },
  analysis: { icon: Eye, label: 'Análisis de Documentos', color: 'text-purple-600', view: 'analyze' },
  draft: { icon: PenTool, label: 'Redacción Legal', color: 'text-green-600', view: 'draft' },
  suin_juriscol: { icon: Database, label: 'SUIN-Juriscol', color: 'text-orange-600', view: 'suin-juriscol' },
  process_query: { icon: Gavel, label: 'Consulta Procesos', color: 'text-red-600', view: 'process-query' },
  process_monitor: { icon: Radar, label: 'Monitor de Procesos', color: 'text-indigo-600', view: 'process-monitor' },
  voice: { icon: Mic, label: 'Transcripción', color: 'text-pink-600', view: 'voice-assistant' },
  case_predictor: { icon: TrendingUp, label: 'Predictor', color: 'text-emerald-600', view: 'case-predictor' },
  strategy: { icon: TrendingUp, label: 'Estrategia', color: 'text-amber-600', view: 'strategize' },
  legal_calendar: { icon: Calculator, label: 'Cálculo de Términos', color: 'text-amber-600', view: 'legal-calendar' },
};

function getItemSummary(item: ActivityItem): string {
  const input = item.input_data || {};
  return (
    (input as any).query ||
    (input as any).fileName ||
    (input as any).radicado ||
    (input as any).caseDescription?.substring(0, 80) ||
    (input as any).draft_name ||
    ''
  );
}

function handleDownloadPdf(item: ActivityItem) {
  const output = item.output_data || {};
  const input = item.input_data || {};

  try {
    switch (item.tool_type) {
      case 'research':
        exportResearchToPdf({
          query: (input as any).query || 'Investigación',
          findings: (output as any).findings || '',
          sources: (output as any).sources || [],
          conclusion: (output as any).conclusion,
          analysis: (output as any).analysis,
          keyPoints: (output as any).keyPoints,
          legalBasis: (output as any).legalBasis,
          recommendations: (output as any).recommendations,
          risks: (output as any).risks,
          timestamp: item.created_at,
        });
        break;
      case 'strategy':
        exportStrategyToPdf({
          caseDescription: (input as any).caseDescription || '',
          legalActions: (output as any).legalActions || [],
          legalArguments: (output as any).legalArguments || [],
          counterarguments: (output as any).counterarguments || [],
          precedents: (output as any).precedents || [],
          recommendations: (output as any).recommendations || [],
          timestamp: item.created_at,
        });
        break;
      case 'case_predictor':
        exportPredictionToPdf(
          output as any,
          (input as any).caseType || '',
          (input as any).caseDescription || ''
        );
        break;
      case 'analysis':
        exportAnalysisToPdf({ ...output, fileName: (input as any).fileName });
        break;
      case 'process_query':
        exportProcessQueryToPdf(
          (input as any).radicado || '',
          (output as any).aiAnalysis || '',
          (output as any).processes
        );
        break;
      case 'suin_juriscol':
        exportSuinSearchToPdf(
          (input as any).query || '',
          (output as any).summary || '',
          (output as any).results || []
        );
        break;
    }
  } catch (e) {
    console.error('Error generating PDF:', e);
  }
}

export function RecentActivityFeed({ lawyerId, onNavigate }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      // Fetch from legal_tools_results for all tool usage
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('id, tool_type, input_data, output_data, metadata, created_at')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const items: ActivityItem[] = data.map((row: any) => {
          const isFailed = (row.metadata as any)?.status === 'failed';
          return {
            id: row.id,
            tool_type: row.tool_type,
            input_data: row.input_data || {},
            output_data: row.output_data || {},
            metadata: row.metadata,
            created_at: row.created_at,
            status: isFailed ? 'failed' : 'completed',
          };
        });
        setActivities(items);
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
    <>
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
              const config = toolConfig[activity.tool_type] || { icon: Clock, label: activity.tool_type, color: 'text-muted-foreground', view: '' };
              const ToolIcon = config.icon;
              const summary = getItemSummary(activity);
              const isFailed = activity.status === 'failed';

              return (
                <div
                  key={activity.id}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group ${
                    isFailed ? 'opacity-75 border-l-2 border-destructive/50' : ''
                  }`}
                  onClick={() => {
                    if (isFailed) return;
                    setSelectedItem(activity);
                  }}
                >
                  <div className={`shrink-0 ${isFailed ? 'text-destructive' : config.color}`}>
                    <ToolIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {config.label}
                    </p>
                    {summary && (
                      <p className="text-xs text-muted-foreground truncate">
                        {summary.substring(0, 60)}{summary.length > 60 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFailed ? (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                        <XCircle className="h-3 w-3 mr-0.5" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-300 text-emerald-700 bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        OK
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && (() => {
                const config = toolConfig[selectedItem.tool_type];
                const Icon = config?.icon || FileText;
                return <Icon className={`h-5 w-5 ${config?.color || ''}`} />;
              })()}
              {selectedItem && (toolConfig[selectedItem.tool_type]?.label || selectedItem.tool_type)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedItem.created_at).toLocaleString('es-CO')}
                </span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Exitoso
                </Badge>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Consulta / Entrada</p>
                <p className="text-sm">
                  {getItemSummary(selectedItem) || 'Sin descripción'}
                </p>
              </div>

              {/* Preview of output */}
              <ScrollArea className="max-h-[200px]">
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Vista previa del resultado</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                    {(() => {
                      const output = selectedItem.output_data as any;
                      return output?.findings
                        || output?.summary
                        || output?.analysis
                        || output?.strategicConclusion
                        || output?.aiAnalysis
                        || (output?.legalActions && `${output.legalActions.length} vías de acción identificadas`)
                        || 'Resultado disponible';
                    })()}
                  </p>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const view = toolConfig[selectedItem.tool_type]?.view;
                    if (view && onNavigate) {
                      onNavigate(view);
                      setSelectedItem(null);
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir al módulo
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    handleDownloadPdf(selectedItem);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
