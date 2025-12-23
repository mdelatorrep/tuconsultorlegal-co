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

interface ClientPortalPageProps {
  accessToken: string;
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

export function ClientPortalPage({ accessToken }: ClientPortalPageProps) {
  const [loading, setLoading] = useState(true);
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateAccess();
  }, [accessToken]);

  const validateAccess = async () => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (error || !portalAccess || !client) {
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
                <h1 className="font-bold">{client.name}</h1>
                <p className="text-sm text-muted-foreground">{client.email}</p>
              </div>
            </div>
            
            {lawyer && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tu abogado</p>
                <p className="font-medium">{lawyer.full_name}</p>
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
              <span className="hidden sm:inline">Mis Casos</span>
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
            <CaseStatus 
              clientId={client.id} 
              lawyerId={portalAccess.lawyer_id} 
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload 
              clientId={client.id} 
              lawyerId={portalAccess.lawyer_id} 
            />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentScheduler 
              clientId={client.id} 
              lawyerId={portalAccess.lawyer_id}
              lawyerName={lawyer?.full_name || ''}
            />
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
