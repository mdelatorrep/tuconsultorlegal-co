import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, 
  FileText, 
  Calendar, 
  MessageSquare,
  User,
  LogOut,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CaseStatus } from './CaseStatus';
import { DocumentUpload } from './DocumentUpload';
import { AppointmentScheduler } from './AppointmentScheduler';
import { InviteClientDialog } from './InviteClientDialog';

interface ClientPortalPageProps {
  accessToken?: string;
  lawyerId?: string;
}

interface PortalAccess {
  id: string;
  client_id: string;
  lawyer_id: string;
  email: string;
  is_active: boolean;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Lawyer {
  id: string;
  full_name: string;
  email: string;
}

export function ClientPortalPage({ accessToken, lawyerId }: ClientPortalPageProps) {
  const [loading, setLoading] = useState(true);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Lawyer mode: show all clients for this lawyer
  const isLawyerMode = !!lawyerId && !accessToken;

  useEffect(() => {
    if (isLawyerMode) {
      loadLawyerClients();
    } else if (accessToken) {
      validateAccess();
    }
  }, [accessToken, lawyerId]);

  const loadLawyerClients = async () => {
    if (!lawyerId) return;
    try {
      setLoading(true);
      
      // Get lawyer info
      const { data: lawyerData } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email')
        .eq('id', lawyerId)
        .single();

      if (lawyerData) {
        setLawyer(lawyerData);
      }

      // Get all clients for this lawyer
      const { data: clientsData, error: clientsError } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('name');

      if (clientsError) {
        console.error('Error loading clients:', clientsError);
        setError('Error al cargar clientes');
        return;
      }

      setClients(clientsData || []);
      if (clientsData && clientsData.length > 0) {
        setSelectedClientId(clientsData[0].id);
        setClient(clientsData[0]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const validateAccess = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      
      // Validate the access token
      const { data: access, error: accessError } = await supabase
        .from('client_portal_access')
        .select('*')
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .single();

      if (accessError || !access) {
        setError('Token de acceso inválido o expirado');
        return;
      }

      // Check expiration
      if (access.expires_at && new Date(access.expires_at) < new Date()) {
        setError('El acceso ha expirado. Contacta a tu abogado.');
        return;
      }

      setPortalAccess(access);

      // Get client info
      const { data: clientData } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('id', access.client_id)
        .single();

      if (clientData) {
        setClient(clientData);
      }

      // Get lawyer info
      const { data: lawyerData } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email')
        .eq('id', access.lawyer_id)
        .single();

      if (lawyerData) {
        setLawyer(lawyerData);
      }

      // Update last access
      await supabase
        .from('client_portal_access')
        .update({ last_access_at: new Date().toISOString() })
        .eq('id', access.id);

    } catch (err) {
      console.error('Error validating access:', err);
      setError('Error al validar el acceso');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setClient(selectedClient);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {isLawyerMode ? 'Cargando portal de clientes...' : 'Verificando acceso...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isLawyerMode && (error || !portalAccess || !client)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <LogOut className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground mb-4">{error || 'No se pudo verificar tu acceso al portal.'}</p>
            <Button onClick={() => window.location.href = '/'}>
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLawyerMode && clients.length === 0) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sin Clientes</h2>
            <p className="text-muted-foreground">
              Aún no tienes clientes registrados. Agrega clientes desde el módulo CRM.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveLawyerId = isLawyerMode ? lawyerId! : (portalAccess?.lawyer_id || '');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                {isLawyerMode && clients.length > 1 ? (
                  <select 
                    value={selectedClientId || ''}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="font-bold bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <h1 className="font-bold">{client?.name}</h1>
                )}
                <p className="text-sm text-muted-foreground">{client?.email}</p>
              </div>
            </div>
            
            {lawyer && !isLawyerMode && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tu abogado</p>
                <p className="font-medium">{lawyer.full_name}</p>
              </div>
            )}
            
            {isLawyerMode && (
              <div className="flex items-center gap-3">
                <InviteClientDialog 
                  lawyerId={lawyerId!} 
                  clients={clients}
                />
                <Badge variant="secondary">Vista de Administrador</Badge>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Casos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Citas</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensajes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            {client && (
              <CaseStatus 
                clientId={client.id} 
                lawyerId={effectiveLawyerId} 
              />
            )}
          </TabsContent>

          <TabsContent value="documents">
            {client && (
              <DocumentUpload 
                clientId={client.id} 
                lawyerId={effectiveLawyerId} 
              />
            )}
          </TabsContent>

          <TabsContent value="appointments">
            {client && (
              <AppointmentScheduler 
                clientId={client.id} 
                lawyerId={effectiveLawyerId}
                lawyerName={lawyer?.full_name || ''}
              />
            )}
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Mensajes</CardTitle>
                <CardDescription>
                  Comunicación con tu abogado
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Sistema de mensajería próximamente disponible
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
