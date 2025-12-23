import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, Clock, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Case {
  id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  status: string;
  priority: string;
  description: string | null;
  start_date: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  activity_date: string;
}

interface CaseStatusProps {
  clientId: string;
  lawyerId: string;
}

export function CaseStatus({ clientId, lawyerId }: CaseStatusProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    loadCases();
  }, [clientId]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_cases')
        .select('*')
        .eq('client_id', clientId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
      
      if (data && data.length > 0) {
        setSelectedCase(data[0]);
        loadActivities(data[0].id);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (caseId: string) => {
    try {
      setLoadingActivities(true);
      const { data, error } = await supabase
        .from('crm_case_activities')
        .select('*')
        .eq('case_id', caseId)
        .order('activity_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'pending': return 'Pendiente';
      case 'closed': return 'Cerrado';
      case 'on_hold': return 'En espera';
      default: return status;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hearing': return '⚖️';
      case 'filing': return '📄';
      case 'meeting': return '👥';
      case 'call': return '📞';
      case 'email': return '📧';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No hay casos registrados</h3>
          <p className="text-muted-foreground">
            Aún no tienes casos registrados con tu abogado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cases List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Mis Casos</CardTitle>
          <CardDescription>{cases.length} caso(s) registrado(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {cases.map(caso => (
                <button
                  key={caso.id}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedCase?.id === caso.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedCase(caso);
                    loadActivities(caso.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{caso.title}</p>
                      {caso.case_number && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          {caso.case_number}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={getStatusColor(caso.status)}>
                      {getStatusLabel(caso.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(caso.created_at), "d MMM yyyy", { locale: es })}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Case Details */}
      <Card className="lg:col-span-2">
        {selectedCase ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedCase.title}</CardTitle>
                  <CardDescription>
                    {selectedCase.case_type} 
                    {selectedCase.case_number && ` • ${selectedCase.case_number}`}
                  </CardDescription>
                </div>
                <Badge variant="outline" className={getStatusColor(selectedCase.status)}>
                  {getStatusLabel(selectedCase.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              {selectedCase.description && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="font-medium text-sm mb-4">Actividad Reciente</h4>
                {loadingActivities ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay actividades registradas
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div 
                        key={activity.id}
                        className={`relative pl-6 pb-4 ${
                          index !== activities.length - 1 ? 'border-l-2 border-muted ml-2' : 'ml-2'
                        }`}
                      >
                        <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-xs">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(activity.activity_date), "d MMM", { locale: es })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground">Selecciona un caso para ver detalles</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
