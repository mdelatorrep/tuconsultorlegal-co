import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus, ChevronRight, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Case {
  id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  status: string;
  priority: string;
  client_name?: string;
  updated_at: string;
}

interface CasesOverviewProps {
  lawyerId: string;
  onViewCRM: () => void;
  onCreateCase: () => void;
}

export function CasesOverview({ lawyerId, onViewCRM, onCreateCase }: CasesOverviewProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState({ active: 0, pending: 0, closed: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (lawyerId) {
      fetchCases();
    } else {
      setIsLoading(false);
    }
  }, [lawyerId]);

  const fetchCases = async () => {
    if (!lawyerId) {
      setIsLoading(false);
      return;
    }
    try {
      // Fetch recent cases with client info
      const { data: casesData, error: casesError } = await supabase
        .from('crm_cases')
        .select(`
          id, title, case_number, case_type, status, priority, updated_at,
          crm_clients!inner(name)
        `)
        .eq('lawyer_id', lawyerId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (casesError) throw casesError;

      const formattedCases = casesData?.map(c => ({
        ...c,
        client_name: (c.crm_clients as any)?.name
      })) || [];

      setCases(formattedCases);

      // Fetch stats
      const { data: allCases, error: statsError } = await supabase
        .from('crm_cases')
        .select('status')
        .eq('lawyer_id', lawyerId);

      if (!statsError && allCases) {
        const active = allCases.filter(c => c.status === 'active').length;
        const pending = allCases.filter(c => c.status === 'pending').length;
        const closed = allCases.filter(c => c.status === 'closed' || c.status === 'completed').length;
        setStats({ active, pending, closed, total: allCases.length });
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Activo', variant: 'default' as const, icon: CheckCircle };
      case 'pending':
        return { label: 'Pendiente', variant: 'secondary' as const, icon: Clock };
      case 'on_hold':
        return { label: 'En espera', variant: 'outline' as const, icon: AlertTriangle };
      case 'closed':
      case 'completed':
        return { label: 'Cerrado', variant: 'secondary' as const, icon: CheckCircle };
      default:
        return { label: status, variant: 'outline' as const, icon: Briefcase };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'text-destructive';
      case 'medium':
        return 'text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Mis Casos</CardTitle>
          </div>
          <Button size="sm" onClick={onCreateCase} className="gap-1">
            <Plus className="h-4 w-4" />
            Nuevo Caso
          </Button>
        </div>
        <CardDescription>
          Resumen de tus casos legales activos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-muted-foreground">{stats.closed}</p>
            <p className="text-xs text-muted-foreground">Cerrados</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Cases List */}
        {cases.length > 0 ? (
          <div className="space-y-2">
            {cases.map((caseItem) => {
              const statusConfig = getStatusConfig(caseItem.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div
                  key={caseItem.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={onViewCRM}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{caseItem.title}</p>
                      <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="truncate">{caseItem.client_name}</span>
                      {caseItem.case_number && (
                        <>
                          <span>•</span>
                          <span className="truncate">{caseItem.case_number}</span>
                        </>
                      )}
                      <span className={`${getPriorityColor(caseItem.priority)} text-xs`}>
                        • {caseItem.priority === 'high' || caseItem.priority === 'urgent' ? '⚡ Alta' : 
                           caseItem.priority === 'medium' ? '📊 Media' : '📌 Normal'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes casos registrados</p>
            <Button variant="link" size="sm" onClick={onCreateCase}>
              Crear tu primer caso
            </Button>
          </div>
        )}

        {/* View All Button */}
        {cases.length > 0 && (
          <Button variant="outline" className="w-full" onClick={onViewCRM}>
            Ver todos los casos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}