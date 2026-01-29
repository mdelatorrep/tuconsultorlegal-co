import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Phone, 
  Mail, 
  Star, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Zap,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  searchTerm: string;
  onRefresh: () => void;
  lawyerData: any;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  origin: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  score: number;
  nurture_stage: string;
  created_at: string;
  last_activity_date: string | null;
  interaction_count: number;
  estimated_case_value: number | null;
}

const NURTURE_STAGES = [
  { id: 'new', label: 'Nuevo', description: 'Sin contactar' },
  { id: 'first_contact', label: 'Primer Contacto', description: 'Email/llamada inicial' },
  { id: 'follow_up', label: 'Seguimiento', description: 'En proceso de nurture' },
  { id: 'meeting_scheduled', label: 'Reunión Agendada', description: 'Cita programada' },
  { id: 'proposal_sent', label: 'Propuesta Enviada', description: 'Esperando respuesta' },
  { id: 'negotiation', label: 'Negociación', description: 'Definiendo términos' }
];

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-600 bg-green-100';
  if (score >= 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-gray-600 bg-gray-100';
};

const getScoreLabel = (score: number) => {
  if (score >= 70) return 'Caliente';
  if (score >= 40) return 'Tibio';
  return 'Frío';
};

export default function LeadPipeline({ searchTerm, onRefresh, lawyerData }: Props) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionData, setConversionData] = useState({
    caseTitle: '',
    caseType: 'civil',
    estimatedValue: ''
  });

  useEffect(() => {
    fetchLeads();
  }, [lawyerData.id]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .in('status', ['new', 'contacted', 'qualified'])
        .order('score', { ascending: false });

      if (error) throw error;

      setLeads((data || []).map(l => ({
        ...l,
        score: l.score || calculateInitialScore(l),
        nurture_stage: l.nurture_stage || 'new',
        interaction_count: l.interaction_count || 0
      })) as Lead[]);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateInitialScore = (lead: any): number => {
    let score = 20; // Base score

    // Origin bonus
    if (lead.origin === 'referido') score += 30;
    else if (lead.origin === 'perfil_publico') score += 20;
    else if (lead.origin === 'web') score += 10;

    // Phone provided bonus
    if (lead.phone) score += 15;

    // Message length (engagement indicator)
    if (lead.message && lead.message.length > 200) score += 15;
    else if (lead.message && lead.message.length > 100) score += 10;

    // Recent lead bonus
    const hoursAgo = differenceInHours(new Date(), new Date(lead.created_at));
    if (hoursAgo < 24) score += 20;
    else if (hoursAgo < 72) score += 10;

    return Math.min(score, 100);
  };

  const updateLeadScore = async (leadId: string, newScore: number) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ score: newScore, last_activity_date: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead score:', error);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ 
          status: newStatus, 
          last_activity_date: new Date().toISOString() 
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El lead ha sido actualizado",
      });

      fetchLeads();
      onRefresh();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleConvertToClient = async () => {
    if (!selectedLead || !conversionData.caseTitle) return;

    setConverting(true);
    try {
      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from('crm_clients')
        .insert({
          lawyer_id: lawyerData.id,
          name: selectedLead.name,
          email: selectedLead.email,
          phone: selectedLead.phone,
          client_type: 'individual',
          status: 'active',
          notes: `Convertido desde lead. Mensaje inicial: ${selectedLead.message}`
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create case
      const { error: caseError } = await supabase
        .from('crm_cases')
        .insert({
          lawyer_id: lawyerData.id,
          client_id: clientData.id,
          title: conversionData.caseTitle,
          case_type: conversionData.caseType,
          status: 'active',
          pipeline_stage: 'inicial',
          expected_value: conversionData.estimatedValue ? parseFloat(conversionData.estimatedValue) : 0,
          probability: 50,
          priority: 'medium'
        });

      if (caseError) throw caseError;

      // Update lead status
      await updateLeadStatus(selectedLead.id, 'converted');

      toast({
        title: "¡Lead convertido!",
        description: "Se creó el cliente y el caso exitosamente",
      });

      setShowConvertDialog(false);
      setSelectedLead(null);
      setConversionData({ caseTitle: '', caseType: 'civil', estimatedValue: '' });
    } catch (error) {
      console.error('Error converting lead:', error);
      toast({
        title: "Error",
        description: "No se pudo convertir el lead",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group leads by temperature
  const hotLeads = filteredLeads.filter(l => l.score >= 70);
  const warmLeads = filteredLeads.filter(l => l.score >= 40 && l.score < 70);
  const coldLeads = filteredLeads.filter(l => l.score < 40);

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
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leads.length}</p>
                <p className="text-xs text-muted-foreground">Total Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{hotLeads.length}</p>
                <p className="text-xs text-muted-foreground">Leads Calientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{warmLeads.length}</p>
                <p className="text-xs text-muted-foreground">Leads Tibios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{coldLeads.length}</p>
                <p className="text-xs text-muted-foreground">Leads Fríos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot Leads Section */}
      {hotLeads.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Zap className="h-5 w-5" />
              Leads Calientes - ¡Actúa Ya!
            </CardTitle>
            <CardDescription>
              Alta probabilidad de conversión. Contacta en las próximas 24 horas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hotLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onConvert={() => {
                    setSelectedLead(lead);
                    setConversionData({ 
                      caseTitle: `Caso ${lead.name}`, 
                      caseType: 'civil', 
                      estimatedValue: lead.estimated_case_value?.toString() || '' 
                    });
                    setShowConvertDialog(true);
                  }}
                  onUpdateStatus={updateLeadStatus}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warm Leads Section */}
      {warmLeads.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <TrendingUp className="h-5 w-5" />
              Leads Tibios - Nutrir
            </CardTitle>
            <CardDescription>
              Potencial medio. Requieren seguimiento y contenido de valor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {warmLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onConvert={() => {
                    setSelectedLead(lead);
                    setConversionData({ 
                      caseTitle: `Caso ${lead.name}`, 
                      caseType: 'civil', 
                      estimatedValue: '' 
                    });
                    setShowConvertDialog(true);
                  }}
                  onUpdateStatus={updateLeadStatus}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cold Leads Section */}
      {coldLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5" />
              Leads Fríos - Largo Plazo
            </CardTitle>
            <CardDescription>
              Bajo interés actual. Mantener en ciclo de nurture automático.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coldLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onConvert={() => {
                    setSelectedLead(lead);
                    setConversionData({ 
                      caseTitle: `Caso ${lead.name}`, 
                      caseType: 'civil', 
                      estimatedValue: '' 
                    });
                    setShowConvertDialog(true);
                  }}
                  onUpdateStatus={updateLeadStatus}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Sin leads activos</p>
            <p className="text-muted-foreground">
              {searchTerm ? 'No se encontraron leads con ese criterio' : 'Los leads llegarán a través de tu perfil público'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversion Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir Lead a Cliente</DialogTitle>
            <DialogDescription>
              Se creará un nuevo cliente y caso para {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título del Caso</Label>
              <Input
                value={conversionData.caseTitle}
                onChange={(e) => setConversionData(prev => ({ ...prev, caseTitle: e.target.value }))}
                placeholder="Ej: Demanda laboral García vs Empresa XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Caso</Label>
              <Select 
                value={conversionData.caseType}
                onValueChange={(value) => setConversionData(prev => ({ ...prev, caseType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="penal">Penal</SelectItem>
                  <SelectItem value="laboral">Laboral</SelectItem>
                  <SelectItem value="familia">Familia</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Estimado (COP)</Label>
              <Input
                type="number"
                value={conversionData.estimatedValue}
                onChange={(e) => setConversionData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                placeholder="Ej: 5000000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConvertToClient}
              disabled={converting || !conversionData.caseTitle}
              className="bg-gradient-to-r from-green-500 to-green-600"
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convirtiendo...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Convertir a Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Lead Card Component
function LeadCard({ 
  lead, 
  onConvert, 
  onUpdateStatus 
}: { 
  lead: Lead; 
  onConvert: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const hoursAgo = differenceInHours(new Date(), new Date(lead.created_at));
  const isRecent = hoursAgo < 48;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{lead.name}</p>
                {isRecent && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    Nuevo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
            </div>
            <Badge className={`${getScoreColor(lead.score)} text-xs`}>
              <Star className="h-3 w-3 mr-1" />
              {lead.score}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(lead.created_at), 'dd MMM', { locale: es })}
            </span>
          </div>

          {/* Score Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Score</span>
              <span className={getScoreColor(lead.score).split(' ')[0]}>
                {getScoreLabel(lead.score)}
              </span>
            </div>
            <Progress value={lead.score} className="h-2" />
          </div>

          {/* Message Preview */}
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
            "{lead.message}"
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onUpdateStatus(lead.id, 'contacted')}
            >
              <Phone className="h-3 w-3 mr-1" />
              Contactar
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
              onClick={onConvert}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Convertir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
