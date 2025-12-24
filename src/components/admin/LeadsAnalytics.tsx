import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, Users, TrendingUp, MessageCircle, RefreshCw,
  AlertCircle, CheckCircle, Clock, Mail, Phone, ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  origin: string;
  lawyer_id: string;
  lawyer_name?: string;
  created_at: string;
  updated_at: string;
}

interface LawyerLeadStats {
  lawyer_id: string;
  lawyer_name: string;
  total_leads: number;
  converted: number;
  pending: number;
  conversion_rate: number;
}

export const LeadsAnalytics = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerLeadStats[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    converted: 0,
    conversionRate: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeadsData();
  }, []);

  const loadLeadsData = async () => {
    setIsLoading(true);
    try {
      // Fetch leads with lawyer info
      const { data: leadsData, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          lawyer_profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const processedLeads = (leadsData || []).map(l => ({
        ...l,
        lawyer_name: l.lawyer_profiles?.full_name || 'Desconocido'
      }));

      setLeads(processedLeads);

      // Calculate metrics
      const total = processedLeads.length;
      const pending = processedLeads.filter(l => l.status === 'new' || l.status === 'pending').length;
      const contacted = processedLeads.filter(l => l.status === 'contacted').length;
      const converted = processedLeads.filter(l => l.status === 'converted' || l.status === 'client').length;
      const conversionRate = total > 0 ? (converted / total) * 100 : 0;

      setMetrics({
        total,
        pending,
        contacted,
        converted,
        conversionRate,
        avgResponseTime: 2.5 // Would need more data to calculate properly
      });

      // Calculate per-lawyer stats
      const lawyerMap = new Map<string, LawyerLeadStats>();
      
      processedLeads.forEach(lead => {
        if (!lawyerMap.has(lead.lawyer_id)) {
          lawyerMap.set(lead.lawyer_id, {
            lawyer_id: lead.lawyer_id,
            lawyer_name: lead.lawyer_name || 'Desconocido',
            total_leads: 0,
            converted: 0,
            pending: 0,
            conversion_rate: 0
          });
        }
        
        const stats = lawyerMap.get(lead.lawyer_id)!;
        stats.total_leads++;
        
        if (lead.status === 'converted' || lead.status === 'client') {
          stats.converted++;
        }
        if (lead.status === 'new' || lead.status === 'pending') {
          stats.pending++;
        }
      });

      // Calculate conversion rates
      lawyerMap.forEach(stats => {
        stats.conversion_rate = stats.total_leads > 0 
          ? (stats.converted / stats.total_leads) * 100 
          : 0;
      });

      const sortedStats = Array.from(lawyerMap.values())
        .sort((a, b) => b.total_leads - a.total_leads);

      setLawyerStats(sortedStats);

    } catch (error) {
      console.error('Error loading leads data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-700">Nuevo</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>;
      case 'contacted':
        return <Badge className="bg-indigo-100 text-indigo-700">Contactado</Badge>;
      case 'converted':
      case 'client':
        return <Badge className="bg-emerald-100 text-emerald-700">Convertido</Badge>;
      case 'lost':
        return <Badge className="bg-red-100 text-red-700">Perdido</Badge>;
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

  const pendingLeads = leads.filter(l => l.status === 'new' || l.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Analytics de Leads
          </h2>
          <p className="text-muted-foreground">
            Seguimiento de leads generados para abogados
          </p>
        </div>
        <Button variant="outline" onClick={loadLeadsData}>
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
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{metrics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Atender</p>
                <p className="text-3xl font-bold text-amber-600">{metrics.pending}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contactados</p>
                <p className="text-3xl font-bold text-indigo-600">{metrics.contacted}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidos</p>
                <p className="text-3xl font-bold text-emerald-600">{metrics.converted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Conversión</p>
                <p className="text-3xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Leads Alert */}
      {pendingLeads.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">{pendingLeads.length} leads sin atender</p>
                  <p className="text-sm text-muted-foreground">
                    Estos leads están esperando respuesta. Cuanto más rápido se contacte, mayor probabilidad de conversión.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Lawyer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leads por Abogado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {lawyerStats.map((stats) => (
                <div key={stats.lawyer_id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm truncate flex-1">{stats.lawyer_name}</p>
                    <Badge variant="outline">{stats.total_leads} leads</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-bold text-amber-600">{stats.pending}</p>
                      <p className="text-muted-foreground">Pendientes</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-600">{stats.converted}</p>
                      <p className="text-muted-foreground">Convertidos</p>
                    </div>
                    <div>
                      <p className="font-bold">{stats.conversion_rate.toFixed(0)}%</p>
                      <p className="text-muted-foreground">Conversión</p>
                    </div>
                  </div>
                  <Progress value={stats.conversion_rate} className="h-1 mt-2" />
                </div>
              ))}
              {lawyerStats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hay datos de leads</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Leads Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {leads.slice(0, 15).map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      {getStatusBadge(lead.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Para: {lead.lawyer_name} • {lead.origin}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </div>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No hay leads registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
