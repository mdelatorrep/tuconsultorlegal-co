import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, Users, Gift, Mail, TrendingUp, RefreshCw, 
  Play, Clock, CheckCircle, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface StepMetrics {
  step: string;
  label: string;
  emoji: string;
  total: number;
  credits: number;
  lawyers: { full_name: string; email: string; sent_at: string }[];
}

const STEP_CONFIG: Record<string, { label: string; emoji: string; credits: number }> = {
  day_1: { label: 'Día 1 - Tip de Uso', emoji: '🚀', credits: 5 },
  day_3: { label: 'Día 3 - Nudge IA', emoji: '🤖', credits: 0 },
  day_7: { label: 'Día 7 - Perfil', emoji: '👤', credits: 3 },
  day_14: { label: 'Día 14 - Re-engagement', emoji: '⚠️', credits: 10 },
  day_30: { label: 'Día 30 - Última Oportunidad', emoji: '💎', credits: 15 },
};

export const LawyerJourneyDashboard = () => {
  const [stepMetrics, setStepMetrics] = useState<StepMetrics[]>([]);
  const [totalLawyers, setTotalLawyers] = useState(0);
  const [totalCreditsGranted, setTotalCreditsGranted] = useState(0);
  const [totalEmailsSent, setTotalEmailsSent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadJourneyData();
  }, []);

  const loadJourneyData = async () => {
    setIsLoading(true);
    try {
      // Get total lawyers
      const { count } = await supabase
        .from('lawyer_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      setTotalLawyers(count || 0);

      // Get journey tracking data
      const { data: tracking } = await supabase
        .from('lawyer_journey_tracking' as any)
        .select('journey_step, lawyer_id, sent_at, action_taken, metadata') as any;

      // Get lawyer names for tracking
      const lawyerIds = [...new Set((tracking || []).map(t => t.lawyer_id))];
      const { data: lawyerProfiles } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email')
        .in('id', lawyerIds.length > 0 ? lawyerIds : ['none']);

      const lawyerMap = new Map((lawyerProfiles || []).map(l => [l.id, l]));

      // Get journey bonus credits
      const { data: bonusTxs } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('transaction_type', 'journey_bonus');

      const totalCredits = (bonusTxs || []).reduce((sum, t) => sum + t.amount, 0);
      setTotalCreditsGranted(totalCredits);
      setTotalEmailsSent((tracking || []).length);

      // Build step metrics
      const metrics: StepMetrics[] = Object.entries(STEP_CONFIG).map(([step, config]) => {
        const stepRecords = (tracking || []).filter(t => t.journey_step === step);
        return {
          step,
          label: config.label,
          emoji: config.emoji,
          total: stepRecords.length,
          credits: config.credits * stepRecords.length,
          lawyers: stepRecords.map(r => {
            const lawyer = lawyerMap.get(r.lawyer_id);
            return {
              full_name: lawyer?.full_name || 'Desconocido',
              email: lawyer?.email || '',
              sent_at: r.sent_at
            };
          }).sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
        };
      });

      setStepMetrics(metrics);
    } catch (error) {
      console.error('Error loading journey data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunJourney = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('lawyer-journey-automation');
      if (error) throw error;
      
      const summary = data?.summary;
      if (summary) {
        toast.success(
          `Journey ejecutado: ${summary.emails_sent} emails, ${summary.credits_granted} créditos, ${summary.notifications_created} notificaciones`
        );
      } else {
        toast.success('Journey ejecutado correctamente');
      }
      await loadJourneyData();
    } catch (error) {
      console.error('Error running journey:', error);
      toast.error('Error al ejecutar el journey');
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const maxStepTotal = Math.max(...stepMetrics.map(s => s.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Journey Automatizado de Abogados
          </h2>
          <p className="text-muted-foreground">
            Lifecycle automation con touchpoints secuenciales, créditos bonus y notificaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadJourneyData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleRunJourney} disabled={isRunning}>
            {isRunning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? "Ejecutando..." : "Ejecutar Ahora"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Abogados</p>
                <p className="text-3xl font-bold">{totalLawyers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Enviados</p>
                <p className="text-3xl font-bold text-indigo-600">{totalEmailsSent}</p>
              </div>
              <Mail className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Créditos Otorgados</p>
                <p className="text-3xl font-bold text-emerald-600">{totalCreditsGranted}</p>
              </div>
              <Gift className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Avance</p>
                <p className="text-3xl font-bold">
                  {totalLawyers > 0 
                    ? Math.round((stepMetrics[0]?.total || 0) / totalLawyers * 100) 
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Funnel del Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stepMetrics.map((step, index) => {
              const percentage = totalLawyers > 0 
                ? (step.total / totalLawyers) * 100 
                : 0;
              const funnelWidth = maxStepTotal > 0 
                ? Math.max(10, (step.total / maxStepTotal) * 100) 
                : 10;

              return (
                <div key={step.step} className="flex items-center gap-4">
                  <div className="w-8 text-2xl text-center">{step.emoji}</div>
                  <div className="w-48">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.total} abogados
                      {STEP_CONFIG[step.step].credits > 0 && (
                        <span className="text-emerald-600 ml-1">
                          (+{STEP_CONFIG[step.step].credits} créditos c/u)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{step.total} de {totalLawyers}</span>
                      <span className="font-medium">{percentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </div>
                  {step.credits > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {step.credits} créditos
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stepMetrics.map(step => (
          <Card key={step.step}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{step.emoji}</span>
                {step.label}
                <Badge variant="outline" className="ml-auto">{step.total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {step.lawyers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ningún abogado ha llegado a este paso aún
                  </p>
                ) : (
                  step.lawyers.slice(0, 8).map((lawyer, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{lawyer.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(lawyer.sent_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
