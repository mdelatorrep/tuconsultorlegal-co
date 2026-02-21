import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Building2, Mail, Phone, MapPin, Globe, 
  Users, Briefcase, FileText, MessageSquare, Calendar,
  Edit, DollarSign, Plus, Heart, TrendingUp, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import EntityContactsList from "./EntityContactsList";
import ContactForm from "./ContactForm";

interface Entity {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  entity_type: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  status: string;
  health_score: number;
  lifetime_value: number;
  contract_type: string | null;
  contract_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  notes: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  is_billing_contact: boolean;
  is_decision_maker: boolean;
  status: string;
  last_contact_date: string | null;
  communication_preference: string;
  notes: string | null;
}

interface Case {
  id: string;
  title: string;
  case_type: string;
  status: string;
  priority: string;
  pipeline_stage: string | null;
  expected_value: number | null;
  created_at: string;
}

interface EntityDetailPageProps {
  entity: Entity;
  lawyerData: any;
  onBack: () => void;
  onUpdate: () => void;
}

const ENTITY_TYPES: Record<string, { label: string; color: string }> = {
  corporation: { label: "Empresa", color: "bg-primary/10 text-primary" },
  government: { label: "Gobierno", color: "bg-accent text-accent-foreground" },
  ngo: { label: "ONG", color: "bg-muted text-muted-foreground" },
  association: { label: "Asociación", color: "bg-amber-100 text-amber-800" },
  other: { label: "Otro", color: "bg-muted text-foreground" }
};

const CONTRACT_TYPES: Record<string, string> = {
  retainer: "Retainer (Iguala)",
  hourly: "Por Hora",
  fixed: "Precio Fijo",
  hybrid: "Híbrido"
};

