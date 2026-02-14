import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Award, ExternalLink, Share2, Download, CheckCircle, Calendar, User, Trophy } from "lucide-react";
import { toast } from "sonner";

interface CertificationBadgeProps {
  certificate: {
    id: string;
    certificate_name: string;
    certificate_code: string;
    issued_date: string;
    verification_url: string;
    linkedin_share_url: string;
    lawyer_name?: string;
  };
  showShareOptions?: boolean;
}

export default function CertificationBadge({ certificate, showShareOptions = true }: CertificationBadgeProps) {
  const [copying, setCopying] = useState(false);

  const handleLinkedInShare = () => {
    window.open(certificate.linkedin_share_url, '_blank', 'noopener,noreferrer');
    toast.success('Abriendo LinkedIn para compartir tu certificación');
  };

  const handleCopyVerification = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(certificate.verification_url);
      toast.success('URL de verificación copiada al portapapeles');
    } catch (error) {
      toast.error('Error al copiar la URL');
    } finally {
      setCopying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-primary/5 to-success/5 border-2 border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <CardTitle className="text-xl font-bold text-primary">
          Certificación Oficial
        </CardTitle>
        <Badge variant="default" className="mx-auto bg-success">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verificado
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Certificate Name */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {certificate.certificate_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            praxis-hub.co
          </p>
        </div>

        {/* Certificate Details */}
        <div className="space-y-3">
          {certificate.lawyer_name && (
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Otorgado a:</p>
                <p className="text-sm text-muted-foreground">{certificate.lawyer_name}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Fecha de emisión:</p>
              <p className="text-sm text-muted-foreground">{formatDate(certificate.issued_date)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Award className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Código de verificación:</p>
              <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                {certificate.certificate_code}
              </p>
            </div>
          </div>
        </div>

        {showShareOptions && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-center">Comparte tu logro</h4>
            
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={handleLinkedInShare}
                className="w-full bg-[#0077B5] hover:bg-[#0077B5]/90 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir en LinkedIn
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyVerification}
                disabled={copying}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {copying ? 'Copiando...' : 'Copiar URL de verificación'}
              </Button>
            </div>
          </div>
        )}

        {/* Verification Info */}
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Este certificado puede ser verificado en{' '}
            <a 
              href={certificate.verification_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              praxis-hub.co/certificacion
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}