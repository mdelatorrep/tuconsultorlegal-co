import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, CreditCard, 
  Activity, AlertTriangle, Target, Coins, FileText,
  ArrowUpRight, ArrowDownRight, Percent, Clock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getColombiaPeriodRange } from "@/lib/date-utils";

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: any;
  color: string;
  bgColor: string;
}

interface BusinessAlert {
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  description: string;
  action?: string;
}

const TOOL_USAGE_TYPES = ['usage', 'consumption'];

export const BusinessMetricsDashboard = () => {
  const [metrics, setMetrics] = useState({
    mrr: 0,
    totalRevenue: 0,
    documentsRevenue: 0,
    creditsRevenue: 0,
    totalLawyers: 0,
    activeLawyers: 0,
    inactiveLawyers: 0,
    verifiedLawyers: 0,
    totalUsers: 0,
    totalDocuments: 0,
    paidDocuments: 0,
    freeDocuments: 0,
    conversionRate: 0,
    avgTicket: 0,
    churnRate: 0,
    revenueGrowth: 0
  });
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBusinessMetrics();
  }, []);

  const loadBusinessMetrics = async () => {
    setIsLoading(true);
    try {
      const range30 = getColombiaPeriodRange(30);

      // Fetch all data in parallel
      const [lawyersRes, usersRes, documentsRes, subscriptionsRes, creditTxsRes, prevCreditTxsRes, packageRes] = await Promise.all([
        supabase.from('lawyer_profiles').select('id, is_active, is_verified, created_at'),
        supabase.from('user_profiles').select('id, created_at'),
        supabase.from('document_tokens').select('id, status, price, created_at, legal_agent_id'),
        supabase.from('lawyer_subscriptions').select('id, status, plan_id, created_at').eq('status', 'active'),
        supabase.from('credit_transactions').select('amount, transaction_type, created_at, lawyer_id')
          .gte('created_at', range30.start).lt('created_at', range30.end),
        supabase.from('credit_transactions').select('amount, transaction_type, created_at, lawyer_id')
          .gte('created_at', range30.prevStart).lt('created_at', range30.prevEnd),
        supabase.from('credit_packages').select('credits, price_cop').eq('is_active', true),
      ]);

      const lawyers = lawyersRes.data || [];
      const documents = documentsRes.data || [];
      const creditTxs = creditTxsRes.data || [];
      const prevCreditTxs = prevCreditTxsRes.data || [];
      const packages = packageRes.data || [];

      // Lawyer metrics
      const totalLawyers = lawyers.length;
      const activeLawyers = lawyers.filter(l => l.is_active).length;
      const verifiedLawyers = lawyers.filter(l => l.is_verified).length;

      // Document metrics
      const totalDocuments = documents.length;
      const paidDocuments = documents.filter(d => d.status === 'pagado' || d.status === 'descargado').length;
      const freeDocuments = documents.filter(d => d.price === 0).length;

      // Revenue from documents (current 30-day period)
      const recentPaidDocs = documents.filter(d =>
        new Date(d.created_at) >= new Date(range30.start) &&
        new Date(d.created_at) < new Date(range30.end) &&
        (d.status === 'pagado' || d.status === 'descargado')
      );
      const documentsRevenue = recentPaidDocs.reduce((sum, d) => sum + (d.price || 0), 0);

      // Credits revenue: use actual package prices
      const avgPricePerCredit = packages.length > 0
        ? packages.reduce((sum, p) => sum + (p.price_cop / p.credits), 0) / packages.length
        : 1000;
      const creditsPurchased = creditTxs.filter(t => t.transaction_type === 'purchase');
      const creditsRevenue = creditsPurchased.reduce((sum, t) => sum + Math.abs(t.amount) * avgPricePerCredit, 0);

      const totalRevenue = documentsRevenue + creditsRevenue;

      // MRR from active subscriptions (use count * average plan price from packages)
      const avgPlanPrice = packages.length > 0
        ? packages.reduce((sum, p) => sum + p.price_cop, 0) / packages.length
        : 99000;
      const mrr = (subscriptionsRes.data?.length || 0) * avgPlanPrice;

      // Conversion rate (paid docs / total docs)
      const conversionRate = totalDocuments > 0 ? (paidDocuments / totalDocuments) * 100 : 0;

      // Average ticket
      const avgTicket = paidDocuments > 0 ? documentsRevenue / paidDocuments : 0;

      // Churn rate based on ACTIVITY (not is_active flag)
      // Active = had at least 1 tool usage in current period
      const activeLawyerIds = new Set(
        creditTxs
          .filter(t => TOOL_USAGE_TYPES.includes(t.transaction_type))
          .map(t => t.lawyer_id)
      );
      const activityBasedActive = activeLawyerIds.size;
      const churnRate = totalLawyers > 0 ? ((totalLawyers - activityBasedActive) / totalLawyers) * 100 : 0;

      // Revenue growth (current 30d vs previous 30d)
      const prevPaidDocs = documents.filter(d => {
        const date = new Date(d.created_at);
        return date >= new Date(range30.prevStart) && date < new Date(range30.prevEnd) &&
          (d.status === 'pagado' || d.status === 'descargado');
      });
      const prevDocRevenue = prevPaidDocs.reduce((sum, d) => sum + (d.price || 0), 0);
      const prevCreditsPurchased = prevCreditTxs.filter(t => t.transaction_type === 'purchase');
      const prevCreditsRevenue = prevCreditsPurchased.reduce((sum, t) => sum + Math.abs(t.amount) * avgPricePerCredit, 0);
      const prevTotalRevenue = prevDocRevenue + prevCreditsRevenue;

      const revenueGrowth = prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0;

      setMetrics({
        mrr,
        totalRevenue,
        documentsRevenue,
        creditsRevenue,
        totalLawyers,
        activeLawyers,
        inactiveLawyers: totalLawyers - activeLawyers,
        verifiedLawyers,
        totalUsers: usersRes.data?.length || 0,
        totalDocuments,
        paidDocuments,
        freeDocuments,
        conversionRate,
        avgTicket,
        churnRate,
        revenueGrowth
      });

      // Generate business alerts
      const newAlerts: BusinessAlert[] = [];
      const inactiveLawyers = totalLawyers - activeLawyers;

      if (inactiveLawyers > 5) {
        newAlerts.push({
          type: 'warning',
          title: `${inactiveLawyers} abogados inactivos`,
          description: 'Considera enviar emails de re-engagement',
          action: 'Ver abogados inactivos'
        });
      }

      if (churnRate > 70) {
        newAlerts.push({
          type: 'danger',
          title: `Churn rate alto: ${churnRate.toFixed(1)}%`,
          description: 'La mayoría de abogados no usaron herramientas en los últimos 30 días.',
          action: 'Ver análisis de retención'
        });
      }

      if (revenueGrowth < 0) {
        newAlerts.push({
          type: 'warning',
          title: `Revenue bajó ${Math.abs(revenueGrowth).toFixed(1)}%`,
          description: 'Los ingresos de este período son menores al anterior',
          action: 'Ver detalles de ingresos'
        });
      }

      if (conversionRate < 20) {
        newAlerts.push({
          type: 'info',
          title: `Tasa de conversión baja: ${conversionRate.toFixed(1)}%`,
          description: 'Muchos documentos se quedan sin pagar. Revisa precios o UX.',
          action: 'Ver funnel de conversión'
        });
      }

      if (newAlerts.length === 0) {
        newAlerts.push({
          type: 'success',
          title: 'Todo está funcionando bien',
          description: 'No hay alertas críticas en este momento',
        });
      }

      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error loading business metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const metricCards: MetricCard[] = [
    {
      title: "MRR (Ingresos Recurrentes)",
      value: formatCurrency(metrics.mrr),
      change: metrics.revenueGrowth,
      changeLabel: "vs período anterior",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "Revenue (30 días)",
      value: formatCurrency(metrics.totalRevenue),
      change: metrics.revenueGrowth,
      changeLabel: "vs período anterior",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      title: "Abogados Activos",
      value: metrics.activeLawyers,
      change: metrics.totalLawyers > 0 ? (metrics.activeLawyers / metrics.totalLawyers) * 100 : 0,
      changeLabel: `de ${metrics.totalLawyers} totales`,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
    },
    {
      title: "Tasa de Conversión",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      change: metrics.conversionRate > 30 ? 5 : -2,
      changeLabel: "docs pagados",
      icon: Percent,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20"
    }
  ];

  const secondaryMetrics = [
    { label: "Ticket Promedio", value: formatCurrency(metrics.avgTicket), icon: CreditCard },
    { label: "Docs Generados", value: metrics.totalDocuments, icon: FileText },
    { label: "Docs Pagados", value: metrics.paidDocuments, icon: DollarSign },
    { label: "Usuarios Finales", value: metrics.totalUsers, icon: Users },
    { label: "Churn Rate", value: `${metrics.churnRate.toFixed(1)}%`, icon: TrendingDown },
    { label: "Abogados Verificados", value: metrics.verifiedLawyers, icon: Activity },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Ejecutivo</h2>
          <p className="text-muted-foreground">
            Métricas de negocio en tiempo real • {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          Actualizado hace 1 min
        </Badge>
      </div>

      {/* Business Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.type === 'danger' ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' :
              alert.type === 'warning' ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' :
              alert.type === 'success' ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' :
              'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    alert.type === 'danger' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-amber-600' :
                    alert.type === 'success' ? 'text-emerald-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
                {alert.action && (
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    {alert.action}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = (metric.change || 0) >= 0;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    {metric.change !== undefined && (
                      <div className="flex items-center gap-1 text-xs">
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-red-600" />
                        )}
                        <span className={isPositive ? "text-emerald-600" : "text-red-600"}>
                          {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">{metric.changeLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {secondaryMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Desglose de Ingresos (30 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Documentos Pagados</span>
                <span className="font-medium">{formatCurrency(metrics.documentsRevenue)}</span>
              </div>
              <Progress 
                value={metrics.totalRevenue > 0 ? (metrics.documentsRevenue / metrics.totalRevenue) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Compra de Créditos</span>
                <span className="font-medium">{formatCurrency(metrics.creditsRevenue)}</span>
              </div>
              <Progress 
                value={metrics.totalRevenue > 0 ? (metrics.creditsRevenue / metrics.totalRevenue) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="font-medium">Total Revenue</span>
                <span className="font-bold text-lg">{formatCurrency(metrics.totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Métricas de Conversión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">{metrics.totalDocuments}</p>
                <p className="text-xs text-muted-foreground">Docs Generados</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-emerald-600">{metrics.paidDocuments}</p>
                <p className="text-xs text-muted-foreground">Docs Pagados</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tasa de Conversión</span>
                <span className="font-medium">{metrics.conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.conversionRate} className="h-3" />
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.freeDocuments} documentos gratuitos generados
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
