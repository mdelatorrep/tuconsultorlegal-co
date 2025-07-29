import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { CheckCircle, Copy, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface DocumentCreationSuccessProps {
  token: string;
  onBack: () => void;
  onNavigateToTracking?: () => void;
}

export default function DocumentCreationSuccess({ 
  token, 
  onBack, 
  onNavigateToTracking 
}: DocumentCreationSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const trackingUrl = `${window.location.origin}/seguimiento?token=${token}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success('Código copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el código');
    }
  };

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setLinkCopied(true);
      toast.success('Link de seguimiento copiado');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el link');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl text-success">
            ¡Documento creado exitosamente!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Tu solicitud ha sido registrada. Guarda este código para hacer seguimiento a tu documento:
            </p>
            
            <div className="bg-muted rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Código de seguimiento:
                  </Label>
                  <p className="text-2xl font-mono font-bold text-primary mt-1">
                    {token}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="ml-4"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Link directo de seguimiento:
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLinkToClipboard}
                >
                  {linkCopied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm font-mono bg-background p-2 rounded border break-all">
                {trackingUrl}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">¿Qué sigue ahora?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Nuestro equipo legal revisará tu solicitud</li>
                <li>• Recibirás notificaciones por correo electrónico</li>
                <li>• Podrás hacer seguimiento con tu código o link directo</li>
                <li>• Una vez listo, procederás al pago</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Crear otro documento
            </Button>
            {onNavigateToTracking && (
              <Button
                onClick={onNavigateToTracking}
                className="flex-1"
              >
                Hacer seguimiento
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}