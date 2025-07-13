import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  Bot,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Users,
  Globe,
  Timer,
  AlertTriangle,
  Shield,
  Target
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  PieChart as RechartsPieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Pie,
  BarChart,
  Bar
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RealStats {
  totalRequests: number;
  managedRequests: number;
  returnedRequests: number;
  activeAgents: number;
  completionRate: number;
  avgProcessingTime: number;
  requestsThisMonth: number;
}

interface SLAStats {
  total_documents: number;
  on_time_completion: number;
  late_completion: number;
  overdue_documents: number;
  at_risk_documents: number;
  on_time_documents: number;
  completion_rate: number;
  average_completion_time: number;
  status_distribution: {
    on_time: number;
    at_risk: number;
    overdue: number;
    completed_on_time: number;
    completed_late: number;
  };
}

interface LawyerSLAStats extends SLAStats {
  lawyer_id: string;
  lawyer_name: string;
  lawyer_email: string;
  agents_count: number;
}

interface MonthlyData {
  month: string;
  gestionadas: number;
  devueltas: number;
  completadas: number;
}

interface DocumentTypeData {
  name: string;
  value: number;
  color: string;
}

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
}

interface LawyerStatsAdminProps {
  authHeaders: Record<string, string>;
  viewMode?: 'global' | 'lawyer';
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function LawyerStatsAdmin({ authHeaders, viewMode = 'global' }: LawyerStatsAdminProps) {
  const [activeChart, setActiveChart] = useState<'managed' | 'returned' | 'completed'>('managed');
  const [selectedLawyer, setSelectedLawyer] = useState<string>('all');
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [stats, setStats] = useState<RealStats>({
    totalRequests: 0,
    managedRequests: 0,
    returnedRequests: 0,
    activeAgents: 0,
    completionRate: 0,
    avgProcessingTime: 0,
    requestsThisMonth: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeData[]>([]);
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [lawyerSlaStats, setLawyerSlaStats] = useState<LawyerSLAStats[]>([]);
  const [selectedSlaView, setSelectedSlaView] = useState<'global' | 'by_lawyer'>('global');
  const [selectedLawyerForSla, setSelectedLawyerForSla] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLawyers();
    fetchSLAStats();
  }, []);

  useEffect(() => {
    fetchRealStats();
  }, [selectedLawyer]);

  const fetchLawyers = async () => {
    try {
      const { data: lawyersData, error } = await supabase.functions.invoke('get-lawyers-admin', {
        headers: authHeaders
      });

      if (error) {
        console.error('Error fetching lawyers:', error);
        return;
      }

      setLawyers(lawyersData || []);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
    }
  };

  const fetchSLAStats = async () => {
    try {
      const { data: slaData, error: slaError } = await supabase.functions.invoke('get-sla-stats-by-lawyer', {
        headers: authHeaders
      });

      if (slaError) {
        console.error('Error fetching SLA stats:', slaError);
        return;
      }

      if (slaData?.global_stats) {
        setSlaStats(slaData.global_stats);
      }
      
      if (slaData?.lawyer_stats) {
        setLawyerSlaStats(slaData.lawyer_stats);
      }

    } catch (error) {
      console.error('Error fetching SLA stats:', error);
    }
  };

  const fetchRealStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch documents
      const { data: documents, error: docError } = await supabase
        .from('document_tokens')
        .select('status, document_type, created_at, updated_at');

      if (docError) {
        console.error('Error fetching documents:', docError);
        return;
      }

      // Fetch active agents
      let activeAgentsCount = 0;
      
      if (selectedLawyer !== 'all') {
        // Filter agents by specific lawyer if selected
        const { data: agentsData } = await supabase
          .from('legal_agents')
          .select('id, name')
          .eq('status', 'active')
          .eq('created_by', selectedLawyer);
        
        activeAgentsCount = agentsData?.length || 0;
      } else {
        const { data: agents } = await supabase
          .from('legal_agents')
          .select('status')
          .eq('status', 'active');
        
        activeAgentsCount = agents?.length || 0;
      }

      // Process document stats
      const totalRequests = documents?.length || 0;
      const managedRequests = documents?.filter(doc => 
        doc.status === 'revisado' || doc.status === 'pagado' || doc.status === 'descargado'
      ).length || 0;
      const returnedRequests = documents?.filter(doc => 
        doc.status === 'revision_usuario'
      ).length || 0;

      // Calculate completion rate
      const completionRate = totalRequests > 0 ? Math.round((managedRequests / totalRequests) * 100) : 0;

      // Calculate monthly data
      const monthlyStats = calculateMonthlyStats(documents || []);
      
      // Calculate document types distribution
      const typeDistribution = calculateDocumentTypes(documents || []);

      // Get current month requests
      const currentMonth = new Date().getMonth();
      const requestsThisMonth = documents?.filter(doc => {
        const docMonth = new Date(doc.created_at).getMonth();
        return docMonth === currentMonth;
      }).length || 0;

      // Calculate average processing time
      const avgProcessingTime = calculateAvgProcessingTime(documents || []);

      setStats({
        totalRequests,
        managedRequests,
        returnedRequests,
        activeAgents: activeAgentsCount,
        completionRate,
        avgProcessingTime,
        requestsThisMonth
      });

      setMonthlyData(monthlyStats);
      setDocumentTypes(typeDistribution);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyStats = (documents: any[]): MonthlyData[] => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      
      const monthDocs = documents.filter(doc => {
        const docMonth = new Date(doc.created_at).getMonth();
        return docMonth === monthIndex;
      });

      const gestionadas = monthDocs.filter(doc => 
        doc.status === 'revisado' || doc.status === 'pagado' || doc.status === 'descargado'
      ).length;

      const devueltas = monthDocs.filter(doc => 
        doc.status === 'revision_usuario'
      ).length;

      const completadas = monthDocs.filter(doc => 
        doc.status === 'pagado' || doc.status === 'descargado'
      ).length;

      last6Months.push({
        month: monthName,
        gestionadas,
        devueltas,
        completadas
      });
    }

