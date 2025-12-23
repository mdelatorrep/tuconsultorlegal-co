import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  Loader2,
  FileCheck,
  User,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  History,
  RefreshCw,
} from "lucide-react";

interface LawyerVerificationModuleProps {
  lawyerId: string;
  lawyerEmail?: string;
}

interface VerificationHistory {
  id: string;
  verification_type: string;
  status: string;
  professional_name: string | null;
  bar_number: string | null;
  professional_status: string | null;
  verified_at: string | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

const QUALITY_TYPES = [
  { value: 'ABG', label: 'Abogado' },
  { value: 'JUEZPAZ', label: 'Juez de Paz' },
  { value: 'LT', label: 'Litigante' },
];

export default function LawyerVerificationModule({ lawyerId, lawyerEmail }: LawyerVerificationModuleProps) {
  const [activeTab, setActiveTab] = useState('verify');
  const [isVerifying, setIsVerifying] = useState(false);
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [quality, setQuality] = useState('ABG');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [certificateResult, setCertificateResult] = useState<any>(null);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState<{
    isVerified: boolean;
    barNumber: string | null;
    verificationDate: string | null;
  } | null>(null);

  useEffect(() => {
    loadCurrentStatus();
    loadHistory();
  }, [lawyerId]);

  const loadCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('lawyer_profiles')
        .select('is_verified, bar_number, verification_date')
        .eq('id', lawyerId)
        .single();

      if (error) throw error;
      
      setCurrentVerificationStatus({
        isVerified: data?.is_verified || false,
        barNumber: data?.bar_number,
        verificationDate: data?.verification_date,
      });
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lawyer_verifications')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data || []) as VerificationHistory[]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleVerifyLawyer = async () => {
    if (!documentNumber.trim()) {
      toast.error('Ingrese el número de documento');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await supabase.functions.invoke('verifik-lawyer-verification', {
        body: {
          documentType,
          documentNumber: documentNumber.trim(),
          lawyerId,
        },
      });

      if (response.error) throw response.error;

      setVerificationResult(response.data);
      
      if (response.data.status === 'verified') {
        toast.success('¡Verificación exitosa!');
        loadCurrentStatus();
      } else if (response.data.status === 'expired') {
        toast.warning('La tarjeta profesional no está vigente');
      } else {
        toast.info('No se encontró información del abogado');
      }

      loadHistory();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Error al verificar el abogado');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckCertificate = async () => {
    if (!documentNumber.trim()) {
      toast.error('Ingrese el número de documento');
      return;
    }

    setIsVerifying(true);
    setCertificateResult(null);

    try {
      const response = await supabase.functions.invoke('verifik-certificate-validity', {
        body: {
          documentType,
          documentNumber: documentNumber.trim(),
          quality,
          lawyerId,
        },
      });

      if (response.error) throw response.error;

      setCertificateResult(response.data);
      
      if (response.data.status === 'verified') {
        toast.success('Certificado de vigencia válido');
      } else {
        toast.warning(response.data.message);
      }

      loadHistory();
    } catch (error) {
      console.error('Certificate check error:', error);
      toast.error('Error al verificar el certificado');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <ShieldX className="h-5 w-5 text-orange-500" />;
      case 'not_found':
        return <ShieldQuestion className="h-5 w-5 text-muted-foreground" />;
      default:
        return <ShieldQuestion className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verificado</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">No Vigente</Badge>;
      case 'not_found':
        return <Badge variant="secondary">No Encontrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header with Current Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Verificación Profesional
          </h1>
          <p className="text-muted-foreground mt-1">
            Verifica tu tarjeta profesional con la Rama Judicial
          </p>
        </div>

        {currentVerificationStatus && (
          <Card className={`${currentVerificationStatus.isVerified ? 'border-green-500/50 bg-green-500/5' : 'border-muted'}`}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              {currentVerificationStatus.isVerified ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-600">Abogado Verificado</p>
                    <p className="text-xs text-muted-foreground">
                      TP: {currentVerificationStatus.barNumber}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="font-medium text-orange-600">Sin Verificar</p>
                    <p className="text-xs text-muted-foreground">
                      Verifica tu tarjeta profesional
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Verificar
          </TabsTrigger>
          <TabsTrigger value="certificate" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Certificado
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Verificar Abogado
              </CardTitle>
              <CardDescription>
                Consulta el estado de tu tarjeta profesional en la Rama Judicial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Documento</Label>
                  <Input
                    placeholder="Ingrese el número"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleVerifyLawyer}
                disabled={isVerifying || !documentNumber.trim()}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verificar Abogado
                  </>
                )}
              </Button>

              {verificationResult && (
                <Card className={`mt-4 ${
                  verificationResult.status === 'verified' 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : verificationResult.status === 'expired'
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-muted'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(verificationResult.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{verificationResult.message}</p>
                          {getStatusBadge(verificationResult.status)}
                        </div>
                        
                        {verificationResult.lawyer && (
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nombre:</span>
                              <span className="font-medium">{verificationResult.lawyer.fullName}</span>
                            </div>
                            {verificationResult.lawyer.barNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tarjeta Profesional:</span>
                                <span className="font-medium">{verificationResult.lawyer.barNumber}</span>
                              </div>
                            )}
                            {verificationResult.lawyer.professionalStatus && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado:</span>
                                <span className="font-medium">{verificationResult.lawyer.professionalStatus}</span>
                              </div>
                            )}
                            {verificationResult.lawyer.specialization && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Especialización:</span>
                                <span className="font-medium">{verificationResult.lawyer.specialization}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificate Tab */}
        <TabsContent value="certificate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Certificado de Vigencia
              </CardTitle>
              <CardDescription>
                Obtén un certificado de vigencia de tu tarjeta profesional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Documento</Label>
                  <Input
                    placeholder="Ingrese el número"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calidad</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCheckCertificate}
                disabled={isVerifying || !documentNumber.trim()}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Consultar Certificado
                  </>
                )}
              </Button>

              {certificateResult && (
                <Card className={`mt-4 ${
                  certificateResult.status === 'verified' 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-orange-500/50 bg-orange-500/5'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(certificateResult.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{certificateResult.message}</p>
                          {getStatusBadge(certificateResult.status)}
                        </div>
                        
                        {certificateResult.certificate && (
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nombre:</span>
                              <span className="font-medium">{certificateResult.certificate.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Estado:</span>
                              <span className="font-medium">{certificateResult.certificate.estado}</span>
                            </div>
                            {certificateResult.certificate.numeroTarjeta && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Número de Tarjeta:</span>
                                <span className="font-medium">{certificateResult.certificate.numeroTarjeta}</span>
                              </div>
                            )}
                            {certificateResult.certificate.fechaExpedicion && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha de Expedición:</span>
                                <span className="font-medium">{certificateResult.certificate.fechaExpedicion}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Verificaciones
                </CardTitle>
                <CardDescription>
                  Tus consultas anteriores a la Rama Judicial
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay verificaciones registradas</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {history.map((item) => (
                      <Card key={item.id} className="border-muted">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(item.status)}
                              <div>
                                <p className="font-medium text-sm">
                                  {item.verification_type === 'professional_status' 
                                    ? 'Verificación de Abogado' 
                                    : 'Certificado de Vigencia'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.professional_name || 'Sin nombre'}
                                  {item.bar_number && ` • TP: ${item.bar_number}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(item.status)}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.created_at).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}