export default function EntityDetailPage({ entity, lawyerData, onBack, onUpdate }: EntityDetailPageProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [entity.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contactsResult, casesResult] = await Promise.all([
        supabase
          .from('crm_contacts')
          .select('*')
          .eq('entity_id', entity.id)
          .order('is_primary', { ascending: false })
          .order('name'),
        supabase
          .from('crm_cases')
          .select('*')
          .eq('entity_id', entity.id)
          .order('created_at', { ascending: false })
      ]);

      if (contactsResult.error) throw contactsResult.error;
      if (casesResult.error) throw casesResult.error;

      setContacts(contactsResult.data || []);
      setCases(casesResult.data || []);
    } catch (error) {
      console.error('Error fetching entity data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la entidad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContact = async (contactData: any) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .insert({
          ...contactData,
          entity_id: entity.id,
          lawyer_id: lawyerData.id
        });

      if (error) throw error;

      toast({
        title: "Contacto creado",
        description: "El contacto se ha agregado a la entidad"
      });

      setShowContactForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el contacto",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-100";
    if (score >= 60) return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  const getContractStatus = () => {
    if (!entity.contract_end) return null;
    const daysUntilEnd = differenceInDays(new Date(entity.contract_end), new Date());
    
    if (daysUntilEnd < 0) return { status: "expired", label: "Vencido", color: "bg-red-100 text-red-800" };
    if (daysUntilEnd <= 30) return { status: "expiring", label: `Vence en ${daysUntilEnd} días`, color: "bg-amber-100 text-amber-800" };
    return { status: "active", label: "Vigente", color: "bg-green-100 text-green-800" };
  };

  const contractStatus = getContractStatus();

  const primaryContact = contacts.find(c => c.is_primary);
  const activeCases = cases.filter(c => c.status === 'active' || c.status === 'in_progress');
  const totalCaseValue = cases.reduce((sum, c) => sum + (c.expected_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{entity.name}</h1>
                <Badge className={ENTITY_TYPES[entity.entity_type]?.color}>
                  {ENTITY_TYPES[entity.entity_type]?.label}
                </Badge>
                <Badge className={getHealthColor(entity.health_score)}>
                  <Heart className="h-3 w-3 mr-1" />
                  {entity.health_score}%
                </Badge>
              </div>
              {entity.legal_name && (
                <p className="text-muted-foreground">{entity.legal_name}</p>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{contacts.length}</p>
            <p className="text-xs text-muted-foreground">Contactos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{activeCases.length}</p>
            <p className="text-xs text-muted-foreground">Casos Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{formatCurrency(entity.lifetime_value)}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted to-accent">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className={`text-2xl font-bold ${healthColor}`}>{entity.health_score || 0}</p>
            <p className="text-xs text-muted-foreground">Salud</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-muted to-accent">
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{cases.length}</p>
            <p className="text-xs text-muted-foreground">Total Casos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="contacts">
            Contactos ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="cases">
            Casos ({cases.length})
          </TabsTrigger>
          <TabsTrigger value="contract">Contrato</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de la Entidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entity.tax_id && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">NIT/RUT</p>
                      <p className="font-medium">{entity.tax_id}</p>
                    </div>
                  </div>
                )}
                {entity.industry && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sector</p>
                      <p className="font-medium">{entity.industry}</p>
                    </div>
                  </div>
                )}
                {entity.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${entity.email}`} className="font-medium text-primary hover:underline">
                        {entity.email}
                      </a>
                    </div>
                  </div>
                )}
                {entity.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <a href={`tel:${entity.phone}`} className="font-medium">{entity.phone}</a>
                    </div>
                  </div>
                )}
                {entity.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sitio Web</p>
                      <a href={entity.website} target="_blank" rel="noopener noreferrer" 
                         className="font-medium text-primary hover:underline">
                        {entity.website}
                      </a>
                    </div>
                  </div>
                )}
                {(entity.address || entity.city) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="font-medium">
                        {entity.address}{entity.address && entity.city ? ", " : ""}{entity.city}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Primary Contact Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Contacto Principal</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowContactForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </CardHeader>
              <CardContent>
                {primaryContact ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                        {primaryContact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{primaryContact.name}</p>
                        <p className="text-sm text-muted-foreground">{primaryContact.role || "Sin cargo definido"}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      {primaryContact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${primaryContact.email}`} className="text-blue-600 hover:underline">
                            {primaryContact.email}
                          </a>
                        </div>
                      )}
                      {primaryContact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${primaryContact.phone}`}>{primaryContact.phone}</a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay contacto principal definido</p>
                    <Button size="sm" variant="link" onClick={() => setShowContactForm(true)}>
                      Agregar primer contacto
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {entity.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{entity.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <EntityContactsList 
            contacts={contacts}
            entityId={entity.id}
            lawyerData={lawyerData}
            onAddContact={() => setShowContactForm(true)}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Casos de {entity.name}</h3>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Caso
            </Button>
          </div>
          
          {cases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin casos</h3>
                <p className="text-muted-foreground mb-4">
                  Esta entidad no tiene casos registrados
                </p>
                <Button>Crear primer caso</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{caseItem.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline">{caseItem.case_type}</Badge>
                          <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'}>
                            {caseItem.status}
                          </Badge>
                          {caseItem.pipeline_stage && (
                            <span>• {caseItem.pipeline_stage}</span>
                          )}
                        </div>
                      </div>
                      {caseItem.expected_value && (
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">
                            {formatCurrency(caseItem.expected_value)}
                          </p>
                          <p className="text-xs text-muted-foreground">Valor esperado</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Contrato Marco</CardTitle>
                {contractStatus && (
                  <Badge className={contractStatus.color}>{contractStatus.label}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {entity.contract_type ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                      <p className="font-medium">{CONTRACT_TYPES[entity.contract_type] || entity.contract_type}</p>
                    </div>
                    {entity.contract_value && (
                      <div>
                        <p className="text-sm text-muted-foreground">Valor del Contrato</p>
                        <p className="font-medium text-lg text-emerald-600">
                          {formatCurrency(entity.contract_value)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {entity.contract_start && (
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                        <p className="font-medium">
                          {format(new Date(entity.contract_start), "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                    {entity.contract_end && (
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Fin</p>
                        <p className="font-medium">
                          {format(new Date(entity.contract_end), "dd 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay contrato marco definido</p>
                  <Button size="sm" variant="link">Agregar contrato</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Contacto</DialogTitle>
            <DialogDescription>
              Agrega una persona de contacto a {entity.name}
            </DialogDescription>
          </DialogHeader>
          <ContactForm 
            onSubmit={handleCreateContact}
            onCancel={() => setShowContactForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