    return last6Months;
  };

  const calculateDocumentTypes = (documents: any[]): DocumentTypeData[] => {
    const typeCounts: Record<string, number> = {};
    
    documents.forEach(doc => {
      const type = doc.document_type || 'Otros';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = documents.length;
    if (total === 0) {
      return [
        { name: 'Sin datos', value: 100, color: '#8b5cf6' }
      ];
    }

    return Object.entries(typeCounts)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const calculateAvgProcessingTime = (documents: any[]): number => {
    const processedDocs = documents.filter(doc => 
      doc.status === 'revisado' && doc.updated_at && doc.created_at
    );

    if (processedDocs.length === 0) return 0;

    const totalTime = processedDocs.reduce((sum, doc) => {
      const created = new Date(doc.created_at);
      const updated = new Date(doc.updated_at);
      const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return Math.round((totalTime / processedDocs.length) * 10) / 10;
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    color = "blue" 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 rounded-full bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`h-4 w-4 text-${color}-600`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  const ChartTabs = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={activeChart === 'managed' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('managed')}
        className="flex items-center gap-2 text-xs"
      >
        <CheckCircle className="h-3 w-3" />
        <span className="hidden sm:inline">Gestionadas</span>
      </Button>
      <Button
        variant={activeChart === 'returned' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('returned')}
        className="flex items-center gap-2 text-xs"
      >
        <RefreshCw className="h-3 w-3" />
        <span className="hidden sm:inline">Devueltas</span>
      </Button>
      <Button
        variant={activeChart === 'completed' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('completed')}
        className="flex items-center gap-2 text-xs"
      >
        <FileText className="h-3 w-3" />
        <span className="hidden sm:inline">Completadas</span>
      </Button>
    </div>
  );

  const renderChart = () => {
    const data = monthlyData.map(item => ({
      ...item,
      value: activeChart === 'managed' ? item.gestionadas : 
             activeChart === 'returned' ? item.devueltas : 
             item.completadas
    }));

    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Estadísticas de Performance Legal
          </h2>
          <p className="text-sm text-muted-foreground">
            Seguimiento global de solicitudes y agentes de IA
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-center">
          <Calendar className="h-3 w-3 mr-1" />
          Últimos 6 meses
        </Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Solicitudes Gestionadas"
          value={stats.managedRequests}
          description="Total procesadas"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Solicitudes Devueltas"
          value={stats.returnedRequests}
          description="Requieren revisión"
          icon={RefreshCw}
          color="orange"
        />
        <StatCard
          title="Total Solicitudes"
          value={stats.totalRequests}
          description="Total recibidas"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Agentes IA"
          value={stats.activeAgents}
          description="Agentes habilitados"
          icon={Bot}
          color="purple"
        />
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.avgProcessingTime}h</p>
                <p className="text-xs text-muted-foreground">Tiempo procesamiento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{stats.requestsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Request Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tendencias de Gestión</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartTabs />
            {renderChart()}
          </CardContent>
        </Card>

        {/* Document Types Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tipos de Documentos</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={documentTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {documentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {documentTypes.map((type, index) => (
                <div key={type.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{type.name}</span>
                  </div>
                  <span className="font-medium">{type.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de Performance Global</CardTitle>
          <CardDescription>
            Análisis del rendimiento general en la gestión de documentos legales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-600">
                {stats.totalRequests > 0 ? ((stats.managedRequests / stats.totalRequests) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-green-600">Éxito de gestión</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <RefreshCw className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-orange-600">
                {stats.totalRequests > 0 ? ((stats.returnedRequests / stats.totalRequests) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-orange-600">Tasa de devolución</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-purple-600">{stats.activeAgents}</p>
              <p className="text-xs text-purple-600">Agentes activos</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-blue-600">{stats.avgProcessingTime}h</p>
              <p className="text-xs text-blue-600">Tiempo promedio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Statistics Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Estadísticas de Acuerdo de Nivel de Servicio (ANS)
              </CardTitle>
              <CardDescription>
                Seguimiento del cumplimiento de tiempos de entrega comprometidos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedSlaView === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSlaView('global')}
                className="flex items-center gap-2"
              >
                <Globe className="h-3 w-3" />
                Global
              </Button>
              <Button
                variant={selectedSlaView === 'by_lawyer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSlaView('by_lawyer')}
                className="flex items-center gap-2"
              >
                <Users className="h-3 w-3" />
                Por Abogado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSlaView === 'global' && slaStats && (
            <div className="space-y-6">
              {/* Global SLA Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-xl font-bold text-blue-600">{slaStats.total_documents}</p>
                        <p className="text-xs text-blue-600">Total con ANS</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-xl font-bold text-green-600">{slaStats.on_time_completion}</p>
                        <p className="text-xs text-green-600">A tiempo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="text-xl font-bold text-red-600">{slaStats.overdue_documents}</p>
                        <p className="text-xs text-red-600">Vencidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Timer className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-xl font-bold text-orange-600">{slaStats.at_risk_documents}</p>
                        <p className="text-xs text-orange-600">En riesgo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-xl font-bold text-purple-600">{slaStats.completion_rate}%</p>
                        <p className="text-xs text-purple-600">Tasa cumplimiento</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SLA Status Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Estado de Documentos ANS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'A tiempo', value: slaStats.on_time_documents, fill: '#10b981' },
                            { name: 'En riesgo', value: slaStats.at_risk_documents, fill: '#f59e0b' },
                            { name: 'Vencidos', value: slaStats.overdue_documents, fill: '#ef4444' },
                            { name: 'Completados a tiempo', value: slaStats.on_time_completion, fill: '#3b82f6' },
                            { name: 'Completados tarde', value: slaStats.late_completion, fill: '#8b5cf6' }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {[
                            { name: 'A tiempo', value: slaStats.on_time_documents, fill: '#10b981' },
                            { name: 'En riesgo', value: slaStats.at_risk_documents, fill: '#f59e0b' },
                            { name: 'Vencidos', value: slaStats.overdue_documents, fill: '#ef4444' },
                            { name: 'Completados a tiempo', value: slaStats.on_time_completion, fill: '#3b82f6' },
                            { name: 'Completados tarde', value: slaStats.late_completion, fill: '#8b5cf6' }
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tiempo Promedio de Cumplimiento</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-[200px]">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {slaStats.average_completion_time}h
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tiempo promedio de completación
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {selectedSlaView === 'by_lawyer' && (
            <div className="space-y-4">
              {/* Lawyer Selection */}
              <div className="flex gap-4 items-center">
                <Select value={selectedLawyerForSla} onValueChange={setSelectedLawyerForSla}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Seleccionar abogado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los abogados</SelectItem>
                    {lawyerSlaStats.map((lawyer) => (
                      <SelectItem key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                        {lawyer.lawyer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="ml-auto">
                  {selectedLawyerForSla === 'all' 
                    ? `${lawyerSlaStats.length} abogados` 
                    : '1 abogado seleccionado'
                  }
                </Badge>
              </div>

              {/* Lawyer Stats Table/Cards */}
              {selectedLawyerForSla === 'all' ? (
                <div className="space-y-3">
                  {lawyerSlaStats.map((lawyer) => (
                    <Card key={lawyer.lawyer_id} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-semibold">{lawyer.lawyer_name}</h4>
                          <p className="text-sm text-muted-foreground">{lawyer.lawyer_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {lawyer.agents_count} agentes • {lawyer.total_documents} documentos con ANS
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                            <p className="text-sm font-bold text-green-600">{lawyer.completion_rate}%</p>
                            <p className="text-xs text-green-600">Cumplimiento</p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                            <p className="text-sm font-bold text-blue-600">{lawyer.on_time_completion}</p>
                            <p className="text-xs text-blue-600">A tiempo</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded">
                            <p className="text-sm font-bold text-red-600">{lawyer.overdue_documents}</p>
                            <p className="text-xs text-red-600">Vencidos</p>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
                            <p className="text-sm font-bold text-orange-600">{lawyer.average_completion_time}h</p>
                            <p className="text-xs text-orange-600">Promedio</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                // Single lawyer detailed view
                (() => {
                  const selectedLawyerData = lawyerSlaStats.find(l => l.lawyer_id === selectedLawyerForSla);
                  if (!selectedLawyerData) return <p className="text-muted-foreground">Abogado no encontrado</p>;
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard
                          title="Documentos con ANS"
                          value={selectedLawyerData.total_documents}
                          description="Total gestionados"
                          icon={Target}
                          color="blue"
                        />
                        <StatCard
                          title="Tasa de Cumplimiento"
                          value={`${selectedLawyerData.completion_rate}%`}
                          description="ANS cumplidos"
                          icon={CheckCircle}
                          color="green"
                        />
                        <StatCard
                          title="Documentos Vencidos"
                          value={selectedLawyerData.overdue_documents}
                          description="Fuera de tiempo"
                          icon={AlertTriangle}
                          color="red"
                        />
                        <StatCard
                          title="Tiempo Promedio"
                          value={`${selectedLawyerData.average_completion_time}h`}
                          description="Completación"
                          icon={Timer}
                          color="purple"
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}