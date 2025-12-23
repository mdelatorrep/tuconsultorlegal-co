import { useState } from 'react';
import { Copy, Check, Users, Gift, Share2, MessageCircle, Mail, Link2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ReferralInfo } from '@/hooks/useGamification';

interface ReferralSectionProps {
  referralInfo: ReferralInfo | null;
  referrals: ReferralInfo[];
  onApplyCode?: (code: string) => Promise<{ success: boolean }>;
  loading?: boolean;
}

export function ReferralSection({ 
  referralInfo, 
  referrals, 
  onApplyCode,
  loading 
}: ReferralSectionProps) {
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);
  const { toast } = useToast();

  const referralLink = referralInfo?.referral_code 
    ? `${window.location.origin}/#abogados?ref=${referralInfo.referral_code}`
    : '';

  const shareMessage = referralInfo?.referral_code 
    ? `¡Únete a tuconsultorlegal.co! Usa mi código de referido ${referralInfo.referral_code} y obtén 15 créditos gratis. Regístrate aquí: ${referralLink}`
    : '';

  const handleCopy = async () => {
    if (!referralInfo?.referral_code) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: '¡Copiado!', description: 'Enlace de referido copiado al portapapeles' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Error', description: 'No se pudo copiar el enlace', variant: 'destructive' });
    }
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('Te invito a tuconsultorlegal.co');
    const body = encodeURIComponent(shareMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim() || !onApplyCode) return;
    
    setApplying(true);
    const result = await onApplyCode(applyCode.trim());
    setApplying(false);
    
    if (result.success) {
      setApplyCode('');
    }
  };

  const completedReferrals = referrals.filter(r => r.status === 'credited').length;
  const pendingReferrals = referrals.filter(r => r.status === 'completed').length;
  const totalCreditsEarned = referrals.reduce((sum, r) => sum + r.credits_awarded_referrer, 0);

  return (
    <div className="space-y-6">
      {/* Your Referral Code */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Tu Código de Referido
          </CardTitle>
          <CardDescription>
            Comparte tu código y gana <span className="font-bold text-primary">20 créditos</span> por cada colega que se registre. 
            Tu colega recibirá <span className="font-bold text-green-600">15 créditos</span> de bienvenida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralInfo?.referral_code ? (
            <>
              {/* Code Display */}
              <div className="flex gap-2">
                <Input 
                  value={referralInfo.referral_code} 
                  readOnly 
                  className="font-mono text-lg font-bold text-center bg-background"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Link Display */}
              <div className="flex gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="text-xs text-muted-foreground bg-muted/50"
                />
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="bg-green-600 hover:bg-green-700 flex-1 min-w-[120px]"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleShareEmail}
                  className="flex-1 min-w-[120px]"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1 min-w-[120px]"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {copied ? '¡Copiado!' : 'Copiar enlace'}
                </Button>
              </div>

              {/* How it works */}
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-2">¿Cómo funciona?</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Comparte tu enlace con un colega abogado</li>
                  <li>Tu colega se registra usando tu enlace</li>
                  <li>Al completar el registro, ambos reciben créditos automáticamente</li>
                </ol>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Tu código de referido se generará automáticamente
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completedReferrals}</div>
              <div className="text-xs text-muted-foreground">Referidos exitosos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{pendingReferrals}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalCreditsEarned}</div>
              <div className="text-xs text-muted-foreground">Créditos ganados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Referral Code */}
      {onApplyCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              ¿Tienes un código de referido?
            </CardTitle>
            <CardDescription>
              Ingresa el código de un colega y recibe 15 créditos de bienvenida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                placeholder="Ej: REF-ABC123"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button 
                onClick={handleApplyCode}
                disabled={!applyCode.trim() || applying}
              >
                {applying ? 'Aplicando...' : 'Aplicar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tus Referidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div 
                  key={ref.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{ref.referred_email || 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ref.status === 'credited' ? 'default' : 'secondary'}>
                      {ref.status === 'credited' ? 'Completado' : 
                       ref.status === 'completed' ? 'Pendiente' : 'En espera'}
                    </Badge>
                    {ref.credits_awarded_referrer > 0 && (
                      <Badge variant="outline" className="text-green-600">
                        +{ref.credits_awarded_referrer}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}