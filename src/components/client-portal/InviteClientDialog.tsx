import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Copy, 
  Check, 
  Send, 
  UserPlus, 
  Loader2,
  Link as LinkIcon,
  Mail,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface InviteClientDialogProps {
  lawyerId: string;
  clients: Client[];
  onInviteSent?: () => void;
}

export function InviteClientDialog({ lawyerId, clients, onInviteSent }: InviteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expirationDays, setExpirationDays] = useState('30');

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const generateAccessToken = () => {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateLink = async () => {
    if (!selectedClientId || !selectedClient) {
      toast.error('Selecciona un cliente');
      return;
    }

    setIsGenerating(true);
    try {
      const token = generateAccessToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));

      // Check if there's an existing active access for this client
      const { data: existingAccess } = await supabase
        .from('client_portal_access')
        .select('id')
        .eq('client_id', selectedClientId)
        .eq('lawyer_id', lawyerId)
        .eq('is_active', true)
        .single();

      if (existingAccess) {
        // Deactivate old access
        await supabase
          .from('client_portal_access')
          .update({ is_active: false })
          .eq('id', existingAccess.id);
      }

      // Create new access
      const { error } = await supabase
        .from('client_portal_access')
        .insert({
          client_id: selectedClientId,
          lawyer_id: lawyerId,
          email: selectedClient.email,
          access_token: token,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) throw error;

      const link = `${window.location.origin}/portal/${token}`;
      setGeneratedLink(link);
      toast.success('Enlace de acceso generado');
    } catch (error) {
      console.error('Error generating access:', error);
      toast.error('Error al generar el enlace de acceso');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleSendByEmail = async () => {
    if (!selectedClient || !generatedLink) return;

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedClient.email,
          subject: 'Acceso a tu Portal de Cliente',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">¡Hola ${selectedClient.name}!</h2>
              <p>Tu abogado te ha enviado acceso a tu portal de cliente donde podrás:</p>
              <ul>
                <li>Ver el estado de tus casos</li>
                <li>Compartir documentos de forma segura</li>
                <li>Programar citas</li>
                <li>Comunicarte con tu abogado</li>
              </ul>
              <p style="margin: 24px 0;">
                <a href="${generatedLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acceder al Portal
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                Este enlace expira en ${expirationDays} días. Si tienes problemas para acceder, 
                contacta a tu abogado.
              </p>
            </div>
          `
        }
      });

      if (error) throw error;

      toast.success(`Invitación enviada a ${selectedClient.email}`);
      onInviteSent?.();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error al enviar el correo. Puedes copiar el enlace y enviarlo manualmente.');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSelectedClientId('');
    setGeneratedLink('');
    setCopied(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Cliente al Portal</DialogTitle>
          <DialogDescription>
            Genera un enlace de acceso seguro para que tu cliente pueda acceder a su portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Seleccionar Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex flex-col">
                      <span>{client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label>Validez del enlace</Label>
            <Select value={expirationDays} onValueChange={setExpirationDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="365">1 año</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          {!generatedLink && (
            <Button 
              onClick={handleGenerateLink} 
              className="w-full"
              disabled={!selectedClientId || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4 mr-2" />
              )}
              Generar Enlace de Acceso
            </Button>
          )}

          {/* Generated Link */}
          {generatedLink && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Enlace Generado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    value={generatedLink} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSendByEmail}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar por Email
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full text-xs"
                  onClick={() => window.open(generatedLink, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Abrir enlace en nueva pestaña
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground text-center">
            El cliente podrá acceder usando este enlace sin necesidad de crear una cuenta.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
