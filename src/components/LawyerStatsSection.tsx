import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Bot,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
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

// Mock data - Replace with real data from API
const mockStats = {
  totalDocuments: 127,
  totalClients: 89,
  totalRevenue: 45600,
  activeAgents: 5,
  completionRate: 94,
  avgResponseTime: 2.3,
  documentsThisMonth: 24,
  revenueGrowth: 12.5
};

const mockMonthlyData = [
  { month: 'Ene', documentos: 45, ingresos: 12000, clientes: 32 },
  { month: 'Feb', documentos: 52, ingresos: 14500, clientes: 38 },
  { month: 'Mar', documentos: 48, ingresos: 13200, clientes: 35 },
  { month: 'Abr', documentos: 61, ingresos: 16800, clientes: 42 },
  { month: 'May', documentos: 55, ingresos: 15300, clientes: 40 },
  { month: 'Jun', documentos: 67, ingresos: 18900, clientes: 47 }
];

const mockDocumentTypes = [
  { name: 'Contratos', value: 35, color: '#3b82f6' },
  { name: 'Demandas', value: 25, color: '#ef4444' },
  { name: 'Testamentos', value: 20, color: '#10b981' },
  { name: 'Poderes', value: 12, color: '#f59e0b' },
  { name: 'Otros', value: 8, color: '#8b5cf6' }
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function LawyerStatsSection() {
  const [activeChart, setActiveChart] = useState<'documents' | 'revenue' | 'clients'>('documents');

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
        variant={activeChart === 'documents' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('documents')}
        className="flex items-center gap-2 text-xs"
      >
        <FileText className="h-3 w-3" />
        <span className="hidden sm:inline">Documentos</span>
      </Button>
      <Button
        variant={activeChart === 'revenue' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('revenue')}
        className="flex items-center gap-2 text-xs"
      >
        <DollarSign className="h-3 w-3" />
        <span className="hidden sm:inline">Ingresos</span>
      </Button>
      <Button
        variant={activeChart === 'clients' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setActiveChart('clients')}
        className="flex items-center gap-2 text-xs"
      >
        <Users className="h-3 w-3" />
        <span className="hidden sm:inline">Clientes</span>
      </Button>
    </div>
  );

  const renderChart = () => {
    const data = mockMonthlyData.map(item => ({
      ...item,
      value: activeChart === 'documents' ? item.documentos : 
             activeChart === 'revenue' ? item.ingresos : 
             item.clientes
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">
            Resumen de tu actividad y rendimiento
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
          title="Documentos"
          value={mockStats.totalDocuments}
          description="Total generados"
          icon={FileText}
          trend="up"
          trendValue="+15%"
          color="blue"
        />
        <StatCard
          title="Clientes"
          value={mockStats.totalClients}
          description="Clientes activos"
          icon={Users}
          trend="up"
          trendValue="+8%"
          color="green"
        />
        <StatCard
          title="Ingresos"
          value={`$${(mockStats.totalRevenue / 1000).toFixed(0)}k`}
          description="Total generados"
          icon={DollarSign}
          trend="up"
          trendValue="+12%"
          color="emerald"
        />
        <StatCard
          title="Agentes IA"
          value={mockStats.activeAgents}
          description="Agentes activos"
          icon={Bot}
          color="purple"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{mockStats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de completación</p>
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
                <p className="text-sm font-medium">{mockStats.avgResponseTime}h</p>
                <p className="text-xs text-muted-foreground">Tiempo promedio</p>
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
                <p className="text-sm font-medium">{mockStats.documentsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tendencias</CardTitle>
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
                  data={mockDocumentTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockDocumentTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {mockDocumentTypes.map((type, index) => (
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones más utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="flex flex-col h-16 gap-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Nuevo Doc</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col h-16 gap-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Clientes</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col h-16 gap-1">
              <Bot className="h-4 w-4" />
              <span className="text-xs">Crear Agente</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col h-16 gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Reportes</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}