import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, Users, FileText, Calendar, Clock, Mail, DollarSign, Target, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AnalyticsData {
  clientsOverTime: any[];
  casesOverTime: any[];
  communicationsOverTime: any[];
  clientTypes: any[];
  caseStatuses: any[];
  revenueData: any[];
  taskCompletion: any[];
}

interface CRMAnalyticsViewProps {
  lawyerData: any;
  searchTerm: string;
  onRefresh: () => void;
}

const CRMAnalyticsView: React.FC<CRMAnalyticsViewProps> = ({ lawyerData, searchTerm, onRefresh }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    clientsOverTime: [],
    casesOverTime: [],
    communicationsOverTime: [],
    clientTypes: [],
    caseStatuses: [],
    revenueData: [],
    taskCompletion: []
  });
  const [stats, setStats] = useState({
    totalClients: 0,
    activeCases: 0,
    totalRevenue: 0,
    avgCaseValue: 0,
    clientGrowth: 0,
    caseCompletion: 0,
    responseTime: 0,
    satisfactionScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (lawyerData?.id) {
      fetchAnalytics();
      fetchStats();
    }
  }, [lawyerData?.id]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch data for different time periods
      const [
        clientsRes,
        casesRes,
        communicationsRes,
        revenueRes
      ] = await Promise.all([
        supabase
          .from('crm_clients')
          .select('created_at')
          .eq('lawyer_id', lawyerData.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('crm_cases')
          .select('created_at, status, billing_rate, estimated_hours')
          .eq('lawyer_id', lawyerData.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('crm_communications')
          .select('created_at, type')
          .eq('lawyer_id', lawyerData.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('crm_cases')
          .select('billing_rate, estimated_hours, actual_hours, created_at')
          .eq('lawyer_id', lawyerData.id)
          .not('billing_rate', 'is', null)
      ]);

      // Process clients over time
      const clientsByDay = processDataByDay(clientsRes.data || [], 'created_at');
      
      // Process cases over time
      const casesByDay = processDataByDay(casesRes.data || [], 'created_at');
      
      // Process communications over time
      const commsByDay = processDataByDay(communicationsRes.data || [], 'created_at');
      
      // Process client types
      const clientTypesData = await processClientTypes();
      
      // Process case statuses
      const caseStatusesData = processCaseStatuses(casesRes.data || []);
      
      // Process revenue data
      const revenueByMonth = processRevenueData(revenueRes.data || []);
      
      // Process task completion (mock data for now)
      const taskCompletionData = [
        { month: 'Ene', completed: 85, pending: 15 },
        { month: 'Feb', completed: 78, pending: 22 },
        { month: 'Mar', completed: 92, pending: 8 },
        { month: 'Abr', completed: 88, pending: 12 },
      ];

      setAnalytics({
        clientsOverTime: clientsByDay,
        casesOverTime: casesByDay,
        communicationsOverTime: commsByDay,
        clientTypes: clientTypesData,
        caseStatuses: caseStatusesData,
        revenueData: revenueByMonth,
        taskCompletion: taskCompletionData
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las analíticas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [
        clientsCount,
        activeCasesCount,
        revenueData,
        satisfactionData
      ] = await Promise.all([
        supabase
          .from('crm_clients')
          .select('id', { count: 'exact' })
          .eq('lawyer_id', lawyerData.id),
        
        supabase
          .from('crm_cases')
          .select('id', { count: 'exact' })
          .eq('lawyer_id', lawyerData.id)
          .eq('status', 'active'),
        
        supabase
          .from('crm_cases')
          .select('billing_rate, estimated_hours, actual_hours')
          .eq('lawyer_id', lawyerData.id)
          .not('billing_rate', 'is', null),
        
        // Mock satisfaction data
        Promise.resolve({ data: [{ score: 4.7 }] })
      ]);

      const totalRevenue = revenueData.data?.reduce((sum, case_) => {
        return sum + ((case_.billing_rate || 0) * (case_.actual_hours || 0));
      }, 0) || 0;

      const avgCaseValue = revenueData.data?.length ? 
        totalRevenue / revenueData.data.length : 0;

      setStats({
        totalClients: clientsCount.count || 0,
        activeCases: activeCasesCount.count || 0,
        totalRevenue,
        avgCaseValue,
        clientGrowth: 12.5, // Mock data
        caseCompletion: 89.2, // Mock data
        responseTime: 2.4, // Mock data (hours)
        satisfactionScore: 4.7 // Mock data
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const processDataByDay = (data: any[], dateField: string) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(day => {
      const count = data.filter(item => 
        new Date(item[dateField]).toISOString().split('T')[0] === day
      ).length;
      
      return {
        date: new Date(day).toLocaleDateString('es-ES', { 
          month: 'short', 
          day: 'numeric' 
        }),
        count
      };
    });
  };

  const processClientTypes = async () => {
    try {
      const { data } = await supabase
        .from('crm_clients')
        .select('client_type')
        .eq('lawyer_id', lawyerData.id);

      const types = data?.reduce((acc: any, client) => {
        acc[client.client_type] = (acc[client.client_type] || 0) + 1;
        return acc;
      }, {}) || {};

      return [
        { name: 'Personas', value: types.individual || 0, color: '#8884d8' },
        { name: 'Empresas', value: types.company || 0, color: '#82ca9d' }
      ];
    } catch (error) {
      return [];
    }
  };

  const processCaseStatuses = (cases: any[]) => {
    const statuses = cases.reduce((acc: any, case_) => {
      acc[case_.status] = (acc[case_.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Activos', value: statuses.active || 0, color: '#8884d8' },
      { name: 'En Espera', value: statuses.on_hold || 0, color: '#ffc658' },
      { name: 'Cerrados', value: statuses.closed || 0, color: '#82ca9d' }
    ];
  };

  const processRevenueData = (cases: any[]) => {
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const revenue = cases
        .filter(case_ => case_.created_at.startsWith(monthKey))
        .reduce((sum, case_) => sum + ((case_.billing_rate || 0) * (case_.actual_hours || 0)), 0);
      
      return {
        month: date.toLocaleDateString('es-ES', { month: 'short' }),
        revenue: revenue / 1000000 // Convert to millions
      };
    }).reverse();

    return monthlyRevenue;
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Analíticas y Métricas</h2>
        <p className="text-sm text-muted-foreground">
          Visualiza el rendimiento de tu CRM y toma decisiones basadas en datos
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-green-600">+{stats.clientGrowth}% vs mes anterior</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Casos Activos</p>
                <p className="text-2xl font-bold">{stats.activeCases}</p>
                <p className="text-xs text-blue-600">{stats.caseCompletion}% completados</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Total</p>
                <p className="text-2xl font-bold">${(stats.totalRevenue/1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Promedio: ${stats.avgCaseValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Satisfacción</p>
                <p className="text-2xl font-bold">{stats.satisfactionScore}/5</p>
                <p className="text-xs text-muted-foreground">Tiempo resp: {stats.responseTime}h</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Nuevos Clientes (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.clientsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tipos de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.clientTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.clientTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {analytics.clientTypes.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Ingresos por Mes (M COP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Case Statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Estado de Casos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.caseStatuses}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.caseStatuses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {analytics.caseStatuses.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Productividad</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Casos completados</span>
                <span className="text-sm font-medium">{stats.caseCompletion}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats.caseCompletion}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Tiempo de Respuesta</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Promedio</span>
                <span className="text-sm font-medium">{stats.responseTime}h</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (24 - stats.responseTime) / 24 * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Satisfacción del Cliente</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Calificación</span>
                <span className="text-sm font-medium">{stats.satisfactionScore}/5</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${(stats.satisfactionScore / 5) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMAnalyticsView;