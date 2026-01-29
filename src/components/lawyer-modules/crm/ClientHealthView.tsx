import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  MessageSquare,
  Loader2,
  ArrowRight,
  User
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  searchTerm: string;
  onRefresh: () => void;
  lawyerData: any;
  onClientClick?: (clientId: string) => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  health_score: number;
  last_contact_date: string | null;
  payment_status: string;
  lifetime_value: number;
  risk_level: string;
  engagement_score: number;
  created_at: string;
  cases_count?: number;
  open_cases?: number;
}

interface AIRecommendation {
  id: string;
  client: Client;
  type: 'call' | 'email' | 'meeting' | 'payment';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'high': return 'text-red-600 bg-red-100 border-red-200';
    case 'medium': return 'text-orange-600 bg-orange-100 border-orange-200';
    default: return 'text-green-600 bg-green-100 border-green-200';
  }
};

const getHealthColor = (score: number) => {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function ClientHealthView({ searchTerm, onRefresh, lawyerData, onClientClick }: Props) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, [lawyerData.id]);

  const fetchClients = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .eq('status', 'active')
        .order('health_score', { ascending: true });

      if (clientsError) throw clientsError;

      // Fetch case counts for each client
      const { data: casesData } = await supabase
        .from('crm_cases')
        .select('client_id, status')
        .eq('lawyer_id', lawyerData.id);

      const casesByClient = new Map<string, { total: number; open: number }>();
      casesData?.forEach(c => {
        const current = casesByClient.get(c.client_id) || { total: 0, open: 0 };
        current.total++;
        if (c.status === 'active') current.open++;
        casesByClient.set(c.client_id, current);
      });

      // Enrich clients with calculated health scores
      const enrichedClients = (clientsData || []).map(c => {
        const cases = casesByClient.get(c.id) || { total: 0, open: 0 };
        const healthScore = calculateHealthScore(c);
        const riskLevel = calculateRiskLevel(c, healthScore);

        return {
          ...c,
          health_score: healthScore,
          risk_level: riskLevel,
          engagement_score: c.engagement_score || 50,
          lifetime_value: Number(c.lifetime_value) || 0,
          cases_count: cases.total,
          open_cases: cases.open
        };
      }) as Client[];

      setClients(enrichedClients);
      generateRecommendations(enrichedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (client: any): number => {
    let score = 100;

    // Communication factor (25%)
    const lastContact = client.last_contact_date ? new Date(client.last_contact_date) : null;
    const daysSinceContact = lastContact ? differenceInDays(new Date(), lastContact) : 999;
    
    if (daysSinceContact > 60) score -= 25;
    else if (daysSinceContact > 30) score -= 15;
    else if (daysSinceContact > 14) score -= 5;

    // Payment factor (30%)
    if (client.payment_status === 'overdue') score -= 30;
    else if (client.payment_status === 'pending') score -= 15;

    // Engagement factor (25%)
    const engagement = client.engagement_score || 50;
    score -= Math.max(0, (50 - engagement) * 0.5);

    // Activity factor (20%)
    if (!client.last_contact_date && daysSinceContact > 30) score -= 20;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateRiskLevel = (client: any, healthScore: number): string => {
    if (healthScore < 40) return 'high';
    if (healthScore < 70) return 'medium';
    return 'low';
  };

  const generateRecommendations = (clients: Client[]) => {
    const recs: AIRecommendation[] = [];

    clients.forEach(client => {
      const lastContact = client.last_contact_date ? new Date(client.last_contact_date) : null;
      const daysSinceContact = lastContact ? differenceInDays(new Date(), lastContact) : 999;

      // No contact in 30+ days
      if (daysSinceContact > 30) {
        recs.push({
          id: `call-${client.id}`,
          client,
          type: 'call',
          priority: daysSinceContact > 60 ? 'high' : 'medium',
          message: `${client.name} no ha sido contactado en ${daysSinceContact} días`,
          action: 'Programar llamada de seguimiento'
        });
      }

      // Overdue payment
      if (client.payment_status === 'overdue') {
        recs.push({
          id: `payment-${client.id}`,
          client,
          type: 'payment',
          priority: 'high',
          message: `${client.name} tiene pagos vencidos`,
          action: 'Enviar recordatorio de pago'
        });
      }

      // Low engagement with open cases
      if (client.engagement_score < 30 && client.open_cases && client.open_cases > 0) {
        recs.push({
          id: `engagement-${client.id}`,
          client,
          type: 'email',
          priority: 'medium',
          message: `${client.name} tiene bajo engagement con ${client.open_cases} casos activos`,
          action: 'Enviar actualización de casos'
        });
      }
    });

    // Sort by priority
    recs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setRecommendations(recs.slice(0, 5)); // Top 5 recommendations
  };

  const handleAction = async (rec: AIRecommendation) => {
    // Update last contact date
    try {
      await supabase
        .from('crm_clients')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', rec.client.id);

      toast({
        title: "Acción registrada",
        description: `Contacto con ${rec.client.name} registrado`,
      });

      fetchClients();
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by risk level
  const highRiskClients = filteredClients.filter(c => c.risk_level === 'high');
  const mediumRiskClients = filteredClients.filter(c => c.risk_level === 'medium');
  const healthyClients = filteredClients.filter(c => c.risk_level === 'low');

  // Stats
  const avgHealth = clients.length > 0 
    ? Math.round(clients.reduce((sum, c) => sum + c.health_score, 0) / clients.length)
    : 0;
  const totalLTV = clients.reduce((sum, c) => sum + c.lifetime_value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-muted-foreground">Clientes Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${avgHealth >= 70 ? 'bg-green-100' : avgHealth >= 40 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <Heart className={`h-6 w-6 ${avgHealth >= 70 ? 'text-green-600' : avgHealth >= 40 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${avgHealth >= 70 ? 'text-green-600' : avgHealth >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {avgHealth}%
                </p>
                <p className="text-xs text-muted-foreground">Salud Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{highRiskClients.length}</p>
                <p className="text-xs text-muted-foreground">En Riesgo Alto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  ${(totalLTV / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Acciones Recomendadas por IA
            </CardTitle>
            <CardDescription>
              Sugerencias basadas en el análisis de salud de tus clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div 
                  key={rec.id}
                  className={`p-3 rounded-lg border bg-white flex items-center justify-between ${
                    rec.priority === 'high' ? 'border-red-200' : 
                    rec.priority === 'medium' ? 'border-orange-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      rec.type === 'call' ? 'bg-blue-100' :
                      rec.type === 'email' ? 'bg-purple-100' :
                      rec.type === 'payment' ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      {rec.type === 'call' && <Phone className="h-4 w-4 text-blue-600" />}
                      {rec.type === 'email' && <Mail className="h-4 w-4 text-purple-600" />}
                      {rec.type === 'payment' && <DollarSign className="h-4 w-4 text-red-600" />}
                      {rec.type === 'meeting' && <Calendar className="h-4 w-4 text-green-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{rec.message}</p>
                      <p className="text-xs text-muted-foreground">{rec.action}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleAction(rec)}
                  >
                    Realizar
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Risk Clients */}
      {highRiskClients.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Clientes en Riesgo Alto
            </CardTitle>
            <CardDescription>
              Requieren atención inmediata para evitar pérdida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {highRiskClients.map((client) => (
                <ClientHealthCard 
                  key={client.id} 
                  client={client} 
                  onClick={() => onClientClick?.(client.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medium Risk Clients */}
      {mediumRiskClients.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              Clientes en Riesgo Medio
            </CardTitle>
            <CardDescription>
              Monitorear de cerca y tomar acciones preventivas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mediumRiskClients.map((client) => (
                <ClientHealthCard 
                  key={client.id} 
                  client={client} 
                  onClick={() => onClientClick?.(client.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Healthy Clients */}
      {healthyClients.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Clientes Saludables
            </CardTitle>
            <CardDescription>
              Relación estable. Mantener comunicación regular.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {healthyClients.slice(0, 6).map((client) => (
                <ClientHealthCard 
                  key={client.id} 
                  client={client} 
                  onClick={() => onClientClick?.(client.id)}
                />
              ))}
            </div>
            {healthyClients.length > 6 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                + {healthyClients.length - 6} clientes más
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Client Health Card Component
function ClientHealthCard({ client, onClick }: { client: Client; onClick?: () => void }) {
  const lastContact = client.last_contact_date ? new Date(client.last_contact_date) : null;
  const daysSinceContact = lastContact ? differenceInDays(new Date(), lastContact) : null;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${getRiskColor(client.risk_level)}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{client.name}</p>
              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                client.risk_level === 'high' ? 'border-red-400 text-red-600' :
                client.risk_level === 'medium' ? 'border-orange-400 text-orange-600' :
                'border-green-400 text-green-600'
              }`}
            >
              {client.risk_level === 'high' ? 'Alto' : 
               client.risk_level === 'medium' ? 'Medio' : 'Bajo'}
            </Badge>
          </div>

          {/* Health Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Salud</span>
              <span className="font-medium">{client.health_score}%</span>
            </div>
            <Progress 
              value={client.health_score} 
              className="h-2"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {daysSinceContact !== null ? `${daysSinceContact}d` : 'Sin contacto'}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {client.open_cases || 0} casos
            </div>
          </div>

          {/* Payment Status */}
          {client.payment_status !== 'current' && (
            <Badge 
              variant="outline" 
              className={`text-xs w-full justify-center ${
                client.payment_status === 'overdue' ? 'border-red-400 text-red-600 bg-red-50' :
                'border-yellow-400 text-yellow-600 bg-yellow-50'
              }`}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              {client.payment_status === 'overdue' ? 'Pago vencido' : 'Pago pendiente'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
