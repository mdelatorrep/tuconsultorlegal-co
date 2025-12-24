import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Scale, 
  Calendar, 
  Brain, 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Clock,
  User,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CaseQuickActions from './CaseQuickActions';
import CaseProcessesTab from './CaseProcessesTab';
import CaseCalendarTab from './CaseCalendarTab';
import CaseAIToolsTab from './CaseAIToolsTab';

interface CaseDetailPageProps {
  caseId: string;
  lawyerId: string;
  onBack: () => void;
  onNavigateToTool?: (tool: string, caseId: string, caseTitle: string) => void;
}

interface CaseData {
  id: string;
  title: string;
  description?: string;
  case_type: string;
  status: string;
  priority: string;
  case_number?: string;
  start_date?: string;
  end_date?: string;
  billing_rate?: number;
  estimated_hours?: number;
  actual_hours: number;
  created_at: string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface CaseStats {
  aiToolsCount: number;
  documentsCount: number;
  tasksCount: number;
  pendingTasksCount: number;
  processesCount: number;
  upcomingEvents: number;
}

const CaseDetailPage: React.FC<CaseDetailPageProps> = ({ 
  caseId, 
  lawyerId, 
  onBack,
  onNavigateToTool 
}) => {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [stats, setStats] = useState<CaseStats>({
    aiToolsCount: 0,
    documentsCount: 0,
    tasksCount: 0,
    pendingTasksCount: 0,
    processesCount: 0,
    upcomingEvents: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (caseId) {
      loadCaseData();
      loadStats();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_cases')
        .select(`
          *,
          client:crm_clients(id, name, email, phone)
        `)
        .eq('id', caseId)
        .single();

      if (error) throw error;
      setCaseData(data);
    } catch (error) {
      console.error('Error loading case:', error);
      toast.error('Error al cargar el caso');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load AI tools count
      const { count: aiToolsCount } = await supabase
        .from('legal_tools_results')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      // Load documents count
      const { count: documentsCount } = await supabase
        .from('crm_documents')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      // Load tasks count
      const { data: tasksData } = await supabase
        .from('crm_tasks')
        .select('status')
        .eq('case_id', caseId);

      const tasksCount = tasksData?.length || 0;
      const pendingTasksCount = tasksData?.filter(t => t.status === 'pending').length || 0;

      // Load processes count
      const { count: processesCount } = await supabase
        .from('monitored_processes')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      // Load upcoming events
      const { count: upcomingEvents } = await supabase
        .from('legal_calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId)
        .gte('start_date', new Date().toISOString())
        .eq('is_completed', false);

      setStats({
        aiToolsCount: aiToolsCount || 0,
        documentsCount: documentsCount || 0,
        tasksCount,
        pendingTasksCount,
        processesCount: processesCount || 0,
        upcomingEvents: upcomingEvents || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'closed': return 'bg-muted text-muted-foreground';
      case 'on_hold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontró el caso</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{caseData.title}</h1>
              <Badge variant="outline" className={getStatusColor(caseData.status)}>
                {caseData.status === 'active' ? 'Activo' : caseData.status === 'closed' ? 'Cerrado' : 'En Espera'}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(caseData.priority)}>
                {caseData.priority === 'high' ? 'Alta' : caseData.priority === 'medium' ? 'Media' : 'Baja'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {caseData.case_number && (
                <span className="font-mono">{caseData.case_number}</span>
              )}
              <span>•</span>
              <span>{caseData.case_type}</span>
              {caseData.client && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {caseData.client.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <CaseQuickActions 
        caseId={caseId}
        caseTitle={caseData.title}
        lawyerId={lawyerId}
        onNavigateToTool={onNavigateToTool}
        onRefresh={loadStats}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.aiToolsCount}</p>
                <p className="text-xs text-muted-foreground">Herramientas IA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.processesCount}</p>
                <p className="text-xs text-muted-foreground">Procesos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.upcomingEvents}</p>
                <p className="text-xs text-muted-foreground">Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.documentsCount}</p>
                <p className="text-xs text-muted-foreground">Documentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-rose-600" />
              <div>
                <p className="text-2xl font-bold text-rose-600">{stats.pendingTasksCount}/{stats.tasksCount}</p>
                <p className="text-xs text-muted-foreground">Tareas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold text-indigo-600">{caseData.actual_hours}h</p>
                <p className="text-xs text-muted-foreground">Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Procesos</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="ai-tools" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Case Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {caseData.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                    <p className="text-sm mt-1">{caseData.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Inicio</p>
                    <p className="text-sm mt-1">
                      {caseData.start_date 
                        ? format(new Date(caseData.start_date), 'dd/MM/yyyy', { locale: es })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Fin</p>
                    <p className="text-sm mt-1">
                      {caseData.end_date 
                        ? format(new Date(caseData.end_date), 'dd/MM/yyyy', { locale: es })
                        : '-'
                      }
                    </p>
                  </div>
                  {caseData.billing_rate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tarifa/Hora</p>
                      <p className="text-sm mt-1">${caseData.billing_rate.toLocaleString()} COP</p>
                    </div>
                  )}
                  {caseData.estimated_hours && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Horas Estimadas</p>
                      <p className="text-sm mt-1">{caseData.estimated_hours}h</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            {caseData.client && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{caseData.client.name}</p>
                      <p className="text-sm text-muted-foreground">{caseData.client.email}</p>
                    </div>
                  </div>
                  {caseData.client.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                      <p className="text-sm mt-1">{caseData.client.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Alerts */}
          {(stats.pendingTasksCount > 0 || stats.upcomingEvents > 0) && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {stats.pendingTasksCount > 0 && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {stats.pendingTasksCount} tareas pendientes
                    </Badge>
                  )}
                  {stats.upcomingEvents > 0 && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {stats.upcomingEvents} eventos próximos
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processes">
          <CaseProcessesTab 
            caseId={caseId} 
            lawyerId={lawyerId}
            onRefresh={loadStats}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CaseCalendarTab 
            caseId={caseId}
            lawyerId={lawyerId}
            caseTitle={caseData.title}
          />
        </TabsContent>

        <TabsContent value="ai-tools">
          <CaseAIToolsTab 
            caseId={caseId}
            caseTitle={caseData.title}
            lawyerId={lawyerId}
            onNavigateToTool={onNavigateToTool}
          />
        </TabsContent>

        <TabsContent value="documents">
          <CaseDocumentsTab 
            caseId={caseId}
            lawyerId={lawyerId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Simple Documents Tab Component
const CaseDocumentsTab: React.FC<{ caseId: string; lawyerId: string }> = ({ caseId, lawyerId }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No hay documentos vinculados a este caso</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos del Caso</CardTitle>
        <CardDescription>{documents.length} documentos vinculados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                </div>
              </div>
              <Badge variant="outline">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CaseDetailPage;
