import { useState } from 'react';
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

// Mock data - Replace with real data from API
const mockStats = {
  totalRequests: 127,
  managedRequests: 89,
  returnedRequests: 24,
  activeAgents: 5,
  completionRate: 94,
  avgProcessingTime: 2.3,
  requestsThisMonth: 24,
  processingImprovement: 12.5
};

const mockMonthlyData = [
  { month: 'Ene', gestionadas: 45, devueltas: 8, completadas: 37 },
  { month: 'Feb', gestionadas: 52, devueltas: 12, completadas: 40 },
  { month: 'Mar', gestionadas: 48, devueltas: 10, completadas: 38 },
  { month: 'Abr', gestionadas: 61, devueltas: 15, completadas: 46 },
  { month: 'May', gestionadas: 55, devueltas: 11, completadas: 44 },
  { month: 'Jun', gestionadas: 67, devueltas: 14, completadas: 53 }
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
  const [activeChart, setActiveChart] = useState<'managed' | 'returned' | 'completed'>('managed');

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
    const data = mockMonthlyData.map(item => ({
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
          value={mockStats.managedRequests}
          description="Total procesadas"
          icon={CheckCircle}
          trend="up"
          trendValue="+15%"
          color="green"
        />
        <StatCard
          title="Solicitudes Devueltas"
          value={mockStats.returnedRequests}
          description="Requieren revisión"
          icon={RefreshCw}
          trend="down"
          trendValue="-8%"
          color="orange"
        />
        <StatCard
          title="Total Solicitudes"
          value={mockStats.totalRequests}
          description="Total recibidas"
          icon={FileText}
          trend="up"
          trendValue="+12%"
          color="blue"
        />
        <StatCard
          title="Agentes IA"
          value={mockStats.activeAgents}
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
                <p className="text-sm font-medium">{mockStats.completionRate}%</p>
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
                <p className="text-sm font-medium">{mockStats.avgProcessingTime}h</p>
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
                <p className="text-sm font-medium">{mockStats.requestsThisMonth}</p>
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
              <p className="text-lg font-bold text-green-600">{((mockStats.managedRequests / mockStats.totalRequests) * 100).toFixed(0)}%</p>
              <p className="text-xs text-green-600">Éxito de gestión</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <RefreshCw className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-orange-600">{((mockStats.returnedRequests / mockStats.totalRequests) * 100).toFixed(0)}%</p>
              <p className="text-xs text-orange-600">Tasa de devolución</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-purple-600">{mockStats.activeAgents}</p>
              <p className="text-xs text-purple-600">Agentes activos</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-blue-600">{mockStats.avgProcessingTime}h</p>
              <p className="text-xs text-blue-600">Tiempo promedio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}