import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  RotateCcw,
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
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Pie
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';

interface RealStats {
  totalRequests: number;
  managedRequests: number;
  returnedRequests: number;
  activeAgents: number;
  completionRate: number;
  avgProcessingTime: number;
  requestsThisMonth: number;
  processingImprovement: number;
  slaComplianceRate: number;
  overdueDocs: number;
  atRiskDocs: number;
  avgSlaTime: number;
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

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

interface LawyerStatsSectionProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function LawyerStatsSection({ user: userProp, currentView, onViewChange, onLogout }: LawyerStatsSectionProps) {
  const [activeChart, setActiveChart] = useState<'managed' | 'returned' | 'completed'>('managed');
  const [stats, setStats] = useState<RealStats>({
    totalRequests: 0,
    managedRequests: 0,
    returnedRequests: 0,
    activeAgents: 0,
    completionRate: 0,
    avgProcessingTime: 0,
    requestsThisMonth: 0,
    processingImprovement: 0,
    slaComplianceRate: 0,
    overdueDocs: 0,
    atRiskDocs: 0,
    avgSlaTime: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useLawyerAuth();

  useEffect(() => {
    if (user) {
      fetchRealStats();
    }
  }, [user]);

  const fetchRealStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch document stats
      const { data: documents, error: docError } = await supabase
        .from('document_tokens')
        .select('status, document_type, created_at, updated_at');

      if (docError) {
        console.error('Error fetching documents:', docError);
        return;
      }

      // Fetch active agents
      const { data: agents, error: agentError } = await supabase
        .from('legal_agents')
        .select('status')
        .eq('status', 'active');

      if (agentError) {
        console.error('Error fetching agents:', agentError);
      }

      // Process document stats
      const totalRequests = documents?.length || 0;
      const managedRequests = documents?.filter(doc => 
        doc.status === 'revisado' || doc.status === 'pagado' || doc.status === 'descargado'
      ).length || 0;
      const returnedRequests = documents?.filter(doc => 
        doc.status === 'revision_usuario'
      ).length || 0;
      const activeAgents = agents?.length || 0;

      // Calculate completion rate
      const completionRate = totalRequests > 0 ? Math.round((managedRequests / totalRequests) * 100) : 0;

      // Calculate monthly data for last 6 months
      const monthlyStats = calculateMonthlyStats(documents || []);
      
      // Calculate document types distribution
      const typeDistribution = calculateDocumentTypes(documents || []);

      // Get current month requests
      const currentMonth = new Date().getMonth();
      const requestsThisMonth = documents?.filter(doc => {
        const docMonth = new Date(doc.created_at).getMonth();
        return docMonth === currentMonth;
      }).length || 0;

      // Calculate average processing time (simplified)
      const avgProcessingTime = calculateAvgProcessingTime(documents || []);

      // Fetch SLA stats
      const slaStats = await fetchSLAStats();

      setStats({
        totalRequests,
        managedRequests,
        returnedRequests,
        activeAgents,
        completionRate,
        avgProcessingTime,
        requestsThisMonth,
        processingImprovement: 12.5, // This would need historical data to calculate properly
        slaComplianceRate: slaStats.completion_rate || 0,
        overdueDocs: slaStats.overdue_documents || 0,
        atRiskDocs: slaStats.at_risk_documents || 0,
        avgSlaTime: slaStats.average_completion_time || 0
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
      .slice(0, 5); // Top 5 types
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

    return Math.round((totalTime / processedDocs.length) * 10) / 10; // Round to 1 decimal
  };

  const fetchSLAStats = async () => {
    try {
      // Get the lawyer token from storage
      const authData = sessionStorage.getItem('lawyer_token');
      if (!authData) {
        console.error('No lawyer token found');
        return { completion_rate: 0, overdue_documents: 0, at_risk_documents: 0, average_completion_time: 0 };
      }

      const { data, error } = await supabase.functions.invoke('get-sla-stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData}`
        }
      });

      if (error) {
        console.error('Error fetching SLA stats:', error);
        return { completion_rate: 0, overdue_documents: 0, at_risk_documents: 0, average_completion_time: 0 };
      }

      return data || { completion_rate: 0, overdue_documents: 0, at_risk_documents: 0, average_completion_time: 0 };
    } catch (error) {
      console.error('Error:', error);
      return { completion_rate: 0, overdue_documents: 0, at_risk_documents: 0, average_completion_time: 0 };
    }
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

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = "blue" 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden hover-scale">
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
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {trend && trendValue && (
            <Badge variant={trend === 'up' ? 'default' : 'destructive'} className="text-xs">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {trendValue}
            </Badge>
          )}
        </div>
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

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-emerald-500/5">
      <main className="flex-1 min-w-0">
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-emerald-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <BarChart3 className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent truncate">
                    Métricas y Estadísticas
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Analiza el rendimiento de tus servicios
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Performance de Gestión Legal</h2>
                  <p className="text-sm text-muted-foreground">
                    Seguimiento de solicitudes y agentes de IA
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
          trend="up"
          trendValue="+15%"
          color="green"
        />
        <StatCard
          title="Solicitudes Devueltas"
          value={stats.returnedRequests}
          description="Requieren revisión"
          icon={RefreshCw}
          trend="down"
          trendValue="-8%"
          color="orange"
        />
        <StatCard
          title="Total Solicitudes"
          value={stats.totalRequests}
          description="Total recibidas"
          icon={FileText}
          trend="up"
          trendValue="+12%"
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
        <Card className="hover-scale">
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

        <Card className="hover-scale">
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

        <Card className="hover-scale">
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

      {/* SLA Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Cumplimiento ANS"
          value={`${stats.slaComplianceRate}%`}
          description="Documentos a tiempo"
          icon={CheckCircle}
          trend={stats.slaComplianceRate >= 90 ? 'up' : 'down'}
          trendValue={stats.slaComplianceRate >= 90 ? 'Excelente' : 'Mejorar'}
          color="green"
        />
        <StatCard
          title="Documentos Vencidos"
          value={stats.overdueDocs}
          description="ANS excedido"
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="En Riesgo"
          value={stats.atRiskDocs}
          description="Próximos a vencer"
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Tiempo Promedio ANS"
          value={`${stats.avgSlaTime}h`}
          description="Tiempo de entrega"
          icon={TrendingUp}
          color="blue"
        />
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
          <CardTitle className="text-base">Resumen de Performance</CardTitle>
          <CardDescription>
            Análisis del rendimiento en la gestión de documentos legales
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
            </div>
          </div>
    </div>
  );
}