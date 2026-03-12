import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, Copy, Check, Trash2, UserPlus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InviteClientDialog } from '@/components/client-portal/InviteClientDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PortalAccess {
  id: string;
  client_id: string;
  email: string;
  access_token: string;
  is_active: boolean;
  expires_at: string | null;
  last_access_at: string | null;
  created_at: string;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface PortalAccessManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyerId: string;
  clients: Client[];
}

export default function PortalAccessManager({ open, onOpenChange, lawyerId, clients }: PortalAccessManagerProps) {
  const [accesses, setAccesses] = useState<PortalAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchAccesses();
  }, [open]);

  const fetchAccesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_portal_access')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with client names
      const enriched = (data || []).map(a => {
        const client = clients.find(c => c.id === a.client_id);
        return { ...a, client_name: client?.name || a.email };
      });
      setAccesses(enriched);
    } catch (err) {
      console.error('Error fetching portal accesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const revokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_access')
        .update({ is_active: false })
        .eq('id', accessId);

      if (error) throw error;
      toast.success('Acceso revocado');
      fetchAccesses();
    } catch (err) {
      toast.error('Error al revocar acceso');
    }
  };

  const copyLink = (token: string, id: string) => {
    const link = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Enlace copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeAccesses = accesses.filter(a => a.is_active);
  const inactiveAccesses = accesses.filter(a => !a.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Gestionar Accesos al Portal
          </DialogTitle>
          <DialogDescription>
            Administra los enlaces de acceso al portal para tus clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <InviteClientDialog
            lawyerId={lawyerId}
            clients={clients}
            onInviteSent={fetchAccesses}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : accesses.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No has generado accesos al portal aún.</p>
            <p className="text-muted-foreground text-xs mt-1">Usa el botón "Invitar Cliente" para crear un enlace.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAccesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Accesos Activos ({activeAccesses.length})</h4>
                {activeAccesses.map(access => (
                  <Card key={access.id} className="border-primary/20">
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{access.client_name}</p>
                        <p className="text-xs text-muted-foreground">{access.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default" className="text-[10px] h-5">Activo</Badge>
                          {access.last_access_at && (
                            <span className="text-[10px] text-muted-foreground">
                              Último acceso: {format(new Date(access.last_access_at), "d MMM yyyy", { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => copyLink(access.access_token, access.id)}
                        >
                          {copiedId === access.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => window.open(`/portal/${access.access_token}`, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => revokeAccess(access.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {inactiveAccesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Revocados ({inactiveAccesses.length})</h4>
                {inactiveAccesses.map(access => (
                  <Card key={access.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{access.client_name}</p>
                        <p className="text-xs text-muted-foreground">{access.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5">Revocado</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
