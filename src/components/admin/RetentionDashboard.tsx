import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Heart, Users, TrendingDown, TrendingUp, Activity,
  AlertTriangle, Mail, Clock, Calendar, UserMinus,
  UserCheck, RefreshCw, ChevronRight
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface LawyerEngagement {
  id: string;
  full_name: string;
  email: string;
  last_activity: string | null;
  days_inactive: number;
  engagement_score: number;
  status: 'active' | 'at_risk' | 'churned';
  total_actions: number;
}

interface CohortData {
  month: string;
  registered: number;
  retained: number;
  retentionRate: number;
}

export const RetentionDashboard = () => {
  const [lawyers, setLawyers] = useState<LawyerEngagement[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [metrics, setMetrics] = useState({
    totalActive: 0,
    atRisk: 0,
    churned: 0,
    avgEngagement: 0,
    retentionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRetentionData();
  }, []);

  const loadRetentionData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const fourteenDaysAgo = subDays(now, 14);

      // Fetch lawyers with activity data
      const { data: lawyerProfiles } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email, is_active, created_at');

      // Fetch credit transactions as activity indicator
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('lawyer_id, created_at')
        .gte('created_at', subDays(now, 90).toISOString());

      // Calculate engagement for each lawyer
      const lawyerEngagements: LawyerEngagement[] = (lawyerProfiles || []).map(lawyer => {
        const lawyerTxs = transactions?.filter(t => t.lawyer_id === lawyer.id) || [];
        const lastActivity = lawyerTxs.length > 0 
          ? lawyerTxs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
          : null;

        const daysInactive = lastActivity 
          ? differenceInDays(now, new Date(lastActivity))
          : differenceInDays(now, new Date(lawyer.created_at));

        // Calculate engagement score (0-100)
        const recentTxs = lawyerTxs.filter(t => 
          new Date(t.created_at) >= thirtyDaysAgo
        ).length;
        const engagementScore = Math.min(100, recentTxs * 10 + (daysInactive < 7 ? 30 : 0));

        // Determine status
        let status: 'active' | 'at_risk' | 'churned' = 'active';
        if (daysInactive > 30) {
          status = 'churned';
        } else if (daysInactive > 14) {
          status = 'at_risk';
        }

        return {
          id: lawyer.id,
          full_name: lawyer.full_name,
          email: lawyer.email,
          last_activity: lastActivity,
          days_inactive: daysInactive,
          engagement_score: engagementScore,
          status,
          total_actions: lawyerTxs.length
        };
      });

      // Sort by engagement (at_risk first, then by days inactive)
      lawyerEngagements.sort((a, b) => {
        if (a.status === 'at_risk' && b.status !== 'at_risk') return -1;
        if (b.status === 'at_risk' && a.status !== 'at_risk') return 1;
        return b.days_inactive - a.days_inactive;
      });

      setLawyers(lawyerEngagements);

      // Calculate metrics
      const active = lawyerEngagements.filter(l => l.status === 'active').length;
      const atRisk = lawyerEngagements.filter(l => l.status === 'at_risk').length;
      const churned = lawyerEngagements.filter(l => l.status === 'churned').length;
      const avgEngagement = lawyerEngagements.length > 0 
        ? lawyerEngagements.reduce((sum, l) => sum + l.engagement_score, 0) / lawyerEngagements.length
        : 0;
      const retentionRate = lawyerEngagements.length > 0
        ? ((active + atRisk) / lawyerEngagements.length) * 100
        : 0;

      setMetrics({
        totalActive: active,
        atRisk,
        churned,
        avgEngagement,
        retentionRate
      });

      // Generate cohort data (last 6 months)
      const cohortData: CohortData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const registered = lawyerProfiles?.filter(l => {
          const created = new Date(l.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length || 0;

        const retained = lawyerEngagements.filter(l => {
          const lawyer = lawyerProfiles?.find(p => p.id === l.id);
          if (!lawyer) return false;
          const created = new Date(lawyer.created_at);
          return created >= monthStart && created <= monthEnd && l.status !== 'churned';
        }).length;

        cohortData.push({
          month: format(monthStart, 'MMM yyyy', { locale: es }),
          registered,
          retained,
          retentionRate: registered > 0 ? (retained / registered) * 100 : 0
        });
      }

      setCohorts(cohortData);

    } catch (error) {
      console.error('Error loading retention data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>;
      case 'at_risk':
        return <Badge className="bg-amber-100 text-amber-700">En Riesgo</Badge>;
      case 'churned':
        return <Badge className="bg-red-100 text-red-700">Inactivo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const atRiskLawyers = lawyers.filter(l => l.status === 'at_risk');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" />
            Retención & Engagement
          </h2>
          <p className="text-muted-foreground">
            Análisis de actividad y retención de abogados
          </p>
        </div>
        <Button variant="outline" onClick={loadRetentionData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-3xl font-bold text-emerald-600">{metrics.totalActive}</p>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Riesgo</p>
                <p className="text-3xl font-bold text-amber-600">{metrics.atRisk}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-3xl font-bold text-red-600">{metrics.churned}</p>
              </div>
              <UserMinus className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Promedio</p>
                <p className="text-3xl font-bold">{metrics.avgEngagement.toFixed(0)}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Retención</p>
                <p className="text-3xl font-bold">{metrics.retentionRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At Risk Alert */}
      {atRiskLawyers.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">{atRiskLawyers.length} abogados en riesgo de churn</p>
                  <p className="text-sm text-muted-foreground">
                    No han usado la plataforma en 14+ días. Considera enviar emails de re-engagement.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Emails
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Análisis de Cohortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohorts.map((cohort, index) => (
                <div key={cohort.month} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{cohort.month}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{cohort.retained} de {cohort.registered} usuarios</span>
                      <span className="font-medium">{cohort.retentionRate.toFixed(0)}%</span>
                    </div>
                    <Progress value={cohort.retentionRate} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lawyers at Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Usuarios en Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {atRiskLawyers.slice(0, 10).map((lawyer) => (
                <div key={lawyer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lawyer.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-600">
                      {lawyer.days_inactive} días
                    </p>
                    <p className="text-xs text-muted-foreground">sin actividad</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
              {atRiskLawyers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hay usuarios en riesgo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Lawyers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Engagement por Abogado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {lawyers.slice(0, 20).map((lawyer) => (
              <div key={lawyer.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lawyer.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                </div>
                <div className="w-24 text-center">
                  {getStatusBadge(lawyer.status)}
                </div>
                <div className="w-24 text-center">
                  <p className="text-sm font-medium">{lawyer.total_actions}</p>
                  <p className="text-xs text-muted-foreground">acciones</p>
                </div>
                <div className="w-32">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Engagement</span>
                    <span>{lawyer.engagement_score}</span>
                  </div>
                  <Progress 
                    value={lawyer.engagement_score} 
                    className={`h-2 ${
                      lawyer.engagement_score > 60 ? '[&>div]:bg-emerald-500' :
                      lawyer.engagement_score > 30 ? '[&>div]:bg-amber-500' :
                      '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
                <div className="w-20 text-right">
                  <p className="text-xs text-muted-foreground">
                    {lawyer.last_activity 
                      ? format(new Date(lawyer.last_activity), 'dd/MM', { locale: es })
                      : 'Nunca'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
