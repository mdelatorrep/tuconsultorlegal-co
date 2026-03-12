import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit2, Trash2, Mail, Phone, MapPin, Building, User, Briefcase, FileText, Activity, LinkIcon, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClientCasesTab from './ClientCasesTab';
import ClientDocumentsTab from './ClientDocumentsTab';
import ClientPortalActivity from './ClientPortalActivity';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  client_type: string;
  status: string;
  tags: string[];
  notes?: string;
  created_at: string;
  cases_count?: number;
}

interface ClientDetailPanelProps {
  client: Client;
  lawyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active': return { label: 'Activo', variant: 'default' as const, color: 'text-green-600', bg: 'bg-green-500/10' };
    case 'inactive': return { label: 'Inactivo', variant: 'secondary' as const, color: 'text-muted-foreground', bg: 'bg-muted' };
    case 'prospect': return { label: 'Prospecto', variant: 'outline' as const, color: 'text-amber-600', bg: 'bg-amber-500/10' };
    default: return { label: status, variant: 'secondary' as const, color: 'text-muted-foreground', bg: 'bg-muted' };
  }
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const ClientDetailPanel: React.FC<ClientDetailPanelProps> = ({ client, lawyerId, open, onOpenChange, onEdit, onDelete }) => {
  const statusConfig = getStatusConfig(client.status);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);

  const handleSharePortal = async () => {
    setIsGeneratingLink(true);
    try {
      // Check if there's already an active access for this client
      const { data: existing } = await supabase
        .from('client_portal_access')
        .select('access_token')
        .eq('client_id', client.id)
        .eq('lawyer_id', lawyerId)
        .eq('is_active', true)
        .maybeSingle();

      let token: string;
      if (existing?.access_token) {
        token = existing.access_token;
      } else {
        // Generate new access
        token = crypto.randomUUID();
        const { error } = await supabase
          .from('client_portal_access')
          .insert({
            client_id: client.id,
            lawyer_id: lawyerId,
            email: client.email,
            access_token: token,
            is_active: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        if (error) throw error;
      }

      const link = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(link);
      setPortalLinkCopied(true);
      toast.success('Enlace del portal copiado al portapapeles');
      setTimeout(() => setPortalLinkCopied(false), 3000);
    } catch (err) {
      console.error('Error generating portal link:', err);
      toast.error('Error al generar enlace del portal');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`${statusConfig.bg} ${statusConfig.color} text-lg font-semibold`}>
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl">{client.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {client.client_type === 'company' ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />}
                {client.client_type === 'company' ? 'Empresa' : 'Persona Natural'}
                <span>•</span>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="resumen" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="casos" className="text-xs">
              <Briefcase className="h-3 w-3 mr-1" />
              Casos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="actividad" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Portal
            </TabsTrigger>
          </TabsList>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Contacto</h4>
              <div className="grid gap-2">
                <a href={`mailto:${client.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.email}</p>
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                  </div>
                </a>
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{client.phone}</p>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                    </div>
                  </a>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{client.address}</p>
                      <p className="text-xs text-muted-foreground">Dirección</p>
                    </div>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Building className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{client.company}</p>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">{client.cases_count || 0}</p>
                <p className="text-xs text-muted-foreground">Casos asociados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm font-medium">
                  {format(new Date(client.created_at), "d MMM yyyy", { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground">Cliente desde</p>
              </div>
            </div>

            {client.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Notas</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{client.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Casos Tab */}
          <TabsContent value="casos" className="mt-4">
            <ClientCasesTab clientId={client.id} lawyerId={lawyerId} />
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="mt-4">
            <ClientDocumentsTab clientId={client.id} lawyerId={lawyerId} clientName={client.name} />
          </TabsContent>

          {/* Actividad Portal Tab */}
          <TabsContent value="actividad" className="mt-4">
            <ClientPortalActivity clientId={client.id} lawyerId={lawyerId} />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSharePortal}
            disabled={isGeneratingLink}
          >
            {portalLinkCopied ? <Check className="h-4 w-4 mr-1" /> : <LinkIcon className="h-4 w-4 mr-1" />}
            {portalLinkCopied ? 'Copiado' : 'Compartir Portal'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onEdit(client)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(client.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailPanel;
