import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Target, Zap, Users, DollarSign, Brain, RefreshCw,
  ArrowRight, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  Megaphone, UserPlus, Wallet, Heart
} from "lucide-react";
import { subDays } from "date-fns";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Insight {
  type: 'success' | 'warning' | 'action' | 'opportunity';
  category: string;
  title: string;
  description: string;
  metric?: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface FeaturePerformance {
  name: string;
  usage: number;
  trend: 'up' | 'down' | 'stable';
  status: 'working' | 'needs_attention' | 'failing';
}

interface StrategicDecisionsProps {
  onNavigate?: (view: string) => void;
}

interface StrategyRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface MatrixMetrics {
  acquisition: {
    totalLeads: number;
    pendingLeads: number;
    conversionRate: number;
    recommendations: StrategyRecommendation[];
  };
  activation: {
    totalLawyers: number;
    activeLawyers: number;
    activeRate: number;
    recommendations: StrategyRecommendation[];
  };
  revenue: {
    totalDocs: number;
    paidDocs: number;
    conversionRate: number;
    creditPurchases: number;
    recommendations: StrategyRecommendation[];
  };
  retention: {
    atRiskCount: number;
    churnedCount: number;
    retentionRate: number;
    recommendations: StrategyRecommendation[];
  };
}

export const StrategicDecisions = ({ onNavigate }: StrategicDecisionsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [workingFeatures, setWorkingFeatures] = useState<FeaturePerformance[]>([]);
  const [failingFeatures, setFailingFeatures] = useState<FeaturePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMatrix, setExpandedMatrix] = useState<string | null>(null);
  const [matrixMetrics, setMatrixMetrics] = useState<MatrixMetrics>({
    acquisition: { totalLeads: 0, pendingLeads: 0, conversionRate: 0, recommendations: [] },
    activation: { totalLawyers: 0, activeLawyers: 0, activeRate: 0, recommendations: [] },
    revenue: { totalDocs: 0, paidDocs: 0, conversionRate: 0, creditPurchases: 0, recommendations: [] },
    retention: { atRiskCount: 0, churnedCount: 0, retentionRate: 0, recommendations: [] }
  });

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      // Fetch various data points in parallel
      const [lawyersResult, documentsResult, creditTxsResult, leadsResult, agentsResult] = await Promise.all([
        supabase.from('lawyer_profiles').select('id, is_active, created_at'),
        supabase.from('document_tokens').select('id, status, price, created_at'),
        supabase.from('credit_transactions').select('*').gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('crm_leads').select('id, status, created_at'),
        supabase.from('legal_agents').select('id, status, created_at')
      ]);

      const lawyers = lawyersResult.data || [];
      const documents = documentsResult.data || [];
      const creditTxs = creditTxsResult.data || [];
      const leads = leadsResult.data || [];
      const agents = agentsResult.data || [];

      const generatedInsights: Insight[] = [];

      // Analyze lawyer activity
      const activeLawyers = lawyers.filter(l => l.is_active).length;
      const totalLawyers = lawyers.length;
      const activeRate = totalLawyers > 0 ? (activeLawyers / totalLawyers) * 100 : 0;

      if (activeRate < 50) {
        generatedInsights.push({
          type: 'warning',
          category: 'Usuarios',
          title: 'Baja tasa de activación de abogados',
          description: `Solo el ${activeRate.toFixed(0)}% de los abogados registrados están activos. Considera implementar onboarding mejorado o campañas de activación.`,
          metric: `${activeRate.toFixed(0)}% activos`,
          action: 'Revisar flujo de onboarding',
          priority: 'high'
        });
      } else {
        generatedInsights.push({
          type: 'success',
          category: 'Usuarios',
          title: 'Buena tasa de activación',
          description: `${activeRate.toFixed(0)}% de los abogados están activos, lo cual es un buen indicador de engagement.`,
          metric: `${activeLawyers} abogados activos`,
          priority: 'low'
        });
      }

      // Analyze document conversion
      const paidDocs = documents.filter(d => d.status === 'pagado' || d.status === 'descargado').length;
      const totalDocs = documents.length;
      const conversionRate = totalDocs > 0 ? (paidDocs / totalDocs) * 100 : 0;

      if (conversionRate < 20) {
        generatedInsights.push({
          type: 'action',
          category: 'Conversión',
          title: 'Oportunidad de mejora en conversión',
          description: `La tasa de conversión de documentos es ${conversionRate.toFixed(1)}%. Considera revisar precios, UX del checkout, o agregar más documentos gratuitos como gancho.`,
          metric: `${conversionRate.toFixed(1)}% conversión`,
          action: 'Optimizar funnel de pago',
          priority: 'high'
        });
      } else {
        generatedInsights.push({
          type: 'success',
          category: 'Conversión',
          title: 'Conversión saludable',
          description: `${conversionRate.toFixed(1)}% de los documentos generados resultan en pago.`,
          metric: `${paidDocs} documentos pagados`,
          priority: 'low'
        });
      }

      // Analyze credits usage
      const creditPurchases = creditTxs.filter(t => t.transaction_type === 'purchase').length;
      const creditConsumptions = creditTxs.filter(t => t.transaction_type === 'consumption').length;

      if (creditConsumptions === 0 && creditPurchases === 0) {
        generatedInsights.push({
          type: 'warning',
          category: 'Créditos',
          title: 'Sistema de créditos sin uso',
          description: 'No hay transacciones de créditos en los últimos 30 días. Considera promocionar más las herramientas IA o revisar los costos.',
          action: 'Promocionar herramientas IA',
          priority: 'medium'
        });
      } else if (creditPurchases > 0) {
        generatedInsights.push({
          type: 'success',
          category: 'Créditos',
          title: 'Monetización de créditos activa',
          description: `${creditPurchases} compras de créditos en los últimos 30 días. El modelo de monetización está funcionando.`,
          metric: `${creditPurchases} compras`,
          priority: 'low'
        });
      }

      // Analyze leads
      const pendingLeads = leads.filter(l => l.status === 'new' || l.status === 'pending').length;
      const totalLeads = leads.length;

      if (pendingLeads > 10) {
        generatedInsights.push({
          type: 'action',
          category: 'Leads',
          title: 'Leads acumulados sin atender',
          description: `Hay ${pendingLeads} leads sin atender. Esto puede afectar la satisfacción de usuarios y la conversión de abogados.`,
          metric: `${pendingLeads} leads pendientes`,
          action: 'Notificar a abogados',
          priority: 'high'
        });
      }

      // Analyze agents
      const pendingAgents = agents.filter(a => a.status === 'pending_review').length;
      const activeAgents = agents.filter(a => a.status === 'active').length;

      if (pendingAgents > 0) {
        generatedInsights.push({
          type: 'action',
          category: 'Agentes',
          title: 'Agentes pendientes de revisión',
          description: `Hay ${pendingAgents} agentes esperando aprobación. Cada día de espera puede frustrar a los abogados creadores.`,
          metric: `${pendingAgents} pendientes`,
          action: 'Revisar agentes',
          priority: 'medium'
        });
      }

      // Add opportunity insights
      if (activeAgents < 10) {
        generatedInsights.push({
          type: 'opportunity',
          category: 'Producto',
          title: 'Oportunidad de expansión de catálogo',
          description: 'Con menos de 10 agentes activos, hay oportunidad de expandir el catálogo. Considera incentivar a abogados a crear más agentes.',
          action: 'Campaña de creación de agentes',
          priority: 'medium'
        });
      }

      setInsights(generatedInsights);

      // Determine feature performance
      const working: FeaturePerformance[] = [];
      const failing: FeaturePerformance[] = [];

      if (conversionRate > 20) {
        working.push({ name: 'Generación de Documentos', usage: totalDocs, trend: 'up', status: 'working' });
      } else {
        failing.push({ name: 'Generación de Documentos', usage: totalDocs, trend: 'down', status: 'needs_attention' });
      }

      if (creditConsumptions > 0) {
        working.push({ name: 'Herramientas IA', usage: creditConsumptions, trend: 'stable', status: 'working' });
      } else {
        failing.push({ name: 'Herramientas IA', usage: 0, trend: 'down', status: 'failing' });
      }

      if (activeLawyers > 5) {
        working.push({ name: 'Onboarding de Abogados', usage: activeLawyers, trend: 'up', status: 'working' });
      } else {
        failing.push({ name: 'Onboarding de Abogados', usage: activeLawyers, trend: 'down', status: 'needs_attention' });
      }

      if (totalLeads > 0) {
        working.push({ name: 'Generación de Leads', usage: totalLeads, trend: 'up', status: 'working' });
      }

      setWorkingFeatures(working);
      setFailingFeatures(failing);

      // Build matrix metrics with recommendations
      const acquisitionRecs: StrategyRecommendation[] = [];
      if (totalLeads === 0) {
        acquisitionRecs.push({ title: 'Crear landing pages específicas', description: 'Segmentar por especialidad legal para mejorar conversión', priority: 'high' });
        acquisitionRecs.push({ title: 'Activar Google Ads', description: 'Campañas de búsqueda para abogados en Colombia', priority: 'medium' });
      } else if (pendingLeads > 5) {
        acquisitionRecs.push({ title: 'Automatizar seguimiento', description: `${pendingLeads} leads sin atender - configura emails automáticos`, priority: 'high' });
      }
      if (totalLeads < 20) {
        acquisitionRecs.push({ title: 'Programa de referidos', description: 'Incentiva a abogados actuales a referir colegas', priority: 'medium' });
        acquisitionRecs.push({ title: 'Content marketing', description: 'Crear blog posts sobre temas legales trending', priority: 'low' });
      }

      const activationRecs: StrategyRecommendation[] = [];
      if (activeRate < 50) {
        activationRecs.push({ title: 'Onboarding interactivo', description: `Solo ${activeRate.toFixed(0)}% activos - implementa tour guiado`, priority: 'high' });
        activationRecs.push({ title: 'Email de bienvenida mejorado', description: 'Incluir video tutorial y primer documento gratis', priority: 'high' });
      }
      if (activeLawyers < 10) {
        activationRecs.push({ title: 'Sesiones 1:1', description: 'Ofrecer demo personalizada a nuevos registros', priority: 'medium' });
      }
      activationRecs.push({ title: 'Gamificación activa', description: 'Recompensas por completar perfil y primer uso', priority: 'low' });

      const revenueRecs: StrategyRecommendation[] = [];
      if (conversionRate < 20) {
        revenueRecs.push({ title: 'Revisar pricing', description: `${conversionRate.toFixed(1)}% conversión - considera precios más competitivos`, priority: 'high' });
        revenueRecs.push({ title: 'Ofrecer documentos gratis', description: 'Primeros 2 documentos sin costo para nuevos usuarios', priority: 'medium' });
      }
      if (creditPurchases === 0) {
        revenueRecs.push({ title: 'Promocionar créditos IA', description: 'Los abogados no están comprando créditos - destacar valor', priority: 'high' });
      } else {
        revenueRecs.push({ title: 'Upsell de paquetes', description: `${creditPurchases} compras - ofrecer descuentos por volumen`, priority: 'medium' });
      }
      revenueRecs.push({ title: 'Suscripción mensual', description: 'Plan premium con documentos ilimitados', priority: 'low' });

      const retentionRecs: StrategyRecommendation[] = [];
      const inactiveLawyers = totalLawyers - activeLawyers;
      const estimatedAtRisk = Math.floor(inactiveLawyers * 0.3);
      if (estimatedAtRisk > 0) {
        retentionRecs.push({ title: 'Campaña de reactivación', description: `~${estimatedAtRisk} usuarios en riesgo - enviar email con oferta especial`, priority: 'high' });
      }
      retentionRecs.push({ title: 'Notificaciones push', description: 'Alertas de nuevos documentos y features', priority: 'medium' });
      retentionRecs.push({ title: 'Encuesta de satisfacción', description: 'NPS score para identificar detractores temprano', priority: 'medium' });
      retentionRecs.push({ title: 'Programa de fidelización', description: 'Descuentos progresivos por antigüedad', priority: 'low' });

      setMatrixMetrics({
        acquisition: {
          totalLeads,
          pendingLeads,
          conversionRate: totalLeads > 0 ? ((totalLeads - pendingLeads) / totalLeads) * 100 : 0,
          recommendations: acquisitionRecs
        },
        activation: {
          totalLawyers,
          activeLawyers,
          activeRate,
          recommendations: activationRecs
        },
        revenue: {
          totalDocs,
          paidDocs,
          conversionRate,
          creditPurchases,
          recommendations: revenueRecs
        },
        retention: {
          atRiskCount: estimatedAtRisk,
          churnedCount: inactiveLawyers,
          retentionRate: totalLawyers > 0 ? (activeLawyers / totalLawyers) * 100 : 0,
          recommendations: retentionRecs
        }
      });

    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'action': return <Zap className="w-5 h-5 text-blue-600" />;
      case 'opportunity': return <Lightbulb className="w-5 h-5 text-purple-600" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-l-emerald-500';
      case 'warning': return 'bg-amber-50/50 dark:bg-amber-950/20 border-l-amber-500';
      case 'action': return 'bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500';
      case 'opportunity': return 'bg-purple-50/50 dark:bg-purple-950/20 border-l-purple-500';
      default: return 'bg-muted/50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-100 text-red-700">Alta</Badge>;
      case 'medium': return <Badge className="bg-amber-100 text-amber-700">Media</Badge>;
      case 'low': return <Badge className="bg-emerald-100 text-emerald-700">Baja</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getActionHandler = (action: string) => {
    const actionMap: Record<string, string> = {
      'Revisar flujo de onboarding': 'users',
      'Optimizar funnel de pago': 'documents',
      'Promocionar herramientas IA': 'ai-tools',
      'Notificar a abogados': 'lawyers',
      'Revisar agentes': 'agents',
      'Campaña de creación de agentes': 'agents',
    };

    return () => {
      const targetView = actionMap[action];
      if (targetView && onNavigate) {
        onNavigate(targetView);
        toast.success(`Navegando a ${action}`);
      } else {
        toast.info(`Acción: ${action}`);
      }
    };
  };

  const handleMatrixClick = (category: string) => {
    const categoryMap: Record<string, string> = {
      'Adquisición': 'leads',
      'Activación': 'users',
      'Revenue': 'revenue',
      'Retención': 'retention',
    };

    const targetView = categoryMap[category];
    if (targetView && onNavigate) {
      onNavigate(targetView);
    } else {
      toast.info(`Ver estrategias de ${category}`);
    }
  };

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" />
            Decisiones Estratégicas
          </h2>
          <p className="text-muted-foreground">
            Insights accionables basados en datos del negocio
          </p>
        </div>
        <Button variant="outline" onClick={generateInsights}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerar Insights
        </Button>
      </div>

      {/* What's Working / Not Working */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <ThumbsUp className="w-5 h-5" />
              ¿Qué Está Funcionando?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workingFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.usage} usos</p>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              ))}
              {workingFeatures.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay suficientes datos para determinar qué funciona
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <ThumbsDown className="w-5 h-5" />
              ¿Qué Necesita Atención?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failingFeatures.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.status === 'failing' ? 'Sin actividad' : 'Bajo rendimiento'}
                      </p>
                    </div>
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              ))}
              {failingFeatures.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500 opacity-50" />
                  <p className="text-muted-foreground">¡Todo parece estar funcionando bien!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Insights & Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((insight, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border-l-4 ${getInsightBg(insight.type)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{insight.title}</p>
                          {getPriorityBadge(insight.priority)}
                          <Badge variant="outline">{insight.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.metric && (
                          <p className="text-sm font-medium">{insight.metric}</p>
                        )}
                      </div>
                    </div>
                    {insight.action && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="shrink-0"
                        onClick={getActionHandler(insight.action)}
                      >
                        {insight.action}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Decision Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Matriz de Decisiones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acquisition */}
          <Collapsible 
            open={expandedMatrix === 'acquisition'} 
            onOpenChange={(open) => setExpandedMatrix(open ? 'acquisition' : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Adquisición</p>
                      <p className="text-xs text-muted-foreground">¿Cómo atraer más abogados?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{matrixMetrics.acquisition.totalLeads}</p>
                      <p className="text-xs text-muted-foreground">leads totales</p>
                    </div>
                    {expandedMatrix === 'acquisition' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {matrixMetrics.acquisition.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => onNavigate?.('leads')}
              >
                Ver Leads <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Activation */}
          <Collapsible 
            open={expandedMatrix === 'activation'} 
            onOpenChange={(open) => setExpandedMatrix(open ? 'activation' : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                      <UserPlus className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Activación</p>
                      <p className="text-xs text-muted-foreground">¿Cómo lograr el "aha moment"?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-600">{matrixMetrics.activation.activeRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">{matrixMetrics.activation.activeLawyers}/{matrixMetrics.activation.totalLawyers} activos</p>
                    </div>
                    {expandedMatrix === 'activation' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {matrixMetrics.activation.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 border-l-4 border-l-amber-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => onNavigate?.('users')}
              >
                Ver Usuarios <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Revenue */}
          <Collapsible 
            open={expandedMatrix === 'revenue'} 
            onOpenChange={(open) => setExpandedMatrix(open ? 'revenue' : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Revenue</p>
                      <p className="text-xs text-muted-foreground">¿Cómo monetizar mejor?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{matrixMetrics.revenue.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{matrixMetrics.revenue.paidDocs} docs pagados</p>
                    </div>
                    {expandedMatrix === 'revenue' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {matrixMetrics.revenue.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 border-l-4 border-l-emerald-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => onNavigate?.('revenue')}
              >
                Ver Ingresos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Retention */}
          <Collapsible 
            open={expandedMatrix === 'retention'} 
            onOpenChange={(open) => setExpandedMatrix(open ? 'retention' : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Retención</p>
                      <p className="text-xs text-muted-foreground">¿Cómo reducir churn?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{matrixMetrics.retention.retentionRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">{matrixMetrics.retention.atRiskCount} en riesgo</p>
                    </div>
                    {expandedMatrix === 'retention' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {matrixMetrics.retention.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 border-l-4 border-l-purple-500">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => onNavigate?.('retention')}
              >
                Ver Retención <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};
